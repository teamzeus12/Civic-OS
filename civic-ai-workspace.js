/* Civic AI Phase 3 workspace interactions. Uses the signed-in user's existing Supabase rows. */
(() => {
  "use strict";
  const PREFS_KEY = "civic-ai-workspace-preferences-v1";
  const $ = (id) => document.getElementById(id);
  const getPanel = () => $("civicAiPanel");
  let refreshTimer = null;

  function readPrefs() {
    try {
      const value = JSON.parse(localStorage.getItem(PREFS_KEY) || "{}");
      return { theme: ["dark","light","system"].includes(value.theme) ? value.theme : "dark", textSize: ["small","medium","large"].includes(value.textSize) ? value.textSize : "medium", notifications: value.notifications !== false };
    } catch { return { theme: "dark", textSize: "medium", notifications: true }; }
  }
  function savePrefs(prefs) { try { localStorage.setItem(PREFS_KEY, JSON.stringify(prefs)); } catch {} applyPrefs(prefs); }
  function applyPrefs(prefs = readPrefs()) {
    const panel = getPanel(); if (!panel) return;
    panel.classList.toggle("is-light", prefs.theme === "light" || (prefs.theme === "system" && window.matchMedia?.("(prefers-color-scheme: light)").matches));
    panel.classList.remove("ai-text-small","ai-text-medium","ai-text-large"); panel.classList.add("ai-text-" + prefs.textSize);
    if ($("civicAiTheme")) $("civicAiTheme").value = prefs.theme;
    if ($("civicAiTextSize")) $("civicAiTextSize").value = prefs.textSize;
    if ($("civicAiNotifications")) $("civicAiNotifications").checked = prefs.notifications;
  }
  async function currentOwner() {
    const client = window.civicSupabase;
    if (!client) throw new Error("Civic OS secure connection is unavailable. Refresh the page and sign in again.");
    const { data, error } = await client.auth.getUser(); if (error) throw error;
    if (!data?.user?.id) throw new Error("Sign in to use saved Civic AI chats.");
    return data.user;
  }
  function setEmpty(target, message) {
    if (!target) return; target.replaceChildren(); const p = document.createElement("p");
    p.className = "civic-ai-history-empty"; p.textContent = message; target.appendChild(p);
  }
  function makeHistoryItem(chat, currentId) {
    const row = document.createElement("div"); row.className = "civic-ai-history-item" + (chat.id === currentId ? " is-current" : "");
    const open = document.createElement("button"); open.type = "button"; open.className = "civic-ai-history-open";
    open.textContent = chat.title || "New chat"; open.title = chat.title || "New chat"; open.dataset.chatId = chat.id;
    open.setAttribute("aria-label", "Open chat: " + (chat.title || "New chat"));
    const pin = document.createElement("button"); pin.type = "button"; pin.className = "civic-ai-history-tool"; pin.dataset.chatPin = chat.id;
    pin.setAttribute("aria-label", chat.is_pinned ? "Unpin chat" : "Pin chat"); pin.title = chat.is_pinned ? "Unpin" : "Pin";
    pin.innerHTML = '<i data-lucide="' + (chat.is_pinned ? "pin-off" : "pin") + '"></i>';
    const remove = document.createElement("button"); remove.type = "button"; remove.className = "civic-ai-history-tool"; remove.dataset.chatDelete = chat.id;
    remove.setAttribute("aria-label", "Delete chat"); remove.title = "Delete chat"; remove.innerHTML = '<i data-lucide="trash-2"></i>';
    row.append(open, pin, remove); return row;
  }
  async function refreshChatHistory() {
    const pinned = $("civicAiPinnedChats"), recent = $("civicAiRecentChats"); if (!pinned || !recent) return;
    const client = window.civicSupabase;
    if (!client) { setEmpty(pinned,"Sign in to see pinned chats."); setEmpty(recent,"Sign in to see saved chats."); return; }
    try {
      const user = await currentOwner();
      const { data, error } = await client.from("civic_ai_conversations").select("id,title,is_pinned,updated_at").eq("owner_id",user.id).order("updated_at",{ascending:false}).limit(100);
      if (error) throw error;
      const chats = data || [], query = ($("civicAiSearch")?.value || "").trim().toLocaleLowerCase();
      const visible = chats.filter(chat => String(chat.title || "New chat").toLocaleLowerCase().includes(query));
      const pinnedChats = visible.filter(chat => chat.is_pinned), recentChats = visible.filter(chat => !chat.is_pinned);
      const currentId = (typeof state !== "undefined" ? state.civicAiConversationId : null) || null;
      pinned.replaceChildren(); recent.replaceChildren();
      if (!pinnedChats.length) setEmpty(pinned,query ? "No matching pinned chats." : "Pinned chats appear here.");
      else pinnedChats.forEach(chat => pinned.appendChild(makeHistoryItem(chat,currentId)));
      if (!recentChats.length) setEmpty(recent,query ? "No matching recent chats." : "Your saved chats appear here.");
      else recentChats.forEach(chat => recent.appendChild(makeHistoryItem(chat,currentId)));
      if (typeof window.refreshIcons === "function") window.refreshIcons();
    } catch (error) {
      console.warn("Civic AI history could not be loaded:",error); setEmpty(pinned,"Could not load pinned chats. Try again."); setEmpty(recent,"Could not load chat history. Check your sign-in.");
    }
  }
  function scheduleHistoryRefresh(delay = 1100) { clearTimeout(refreshTimer); refreshTimer = setTimeout(refreshChatHistory,delay); }
  async function togglePin(conversationId) {
    try {
      const client = window.civicSupabase, user = await currentOwner();
      const { data, error } = await client.from("civic_ai_conversations").select("is_pinned").eq("id",conversationId).eq("owner_id",user.id).single();
      if (error) throw error;
      const { error: updateError } = await client.from("civic_ai_conversations").update({is_pinned:!data.is_pinned,updated_at:new Date().toISOString()}).eq("id",conversationId).eq("owner_id",user.id);
      if (updateError) throw updateError;
      if (typeof window.toast === "function") window.toast(data.is_pinned ? "Chat unpinned." : "Chat pinned.","pin");
      await refreshChatHistory();
    } catch (error) { console.error("Civic AI pin update failed:",error); if (typeof window.toast === "function") window.toast(error.message || "Could not update this chat.","triangle-alert"); }
  }
  async function deleteChat(conversationId) {
    if (!window.confirm("Delete this Civic AI conversation and its messages? This cannot be undone.")) return;
    try {
      const client = window.civicSupabase, user = await currentOwner();
      const { error: messagesError } = await client.from("civic_ai_messages").delete().eq("conversation_id",conversationId).eq("owner_id",user.id); if (messagesError) throw messagesError;
      const { error: conversationError } = await client.from("civic_ai_conversations").delete().eq("id",conversationId).eq("owner_id",user.id); if (conversationError) throw conversationError;
      if ((typeof state !== "undefined" && state.civicAiConversationId === conversationId) && typeof window.startNewCivicAiChat === "function") window.startNewCivicAiChat();
      if (typeof window.toast === "function") window.toast("Conversation deleted.","trash-2"); await refreshChatHistory();
    } catch (error) { console.error("Civic AI delete failed:",error); if (typeof window.toast === "function") window.toast(error.message || "Could not delete this conversation.","triangle-alert"); }
  }
  async function clearAllHistory() {
    if (!window.confirm("Delete ALL of your saved Civic AI conversations and messages? This cannot be undone.")) return;
    try {
      const client = window.civicSupabase, user = await currentOwner();
      const { error: messagesError } = await client.from("civic_ai_messages").delete().eq("owner_id",user.id); if (messagesError) throw messagesError;
      const { error: chatsError } = await client.from("civic_ai_conversations").delete().eq("owner_id",user.id); if (chatsError) throw chatsError;
      if (typeof window.startNewCivicAiChat === "function") window.startNewCivicAiChat();
      if (typeof window.toast === "function") window.toast("Your saved Civic AI history was cleared.","check");
      await refreshChatHistory(); $("civicAiSettingsView").hidden = true;
    } catch (error) { console.error("Civic AI clear history failed:",error); if (typeof window.toast === "function") window.toast(error.message || "Could not clear chat history.","triangle-alert"); }
  }
  async function exportHistory() {
    try {
      const client = window.civicSupabase, user = await currentOwner();
      const { data: chats, error: chatError } = await client.from("civic_ai_conversations").select("id,title,is_pinned,created_at,updated_at").eq("owner_id",user.id).order("updated_at",{ascending:false});
      if (chatError) throw chatError;
      const rows = [];
      for (const chat of chats || []) {
        const { data: messages, error } = await client.from("civic_ai_messages").select("role,content,created_at").eq("conversation_id",chat.id).eq("owner_id",user.id).order("created_at",{ascending:true});
        if (error) throw error; rows.push({...chat,messages:messages || []});
      }
      const blob = new Blob([JSON.stringify({exportedAt:new Date().toISOString(),conversations:rows},null,2)],{type:"application/json"});
      const url = URL.createObjectURL(blob), link = document.createElement("a"); link.href = url; link.download = "civic-ai-chat-history.json";
      document.body.appendChild(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url),1000);
    } catch (error) { console.error("Civic AI export failed:",error); if (typeof window.toast === "function") window.toast(error.message || "Could not export chat history.","triangle-alert"); }
  }
  function showSettings(show = true) {
    const view = $("civicAiSettingsView"); if (!view) return; view.hidden = !show;
    if (show) applyPrefs(); if (typeof window.refreshIcons === "function") window.refreshIcons();
  }
  function openWorkspace() {
    const panel = getPanel(); if (!panel) return;
    panel.classList.add("is-open","is-expanded"); panel.classList.toggle("civic-ai-show-sidebar", window.matchMedia("(max-width: 520px)").matches);
    document.body.classList.add("civic-ai-open"); panel.setAttribute("aria-hidden","false");
    const fab = $("civicAiFab"); if (fab) fab.setAttribute("aria-expanded","true");
    refreshChatHistory(); if (typeof window.refreshIcons === "function") window.refreshIcons();
  }
  function onExpandClick() {
    const panel = getPanel(); if (!panel) return;
    if (panel.classList.contains("is-maximized")) { panel.classList.toggle("civic-ai-show-sidebar"); return; }
    if (!panel.classList.contains("is-open")) { openWorkspace(); return; }
    if (!panel.classList.contains("is-expanded")) { panel.classList.add("is-expanded"); if (window.matchMedia("(max-width: 520px)").matches) panel.classList.add("civic-ai-show-sidebar"); refreshChatHistory(); return; }
    if (window.matchMedia("(max-width: 520px)").matches) panel.classList.toggle("civic-ai-show-sidebar");
    else { panel.classList.remove("is-expanded","civic-ai-show-sidebar"); }
  }
  async function regenerateLastReply() {
    const stateRef = typeof state !== "undefined" ? state : null; if (!stateRef || !Array.isArray(stateRef.civicAiMessages)) return;
    let userIndex = -1;
    for (let i = stateRef.civicAiMessages.length - 1; i >= 0; i--) if (stateRef.civicAiMessages[i].role === "user") { userIndex = i; break; }
    if (userIndex < 0) { if (typeof window.toast === "function") window.toast("There is no user message to regenerate.","info"); return; }
    const toText = value => typeof window.civicAiPlainText === "function" ? window.civicAiPlainText(value) : String(value || "");
    const prompt = toText(stateRef.civicAiMessages[userIndex].text).trim(); if (!prompt) return;
    const generation = stateRef.civicAiGeneration;
    const history = stateRef.civicAiMessages.slice(0,userIndex).slice(-10).map(item => ({role:item.role === "ai" ? "assistant" : "user",content:toText(item.text).slice(0,3000)})).filter(item => item.content);
    if (typeof window.addCivicAiMessage !== "function" || typeof window.requestCivicAiReply !== "function") return;
    window.addCivicAiMessage("ai",'<p class="civic-ai-thinking"><i data-lucide="loader-circle"></i> Regenerating response…</p>');
    try {
      const reply = await window.requestCivicAiReply(prompt,"",history); if (generation !== stateRef.civicAiGeneration) return;
      await window.persistCivicAiMessage("assistant",reply,generation);
      const messages = $("civicAiMessages"), thinking = messages?.querySelector(".civic-ai-message.ai:last-child .civic-ai-thinking");
      const formatted = window.formatCivicAiReply(reply);
      if (thinking?.closest(".civic-ai-bubble")) thinking.closest(".civic-ai-bubble").innerHTML = formatted;
      stateRef.civicAiMessages[stateRef.civicAiMessages.length - 1] = {role:"ai",text:formatted};
      if (messages) messages.scrollTop = messages.scrollHeight; scheduleHistoryRefresh();
      if (typeof window.refreshIcons === "function") window.refreshIcons();
    } catch (error) {
      const thinking = $("civicAiMessages")?.querySelector(".civic-ai-message.ai:last-child .civic-ai-thinking");
      if (thinking) thinking.textContent = error.message || "Could not regenerate the response.";
    }
  }
  function enhanceResponseActions() {
    const container = $("civicAiMessages"); if (!container) return;
    let changed = false;
    container.querySelectorAll(".civic-ai-message.ai .civic-ai-response-actions").forEach(actions => {
      if (!actions.querySelector("[data-civic-ai-regenerate]")) {
        const button = document.createElement("button"); button.type = "button"; button.className = "civic-ai-copy-response"; button.dataset.civicAiRegenerate = "true";
        button.innerHTML = '<i data-lucide="refresh-cw"></i><span>Regenerate</span>'; actions.appendChild(button); changed = true;
      }
      if (!actions.querySelector("[data-civic-ai-pin-current]")) {
        const button = document.createElement("button"); button.type = "button"; button.className = "civic-ai-copy-response"; button.dataset.civicAiPinCurrent = "true";
        button.innerHTML = '<i data-lucide="pin"></i><span>Pin chat</span>'; actions.appendChild(button); changed = true;
      }
    });
    if (changed && typeof window.refreshIcons === "function") window.refreshIcons();
  }
  function setupResponseObserver() {
    const messages = $("civicAiMessages"); if (!messages) return;
    const observer = new MutationObserver(() => { enhanceResponseActions(); scheduleHistoryRefresh(); });
    observer.observe(messages,{childList:true,subtree:true}); enhanceResponseActions();
    messages.addEventListener("click",async event => {
      const regenerate = event.target.closest("[data-civic-ai-regenerate]");
      if (regenerate) { regenerate.disabled = true; await regenerateLastReply(); regenerate.disabled = false; return; }
      const pin = event.target.closest("[data-civic-ai-pin-current]");
      if (pin) {
        const id = typeof state !== "undefined" ? state.civicAiConversationId : null;
        if (!id) { if (typeof window.toast === "function") window.toast("Send a message first to create a saved chat.","info"); return; }
        await togglePin(id); pin.innerHTML = '<i data-lucide="pin-check"></i><span>Pinned chat</span>';
        if (typeof window.refreshIcons === "function") window.refreshIcons();
      }
    });
  }
  async function generateImageConcept() {
    const file = $("civicAiImageGenFile")?.files?.[0], prompt = ($("civicAiImageGenPrompt")?.value || "").trim();
    const button = $("civicAiGenerateImage"), preview = $("civicAiGeneratedPreview");
    if (!file) { if (typeof window.toast === "function") window.toast("Choose a reference photo first.","image-plus"); $("civicAiImageGenFile")?.click(); return; }
    if (!prompt) { if (typeof window.toast === "function") window.toast("Describe the concept you want to generate.","message-square"); $("civicAiImageGenPrompt")?.focus(); return; }
    if (!file.type.startsWith("image/")) { if (typeof window.toast === "function") window.toast("Please choose an image file.","triangle-alert"); return; }
    button.disabled = true; button.setAttribute("aria-busy","true"); button.querySelector("span").textContent = "Generating…";
    preview.hidden = false; preview.replaceChildren(); const loading = document.createElement("p"); loading.textContent = "Creating your concept. Keep this workspace open."; preview.appendChild(loading);
    try {
      const client = window.civicSupabase; if (!client) throw new Error("Secure Civic OS connection is unavailable.");
      const imageDataUrl = await window.civicImageToDataUrl(file);
      const {data,error} = await client.functions.invoke("civic-generate-improvement",{body:{imageDataUrl,categoryKey:"other",description:prompt.slice(0,1000),location:"Civic AI workspace"}});
      if (error) throw error; if (!data?.imageDataUrl) throw new Error(data?.error || "The image service did not return a preview.");
      preview.replaceChildren();
      const image = document.createElement("img"); image.src = data.imageDataUrl; image.alt = "AI-generated improvement concept based on your reference photo";
      const note = document.createElement("p"); note.textContent = "AI-generated concept only. It may alter details and does not verify what a real location will look like.";
      const download = document.createElement("a"); download.href = data.imageDataUrl; download.download = "civic-ai-concept.png"; download.textContent = "Save concept image";
      preview.append(image,note,download);
    } catch (error) { console.error("Civic AI image generation failed:",error); preview.replaceChildren(); const message = document.createElement("p"); message.textContent = error.message || "Could not generate the image. Please try again."; preview.appendChild(message); }
    finally { button.disabled = false; button.removeAttribute("aria-busy"); button.querySelector("span").textContent = "Generate concept"; if (typeof window.refreshIcons === "function") window.refreshIcons(); }
  }
  function bind() {
    const panel = getPanel(); if (!panel) return; applyPrefs();
    $("expandCivicAi")?.addEventListener("click",onExpandClick);
    $("civicAiSidebarNewChat")?.addEventListener("click",() => { if (typeof window.startNewCivicAiChat === "function") window.startNewCivicAiChat(); showSettings(false); if (typeof window.refreshIcons === "function") window.refreshIcons(); });
    $("civicAiSearch")?.addEventListener("input",refreshChatHistory);
    $("civicAiSettingsButton")?.addEventListener("click",() => showSettings(true));
    $("civicAiSettingsClose")?.addEventListener("click",() => showSettings(false));
    $("civicAiClearHistory")?.addEventListener("click",clearAllHistory);
    $("civicAiExportHistory")?.addEventListener("click",exportHistory);
    $("civicAiTheme")?.addEventListener("change",event => savePrefs({...readPrefs(),theme:event.target.value}));
    $("civicAiTextSize")?.addEventListener("change",event => savePrefs({...readPrefs(),textSize:event.target.value}));
    $("civicAiNotifications")?.addEventListener("change",event => savePrefs({...readPrefs(),notifications:event.target.checked}));
    panel.addEventListener("click",async event => {
      const openChat = event.target.closest("[data-chat-id]");
      if (openChat && openChat.dataset.chatId) {
        try { await window.loadCivicAiConversation(openChat.dataset.chatId); showSettings(false); await refreshChatHistory(); if (window.matchMedia("(max-width: 520px)").matches) panel.classList.remove("civic-ai-show-sidebar"); }
        catch (error) { console.error("Could not open Civic AI conversation:",error); if (typeof window.toast === "function") window.toast(error.message || "Could not open this conversation.","triangle-alert"); }
        return;
      }
      const pin = event.target.closest("[data-chat-pin]"); if (pin) { event.stopPropagation(); await togglePin(pin.dataset.chatPin); return; }
      const remove = event.target.closest("[data-chat-delete]"); if (remove) { event.stopPropagation(); await deleteChat(remove.dataset.chatDelete); }
    });
    $("civicAiImageGenOpen")?.addEventListener("click",() => { $("civicAiImageGenerator").hidden = false; if (!panel.classList.contains("is-expanded") && !panel.classList.contains("is-maximized")) openWorkspace(); $("civicAiImageGenPrompt")?.focus(); });
    $("civicAiImageGenClose")?.addEventListener("click",() => { $("civicAiImageGenerator").hidden = true; });
    $("civicAiImageGenFile")?.addEventListener("change",event => { const file = event.target.files?.[0]; $("civicAiImageGenFileLabel").textContent = file ? file.name : "Choose a reference photo"; });
    $("civicAiGenerateImage")?.addEventListener("click",generateImageConcept);
    $("civicAiForm")?.addEventListener("submit",() => scheduleHistoryRefresh(2200));
    $("newCivicAiChat")?.addEventListener("click",() => { showSettings(false); scheduleHistoryRefresh(500); });
    $("maximizeCivicAi")?.addEventListener("click",() => { setTimeout(() => { const maximized = panel.classList.contains("is-maximized"); panel.classList.toggle("is-expanded",!maximized); panel.classList.remove("civic-ai-show-sidebar"); if (maximized) refreshChatHistory(); },0); });
    $("closeCivicAi")?.addEventListener("click",() => { panel.classList.remove("is-expanded","civic-ai-show-sidebar"); showSettings(false); });
    document.addEventListener("visibilitychange",() => { if (!document.hidden) refreshChatHistory(); });
    setupResponseObserver(); refreshChatHistory();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded",bind,{once:true}); else bind();
  window.CivicAiWorkspace = Object.freeze({refreshChatHistory,openWorkspace});
})();
