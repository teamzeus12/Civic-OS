(() => {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const escape = (value) => String(value ?? "").replace(/[&<>"']/g, (c) => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const prefsKey = "civicOS.profilePreferences.v1";

  function readPrefs() {
    try { return JSON.parse(localStorage.getItem(prefsKey) || "{}"); } catch { return {}; }
  }
  function applyUiPreferences(prefs = readPrefs()) {
    const theme = ["system","dark","light"].includes(prefs.theme) ? prefs.theme : "system";
    const textSize = ["standard","large","larger"].includes(prefs.textSize) ? prefs.textSize : "standard";
    const prefersLight = Boolean(window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches);
    document.body.dataset.civicTheme = theme === "system" ? (prefersLight ? "light" : "dark") : theme;
    document.body.dataset.civicTextSize = textSize;
    document.body.dataset.civicReduceMotion = prefs.reduceMotion ? "true" : "false";
    if ($("profileThemePreference")) $("profileThemePreference").value = theme;
    if ($("profileTextSize")) $("profileTextSize").value = textSize;
    if ($("profileReduceMotion")) $("profileReduceMotion").checked = Boolean(prefs.reduceMotion);
  }
  function savePrefs() {
    const prefs = readPrefs();
    document.querySelectorAll("[data-profile-pref]").forEach((el) => prefs[el.dataset.profilePref] = el.checked);
    document.querySelectorAll("[data-ui-pref]").forEach((el) => prefs[el.dataset.uiPref] = el.type === "checkbox" ? el.checked : el.value);
    try { localStorage.setItem(prefsKey, JSON.stringify(prefs)); } catch {}
    applyUiPreferences(prefs);
  }
  function activateSettingsTab(name) {
    document.querySelectorAll("[data-settings-tab]").forEach((tab) => {
      const active = tab.dataset.settingsTab === name;
      tab.classList.toggle("active", active);
      tab.setAttribute("aria-selected", String(active));
      tab.tabIndex = active ? 0 : -1;
    });
    document.querySelectorAll("[data-settings-panel]").forEach((panel) => { panel.hidden = panel.dataset.settingsPanel !== name; });
  }
  function setAvatar(initials, signedUrl) {
    const avatar = $("citizenAvatar");
    if (!avatar) return;
    avatar.replaceChildren();
    if (signedUrl) {
      const image = document.createElement("img");
      image.src = signedUrl;
      image.alt = "Profile photo";
      image.loading = "lazy";
      image.onerror = () => { avatar.replaceChildren(); avatar.textContent = initials || "C"; };
      avatar.appendChild(image);
    } else avatar.textContent = initials || "C";
  }
  async function loadAvatar(client, userId, path, initials) {
    if (!path) { setAvatar(initials); return; }
    const result = await client.storage.from("civic-profile-avatars").createSignedUrl(path, 3600);
    setAvatar(initials, result.error ? null : result.data?.signedUrl || null);
  }
  function activateTab(name) {
    document.querySelectorAll("[data-profile-tab]").forEach((tab) => {
      const active = tab.dataset.profileTab === name;
      tab.classList.toggle("active", active);
      tab.setAttribute("aria-selected", String(active));
      tab.tabIndex = active ? 0 : -1;
    });
    document.querySelectorAll("[data-profile-section]").forEach((panel) => { panel.hidden = panel.dataset.profileSection !== name; });
  }
  function renderActivity(rows) {
    const target = $("profileActivityTimeline");
    if (!target) return;
    if (!rows.length) { target.innerHTML = '<p class="profile-empty">No civic activity is available for this account yet.</p>'; return; }
    target.innerHTML = rows.slice(0,8).map((row) => {
      const date = row.reported_at ? new Date(row.reported_at).toLocaleDateString() : "Date unavailable";
      return '<article class="profile-history-item"><span class="profile-history-symbol">↗</span><div class="profile-history-copy"><strong>' + escape(row.title || row.public_id || "Civic report") + '</strong><small>' + escape(date) + ' · ' + escape(row.category || "Civic report") + '</small><small>Latest status: ' + escape(row.status || "Reported") + '</small></div></article>';
    }).join("");
  }
  function renderHistory(rows) {
    const target = $("profileReportHistory");
    if (!target) return;
    if (!rows.length) { target.innerHTML = '<p class="profile-empty">No saved reports found for this account yet.</p>'; renderActivity(rows); return; }
    target.innerHTML = rows.slice(0,50).map((row) => {
      const status = String(row.status || "Reported");
      const statusClass = status.toLowerCase().replace(/[^a-z]+/g,"-");
      const location = typeof row.location === "string" ? row.location : row.location?.address || row.location?.label || row.location?.name || "Location not supplied";
      const date = row.reported_at ? new Date(row.reported_at).toLocaleDateString() : "Date unavailable";
      return '<article class="profile-history-item"><span class="profile-history-symbol">▤</span><div class="profile-history-copy"><strong>' + escape(row.title || row.public_id || "Civic report") + '</strong><small>' + escape(row.category || "General") + ' · ' + escape(location) + '</small><small>' + escape(date) + '</small></div><span class="profile-status-pill status-' + escape(statusClass) + '">' + escape(status) + '</span></article>';
    }).join("");
    renderActivity(rows);
  }
  window.renderCivicProfile = async function() {
    const client = window.civicSupabase;
    if (!client) { $("citizenEmail").textContent = "Account service unavailable. Refresh and try again."; return; }
    const { data, error } = await client.auth.getSession();
    if (error) { $("citizenEmail").textContent = "Unable to check your account session."; return; }
    const user = data.session?.user;
    const prefs = readPrefs();
    applyUiPreferences(prefs);
    document.querySelectorAll("[data-profile-pref]").forEach((el) => {
      if (Object.prototype.hasOwnProperty.call(prefs, el.dataset.profilePref)) el.checked = Boolean(prefs[el.dataset.profilePref]);
    });
    if (!user) {
      $("citizenDisplayName").textContent = "Your civic profile";
      $("citizenEmail").textContent = "Sign in to manage your profile and view your private report history.";
      setAvatar("C");
      const avatarInput = $("profileAvatarInput"); if (avatarInput) avatarInput.value = "";
      $("citizenEmailBadge").textContent = "Sign-in required";
      $("citizenVerificationBadge").textContent = "Resident verification not completed";
      ["profileFullName","profilePhone","profileWard","profileMunicipality","profileDistrict"].forEach((id) => { if ($(id)) $(id).value = ""; });
      $("profileReportCount").textContent = "0"; $("profileResolvedCount").textContent = "0";
      renderHistory([]);
      $("profileSignInButton").textContent = "Sign in";
      return;
    }
    const meta = user.user_metadata || {};
    let name = String(meta.full_name || "").trim();
    const profileResult = await client.from("profiles").select("full_name,avatar_path").eq("id",user.id).maybeSingle();
    if (!profileResult.error && profileResult.data?.full_name) name = profileResult.data.full_name;
    name = name || "Civic OS member";
    $("citizenDisplayName").textContent = name;
    $("citizenEmail").textContent = user.email || "Email unavailable";
    const initials = name.split(/\s+/).map((part) => part[0]).slice(0,2).join("").toUpperCase();
    await loadAvatar(client, user.id, !profileResult.error ? profileResult.data?.avatar_path : null, initials);
    $("citizenEmailBadge").textContent = user.email_confirmed_at ? "✓ Email confirmed" : "Email confirmation pending";
    $("citizenVerificationBadge").textContent = "Resident verification not completed";
    $("profileFullName").value = name === "Civic OS member" ? "" : name;
    $("profilePhone").value = meta.phone || ""; $("profileWard").value = meta.ward || "";
    $("profileMunicipality").value = meta.municipality || ""; $("profileDistrict").value = meta.district || "";
    $("profileSignInButton").textContent = "Account active";
    const reportsResult = await client.from("reports").select("id,public_id,title,category,status,location,reported_at").eq("reported_by",user.id).order("reported_at",{ascending:false}).limit(50);
    if (reportsResult.error) {
      $("profileReportCount").textContent = "—"; $("profileResolvedCount").textContent = "—";
      $("profileSaveMessage").textContent = "Profile is available, but report history could not be loaded.";
      renderHistory([]);
    } else {
      const rows = reportsResult.data || [];
      $("profileReportCount").textContent = String(rows.length);
      $("profileResolvedCount").textContent = String(rows.filter((r) => String(r.status).toLowerCase() === "resolved").length);
      renderHistory(rows);
    }
    if (window.lucide?.createIcons) window.lucide.createIcons();
  };
  document.addEventListener("DOMContentLoaded", () => {
    applyUiPreferences();
    if (window.matchMedia) {
      const systemTheme = window.matchMedia("(prefers-color-scheme: light)");
      const refreshSystemTheme = () => { if (readPrefs().theme === "system") applyUiPreferences(); };
      if (systemTheme.addEventListener) systemTheme.addEventListener("change", refreshSystemTheme);
      else if (systemTheme.addListener) systemTheme.addListener(refreshSystemTheme);
    }
    activateTab("overview");
    activateSettingsTab("appearance");
    document.querySelectorAll("[data-settings-tab]").forEach((tab) => tab.addEventListener("click", () => activateSettingsTab(tab.dataset.settingsTab)));
    document.querySelectorAll("[data-ui-pref]").forEach((el) => el.addEventListener("change", savePrefs));
    document.querySelectorAll("[data-open-profile-overview]").forEach((button) => button.addEventListener("click", () => activateTab("overview")));
    document.querySelectorAll("[data-profile-tab]").forEach((tab) => tab.addEventListener("click", () => activateTab(tab.dataset.profileTab)));
    $("profileEditButton")?.addEventListener("click", () => {
      activateTab("overview");
      $("civicProfileForm")?.scrollIntoView({ behavior: "smooth", block: "start" });
      $("profileFullName")?.focus({ preventScroll: true });
    });
    $("profileAvatarInput")?.addEventListener("change", async (event) => {
      const input = event.currentTarget, file = input.files?.[0];
      if (!file) return;
      const msg = $("profileSaveMessage"), label = document.querySelector('label[for="profileAvatarInput"]');
      const sessionResult = await window.civicSupabase?.auth.getSession();
      const user = sessionResult?.data?.session?.user;
      if (!user) { msg.textContent = "Sign in before changing your profile photo."; input.value = ""; return; }
      if (!["image/jpeg","image/png","image/webp"].includes(file.type)) { msg.textContent = "Choose a JPG, PNG or WebP image."; input.value = ""; return; }
      if (file.size > 3 * 1024 * 1024) { msg.textContent = "Profile photos must be 3 MB or smaller."; input.value = ""; return; }
      const client = window.civicSupabase;
      const oldProfile = await client.from("profiles").select("avatar_path").eq("id",user.id).maybeSingle();
      if (oldProfile.error) { msg.textContent = "Could not load your current photo settings."; input.value = ""; return; }
      const ext = file.type === "image/jpeg" ? "jpg" : file.type === "image/png" ? "png" : "webp";
      const path = user.id + "/avatar-" + Date.now() + "." + ext;
      if (label) { label.setAttribute("aria-disabled","true"); label.textContent = "Uploading…"; }
      msg.textContent = "Uploading your private profile photo…";
      try {
        const upload = await client.storage.from("civic-profile-avatars").upload(path,file,{ upsert:false, contentType:file.type, cacheControl:"3600" });
        if (upload.error) throw upload.error;
        const saved = await client.from("profiles").update({ avatar_path:path }).eq("id",user.id).select("id").maybeSingle();
        if (saved.error || !saved.data) {
          await client.storage.from("civic-profile-avatars").remove([path]);
          throw saved.error || new Error("Profile record was not updated.");
        }
        const oldPath = oldProfile.data?.avatar_path;
        if (oldPath && oldPath !== path) await client.storage.from("civic-profile-avatars").remove([oldPath]);
        msg.textContent = "Profile photo updated. It is stored in your private account space.";
        await window.renderCivicProfile();
      } catch (error) {
        console.error("Profile photo upload failed:",error);
        msg.textContent = "Photo upload failed. Check your connection and try again.";
      } finally {
        if (label) { label.removeAttribute("aria-disabled"); label.textContent = "Change photo"; }
        input.value = "";
      }
    });
    $("profileShareButton")?.addEventListener("click", async () => {
      const session = await window.civicSupabase?.auth.getSession();
      if (!session?.data?.session?.user) { $("profileSaveMessage").textContent = "Sign in before sharing your civic profile summary."; activateTab("overview"); return; }
      const name = $("citizenDisplayName")?.textContent || "Civic OS member";
      const summary = name + " on Civic OS\nCivic reports submitted: " + ($("profileReportCount")?.textContent || "—") + "\nReports marked resolved: " + ($("profileResolvedCount")?.textContent || "—") + "\nReport. Connect. Resolve.\n" + window.location.href.split("#")[0];
      try {
        if (navigator.share) await navigator.share({ title: "My Civic OS profile", text: summary });
        else if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(summary); $("profileSaveMessage").textContent = "A privacy-safe profile summary was copied to your clipboard."; }
        else $("profileSaveMessage").textContent = "Sharing is not supported by this browser.";
      } catch (error) { if (error?.name !== "AbortError") $("profileSaveMessage").textContent = "Could not open the share menu. Please try again."; }
    });
    document.querySelectorAll("[data-profile-pref]").forEach((el) => el.addEventListener("change", savePrefs));
    $("profileSignInButton")?.addEventListener("click", async () => {
      const session = await window.civicSupabase?.auth.getSession();
      if (session?.data?.session?.user) return;
      $("civicAuthDialog")?.showModal?.();
    });
    $("civicProfileForm")?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const client = window.civicSupabase, msg = $("profileSaveMessage"), button = $("profileSaveButton");
      if (!client) { msg.textContent = "Account service is unavailable."; return; }
      const session = await client.auth.getSession(), user = session.data?.session?.user;
      if (!user) { msg.textContent = "Sign in before saving profile details."; return; }
      const values = { full_name: $("profileFullName").value.trim(), phone: $("profilePhone").value.trim(), ward: $("profileWard").value.trim(), municipality: $("profileMunicipality").value.trim(), district: $("profileDistrict").value.trim() };
      button.disabled = true; msg.textContent = "Saving profile…";
      try {
        const authUpdate = await client.auth.updateUser({ data: values });
        if (authUpdate.error) throw authUpdate.error;
        const profileUpdate = await client.from("profiles").upsert({ id: user.id, full_name: values.full_name }, { onConflict: "id" });
        if (profileUpdate.error) throw profileUpdate.error;
        msg.textContent = "Profile saved. Jurisdiction details remain self-reported.";
        await window.renderCivicProfile();
      } catch (err) { console.error("Citizen profile save failed:",err); msg.textContent = "Could not save profile. Please try again."; }
      finally { button.disabled = false; }
    });
    $("profileResetPassword")?.addEventListener("click", async () => {
      const client = window.civicSupabase, msg = $("profileSecurityMessage");
      if (!client) { msg.textContent = "Account service is unavailable."; return; }
      const session = await client.auth.getSession(), email = session.data?.session?.user?.email;
      if (!email) { msg.textContent = "Sign in before requesting a password reset."; return; }
      const result = await client.auth.resetPasswordForEmail(email);
      msg.textContent = result.error ? "Password reset could not be requested. Please try again." : "If password reset is enabled, a secure reset email will arrive shortly.";
    });
    $("profileSignOutButton")?.addEventListener("click", async () => {
      const msg = $("profileSecurityMessage");
      const result = await window.civicSupabase?.auth.signOut();
      if (result?.error) { msg.textContent = "Sign out failed. Please try again."; return; }
      msg.textContent = "You have signed out.";
      await window.renderCivicProfile();
      const label = $("civicAccountButton"); if (label) label.textContent = "Sign in";
    });
    window.civicSupabase?.auth.onAuthStateChange(() => {
      if (document.getElementById("profileScreen")?.classList.contains("active")) window.renderCivicProfile();
    });
  });
})();