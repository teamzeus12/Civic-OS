(() => {
  "use strict";

  // Development preview: report data is fetched only from Supabase after authorization.
  const departments = [
    { id: "pwd", name: "Public Works Department", short: "PWD", icon: "⌁", description: "Roads, bridges, drainage and public infrastructure.", categories: ["roads", "drainage", "infrastructure"] },
    { id: "mahud", name: "MAHUD", short: "MAHUD", icon: "⌂", description: "Municipal administration, urban services and sanitation.", categories: ["garbage", "sanitation", "urban services"] },
    { id: "electricity", name: "Electricity Department", short: "Electricity", icon: "ϟ", description: "Power supply, street lighting and electrical infrastructure.", categories: ["electricity", "streetlights"] },
    { id: "forest", name: "Forest Department", short: "Forest", icon: "♧", description: "Forests, trees, biodiversity and wildlife concerns.", categories: ["forest", "environment", "wildlife"] },
    { id: "education", name: "Education Department", short: "Education", icon: "▤", description: "Public schools, learning facilities and education resources.", categories: ["education", "school facilities"] },
    { id: "agriculture", name: "Agriculture Department", short: "Agriculture", icon: "❋", description: "Agricultural support, irrigation and farming concerns.", categories: ["agriculture", "irrigation"] },
    { id: "transport", name: "Transport Department", short: "Transport", icon: "↔", description: "Traffic, public transport and transport infrastructure.", categories: ["transport", "traffic"] },
    { id: "health", name: "Health Department", short: "Health", icon: "+", description: "Public health services and health facility concerns.", categories: ["health", "public health"] },
    { id: "water", name: "Water Resources", short: "Water", icon: "≈", description: "Water supply, flooding, drainage and water resources.", categories: ["water", "flooding", "drainage"] },
    { id: "animal", name: "Animal Welfare", short: "Animal Welfare", icon: "♡", description: "Animal welfare and related community reports.", categories: ["animals", "animal welfare"] },
    { id: "sports", name: "Sports Department", short: "Sports", icon: "◎", description: "Public sports facilities and community recreation spaces.", categories: ["sports", "recreation"] },
    { id: "other", name: "Other Civic Services", short: "Other", icon: "＋", description: "Reports that need review and routing by an authorized official.", categories: ["other"] }
  ];

  // Real records only; populated after authorized Supabase access.
  let reports = [];

  const statusOptions = ["Reported", "Verified", "In Progress", "Resolved"];
  let selectedDepartment = null;
  let activeStatus = "all";
  let supabaseClient = null;
  let liveMode = false;
  let officialProfile = null;
  let governmentMap = null;
  const governmentMapMarkers = new Map();
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]);
  const deptById = (id) => departments.find((dept) => dept.id === id);
  const countStatus = (status) => reports.filter((report) => report.status === status).length;
  const countDepartment = (id) => reports.filter((report) => report.department === id).length;

  function getReportCoordinates(report) {
    const raw = report?.rawLocation;
    let latitude = report?.latitude;
    let longitude = report?.longitude;
    if (raw && typeof raw === "object") {
      latitude = latitude ?? raw.latitude ?? raw.lat;
      longitude = longitude ?? raw.longitude ?? raw.lng ?? raw.lon;
    }
    if ((latitude === null || latitude === undefined || longitude === null || longitude === undefined) && typeof raw === "string") {
      const match = raw.trim().match(/^(?:GPS\s*)?(-?\d{1,2}(?:\.\d+)?)\s*,\s*(-?\d{1,3}(?:\.\d+)?)$/i);
      if (match) { latitude = Number(match[1]); longitude = Number(match[2]); }
    }
    latitude = Number(latitude); longitude = Number(longitude);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) return null;
    return { latitude, longitude };
  }

  function getReportLocationUrl(report) {
    const coords = getReportCoordinates(report);
    const query = coords ? coords.latitude + "," + coords.longitude : String(report?.location || "").trim();
    return "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(query || "Manipur");
  }

  function navigate(page) {
    $$(".page").forEach((section) => section.classList.toggle("active", section.dataset.pageView === page));
    $$(".nav-btn[data-page]").forEach((button) => button.classList.toggle("active", button.dataset.page === page));
    window.scrollTo({ top: 0, behavior: "smooth" });
    if (page === "dashboard" && governmentMap) requestAnimationFrame(() => governmentMap && governmentMap.invalidateSize());
  }

  function statsMarkup(items) {
    return items.map((item) => `<article class="stat-card"><div class="stat-top"><span>${escapeHtml(item.label)}</span><span class="stat-icon">${item.icon}</span></div><strong>${item.value}</strong><small>${escapeHtml(item.note)}</small></article>`).join("");
  }

  function departmentCard(dept) {
    const count = countDepartment(dept.id);
    return `<button type="button" class="department-card" data-department="${dept.id}"><span class="dept-icon">${dept.icon}</span><strong>${escapeHtml(dept.name)}</strong><small>${escapeHtml(dept.description)}</small><span class="card-arrow">↗</span><span class="pill">${count} ${count === 1 ? "report" : "reports"}</span></button>`;
  }

  function statusClass(status) {
    return ({ "Reported": "status-reported", "Verified": "status-verified", "In Progress": "status-progress", "Resolved": "status-resolved" })[status] || "";
  }

  function reportCard(report, allowStatusControl = false) {
    const dept = deptById(report.department);
    const statusControl = allowStatusControl && liveMode ? `<select aria-label="Status for ${escapeHtml(report.id)}" data-status-select="${escapeHtml(report.id)}">${statusOptions.map((status) => `<option ${status === report.status ? "selected" : ""}>${status}</option>`).join("")}</select><button class="btn btn-primary" data-save-status="${escapeHtml(report.id)}" type="button">Save status</button>` : "";
    const photos = Array.isArray(report.photos) ? report.photos : [];
    const photoMarkup = photos.length
      ? `<img class="gov-report-photo" src="${escapeHtml(photos[0].url)}" alt="Submitted photo for ${escapeHtml(report.title)}" loading="lazy" decoding="async" />`
      : `<span class="gov-report-photo-placeholder"><span aria-hidden="true">▧</span><span>No photo</span></span>`;
    return `<article class="report-card"><div class="gov-report-copy"><span class="report-id">${escapeHtml(report.id)} · ${escapeHtml(report.category)}</span><h3>${escapeHtml(report.title)}</h3><p>${escapeHtml(report.description)}</p><div class="report-meta"><span class="pill">${escapeHtml(dept?.short || "Other")}</span><span class="pill">⌖ ${escapeHtml(report.location)}</span><span class="pill status ${statusClass(report.status)}">${escapeHtml(report.status)}</span></div><div class="report-actions">${statusControl || `<button class="btn" data-open-department="${report.department}" type="button">Department →</button>`}<button class="btn btn-primary" data-action-report="${escapeHtml(report.id)}" type="button">Action &amp; Resolution</button></div></div><div class="gov-report-media" aria-label="${photos.length ? photos.length + " submitted photo(s)" : "No photo submitted"}">${photoMarkup}</div></article>`;
  }

  function renderStats(targetId) {
    const target = $("#" + targetId);
    if (!target) return;
    target.innerHTML = statsMarkup([
      { label: "Total reports", value: reports.length, note: liveMode ? "Live database records" : "Waiting for authorized sign-in", icon: "▤" },
      { label: "Awaiting review", value: countStatus("Reported"), note: "Reported status", icon: "◷" },
      { label: "In progress", value: countStatus("In Progress"), note: "Work underway", icon: "↻" },
      { label: "Resolved", value: countStatus("Resolved"), note: "Marked resolved", icon: "✓" }
    ]);
  }

  function renderDepartments(targetId, query = "") {
    const target = $("#" + targetId);
    if (!target) return;
    const q = query.trim().toLowerCase();
    const list = departments.filter((dept) => [dept.name, dept.short, dept.description].join(" ").toLowerCase().includes(q));
    target.innerHTML = list.length ? list.map(departmentCard).join("") : '<div class="empty-state">No departments match your search.</div>';
  }

  function renderReports(targetId, list, controls = false) {
    const target = $("#" + targetId);
    if (!target) return;
    target.innerHTML = list.length ? list.map((report) => reportCard(report, controls)).join("") : '<div class="empty-state">No genuine reports are available for this view yet.</div>';
  }

  function openDepartment(id) {
    const dept = deptById(id);
    if (!dept) return;
    selectedDepartment = id;
    $("#departmentTitle").textContent = dept.name;
    $("#departmentDescription").textContent = dept.description;
    $("#departmentHeroIcon").textContent = dept.icon;
    $("#departmentHeroTitle").textContent = dept.name;
    $("#departmentHeroDescription").textContent = dept.description;
    const list = reports.filter((report) => report.department === id);
    $("#departmentStats").innerHTML = statsMarkup([
      { label: "Department reports", value: list.length, note: "Database records", icon: "▤" },
      { label: "Reported", value: list.filter((r) => r.status === "Reported").length, note: "Awaiting review", icon: "◷" },
      { label: "In progress", value: list.filter((r) => r.status === "In Progress").length, note: "Currently active", icon: "↻" },
      { label: "Resolved", value: list.filter((r) => r.status === "Resolved").length, note: "Completed reports", icon: "✓" }
    ]);
    renderDepartmentReports();
    navigate("department");
  }

  function renderDepartmentReports() {
    if (!selectedDepartment) return;
    const q = ($("#departmentReportSearch")?.value || "").trim().toLowerCase();
    const status = $("#departmentStatusFilter")?.value || "all";
    const list = reports.filter((report) => report.department === selectedDepartment)
      .filter((report) => status === "all" || report.status === status)
      .filter((report) => [report.id, report.title, report.category, report.location, report.description].join(" ").toLowerCase().includes(q));
    renderReports("departmentReports", list, liveMode);
  }

  function renderIssues() {
    const q = ($("#issueSearch")?.value || "").trim().toLowerCase();
    const dept = $("#issueDepartmentFilter")?.value || "all";
    const status = $("#issueStatusFilter")?.value || "all";
    const list = reports.filter((report) => dept === "all" || report.department === dept)
      .filter((report) => status === "all" || report.status === status)
      .filter((report) => [report.id, report.title, report.category, report.location, report.description, deptById(report.department)?.name].join(" ").toLowerCase().includes(q));
    renderReports("issueReports", list, liveMode);
    const chips = $("#statusChips");
    if (chips) chips.innerHTML = [["all", "All"], ...statusOptions.map((statusName) => [statusName, statusName])].map(([value, label]) => `<button type="button" class="filter-chip ${activeStatus === value ? "active" : ""}" data-status-chip="${escapeHtml(value)}">${escapeHtml(label)} · ${value === "all" ? reports.length : countStatus(value)}</button>`).join("");
  }

  function renderGovernmentMapSelection(report) {
    const panel = $("#govMapSelection");
    if (!panel || !report) return;
    const coords = getReportCoordinates(report);
    const dept = deptById(report.department);
    panel.innerHTML = `<div class="map-report-top"><span>${escapeHtml(report.publicId || report.id)}</span><span>${escapeHtml(report.status)}</span></div>
      <h3>${escapeHtml(report.title)}</h3>
      <div class="map-report-meta"><span class="pill">${escapeHtml(dept?.short || report.department || "Other")}</span><span class="pill">${escapeHtml(report.category || "General")}</span></div>
      <p>${escapeHtml(report.description || "No description supplied.")}</p>
      <div class="map-location"><strong>Location</strong><br>${escapeHtml(report.location || "Location not provided")}<br><span>${coords ? "Coordinates: " + coords.latitude.toFixed(5) + ", " + coords.longitude.toFixed(5) : "No usable GPS coordinates recorded"}</span></div>
      <a class="map-open-link" href="${escapeHtml(getReportLocationUrl(report))}" target="_blank" rel="noopener noreferrer">Open location ↗</a>`;
    governmentMapMarkers.forEach((entry, id) => entry.marker.setStyle({ radius: id === report.id ? 10 : 7, weight: id === report.id ? 4 : 2 }));
  }

  function renderGovernmentMap() {
    const mapElement = $("#govDashboardMap");
    const statusElement = $("#govDashboardMapStatus");
    const unpinnedTarget = $("#govMapUnpinned");
    if (!mapElement) return;
    const mapped = reports.map((report) => ({ report, coords: getReportCoordinates(report) })).filter((item) => item.coords);
    const unpinned = reports.filter((report) => !getReportCoordinates(report));

    if (statusElement) statusElement.textContent = liveMode
      ? mapped.length + " of " + reports.length + " authorized reports have usable map coordinates. Address-only reports are listed separately; no locations are guessed."
      : "Sign in with an authorized government account to load the real report map.";

    if (unpinnedTarget) {
      unpinnedTarget.innerHTML = unpinned.length
        ? unpinned.map((report) => `<button type="button" data-gov-map-report="${escapeHtml(report.id)}"><strong>${escapeHtml(report.title)}</strong><span>${escapeHtml(report.location || "Location not provided")} · ${escapeHtml(report.status)}</span></button>`).join("")
        : '<p class="gov-map-status">No address-only reports in this data scope.</p>';
    }

    if (!window.L || typeof window.L.map !== "function") {
      mapElement.innerHTML = '<div class="gov-map-fallback"><strong>Map library unavailable</strong><p>Report records remain available in Issues. Check the network connection and reload to use the map.</p></div>';
      return;
    }

    if (governmentMap) { governmentMap.remove(); governmentMap = null; }
    governmentMapMarkers.clear();
    mapElement.innerHTML = "";
    governmentMap = window.L.map(mapElement, { scrollWheelZoom: false }).setView([24.817, 93.9368], 9);
    window.L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap contributors</a>'
    }).addTo(governmentMap);

    const statusColors = { "Reported": "#64748b", "Verified": "#2563eb", "In Progress": "#b86c08", "Resolved": "#0f9f78" };
    const points = [];
    mapped.forEach(({ report, coords }) => {
      const color = statusColors[report.status] || "#0f766e";
      const marker = window.L.circleMarker([coords.latitude, coords.longitude], {
        radius: 7, color, weight: 2, opacity: 1, fillColor: color, fillOpacity: .9
      }).addTo(governmentMap);
      marker.bindTooltip(escapeHtml(report.title || report.id), { direction: "top", offset: [0, -6] });
      marker.on("click", () => renderGovernmentMapSelection(report));
      governmentMapMarkers.set(report.id, { marker });
      points.push([coords.latitude, coords.longitude]);
    });

    if (points.length === 1) governmentMap.setView(points[0], 14);
    else if (points.length > 1) governmentMap.fitBounds(points, { padding: [24, 24], maxZoom: 14 });

    const selection = $("#govMapSelection");
    if (selection) {
      if (mapped.length) renderGovernmentMapSelection(mapped[0].report);
      else selection.innerHTML = '<div class="map-selection-empty"><strong>No GPS pins available yet</strong><p>Reports will appear here when their saved location includes usable coordinates. Address-only reports remain listed separately.</p></div>';
    }
    requestAnimationFrame(() => governmentMap && governmentMap.invalidateSize());
  }

  function renderDashboard() {
    renderStats("dashboardStats");
    const statusTarget = $("#statusAnalytics");
    const deptTarget = $("#departmentAnalytics");
    statusTarget.innerHTML = statusOptions.map((status) => {
      const count = countStatus(status);
      return `<div class="bar-row"><span>${escapeHtml(status)}</span><div class="bar-track"><div class="bar-fill" style="width:${reports.length ? count / reports.length * 100 : 0}%"></div></div><strong>${count}</strong></div>`;
    }).join("");
    const departmentCounts = departments.map((dept) => ({ dept, count: countDepartment(dept.id) })).filter((item) => item.count).sort((a, b) => b.count - a.count);
    deptTarget.innerHTML = departmentCounts.map(({ dept, count }) => `<div class="bar-row"><span>${escapeHtml(dept.short)}</span><div class="bar-track"><div class="bar-fill" style="width:${reports.length ? count / reports.length * 100 : 0}%"></div></div><strong>${count}</strong></div>`).join("");

    const summaryTarget = $("#governmentAiSummary");
    if (summaryTarget) {
      const openReports = reports.filter((report) => report.status !== "Resolved");
      const categoryCounts = new Map();
      reports.forEach((report) => {
        const category = String(report.category || "").trim();
        if (category) categoryCounts.set(category, (categoryCounts.get(category) || 0) + 1);
      });
      const topCategory = [...categoryCounts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0];
      const openByDepartment = new Map();
      openReports.forEach((report) => {
        const key = report.department || "other";
        openByDepartment.set(key, (openByDepartment.get(key) || 0) + 1);
      });
      const topDepartment = [...openByDepartment.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0];
      const openByLocation = new Map();
      openReports.forEach((report) => {
        const location = String(report.location || "").trim();
        if (!location || /^(location not provided|location recorded|location not specified|unknown)$/i.test(location)) return;
        const key = location.toLocaleLowerCase();
        const current = openByLocation.get(key);
        if (current) current.count++;
        else openByLocation.set(key, { name: location, count: 1 });
      });
      const topLocation = [...openByLocation.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))[0];
      const summaryParts = [];
      if (topCategory && reports.length) {
        const label = topCategory[0].replace(/[_-]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
        summaryParts.push(`<strong>${escapeHtml(label)}</strong> is the most reported category (${Math.round(topCategory[1] / reports.length * 100)}% of reports).`);
      }
      if (topDepartment) {
        const deptName = deptById(topDepartment[0])?.short || topDepartment[0];
        summaryParts.push(`<strong>${escapeHtml(deptName)}</strong> carries the largest open workload with ${topDepartment[1]} active ${topDepartment[1] === 1 ? "report" : "reports"}.`);
      }
      if (topLocation) {
        summaryParts.push(`<strong>${escapeHtml(topLocation.name)}</strong> is the current hotspot with ${topLocation.count} open ${topLocation.count === 1 ? "report" : "reports"}.`);
      }
      summaryTarget.innerHTML = summaryParts.length
        ? `<p>${summaryParts.join(" ")}</p><p class="gov-ai-summary-note">This summary uses only genuine reports available within your authorized government data scope. Officials determine the appropriate response and timing.</p>`
        : '<div class="gov-ai-summary-empty">No report patterns are available yet. The summary will appear after genuine reports load.</div>';
    }

    $("#dashboardActivity").innerHTML = reports.slice().reverse().slice(0, 5).map((report) => `<div class="activity-item"><span class="activity-dot"></span><div><strong>${escapeHtml(report.title)}</strong><p>${escapeHtml(deptById(report.department)?.short || "Other")} · ${escapeHtml(report.location)} · ${escapeHtml(report.status)}</p></div></div>`).join("");
    renderGovernmentMap();
  }

  function renderNotifications() {
    const target = $("#notificationList");
    if (target) target.innerHTML = '<div class="empty-state">No official notifications are available yet.</div>';
  }


  const govPrefsKey = "civicOS.governmentProfilePreferences.v1";
  function loadGovernmentProfilePreferences() {
    let saved = {};
    try { saved = JSON.parse(localStorage.getItem(govPrefsKey) || "{}"); } catch (error) {}
    document.querySelectorAll("[data-gov-pref]").forEach(function(input) {
      if (Object.prototype.hasOwnProperty.call(saved, input.dataset.govPref)) input.checked = Boolean(saved[input.dataset.govPref]);
    });
  }
  function saveGovernmentProfilePreferences() {
    const saved = {};
    document.querySelectorAll("[data-gov-pref]").forEach(function(input) { saved[input.dataset.govPref] = input.checked; });
    try { localStorage.setItem(govPrefsKey, JSON.stringify(saved)); } catch (error) {}
    const message = document.querySelector("#govProfilePrefMessage");
    if (message) message.textContent = "Preferences saved on this device.";
  }
  async function renderGovernmentProfile() {
    loadGovernmentProfilePreferences();
    const badge = document.querySelector("#govProfileAccessBadge");
    const signInCard = document.querySelector("#govProfileSignInCard");
    if (!supabaseClient) { if (badge) badge.textContent = "Sign-in required"; if (signInCard) signInCard.hidden = false; return; }
    const sessionResult = await supabaseClient.auth.getSession();
    const user = sessionResult.data && sessionResult.data.session ? sessionResult.data.session.user : null;
    if (!user || !liveMode || !officialProfile) { if (badge) badge.textContent = "Access not verified"; if (signInCard) signInCard.hidden = false; return; }
    if (signInCard) signInCard.hidden = true;
    const profile = officialProfile;
    const name = profile.full_name || (user.user_metadata && user.user_metadata.full_name) || "Government official";
    const role = profile.role === "admin" ? "Administrator" : "Department official";
    const department = profile.role === "admin" ? "All departments" : (profile.department_id || "Not assigned");
    const total = reports.length;
    const resolved = reports.filter(function(row) { return String(row.status).toLowerCase() === "resolved"; }).length;
    const open = reports.filter(function(row) { return ["reported", "verified"].includes(String(row.status).toLowerCase()); }).length;
    const setText = function(id, value) { const el = document.getElementById(id); if (el) el.textContent = value; };
    setText("govProfileName", name);
    setText("govProfileEmail", user.email || "Official email unavailable");
    setText("govProfileAvatar", name.split(/\s+/).map(function(part) { return part[0]; }).slice(0,2).join("").toUpperCase());
    setText("govProfileAccessBadge", "Authorized session");
    setText("govProfileRoleBadge", role);
    setText("govProfileDepartmentBadge", department);
    setText("govProfileDetailName", name);
    setText("govProfileDetailEmail", user.email || "Unavailable");
    setText("govProfileDetailRole", role);
    setText("govProfileDetailDepartment", department);
    setText("govProfileDetailScope", profile.role === "admin" ? "All authorized departments" : "Assigned department only");
    setText("govProfileReportCount", String(total));
    setText("govProfileResolvedCount", String(resolved));
    setText("govProfileOpenCount", String(open));
  }

  async function connectGovernmentWorkspace() {
    const config = window.CIVIC_SUPABASE_CONFIG;
    if (!window.supabase?.createClient || !config?.url || !config?.publishableKey) { showWorkspaceError("Supabase is not configured. Live reports cannot be loaded."); return; }
    const client = window.supabase.createClient(config.url, config.publishableKey);
    supabaseClient = client;
    let sessionData;
    try {
      const sessionResult = await client.auth.getSession();
      sessionData = sessionResult.data;
      if (sessionResult.error) { showWorkspaceError("Authentication could not be checked. No reports were loaded."); return; }
    } catch (error) { console.error("Government session check failed", error); showWorkspaceError("Authentication service is unavailable. No reports were loaded."); return; }
    if (!sessionData?.session) { showWorkspaceError("Sign in with an authorized government account to load real reports. No sample data is displayed."); return; }
    const userId = sessionData.session.user.id;
    let profile, profileError;
    try {
      const profileResult = await client.from("profiles").select("id,role,department_id,full_name").eq("id", userId).maybeSingle();
      profile = profileResult.data; profileError = profileResult.error;
    } catch (error) { console.error("Government profile check failed", error); showWorkspaceError("Government account verification failed. No reports were loaded."); return; }
    if (profileError || !profile || !["government", "admin"].includes(profile.role)) { showWorkspaceError("Government access could not be verified. No reports were loaded."); return; }
    if (profile.role !== "admin" && !profile.department_id) { showWorkspaceError("Your official account has no department assignment. No reports were loaded; ask an administrator to assign your department."); return; }
    const query = client.from("reports").select("id,public_id,title,category,description,status,location,primary_department_id,reported_at,updated_at,verification_required").order("reported_at", { ascending: false });
    const scopedQuery = profile.role === "admin" ? query : query.eq("primary_department_id", profile.department_id);
    let data, error;
    try { const reportResult = await scopedQuery; data = reportResult.data; error = reportResult.error; }
    catch (loadError) { console.error("Live report load failed", loadError); showWorkspaceError("Reports could not be loaded from Supabase. Check your connection or permissions."); return; }
    if (error) { console.error("Live report load failed", error); showWorkspaceError("Reports could not be loaded from Supabase. Check your connection or permissions."); return; }
    clearWorkspaceError();
    const deptMap = { mahud:"mahud", pwd:"pwd", power:"electricity", environment_forest:"forest", education:"education", agriculture:"agriculture", transport:"transport", health:"health", water_resources:"water", youth_sports:"sports", animal_husbandry:"animal" };
    const place = (v) => typeof v === "string" ? v : v && typeof v === "object" ? [v.address,v.name,v.locality,v.district,v.city,v.label].find(x => typeof x === "string" && x.trim()) || "Location recorded" : "Location not provided";
    const reportRows = data || [];
    const reportIds = reportRows.map((report) => report.id).filter(Boolean);
    const photosByReport = new Map();
    if (reportIds.length) {
      const { data: evidenceRows, error: evidenceError } = await client
        .from("report_evidence")
        .select("report_id,storage_path,media_type,original_name,created_at")
        .in("report_id", reportIds)
        .eq("media_type", "image")
        .order("created_at", { ascending: true });
      if (evidenceError) {
        console.warn("Government report evidence could not be loaded:", evidenceError);
      } else {
        for (const evidence of evidenceRows || []) {
          if (!evidence.storage_path) continue;
          const { data: signed, error: signedError } = await client
            .storage.from("civic-report-evidence")
            .createSignedUrl(evidence.storage_path, 3600);
          if (signedError || !signed?.signedUrl) {
            console.warn("Could not create a temporary government photo URL:", signedError);
            continue;
          }
          const photos = photosByReport.get(evidence.report_id) || [];
          photos.push({ url: signed.signedUrl, name: evidence.original_name || "Submitted evidence" });
          photosByReport.set(evidence.report_id, photos);
        }
      }
    }
    reports = reportRows.map(r => ({ id:r.id, publicId:r.public_id, databaseId:r.id, title:r.title || "Untitled civic report", category:r.category || "General", department:deptMap[r.primary_department_id] || r.primary_department_id || "other", rawLocation:r.location, latitude:r.location && typeof r.location === "object" ? (r.location.latitude ?? r.location.lat ?? null) : null, longitude:r.location && typeof r.location === "object" ? (r.location.longitude ?? r.location.lng ?? r.location.lon ?? null) : null, location:place(r.location), description:r.description || "", status:r.status || "Submitted", updated:r.updated_at || r.reported_at || "", photos:photosByReport.get(r.id) || [] }));
    liveMode = true; supabaseClient = client; officialProfile = profile;
    const pill = document.querySelector(".demo-pill"); if (pill) pill.textContent = "LIVE · AUTHENTICATED";
    renderStats("homeStats"); renderStats("dashboardStats"); renderDepartments("homeDepartments"); renderDepartments("allDepartments", $("#departmentSearch")?.value || ""); renderReports("homeRecent", reports.slice(0, 4)); renderDashboard(); renderIssues(); renderNotifications(); renderGovernmentProfile();
    navigate("dashboard");
    const small = document.querySelector(".profile-mini small"); if (small) small.textContent = profile.role === "admin" ? "Administrator" : profile.department_id.toUpperCase() + " official";
  }

  function showWorkspaceError(message) {
    let node = $("#workspaceDataError");
    if (!node) { node = document.createElement("div"); node.id = "workspaceDataError"; node.className = "notice"; document.querySelector(".main")?.prepend(node); }
    if (node) node.textContent = message;
  }
  function clearWorkspaceError() { $("#workspaceDataError")?.remove(); }

  function init() {
    renderStats("homeStats");
    renderStats("dashboardStats");
    renderDepartments("homeDepartments");
    renderDepartments("allDepartments");
    renderReports("homeRecent", reports.slice().reverse().slice(0, 4));
    renderDashboard();
    renderNotifications();
    $("#issueDepartmentFilter").innerHTML = '<option value="all">All departments</option>' + departments.map((dept) => `<option value="${dept.id}">${escapeHtml(dept.name)}</option>`).join("");
    renderIssues();
  }

  document.addEventListener("click", async (event) => {
    const nav = event.target.closest("[data-page]");
    if (nav) { navigate(nav.dataset.page); if (nav.dataset.page === "profile") renderGovernmentProfile(); return; }
    const mapReportButton = event.target.closest("[data-gov-map-report]");
    if (mapReportButton) { const report = reports.find((item) => item.id === mapReportButton.dataset.govMapReport); if (report) renderGovernmentMapSelection(report); return; }
    const deptCard = event.target.closest("[data-department]");
    if (deptCard) { openDepartment(deptCard.dataset.department); return; }
    const deptLink = event.target.closest("[data-open-department]");
    if (deptLink) { openDepartment(deptLink.dataset.openDepartment); return; }
    const chip = event.target.closest("[data-status-chip]");
    if (chip) {
      activeStatus = chip.dataset.statusChip;
      $("#issueStatusFilter").value = activeStatus;
      renderIssues();
      return;
    }
    const action = event.target.closest("[data-action-report]");
    if (action) {
      if (!liveMode) { window.alert("Report actions are disabled until authorized live records are loaded."); return; }
      const report = reports.find((item) => item.id === action.dataset.actionReport);
      if (!report) return;
      const status = window.prompt("Official status (Reported, Verified, In Progress, Resolved):", report.status);
      if (status === null) return;
      const notes = window.prompt("Official progress note:", "");
      if (notes === null) return;
      const nextStatus = status.trim() || report.status;
      if (!supabaseClient || !report.publicId) { window.alert("This report cannot be updated because its official public ID is unavailable."); return; }
      const result = await supabaseClient.rpc("government_update_report_status", { p_public_id: report.publicId, p_new_status: nextStatus, p_note: notes.trim() || null });
      if (result.error) { window.alert("The update was not saved: " + result.error.message); return; }
      window.alert("Official status update saved.");
      await connectGovernmentWorkspace();
      if (selectedDepartment) renderDepartmentReports();
      return;
    }
    const save = event.target.closest("[data-save-status]");
    if (save) {
      if (!liveMode) { window.alert("Status updates are disabled until authorized live records are loaded."); return; }
      const id = save.dataset.saveStatus;
      const select = document.querySelector(`[data-status-select="${CSS.escape(id)}"]`);
      const report = reports.find((item) => item.id === id);
      if (!report || !select || !supabaseClient || !report.publicId) return;
      const result = await supabaseClient.rpc("government_update_report_status", { p_public_id: report.publicId, p_new_status: select.value, p_note: null });
      if (result.error) { window.alert("The update was not saved: " + result.error.message); return; }
      await connectGovernmentWorkspace();
      if (selectedDepartment) renderDepartmentReports();
    }
  });

  $("#departmentSearch").addEventListener("input", (event) => renderDepartments("allDepartments", event.target.value));
  ["issueSearch", "issueDepartmentFilter", "issueStatusFilter"].forEach((id) => $("#" + id).addEventListener(id === "issueSearch" ? "input" : "change", renderIssues));
  ["departmentReportSearch", "departmentStatusFilter"].forEach((id) => $("#" + id).addEventListener(id === "departmentReportSearch" ? "input" : "change", renderDepartmentReports));
  document.querySelector("#governmentSignInForm")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const message = document.querySelector("#governmentAuthMessage");
    const button = event.currentTarget.querySelector('button[type="submit"]');
    const config = window.CIVIC_SUPABASE_CONFIG;
    if (!window.supabase?.createClient || !config?.url || !config?.publishableKey) {
      if (message) message.textContent = "Authentication service is not configured.";
      return;
    }
    const client = supabaseClient || window.supabase.createClient(config.url, config.publishableKey);
    supabaseClient = client;
    button.disabled = true;
    if (message) message.textContent = "Signing in…";
    const { error } = await client.auth.signInWithPassword({
      email: document.querySelector("#governmentEmail").value.trim(),
      password: document.querySelector("#governmentPassword").value
    });
    button.disabled = false;
    if (error) {
      if (message) message.textContent = "Sign-in failed. Check the account details and government authorization.";
      return;
    }
    document.querySelector("#governmentPassword").value = "";
    if (message) message.textContent = "Signed in. Checking official role and department…";
    await connectGovernmentWorkspace();
    init();
    if (liveMode) {
      renderStats("homeStats"); renderStats("dashboardStats"); renderDepartments("homeDepartments"); renderDepartments("allDepartments");
      renderReports("homeRecent", reports.slice().reverse().slice(0, 4)); renderDashboard(); renderIssues();
      if (message) message.textContent = "Authenticated. Live department reports loaded.";
    } else if (message) {
      message.textContent = "Signed in, but this account is not authorized for the Government Portal or has no assigned department. Ask an administrator to review access.";
    }
  });

  document.querySelectorAll("[data-gov-pref]").forEach(function(input) { input.addEventListener("change", saveGovernmentProfilePreferences); });
  document.querySelector("#govProfileResetPassword")?.addEventListener("click", async () => {
    const message = document.querySelector("#govProfileSecurityMessage");
    const session = supabaseClient ? await supabaseClient.auth.getSession() : null;
    const email = session && session.data && session.data.session ? session.data.session.user.email : null;
    if (!email) { if (message) message.textContent = "Sign in with an authorized government account first."; return; }
    const result = await supabaseClient.auth.resetPasswordForEmail(email);
    if (message) message.textContent = result.error ? "Password reset could not be requested. Try again." : "If password reset is enabled, a secure reset email will arrive shortly.";
  });
  document.querySelector("#governmentSignOutProfile")?.addEventListener("click", async () => {
    if (supabaseClient) await supabaseClient.auth.signOut();
    window.location.reload();
  });
  document.querySelector("#governmentSignOut")?.addEventListener("click", async () => {
    if (supabaseClient) await supabaseClient.auth.signOut();
    liveMode = false; officialProfile = null; supabaseClient = null;
    window.location.reload();
  });

  connectGovernmentWorkspace().finally(() => {
    init();
    if (liveMode) { renderStats("homeStats"); renderStats("dashboardStats"); renderDepartments("homeDepartments"); renderDepartments("allDepartments"); renderReports("homeRecent", reports.slice().reverse().slice(0, 4)); renderDashboard(); renderIssues(); renderGovernmentProfile(); navigate("dashboard"); }
  });
})();