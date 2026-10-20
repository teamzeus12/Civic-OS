"use strict";
(() => {
  const config = window.CIVIC_SUPABASE_CONFIG;
  const client = window.supabase && config?.url && config?.publishableKey
    ? window.supabase.createClient(config.url, config.publishableKey)
    : null;
  const $ = (id) => document.getElementById(id);
  let portal = "people";
  let mode = "signin";
  let codeSent = false;

  const setMessage = (id, message, isError = false) => {
    const el = $(id);
    if (!el) return;
    el.textContent = message || "";
    el.classList.toggle("error", isError);
  };
  const setBusy = (button, busy, label) => {
    if (!button) return;
    button.disabled = busy;
    if (busy) { button.dataset.originalText = button.textContent; button.textContent = label || "Please wait…"; }
    else if (button.dataset.originalText) { button.textContent = button.dataset.originalText; delete button.dataset.originalText; }
  };
  const redirectHome = () => { window.location.href = "./home.html"; };

  function choosePortal(next) {
    portal = next === "government" ? "government" : "people";

    $("citizenForm").hidden = portal !== "people";
    $("governmentForm").hidden = portal !== "government";
    $("peopleModes").hidden = portal !== "people";
    $("formEyebrow").textContent = portal === "people" ? "PEOPLE’S PORTAL" : "GOVERNMENT PORTAL";
    $("formTitle").textContent = portal === "people" ? (mode === "signup" ? "Create your account" : "Welcome back") : "Official sign-in";
    $("formDescription").textContent = portal === "people"
      ? (mode === "signup" ? "Create a free citizen account to report issues and follow progress." : "Sign in to submit civic reports and track updates.")
      : "Verify your official email. Only pre-authorised government accounts can continue.";
    $("featureKicker").textContent = portal === "people" ? "PEOPLE’S PORTAL" : "GOVERNMENT PORTAL";
    $("featureTitle").innerHTML = portal === "people" ? "Your voice.<br>Visible progress." : "Trusted access.<br>Clear action.";
    $("featureCopy").textContent = portal === "people"
      ? "Report local issues, follow their progress, and take part in making your community better."
      : "A dedicated workspace for authorised officials to review reports, coordinate responses, and communicate progress.";
    $("featureFooter").textContent = portal === "people" ? "CITIZENS · COMMUNITIES · ACTION" : "OFFICIALS · ACCOUNTABILITY · RESPONSE";
    setMessage("citizenMessage", "");
    setMessage("governmentMessage", "");
    if (portal === "government") {
      codeSent = false;
      $("governmentCodeWrap").hidden = true;
      $("governmentCode").required = false;
      $("governmentSubmit").innerHTML = 'Send secure sign-in code <span aria-hidden="true">→</span>';
    }
  }
  function chooseMode(next) {
    mode = next === "signup" ? "signup" : "signin";
    document.querySelectorAll(".mode-button").forEach((button) => button.classList.toggle("active", button.dataset.mode === mode));
    $("citizenName").hidden = mode !== "signup";
    $("citizenNameLabel").hidden = mode !== "signup";
    $("citizenName").required = mode === "signup";
    $("citizenPassword").autocomplete = mode === "signup" ? "new-password" : "current-password";
    $("citizenPassword").placeholder = mode === "signup" ? "Create a strong password" : "Enter your password";
    $("formTitle").textContent = mode === "signup" ? "Create your account" : "Welcome back";
    $("formDescription").textContent = mode === "signup" ? "Create a free citizen account to report issues and follow progress." : "Sign in to submit civic reports and track updates.";
    $("citizenSubmit").innerHTML = (mode === "signup" ? "Create account" : "Sign in") + ' <span aria-hidden="true">→</span>';
    $("forgotPassword").hidden = mode === "signup";
    setMessage("citizenMessage", "");
  }

  async function ensureCitizenProfile(user) {
    const { data, error } = await client.from("profiles").select("id, role").eq("id", user.id).maybeSingle();
    if (error) throw error;
    if (!data) {
      const { error: insertError } = await client.from("profiles").insert({
        id: user.id,
        full_name: (user.user_metadata?.full_name || "").trim() || null
      });
      if (insertError) throw insertError;
    } else if (data.role && !["citizen", "government", "admin"].includes(data.role)) {
      throw new Error("Your account profile is not configured correctly. Contact Civic OS support.");
    }
  }

  async function checkGovernmentRole(user) {
    const { data, error } = await client.from("profiles").select("role").eq("id", user.id).maybeSingle();
    if (error) throw error;
    if (!data || !["government", "admin"].includes(data.role)) {
      await client.auth.signOut();
      throw new Error("This account is not authorised for the Government Portal. Contact your Civic OS administrator.");
    }
  }

  $("citizenForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!client) return setMessage("citizenMessage", "Secure sign-in could not load. Refresh and try again.", true);
    const button = $("citizenSubmit");
    setBusy(button, true);
    setMessage("citizenMessage", "");
    try {
      const email = $("citizenEmail").value.trim();
      const password = $("citizenPassword").value;
      if (mode === "signup") {
        const fullName = $("citizenName").value.trim();
        const { data, error } = await client.auth.signUp({
          email, password, options: {
            data: { full_name: fullName },
            emailRedirectTo: new URL("./auth.html?portal=people", window.location.href).href
          }
        });
        if (error) throw error;
        if (!data.session) {
          chooseMode("signin");
          setMessage("citizenMessage", "Account created. Check your email for the confirmation link, then sign in.");
          return;
        }
      } else {
        const { error } = await client.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      const { data, error } = await client.auth.getUser();
      if (error) throw error;
      if (!data.user) throw new Error("Sign-in was not completed. Please try again.");
      await ensureCitizenProfile(data.user);
      redirectHome();
    } catch (error) {
      setMessage("citizenMessage", error?.message || "Could not sign in. Please try again.", true);
    } finally { setBusy(button, false); }
  });

  $("forgotPassword").addEventListener("click", async () => {
    if (!client) return setMessage("citizenMessage", "Secure sign-in could not load. Refresh and try again.", true);
    const email = $("citizenEmail").value.trim();
    if (!email) {
      $("citizenEmail").focus();
      return setMessage("citizenMessage", "Enter your email address first, then select Forgot password.", true);
    }
    const button = $("forgotPassword");
    button.disabled = true;
    try {
      const { error } = await client.auth.resetPasswordForEmail(email, {
        redirectTo: new URL("./auth.html", window.location.href).href
      });
      if (error) throw error;
      setMessage("citizenMessage", "If password recovery is enabled for this account, a reset link will arrive by email.");
    } catch (error) {
      setMessage("citizenMessage", error?.message || "Could not send a reset link.", true);
    } finally { button.disabled = false; }
  });

  $("governmentForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!client) return setMessage("governmentMessage", "Secure sign-in could not load. Refresh and try again.", true);
    const button = $("governmentSubmit");
    setBusy(button, true);
    setMessage("governmentMessage", "");
    try {
      const email = $("governmentEmail").value.trim();
      if (!codeSent) {
        const { error } = await client.auth.signInWithOtp({
          email,
          options: { shouldCreateUser: false, emailRedirectTo: new URL("./auth.html", window.location.href).href }
        });
        if (error) throw error;
        codeSent = true;
        $("governmentCodeWrap").hidden = false;
        $("governmentCode").required = true;
        $("governmentSubmit").innerHTML = 'Verify code and continue <span aria-hidden="true">→</span>';
        setMessage("governmentMessage", "If this email belongs to an existing account, a sign-in code or link will be sent. Enter the 6-digit code if your email template provides one.");
      } else {
        const token = $("governmentCode").value.trim();
        if (!/^\d{6}$/.test(token)) throw new Error("Enter the 6-digit email code.");
        const { data, error } = await client.auth.verifyOtp({ email, token, type: "email" });
        if (error) throw error;
        if (!data.user) throw new Error("Email verification did not return an account.");
        await checkGovernmentRole(data.user);
        redirectHome();
      }
    } catch (error) {
      setMessage("governmentMessage", error?.message || "Official sign-in could not be completed.", true);
    } finally { setBusy(button, false); }
  });

  document.querySelectorAll(".portal-tab").forEach((tab) => tab.addEventListener("click", () => choosePortal(tab.dataset.portal)));
  document.querySelectorAll(".mode-button").forEach((button) => button.addEventListener("click", () => chooseMode(button.dataset.mode)));

  $("recoveryForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!client) return setMessage("recoveryMessage", "Secure sign-in could not load. Refresh and try again.", true);
    const password = $("newPassword").value;
    if (password !== $("confirmPassword").value) return setMessage("recoveryMessage", "The passwords do not match.", true);
    const button = $("recoverySubmit");
    setBusy(button, true);
    setMessage("recoveryMessage", "");
    try {
      const { error } = await client.auth.updateUser({ password });
      if (error) throw error;
      setMessage("recoveryMessage", "Password updated. You can now return to Civic OS and sign in.");
      $("recoveryForm").reset();
    } catch (error) {
      setMessage("recoveryMessage", error?.message || "Could not update the password.", true);
    } finally { setBusy(button, false); }
  });

  const isRecovery = window.location.hash.includes("type=recovery");
  if (isRecovery) {
    $("citizenForm").hidden = true;
    $("governmentForm").hidden = true;
    $("peopleModes").hidden = true;
    $("recoveryForm").hidden = false;
    $("formTitle").textContent = "Choose a new password";
    $("formDescription").textContent = "Use at least 8 characters and keep it private.";
    $("formEyebrow").textContent = "ACCOUNT RECOVERY";
    $("featureKicker").textContent = "ACCOUNT RECOVERY";
    $("featureTitle").innerHTML = "Back in control.<br>Securely.";
    $("featureCopy").textContent = "Set a new password to restore access to your citizen account.";
  } else if (window.location.hash.includes("access_token") || window.location.search.includes("code=")) {
    client?.auth.getSession().then(async ({ data, error }) => {
      if (error || !data.session?.user) return;
      try {
        const { data: profile, error: profileError } = await client.from("profiles").select("role").eq("id", data.session.user.id).maybeSingle();
        if (profileError) throw profileError;
        if (profile && ["government", "admin"].includes(profile.role)) {
          redirectHome();
        } else {
          choosePortal("people");
          setMessage("citizenMessage", "Email verified. You can now sign in to your citizen account.");
        }
      } catch (err) {
        choosePortal("government");
        setMessage("governmentMessage", err?.message || "This account could not be verified.", true);
      }
    });
  }
  const requestedPortal = new URLSearchParams(window.location.search).get("portal");
  const portalFromUrl = requestedPortal === "government" ? "government" : "people";
  choosePortal(portalFromUrl);
  chooseMode("signin");
  $("formTitle").textContent = portalFromUrl === "government" ? "Official sign-in" : "Welcome back";
  $("formDescription").textContent = portalFromUrl === "government"
    ? "Sign in with your authorised government account."
    : "Sign in to submit civic reports and track updates.";
  if (isRecovery) {
    $("citizenForm").hidden = true;
    $("governmentForm").hidden = true;
    $("peopleModes").hidden = true;
    $("recoveryForm").hidden = false;
  }
})();
