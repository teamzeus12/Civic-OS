"use strict";
(() => {
  const config = window.CIVIC_SUPABASE_CONFIG;
  const client = window.supabase && config?.url && config?.publishableKey
    ? window.supabase.createClient(config.url, config.publishableKey)
    : null;

  // This is a navigation guard; database policies must still enforce permissions.
  async function protectHome() {
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