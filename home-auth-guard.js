"use strict";
(() => {
  const config = window.CIVIC_SUPABASE_CONFIG;
  const client = window.supabase && config?.url && config?.publishableKey
    ? window.supabase.createClient(config.url, config.publishableKey)
    : null;

  // This is a navigation guard; database policies must still enforce permissions.
  function addProfileUI() {
    if (document.getElementById("profileScreen")) return;

    const topNav = document.querySelector(".top-links");
    if (topNav && !topNav.querySelector('[data-goto="profileScreen"]')) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "top-link";
      button.dataset.nav = "";
      button.dataset.goto = "profileScreen";
      button.textContent = "Profile";
      const reportButton = topNav.querySelector('[data-goto="reportScreen"]');
      topNav.insertBefore(button, reportButton || null);
    }

    const bottomNav = document.querySelector(".bottom-nav");
    if (bottomNav && !bottomNav.querySelector('[data-goto="profileScreen"]')) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "nav-item";
      button.dataset.nav = "";
      button.dataset.goto = "profileScreen";
      button.innerHTML = '<i data-lucide="user-round"></i><span>Profile</span>';
      bottomNav.appendChild(button);
      const navStyle = document.createElement("style");
      navStyle.id = "profile-nav-layout";
      navStyle.textContent = '.bottom-nav{grid-template-columns:repeat(5,minmax(0,1fr))!important}.bottom-nav [data-goto="actionsScreen"]{grid-column:3!important}';
      document.head.appendChild(navStyle);
    }

    const app = document.getElementById("app");
    if (!app) return;
    const section = document.createElement("section");
    section.id = "profileScreen";
    section.className = "screen";
    section.setAttribute("aria-labelledby", "profileTitle");
    section.innerHTML = `
      <div class="container">
        <header class="screen-header">
          <p class="kicker">YOUR ACCOUNT</p>
          <h1 id="profileTitle" class="screen-title">My profile</h1>
          <p class="screen-sub">Your account details are saved to your Civic OS account.</p>
        </header>
        <div class="glass" style="max-width:680px;margin:24px auto;padding:24px;border-radius:20px">
          <form id="profileForm">
            <label for="profileFullName">Full name</label>
            <input id="profileFullName" name="full_name" type="text" autocomplete="name" maxlength="100" required>
            <label for="profileEmail" style="display:block;margin-top:16px">Email address</label>
            <input id="profileEmail" name="email" type="email" readonly aria-describedby="profileEmailNote">
            <p id="profileEmailNote" class="screen-sub">Email is managed by your sign-in account.</p>
            <label for="profileRole" style="display:block;margin-top:16px">Account type</label>
            <input id="profileRole" name="role" type="text" readonly>
            <p id="profileMessage" role="status" aria-live="polite" style="margin-top:16px"></p>
            <div style="display:flex;gap:12px;flex-wrap:wrap;margin-top:20px">
              <button class="btn btn-primary" id="profileSave" type="submit">Save profile</button>
              <button class="btn btn-ghost" id="profileLogout" type="button">Log out</button>
            </div>
          </form>
        </div>
      </div>`;
    app.appendChild(section);

    if (window.lucide?.createIcons) window.lucide.createIcons();
  }

  function setProfileMessage(message, isError = false) {
    const el = document.getElementById("profileMessage");
    if (!el) return;
    el.textContent = message;
    el.style.color = isError ? "#b42318" : "";
  }

  async function loadProfile() {
    if (!client) return;
    const nameInput = document.getElementById("profileFullName");
    const emailInput = document.getElementById("profileEmail");
    const roleInput = document.getElementById("profileRole");
    if (!nameInput || !emailInput || !roleInput) return;

    setProfileMessage("Loading your saved profile…");
    try {
      const { data: authData, error: authError } = await client.auth.getUser();
      if (authError) throw authError;
      const user = authData.user;
      if (!user) throw new Error("Your session has expired. Please sign in again.");

      const { data: profile, error } = await client
        .from("profiles")
        .select("full_name, role")
        .eq("id", user.id)
        .maybeSingle();
      if (error) throw error;
      if (!profile) throw new Error("Your profile record could not be found.");

      nameInput.value = profile.full_name || user.user_metadata?.full_name || "";
      emailInput.value = user.email || "";
      roleInput.value = profile.role || "citizen";
      setProfileMessage("Profile loaded from your account.");
    } catch (error) {
      setProfileMessage(error?.message || "Could not load your profile.", true);
    }
  }

  async function saveProfile(event) {
    event.preventDefault();
    if (!client) return setProfileMessage("Secure account service is unavailable. Refresh and try again.", true);

    const button = document.getElementById("profileSave");
    const name = document.getElementById("profileFullName").value.trim();
    if (!name) return setProfileMessage("Enter your full name before saving.", true);

    button.disabled = true;
    button.textContent = "Saving…";
    setProfileMessage("");
    try {
      const { data: authData, error: authError } = await client.auth.getUser();
      if (authError) throw authError;
      if (!authData.user) throw new Error("Your session has expired. Please sign in again.");

      const { error: profileError } = await client
        .from("profiles")
        .update({ full_name: name })
        .eq("id", authData.user.id);
      if (profileError) throw profileError;

      const { error: metadataError } = await client.auth.updateUser({
        data: { full_name: name }
      });
      if (metadataError) throw metadataError;

      setProfileMessage("Profile saved. Sign out and back in to test that it persists.");
    } catch (error) {
      setProfileMessage(error?.message || "Could not save your profile.", true);
    } finally {
      button.disabled = false;
      button.textContent = "Save profile";
    }
  }

  function bindProfileEvents() {
    document.getElementById("profileForm")?.addEventListener("submit", saveProfile);
    document.getElementById("profileLogout")?.addEventListener("click", async () => {
      const button = document.getElementById("profileLogout");
      button.disabled = true;
      button.textContent = "Logging out…";
      try {
        const { error } = await client.auth.signOut();
        if (error) throw error;
        window.location.replace("./portals.html");
      } catch (error) {
        setProfileMessage(error?.message || "Could not log out. Please try again.", true);
        button.disabled = false;
        button.textContent = "Log out";
      }
    });

    document.addEventListener("click", (event) => {
      if (event.target.closest('[data-goto="profileScreen"]')) loadProfile();
    });
  }

  async function protectHome() {
    addProfileUI();
    bindProfileEvents();

    if (!client) {
      window.location.replace("./portals.html");
      return;
    }
    try {
      const { data: sessionData, error: sessionError } = await client.auth.getSession();
      if (sessionError || !sessionData.session?.user) {
        window.location.replace("./portals.html");
        return;
      }

      const user = sessionData.session.user;
      const { data: profile, error: profileError } = await client
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

      if (profileError || !profile || !["citizen", "government", "admin"].includes(profile.role)) {
        await client.auth.signOut();
        window.location.replace("./portals.html");
      }
    } catch (_) {
      window.location.replace("./portals.html");
    }
  }

  protectHome();
})();