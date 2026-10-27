(() => {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const escape = (value) => String(value ?? "").replace(/[&<>"']/g, (c) => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const prefsKey = "civicOS.profilePreferences.v1";

  function readPrefs() {
    try { return JSON.parse(localStorage.getItem(prefsKey) || "{}"); } catch { return {}; }
  }
  function savePrefs() {
    const prefs = {};
    document.querySelectorAll("[data-profile-pref]").forEach((el) => prefs[el.dataset.profilePref] = el.checked);
    try { localStorage.setItem(prefsKey, JSON.stringify(prefs)); } catch {}
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
    target.innerHTML = rows.slice(0,5).map((row) => {
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
    document.querySelectorAll("[data-profile-pref]").forEach((el) => {
      if (Object.prototype.hasOwnProperty.call(prefs, el.dataset.profilePref)) el.checked = Boolean(prefs[el.dataset.profilePref]);
    });
    if (!user) {
      $("citizenDisplayName").textContent = "Your civic profile";
      $("citizenEmail").textContent = "Sign in to manage your profile and view your private report history.";
      $("citizenAvatar").textContent = "C";
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
    const profileResult = await client.from("profiles").select("full_name").eq("id",user.id).maybeSingle();
    if (!profileResult.error && profileResult.data?.full_name) name = profileResult.data.full_name;
    name = name || "Civic OS member";
    $("citizenDisplayName").textContent = name;
    $("citizenEmail").textContent = user.email || "Email unavailable";
    $("citizenAvatar").textContent = name.split(/\s+/).map((part) => part[0]).slice(0,2).join("").toUpperCase();
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
    activateTab("overview");
    document.querySelectorAll("[data-profile-tab]").forEach((tab) => tab.addEventListener("click", () => activateTab(tab.dataset.profileTab)));
    $("profileEditButton")?.addEventListener("click", () => {
      activateTab("overview");
      $("civicProfileForm")?.scrollIntoView({ behavior: "smooth", block: "start" });
      $("profileFullName")?.focus({ preventScroll: true });
    });
    $("profileShareButton")?.addEventListener("click", async () => {
      const session = await window.civicSupabase?.auth.getSession();
      if (!session?.data?.session?.user) { $("profileSaveMessage").textContent = "Sign in before sharing your civic profile summary."; activateTab("overview"); return; }
      const name = $("citizenDisplayName")?.textContent || "Civic OS member";
      const summary = name + " on Civic OS\\nCivic reports submitted: " + ($("profileReportCount")?.textContent || "—") + "\\nReports marked resolved: " + ($("profileResolvedCount")?.textContent || "—") + "\\nReport. Connect. Resolve.\\n" + window.location.href.split("#")[0];
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