/*
 * Civic OS - drop-in login button for the existing GitHub Pages site.
 *
 * 1. Add this tag where you want the button (e.g. in the top nav, next to "Live demo"):
 *        <span id="auth-slot"></span>
 * 2. Before loading this script, set your deployed backend URL:
 *        <script>window.CIVIC_API = "https://your-backend.onrender.com";</script>
 *        <script src="auth-nav.js" defer></script>
 *
 * Logged out  -> shows a "Log in" link.
 * Logged in   -> shows the user's name, a profile link and a log-out button.
 *
 * It also exposes window.CivicAuth.submitIssue(payload) so your Report form can save
 * a report to the logged-in user's account.
 */
(function () {
  var API = (window.CIVIC_API || "http://localhost:5000").replace(/\/$/, "");
  var state = { authenticated: false, user: null, csrf: "" };

  function el(tag, attrs, text) {
    var n = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) { n.setAttribute(k, attrs[k]); });
    if (text) n.textContent = text;           // textContent: never inject user data as HTML
    return n;
  }

  function render() {
    var slot = document.getElementById("auth-slot");
    if (!slot) return;
    slot.textContent = "";
    var linkStyle = "margin-left:12px;font-weight:600;text-decoration:none;color:#0f766e;";
    if (state.authenticated) {
      slot.appendChild(el("a", { href: API + "/profile", style: linkStyle }, "Hi, " + state.user.name.split(" ")[0]));
      var out = el("button", { type: "button", style: "margin-left:12px;cursor:pointer;" }, "Log out");
      out.addEventListener("click", logout);
      slot.appendChild(out);
    } else {
      slot.appendChild(el("a", { href: API + "/login", style: linkStyle }, "Log in"));
    }
  }

  function refresh() {
    return fetch(API + "/api/me", { credentials: "include" })
      .then(function (r) { return r.json(); })
      .then(function (d) { state = d; render(); return d; })
      .catch(function () { render(); });          // backend offline: site still works, shows "Log in"
  }

  function logout() {
    fetch(API + "/api/logout", {
      method: "POST", credentials: "include",
      headers: { "X-CSRF-Token": state.csrf }
    }).then(refresh);
  }

  function submitIssue(payload) {
    if (!state.authenticated) {
      window.location.href = API + "/login?next=/profile";
      return Promise.reject(new Error("Login required"));
    }
    return fetch(API + "/api/issues", {
      method: "POST", credentials: "include",
      headers: { "Content-Type": "application/json", "X-CSRF-Token": state.csrf },
      body: JSON.stringify(payload)
    }).then(function (r) { return r.json().then(function (b) { if (!r.ok) throw new Error(b.error || "Failed"); return b; }); });
  }

  window.CivicAuth = { refresh: refresh, submitIssue: submitIssue, state: function () { return state; } };
  document.addEventListener("DOMContentLoaded", refresh);
})();
