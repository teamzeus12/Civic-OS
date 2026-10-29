(() => {
  "use strict";

  // Development preview: report data is fetched only from Supabase after authorization.
  const departments = [
    { id: "pwd", name: "Public Works Department", short: "PWD", icon: "road", description: "Roads, bridges, drainage and public infrastructure.", categories: ["roads", "drainage", "infrastructure"] },
    { id: "mahud", name: "MAHUD", short: "MAHUD", icon: "building-2", description: "Municipal administration, urban services and sanitation.", categories: ["garbage", "sanitation", "urban services"] },
    { id: "electricity", name: "Electricity Department", short: "Electricity", icon: "zap", description: "Power supply, street lighting and electrical infrastructure.", categories: ["electricity", "streetlights"] },
    { id: "forest", name: "Forest Department", short: "Forest", icon: "trees", description: "Forests, trees, biodiversity and wildlife concerns.", categories: ["forest", "environment", "wildlife"] },
    { id: "education", name: "Education Department", short: "Education", icon: "graduation-cap", description: "Public schools, learning facilities and education resources.", categories: ["education", "school facilities"] },
    { id: "agriculture", name: "Agriculture Department", short: "Agriculture", icon: "sprout", description: "Agricultural support, irrigation and farming concerns.", categories: ["agriculture", "irrigation"] },
    { id: "transport", name: "Transport Department", short: "Transport", icon: "bus", description: "Traffic, public transport and transport infrastructure.", categories: ["transport", "traffic"] },
    { id: "health", name: "Health Department", short: "Health", icon: "heart-pulse", description: "Public health services and health facility concerns.", categories: ["health", "public health"] },
    { id: "water", name: "Water Resources", short: "Water", icon: "droplet", description: "Water supply, flooding, drainage and water resources.", categories: ["water", "flooding", "drainage"] },
    { id: "animal", name: "Animal Welfare", short: "Animal Welfare", icon: "heart-handshake", description: "Animal welfare and related community reports.", categories: ["animals", "animal welfare"] },
    { id: "sports", name: "Sports Department", short: "Sports", icon: "trophy", description: "Public sports facilities and community recreation spaces.", categories: ["sports", "recreation"] },
    { id: "other", name: "Other Civic Services", short: "Other", icon: "circle-help", description: "Reports that need review and routing by an authorized official.", categories: ["other"] }
  ];

  // Real records only; populated after authorized Supabase access.
  let reports = [];
  let officialNotices = [];
  let governmentNoticeLoadError = "";
  let noticeFilter = "all";
  let noticeSearchQuery = "";
  let editingNoticeId = null;

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

  const govIconPaths = {
    "road": '<path d="M8 3 5 21M16 3l3 18M12 5v3m0 4v3m0 4v2"/>',
    "building-2": '<path d="M4 21V5a2 2 0 0 1 2-2h8v18"/><path d="M14 9h4a2 2 0 0 1 2 2v10M8 7h2m-2 4h2m-2 4h2M2 21h20"/>',
    "zap": '<path d="m13 2-3 8h6l-5 12 2-9H7z"/>',
    "trees": '<path d="M12 21v-8"/><path d="M12 13C5 13 4 8 4 5c5 0 8 3 8 8ZM12 17c0-5 3-8 8-8 0 4-2 8-8 8Z"/>',
    "graduation-cap": '<path d="m2 9 10-5 10 5-10 5L2 9Z"/><path d="M6 11v5c4 3 8 3 12 0v-5M22 9v7"/>',
    "sprout": '<path d="M12 21v-9"/><path d="M12 12C5 12 4 7 4 4c5 0 8 3 8 8ZM12 16c0-5 3-8 8-8 0 4-2 8-8 8Z"/>',
    "bus": '<rect x="4" y="3" width="16" height="15" rx="3"/><path d="M4 11h16M8 18l-2 3m10-3 2 3M8 7h.01M16 7h.01"/>',
    "heart-pulse": '<path d="M20.8 8.8c0 4.3-8.8 10-8.8 10S3.2 13.1 3.2 8.8A4.2 4.2 0 0 1 12 7.4a4.2 4.2 0 0 1 8.8 1.4Z"/><path d="M4 12h4l2-3 3 6 2-3h5"/>',
    "droplet": '<path d="M12 3s7 7.2 7 12a7 7 0 0 1-14 0c0-4.8 7-12 7-12Z"/><path d="M9 16a3 3 0 0 0 3 3"/>',
    "heart-handshake": '<path d="M20.8 8.8c0 4.3-8.8 10-8.8 10S3.2 13.1 3.2 8.8A4.2 4.2 0 0 1 12 7.4a4.2 4.2 0 0 1 8.8 1.4Z"/><path d="m8 12 2-1 2 2 2-2 2 1"/>',
    "trophy": '<path d="M8 21h8M12 17v4M7 4h10v6a5 5 0 0 1-10 0V4Z"/><path d="M7 6H4v3a4 4 0 0 0 4 4M17 6h3v3a4 4 0 0 1-4 4"/>',
    "circle-help": '<circle cx="12" cy="12" r="9"/><path d="M9.6 9a2.5 2.5 0 1 1 4.3 1.7c-1.2 1.1-1.9 1.5-1.9 3M12 17h.01"/>',
    "clipboard-list": '<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4.5h6V7H9zM9 11h6M9 15h6"/>',
    "clock": '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    "refresh-cw": '<path d="M20 7v5h-5M4 17v-5h5"/><path d="M5.5 9a7 7 0 0 1 12-2L20 12M4 12l2.5 5a7 7 0 0 0 12-2"/>',
    "check-circle": '<circle cx="12" cy="12" r="9"/><path d="m8 12 2.5 2.5L16 9"/>',
    "image-off": '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="m3 16 5-5 4 4 2-2 7 6M3 3l18 18"/>',
    "map-pin": '<path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/>',
    "arrow-right": '<path d="M5 12h14M12 5l7 7-7 7"/>',
    "arrow-left": '<path d="M19 12H5M12 5l-7 7 7 7"/>',
    "arrow-up-right": '<path d="M7 17 17 7M7 7h10v10"/>',
    "plus": '<path d="M12 5v14M5 12h14"/>',
    "shield-check": '<path d="M12 3 19 6v5c0 4.5-2.9 7.8-7 10-4.1-2.2-7-5.5-7-10V6l7-3Z"/><path d="m9 12 2 2 4-4"/>',
    "info": '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
    "megaphone": '<path d="M4 11V7l13-3v16L4 17v-6Z"/><path d="M4 11h13M7 18l2 3h3l-2-4"/>',
    "calendar": '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/>',
    "file-text": '<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v5h5M9 12h6M9 16h6"/>',
    "users": '<circle cx="9" cy="8" r="3"/><path d="M3 20v-1a6 6 0 0 1 12 0v1M16 5.5a3 3 0 0 1 0 5.8M18 14a5 5 0 0 1 3 4.6v1"/>',
    "bell": '<path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/>',
    "chart": '<path d="M4 20V4M4 20h17"/><path d="M8 16v-4M12 16V8M16 16v-7"/>'
  };
  function govIcon(name) {
    return '<svg class="gov-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (govIconPaths[name] || govIconPaths["circle-help"]) + '</svg>';
  }

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
    return query ? "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(query) : "";
  }

  function navigate(page) {
    $$(".page").forEach((section) => section.classList.toggle("active", section.dataset.pageView === page));
    $$(".nav-btn[data-page]").forEach((button) => button.classList.toggle("active", button.dataset.page === page));
    window.scrollTo({ top: 0, behavior: "smooth" });
    if (page === "dashboard" && governmentMap) requestAnimationFrame(() => governmentMap && governmentMap.invalidateSize());
  }

  function statsMarkup(items) {
    return items.map((item) => `<article class="stat-card"><div class="stat-top"><span>${escapeHtml(item.label)}</span><span class="stat-icon">${govIcon(item.icon)}</span></div><strong>${item.value}</strong><small>${escapeHtml(item.note)}</small></article>`).join("");
  }

  function departmentCard(dept) {
    const count = countDepartment(dept.id);
    return `<button type="button" class="department-card" data-department="${dept.id}"><span class="dept-icon">${govIcon(dept.icon)}</span><strong>${escapeHtml(dept.name)}</strong><small>${escapeHtml(dept.description)}</small><span class="card-arrow">${govIcon("arrow-up-right")}</span><span class="pill">${count} ${count === 1 ? "report" : "reports"}</span></button>`;
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
      : `<span class="gov-report-photo-placeholder">${govIcon("image-off")}<span>No photo</span></span>`;
    return `<article class="report-card"><div class="gov-report-copy"><span class="report-id">${escapeHtml(report.id)} · ${escapeHtml(report.category)}</span><h3>${escapeHtml(report.title)}</h3><p>${escapeHtml(report.description)}</p><div class="report-meta"><span class="pill">${escapeHtml(dept?.short || "Other")}</span><span class="pill">${govIcon("map-pin")}${escapeHtml(report.location || "Location not provided")}</span><span class="pill status ${statusClass(report.status)}">${escapeHtml(report.status)}</span></div><div class="report-actions">${statusControl || `<button class="btn" data-open-department="${report.department}" type="button">${govIcon("arrow-right")}Department</button>`}<button class="btn btn-primary" data-action-report="${escapeHtml(report.id)}" type="button">Action &amp; Resolution</button></div></div><div class="gov-report-media" aria-label="${photos.length ? photos.length + " submitted photo(s)" : "No photo submitted"}">${photoMarkup}</div></article>`;
  }

  function renderStats(targetId) {
    const target = $("#" + targetId);
    if (!target) return;
    target.innerHTML = statsMarkup([
      { label: "Total reports", value: reports.length, note: liveMode ? "Live database records" : "Waiting for authorized sign-in", icon: "clipboard-list" },
      { label: "Awaiting review", value: countStatus("Reported"), note: "Reported status", icon: "clock" },
      { label: "In progress", value: countStatus("In Progress"), note: "Work underway", icon: "refresh-cw" },
      { label: "Resolved", value: countStatus("Resolved"), note: "Marked resolved", icon: "check-circle" }
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
    $("#departmentHeroIcon").innerHTML = govIcon(dept.icon);
    $("#departmentHeroTitle").textContent = dept.name;
    $("#departmentHeroDescription").textContent = dept.description;
    const list = reports.filter((report) => report.department === id);
    $("#departmentStats").innerHTML = statsMarkup([
      { label: "Department reports", value: list.length, note: "Database records", icon: "clipboard-list" },
      { label: "Reported", value: list.filter((r) => r.status === "Reported").length, note: "Awaiting review", icon: "clock" },
      { label: "In progress", value: list.filter((r) => r.status === "In Progress").length, note: "Currently active", icon: "refresh-cw" },
      { label: "Resolved", value: list.filter((r) => r.status === "Resolved").length, note: "Completed reports", icon: "check-circle" }
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
    const locationUrl = getReportLocationUrl(report);
    panel.innerHTML = `<div class="map-report-top"><span>${escapeHtml(report.publicId || report.id)}</span><span>${escapeHtml(report.status)}</span></div>
      <h3>${escapeHtml(report.title)}</h3>
      <div class="map-report-meta"><span class="pill">${escapeHtml(dept?.short || report.department || "Other")}</span><span class="pill">${escapeHtml(report.category || "General")}</span></div>
      <p>${escapeHtml(report.description || "No description supplied.")}</p>
      <div class="map-location"><strong>Location</strong><br>${escapeHtml(report.location || "Location not provided")}<br><span>${coords ? "Coordinates: " + coords.latitude.toFixed(5) + ", " + coords.longitude.toFixed(5) : "No usable coordinates recorded"}</span></div>
      ${locationUrl ? `<a class="map-open-link" href="${escapeHtml(locationUrl)}" target="_blank" rel="noopener noreferrer">Open location ${govIcon("arrow-up-right")}</a>` : `<span class="map-open-link is-disabled" aria-disabled="true">Location unavailable</span>`}`;
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

    const statusColors = { "Reported": "#B45309", "Verified": "#1D4ED8", "In Progress": "#6D28D9", "Resolved": "#047857" };
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

  function noticeDepartmentLabel(id) {
    return departments.find((dept) => dept.id === id)?.name || String(id || "Government department").replace(/_/g, " ").toUpperCase();
  }

  function formatNoticeDate(value) {
    if (!value) return "";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "" : date.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
  }

  function noticeStatusBadge(status) {
    const label = status === "published" ? "PUBLISHED" : status === "withdrawn" ? "WITHDRAWN" : status === "archived" ? "ARCHIVED" : "DRAFT";
    return `<span class="notice-status-badge" data-status="${escapeHtml(status)}">${label}</span>`;
  }

  function renderNotifications() {
    const target = $("#notificationList");
    if (!target) return;
    if (!liveMode || !officialProfile) {
      target.innerHTML = '<div class="empty-state">Sign in with an authorized government account to view or publish official notices. Citizen accounts cannot publish government announcements.</div>';
      return;
    }
    if (governmentNoticeLoadError) {
      target.innerHTML = '<div class="empty-state">Notices could not be loaded. Check that the civic_notices database migration is installed and that your account has department permissions.</div>';
      return;
    }
    const q = noticeSearchQuery.trim().toLowerCase();
    const list = officialNotices.filter((notice) => {
      const matchesStatus = noticeFilter === "all" || notice.status === noticeFilter;
      const haystack = [notice.title, notice.reference_number, notice.notice_type, notice.issuing_department, notice.summary, notice.body, notice.district, notice.locality].join(" ").toLowerCase();
      return matchesStatus && (!q || haystack.includes(q));
    });
    if (!list.length) {
      target.innerHTML = `<div class="empty-state">${officialNotices.length ? "No notices match these filters." : "No notices have been created in your authorized scope yet. Use Create notice to draft the first official announcement."}</div>`;
      return;
    }
    target.innerHTML = list.map((notice) => {
      const area = [notice.district, notice.locality].filter(Boolean).join(" · ");
      const dates = [
        notice.issued_at ? "Issued " + formatNoticeDate(notice.issued_at) : "",
        notice.effective_at ? "Effective " + formatNoticeDate(notice.effective_at) : "",
        notice.expires_at ? "Valid until " + formatNoticeDate(notice.expires_at) : ""
      ].filter(Boolean);
      const actions = [
        `<button type="button" class="btn" data-notice-edit="${escapeHtml(notice.id)}">Edit</button>`,
        notice.status === "draft" || notice.status === "archived" || notice.status === "withdrawn"
          ? `<button type="button" class="btn btn-primary" data-notice-status="${escapeHtml(notice.id)}" data-next-status="published">${notice.status === "archived" ? "Republish" : notice.status === "withdrawn" ? "Republish withdrawn notice" : "Publish"}</button>`
          : `<button type="button" class="btn" data-notice-status="${escapeHtml(notice.id)}" data-next-status="withdrawn">Withdraw</button>`,
        notice.status === "draft" ? `<button type="button" class="btn" data-notice-status="${escapeHtml(notice.id)}" data-next-status="archived">Discard / archive</button>` : notice.status === "withdrawn" ? `<button type="button" class="btn" data-notice-status="${escapeHtml(notice.id)}" data-next-status="archived">Archive</button>` : ""
      ].join("");
      return `<article class="government-notice-card ${notice.is_pinned ? "is-pinned" : ""}">
        <div class="government-notice-card-head"><div class="government-notice-card-copy">
          <div class="government-notice-kicker"><span>${escapeHtml(notice.notice_type)}</span>${notice.reference_number ? `<span>· ${escapeHtml(notice.reference_number)}</span>` : ""}${notice.is_pinned ? "<span>· PINNED</span>" : ""}</div>
          <h3>${escapeHtml(notice.title)}</h3>
          <p class="government-notice-summary">${escapeHtml(notice.summary || notice.body.slice(0, 240) + (notice.body.length > 240 ? "…" : ""))}</p>
        </div>${noticeStatusBadge(notice.status)}</div>
        <div class="government-notice-meta"><span>${escapeHtml(noticeDepartmentLabel(notice.issuing_department))}</span>${area ? `<span>${escapeHtml(area)}</span>` : ""}${dates.map((date) => `<span>${escapeHtml(date)}</span>`).join("")}</div>
        <div class="government-notice-actions">${actions}</div>
      </article>`;
    }).join("");
  }

  function setNoticeFormMessage(message, kind = "") {
    const target = $("#noticeFormMessage");
    if (!target) return;
    target.textContent = message || "";
    if (kind) target.dataset.kind = kind;
    else delete target.dataset.kind;
  }

  function populateNoticeDepartmentOptions() {
    const select = $("#noticeDepartment");
    if (!select) return;
    const currentDepartment = officialProfile?.department_id || "";
    const list = departments.map((dept) => ({ value: dept.id, label: dept.name }));
    if (currentDepartment && !list.some((dept) => dept.value === currentDepartment)) {
      list.push({ value: currentDepartment, label: noticeDepartmentLabel(currentDepartment) });
    }
    select.innerHTML = list.map((dept) => `<option value="${escapeHtml(dept.value)}">${escapeHtml(dept.label)}</option>`).join("");
    if (officialProfile?.role === "admin") {
      select.disabled = false;
      if (!select.value && list.length) select.value = list[0].value;
    } else if (currentDepartment) {
      select.value = currentDepartment;
      select.disabled = true;
    } else {
      select.disabled = true;
    }
  }

  function dateInputValue(value) {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    const pad = (part) => String(part).padStart(2, "0");
    return date.getFullYear() + "-" + pad(date.getMonth() + 1) + "-" + pad(date.getDate()) + "T" + pad(date.getHours()) + ":" + pad(date.getMinutes());
  }

  function dateInputToIso(value) {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }

  function formatNoticeDateTime(value) {
    if (!value) return "";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "" : date.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
  }

  function resetNoticeForm() {
    const form = $("#governmentNoticeForm");
    if (!form) return;
    form.reset();
    editingNoticeId = null;
    $("#noticeId").value = "";
    $("#noticeFormHeading").textContent = "Create official notice";
    const issued = $("#noticeIssuedAt");
    if (issued) issued.value = dateInputValue(new Date().toISOString());
    populateNoticeDepartmentOptions();
    setNoticeFormMessage("");
  }

  function openNoticeForm(notice = null) {
    if (!liveMode || !officialProfile) {
      setNoticeFormMessage("Sign in with an authorized government account before creating a notice.", "error");
      return;
    }
    const panel = $("#noticeFormPanel");
    if (!panel) return;
    resetNoticeForm();
    if (notice) {
      editingNoticeId = notice.id;
      $("#noticeId").value = notice.id;
      $("#noticeTitle").value = notice.title || "";
      $("#noticeReference").value = notice.reference_number || "";
      $("#noticeType").value = notice.notice_type || "Public Notice";
      $("#noticeDepartment").value = notice.issuing_department || officialProfile.department_id || "";
      $("#noticeOfficer").value = notice.issuing_officer || "";
      $("#noticeSummary").value = notice.summary || "";
      $("#noticeBody").value = notice.body || "";
      $("#noticeAudience").value = notice.audience_type || "All citizens";
      $("#noticeAudienceDetails").value = notice.audience_details || "";
      $("#noticeDistrict").value = notice.district || "";
      $("#noticeLocality").value = notice.locality || "";
      $("#noticeIssuedAt").value = dateInputValue(notice.issued_at);
      $("#noticeEffectiveAt").value = dateInputValue(notice.effective_at);
      $("#noticeExpiresAt").value = dateInputValue(notice.expires_at);
      $("#noticeContactOffice").value = notice.contact_office || "";
      $("#noticeContactPhone").value = notice.contact_phone || "";
      $("#noticeContactEmail").value = notice.contact_email || "";
      $("#noticeAttachmentLabel").value = notice.attachment_label || "";
      $("#noticeAttachmentUrl").value = notice.attachment_url || "";
      $("#noticePinned").checked = Boolean(notice.is_pinned);
      $("#noticeFormHeading").textContent = notice.status === "published" ? "Edit published notice" : "Edit official notice";
    }
    panel.hidden = false;
    $("#toggleNoticeForm").textContent = notice ? "Editing notice" : "Create notice";
    panel.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function loadGovernmentNotices() {
    if (!supabaseClient || !liveMode || !officialProfile) {
      officialNotices = [];
      governmentNoticeLoadError = "";
      renderNotifications();
      return;
    }
    const { data, error } = await supabaseClient
      .from("civic_notices")
      .select("*")
      .order("is_pinned", { ascending: false })
      .order("updated_at", { ascending: false });
    if (error) {
      console.error("Government notices could not be loaded:", error);
      officialNotices = [];
      governmentNoticeLoadError = error.message || "Notice feed unavailable";
      renderNotifications();
      return;
    }
    governmentNoticeLoadError = "";
    const scopedRows = data || [];
    officialNotices = officialProfile.role === "admin"
      ? scopedRows
      : scopedRows.filter((notice) => notice.issuing_department === officialProfile.department_id || notice.created_by === officialProfile.id);
    renderNotifications();
  }

  async function updateNoticeStatus(noticeId, nextStatus) {
    if (!liveMode || !supabaseClient || !officialProfile) return;
    const notice = officialNotices.find((item) => item.id === noticeId);
    if (!notice) return;
    const actionLabel = nextStatus === "published" ? "publish" : nextStatus === "withdrawn" ? "withdraw" : "archive";
    if (!window.confirm(`Are you sure you want to ${actionLabel} “${notice.title}”?`)) return;
    const { data: userData, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !userData?.user) {
      setNoticeFormMessage("Your session could not be verified. Sign in again.", "error");
      return;
    }
    const patch = {
      status: nextStatus,
      updated_by: userData.user.id
    };
    if (nextStatus === "published") patch.published_at = notice.published_at || new Date().toISOString();
    const { error } = await supabaseClient.from("civic_notices").update(patch).eq("id", noticeId);
    if (error) {
      console.error("Notice status update failed:", error);
      window.alert("The notice was not updated. Check your authorization and try again.");
      return;
    }
    await loadGovernmentNotices();
  }

  async function submitGovernmentNotice(event) {
    event.preventDefault();
    if (!liveMode || !supabaseClient || !officialProfile) {
      setNoticeFormMessage("Only an authorized government account can save or publish notices.", "error");
      return;
    }
    const form = event.currentTarget;
    const action = event.submitter?.dataset.noticeAction || "draft";
    const noticeId = $("#noticeId").value || editingNoticeId;
    const existing = noticeId ? officialNotices.find((item) => item.id === noticeId) : null;
    const body = $("#noticeBody").value.trim();
    const effectiveDate = $("#noticeEffectiveAt").value;
    const expiryDate = $("#noticeExpiresAt").value;
    if (effectiveDate && expiryDate && expiryDate < effectiveDate) {
      setNoticeFormMessage("Expiry date must be on or after the effective date.", "error");
      return;
    }
    const attachmentUrl = $("#noticeAttachmentUrl").value.trim();
    if (attachmentUrl && !/^https?:\/\//i.test(attachmentUrl)) {
      setNoticeFormMessage("The attachment must use a valid http:// or https:// URL.", "error");
      return;
    }
    const { data: userData, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !userData?.user) {
      setNoticeFormMessage("Your session could not be verified. Please sign in again.", "error");
      return;
    }
    const userId = userData.user.id;
    const nextStatus = action === "publish" ? "published" : (existing?.status || "draft");
    const payload = {
      title: $("#noticeTitle").value.trim(),
      reference_number: $("#noticeReference").value.trim() || null,
      notice_type: $("#noticeType").value,
      issuing_department: $("#noticeDepartment").value || officialProfile.department_id,
      issuing_officer: $("#noticeOfficer").value.trim() || null,
      summary: $("#noticeSummary").value.trim() || null,
      body,
      audience_type: $("#noticeAudience").value,
      audience_details: $("#noticeAudienceDetails").value.trim() || null,
      district: $("#noticeDistrict").value.trim() || null,
      locality: $("#noticeLocality").value.trim() || null,
      issued_at: dateInputToIso($("#noticeIssuedAt").value) || new Date().toISOString(),
      effective_at: dateInputToIso(effectiveDate),
      expires_at: dateInputToIso(expiryDate),
      contact_office: $("#noticeContactOffice").value.trim() || null,
      contact_phone: $("#noticeContactPhone").value.trim() || null,
      contact_email: $("#noticeContactEmail").value.trim() || null,
      attachment_label: $("#noticeAttachmentLabel").value.trim() || null,
      attachment_url: attachmentUrl || null,
      is_pinned: $("#noticePinned").checked,
      status: nextStatus,
      published_at: nextStatus === "published" ? (existing?.published_at || new Date().toISOString()) : null,
      updated_by: userId
    };
    if (!existing) payload.created_by = userId;
    const submitButtons = form.querySelectorAll('button[type="submit"]');
    submitButtons.forEach((button) => { button.disabled = true; });
    setNoticeFormMessage(action === "publish" ? "Publishing official notice…" : "Saving notice…");
    try {
      const result = existing
        ? await supabaseClient.from("civic_notices").update(payload).eq("id", existing.id).select("id").maybeSingle()
        : await supabaseClient.from("civic_notices").insert(payload).select("id").maybeSingle();
      if (result.error || !result.data?.id) throw result.error || new Error("No notice was saved. Confirm that your account can manage this department.");
      await loadGovernmentNotices();
      setNoticeFormMessage(action === "publish" ? "Notice published. It is now available in the People’s Portal notice page." : (existing ? "Notice changes saved." : "Draft saved. It is not visible to citizens until published."), "success");
      $("#noticeId").value = existing?.id || result.data.id;
      editingNoticeId = existing?.id || result.data.id;
      $("#noticeFormHeading").textContent = nextStatus === "published" ? "Edit published notice" : "Edit official notice";
      $("#noticeFormPanel").hidden = false;
    } catch (error) {
      console.error("Could not save government notice:", error);
      setNoticeFormMessage(error?.message || "The notice could not be saved. Check required fields and department access.", "error");
    } finally {
      submitButtons.forEach((button) => { button.disabled = false; });
    }
  }

  function bindNoticeEvents() {
    const toggle = $("#toggleNoticeForm");
    if (toggle && toggle.dataset.bound !== "true") {
      toggle.dataset.bound = "true";
      toggle.addEventListener("click", () => {
        const panel = $("#noticeFormPanel");
        if (!liveMode) {
          setNoticeFormMessage("Sign in with an authorized government account before creating a notice.", "error");
          navigate("profile");
          return;
        }
        if (!panel.hidden) {
          panel.hidden = true;
          resetNoticeForm();
          toggle.innerHTML = govIcon("plus") + "Create notice";
        } else openNoticeForm();
      });
    }
    $("#cancelNoticeForm")?.addEventListener("click", () => {
      $("#noticeFormPanel").hidden = true;
      resetNoticeForm();
      if (toggle) toggle.innerHTML = govIcon("plus") + "Create notice";
    });
    const previewButton = $("#previewNoticeButton");
    if (previewButton && previewButton.dataset.bound !== "true") {
      previewButton.dataset.bound = "true";
      previewButton.addEventListener("click", () => {
        const title = $("#noticeTitle").value.trim();
        const body = $("#noticeBody").value.trim();
        if (title.length < 5 || body.length < 20) {
          setNoticeFormMessage("Enter a title and full notice text before previewing.", "error");
          return;
        }
        $("#noticePreviewTitle").textContent = title;
        $("#noticePreviewMeta").textContent = [$("#noticeType").value, $("#noticeDepartment").selectedOptions[0]?.textContent || $("#noticeDepartment").value, $("#noticeReference").value.trim() ? "Ref: " + $("#noticeReference").value.trim() : ""].filter(Boolean).join(" · ");
        $("#noticePreviewSummary").textContent = $("#noticeSummary").value.trim();
        $("#noticePreviewBody").textContent = body;
        $("#noticePreviewDates").textContent = [$("#noticeIssuedAt").value ? "Issued " + formatNoticeDateTime(dateInputToIso($("#noticeIssuedAt").value)) : "", $("#noticeEffectiveAt").value ? "Effective " + formatNoticeDateTime(dateInputToIso($("#noticeEffectiveAt").value)) : "", $("#noticeExpiresAt").value ? "Valid until " + formatNoticeDateTime(dateInputToIso($("#noticeExpiresAt").value)) : ""].filter(Boolean).join(" · ");
        $("#noticePreviewPanel").hidden = false;
        setNoticeFormMessage("Preview only — this notice has not been published.");
        $("#noticePreviewPanel").scrollIntoView({ behavior: "smooth", block: "nearest" });
      });
    }
    const form = $("#governmentNoticeForm");
    if (form && form.dataset.bound !== "true") {
      form.dataset.bound = "true";
      form.addEventListener("submit", submitGovernmentNotice);
    }
    $("#noticeSearch")?.addEventListener("input", (event) => {
      noticeSearchQuery = event.target.value || "";
      renderNotifications();
    });
    $("#noticeStatusFilter")?.addEventListener("change", (event) => {
      noticeFilter = event.target.value || "all";
      renderNotifications();
    });
    const target = $("#notificationList");
    if (target && target.dataset.bound !== "true") {
      target.dataset.bound = "true";
      target.addEventListener("click", (event) => {
        const edit = event.target.closest("[data-notice-edit]");
        if (edit) {
          const notice = officialNotices.find((item) => item.id === edit.dataset.noticeEdit);
          if (notice) openNoticeForm(notice);
          return;
        }
        const statusButton = event.target.closest("[data-notice-status]");
        if (statusButton) updateNoticeStatus(statusButton.dataset.noticeStatus, statusButton.dataset.nextStatus);
      });
    }
  }


  const govPrefsKey = "civicOS.governmentProfilePreferences.v1";
  function applyGovernmentTheme(theme = "system") {
    const mode = ["system","light","dark"].includes(theme) ? theme : "system";
    const effective = mode === "system" ? (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light") : mode;
    document.body.dataset.civicTheme = effective;
    const selector = document.querySelector("#govThemePreference");
    if (selector) selector.value = mode;
  }
  function loadGovernmentProfilePreferences() {
    let saved = {};
    try { saved = JSON.parse(localStorage.getItem(govPrefsKey) || "{}"); } catch (error) {}
    document.querySelectorAll("[data-gov-pref]").forEach(function(input) {
      if (Object.prototype.hasOwnProperty.call(saved, input.dataset.govPref)) input.checked = Boolean(saved[input.dataset.govPref]);
    });
    applyGovernmentTheme(saved.theme || "system");
  }
  function saveGovernmentProfilePreferences() {
    let saved = {};
    try { saved = JSON.parse(localStorage.getItem(govPrefsKey) || "{}"); } catch (error) {}
    document.querySelectorAll("[data-gov-pref]").forEach(function(input) { saved[input.dataset.govPref] = input.checked; });
    const selector = document.querySelector("#govThemePreference");
    saved.theme = selector ? selector.value : (saved.theme || "system");
    try { localStorage.setItem(govPrefsKey, JSON.stringify(saved)); } catch (error) {}
    applyGovernmentTheme(saved.theme);
    const message = document.querySelector("#govProfilePrefMessage");
    if (message) message.textContent = "Preferences saved on this device.";
  }
  async function renderGovernmentProfile() {
    loadGovernmentProfilePreferences();
    const badge = document.querySelector("#govProfileAccessBadge");
    const signInCard = document.querySelector("#govProfileSignInCard");
    const metrics = document.querySelector(".gov-profile-metrics");
    if (metrics) metrics.hidden = true;
    if (!supabaseClient) { if (badge) badge.textContent = "Sign-in required"; if (signInCard) signInCard.hidden = false; return; }
    const sessionResult = await supabaseClient.auth.getSession();
    const user = sessionResult.data && sessionResult.data.session ? sessionResult.data.session.user : null;
    if (!user || !liveMode || !officialProfile) { if (badge) badge.textContent = "Access not verified"; if (signInCard) signInCard.hidden = false; return; }
    if (signInCard) signInCard.hidden = true;
    if (metrics) metrics.hidden = false;
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

  async function connectGovernmentWorkspace(options = {}) {
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
    populateNoticeDepartmentOptions();
    await loadGovernmentNotices();
    const pill = document.querySelector(".demo-pill"); if (pill) pill.textContent = "LIVE · AUTHENTICATED";
    renderStats("homeStats"); renderStats("dashboardStats"); renderDepartments("homeDepartments"); renderDepartments("allDepartments", $("#departmentSearch")?.value || ""); renderReports("homeRecent", reports.slice(0, 4)); renderDashboard(); renderIssues(); renderNotifications(); renderGovernmentProfile();
    if (selectedDepartment) renderDepartmentReports();
    if (options.navigateToDashboard !== false) navigate("dashboard");
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
  document.querySelector("#govThemePreference")?.addEventListener("change", saveGovernmentProfilePreferences);
  const govSystemThemeQuery = window.matchMedia ? window.matchMedia("(prefers-color-scheme: dark)") : null;
  if (govSystemThemeQuery) govSystemThemeQuery.addEventListener("change", function() { try { const prefs = JSON.parse(localStorage.getItem(govPrefsKey) || "{}"); if (!prefs.theme || prefs.theme === "system") applyGovernmentTheme("system"); } catch (error) { applyGovernmentTheme("system"); } });
  loadGovernmentProfilePreferences();
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

  let governmentRefreshLastAt = Date.now();
  let governmentRefreshInFlight = false;
  async function refreshGovernmentReportsOnReturn() {
    if (
      document.visibilityState !== "visible" ||
      !liveMode ||
      governmentRefreshInFlight ||
      Date.now() - governmentRefreshLastAt < 30000
    ) return;
    governmentRefreshInFlight = true;
    governmentRefreshLastAt = Date.now();
    try {
      await connectGovernmentWorkspace({ navigateToDashboard: false });
    } finally {
      governmentRefreshInFlight = false;
    }
  }
  document.addEventListener("visibilitychange", refreshGovernmentReportsOnReturn);
  window.addEventListener("focus", refreshGovernmentReportsOnReturn);
  bindNoticeEvents();

  connectGovernmentWorkspace().finally(() => {
    init();
    if (liveMode) { renderStats("homeStats"); renderStats("dashboardStats"); renderDepartments("homeDepartments"); renderDepartments("allDepartments"); renderReports("homeRecent", reports.slice().reverse().slice(0, 4)); renderDashboard(); renderIssues(); renderGovernmentProfile(); navigate("dashboard"); }
  });
})();