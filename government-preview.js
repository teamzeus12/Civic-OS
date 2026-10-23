(() => {
  "use strict";

  // DEVELOPMENT ONLY: fictional data; this script never calls Supabase or production APIs.
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

  const reports = [
    { id: "DEMO-001", title: "Large pothole near market", category: "Roads", department: "pwd", location: "Imphal West", description: "Sample road surface damage reported near a busy market.", status: "Reported", updated: "Just now" },
    { id: "DEMO-002", title: "Waste collection missed", category: "Sanitation", department: "mahud", location: "Imphal East", description: "Sample report about missed waste collection in a residential area.", status: "Verified", updated: "Today" },
    { id: "DEMO-003", title: "Streetlight not working", category: "Electricity", department: "electricity", location: "Thoubal", description: "Sample report about a streetlight that is no longer operating.", status: "In Progress", updated: "Today" },
    { id: "DEMO-004", title: "School water supply issue", category: "Education", department: "education", location: "Bishnupur", description: "Sample report about water access at a public school.", status: "Resolved", updated: "Yesterday" },
    { id: "DEMO-005", title: "Tree damage beside public road", category: "Forest", department: "forest", location: "Kakching", description: "Sample report asking the relevant team to inspect damaged trees.", status: "Reported", updated: "Today" },
    { id: "DEMO-006", title: "Irrigation channel blockage", category: "Agriculture", department: "agriculture", location: "Thoubal district", description: "Sample report about a blocked channel affecting nearby fields.", status: "Verified", updated: "Yesterday" },
    { id: "DEMO-007", title: "Traffic signal malfunction", category: "Transport", department: "transport", location: "Imphal West", description: "Sample report about a traffic signal that needs inspection.", status: "In Progress", updated: "Today" },
    { id: "DEMO-008", title: "Drain overflow after rain", category: "Water Resources", department: "water", location: "Imphal East", description: "Sample report about drainage overflow after rainfall.", status: "Reported", updated: "Today" },
    { id: "DEMO-009", title: "Community sports ground needs repair", category: "Sports", department: "sports", location: "Bishnupur", description: "Sample report about damaged equipment at a public sports ground.", status: "Verified", updated: "Yesterday" },
    { id: "DEMO-010", title: "Stray animal assistance request", category: "Animal Welfare", department: "animal", location: "Imphal East", description: "Sample request for help with an animal welfare concern.", status: "Reported", updated: "Today" }
  ];

  const statusOptions = ["Reported", "Verified", "In Progress", "Resolved"];
  let selectedDepartment = null;
  let activeStatus = "all";
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]);
  const deptById = (id) => departments.find((dept) => dept.id === id);
  const countStatus = (status) => reports.filter((report) => report.status === status).length;
  const countDepartment = (id) => reports.filter((report) => report.department === id).length;

  function navigate(page) {
    $$(".page").forEach((section) => section.classList.toggle("active", section.dataset.pageView === page));
    $$(".nav-btn[data-page]").forEach((button) => button.classList.toggle("active", button.dataset.page === page));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function statsMarkup(items) {
    return items.map((item) => `<article class="stat-card"><div class="stat-top"><span>${escapeHtml(item.label)}</span><span class="stat-icon">${item.icon}</span></div><strong>${item.value}</strong><small>${escapeHtml(item.note)}</small></article>`).join("");
  }

  function departmentCard(dept) {
    const count = countDepartment(dept.id);
    return `<button type="button" class="department-card" data-department="${dept.id}"><span class="dept-icon">${dept.icon}</span><strong>${escapeHtml(dept.name)}</strong><small>${escapeHtml(dept.description)}</small><span class="card-arrow">↗</span><span class="pill">${count} sample ${count === 1 ? "report" : "reports"}</span></button>`;
  }

  function statusClass(status) {
    return ({ "Reported": "status-reported", "Verified": "status-verified", "In Progress": "status-progress", "Resolved": "status-resolved" })[status] || "";
  }

  function reportCard(report, allowStatusControl = false) {
    const dept = deptById(report.department);
    const statusControl = allowStatusControl ? `<select aria-label="Demo status for ${escapeHtml(report.id)}" data-status-select="${escapeHtml(report.id)}">${statusOptions.map((status) => `<option ${status === report.status ? "selected" : ""}>${status}</option>`).join("")}</select><button class="btn btn-primary" data-save-status="${escapeHtml(report.id)}" type="button">Save demo status</button>` : "";
    return `<article class="report-card"><div><span class="report-id">${escapeHtml(report.id)} · ${escapeHtml(report.category)}</span><h3>${escapeHtml(report.title)}</h3><p>${escapeHtml(report.description)}</p><div class="report-meta"><span class="pill">${escapeHtml(dept?.short || "Other")}</span><span class="pill">⌖ ${escapeHtml(report.location)}</span><span class="pill status ${statusClass(report.status)}">${escapeHtml(report.status)}</span></div></div><div class="report-actions">${statusControl || `<button class="btn" data-open-department="${report.department}" type="button">Department →</button>`}<button class="btn btn-primary" data-action-report="${escapeHtml(report.id)}" type="button">Action &amp; Resolution</button></div></article>`;
  }

  function renderStats(targetId) {
    const target = $("#" + targetId);
    if (!target) return;
    target.innerHTML = statsMarkup([
      { label: "Total sample reports", value: reports.length, note: "Fictional test records", icon: "▤" },
      { label: "Awaiting review", value: countStatus("Reported"), note: "Reported status", icon: "◷" },
      { label: "In progress", value: countStatus("In Progress"), note: "Work underway in sample", icon: "↻" },
      { label: "Resolved", value: countStatus("Resolved"), note: "Marked resolved in sample", icon: "✓" }
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
    target.innerHTML = list.length ? list.map((report) => reportCard(report, controls)).join("") : '<div class="empty-state">No sample reports match these filters.</div>';
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
      { label: "Department reports", value: list.length, note: "Fictional records", icon: "▤" },
      { label: "Reported", value: list.filter((r) => r.status === "Reported").length, note: "Awaiting review", icon: "◷" },
      { label: "In progress", value: list.filter((r) => r.status === "In Progress").length, note: "Currently active", icon: "↻" },
      { label: "Resolved", value: list.filter((r) => r.status === "Resolved").length, note: "Completed in sample", icon: "✓" }
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
    renderReports("departmentReports", list, true);
  }

  function renderIssues() {
    const q = ($("#issueSearch")?.value || "").trim().toLowerCase();
    const dept = $("#issueDepartmentFilter")?.value || "all";
    const status = $("#issueStatusFilter")?.value || "all";
    const list = reports.filter((report) => dept === "all" || report.department === dept)
      .filter((report) => status === "all" || report.status === status)
      .filter((report) => [report.id, report.title, report.category, report.location, report.description, deptById(report.department)?.name].join(" ").toLowerCase().includes(q));
    renderReports("issueReports", list, true);
    const chips = $("#statusChips");
    if (chips) chips.innerHTML = [["all", "All"], ...statusOptions.map((statusName) => [statusName, statusName])].map(([value, label]) => `<button type="button" class="filter-chip ${activeStatus === value ? "active" : ""}" data-status-chip="${escapeHtml(value)}">${escapeHtml(label)} · ${value === "all" ? reports.length : countStatus(value)}</button>`).join("");
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
    $("#dashboardActivity").innerHTML = reports.slice().reverse().slice(0, 5).map((report) => `<div class="activity-item"><span class="activity-dot"></span><div><strong>${escapeHtml(report.title)}</strong><p>${escapeHtml(deptById(report.department)?.short || "Other")} · ${escapeHtml(report.location)} · ${escapeHtml(report.status)}</p></div></div>`).join("");
  }

  function renderNotifications() {
    $("#notificationList").innerHTML = [
      ["Report assigned for review", "A sample report has been placed in its department workspace.", "Today · Demo notification"],
      ["Status updated", "A fictional report status changed in the sample data.", "Today · Demo notification"],
      ["Department directory available", "Choose your department from Home or Departments.", "Preview guide"]
    ].map(([title, text, when]) => `<article class="notification-card"><span class="notification-icon">♧</span><div><strong>${escapeHtml(title)}</strong><p>${escapeHtml(text)}</p><small>${escapeHtml(when)}</small></div></article>`).join("");
  }

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

  document.addEventListener("click", (event) => {
    const nav = event.target.closest("[data-page]");
    if (nav) { navigate(nav.dataset.page); return; }
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
      const report = reports.find((item) => item.id === action.dataset.actionReport);
      if (!report) return;
      const status = window.prompt("Demo status (Reported, Under Review, Verified, In Progress, Resolved, Rejected, More Information Required):", report.status);
      if (status === null) return;
      const notes = window.prompt("Demo progress notes (leave blank to keep existing):", report.actionNotes || "");
      if (notes === null) return;
      const summary = window.prompt("Demo resolution summary (leave blank if not resolved):", report.resolutionSummary || "");
      if (summary === null) return;
      report.status = status.trim() || report.status;
      report.actionNotes = notes.trim();
      report.resolutionSummary = summary.trim();
      report.actionHistory = report.actionHistory || [];
      report.actionHistory.push(new Date().toLocaleString() + " — " + report.status + (report.actionNotes ? " — progress notes updated" : "") + (report.resolutionSummary ? " — resolution summary updated" : ""));
      window.alert("Demo update recorded in memory only. It is not saved to Supabase, published, or sent to citizens.");
      renderStats("homeStats"); renderStats("dashboardStats"); renderDepartments("homeDepartments"); renderDepartments("allDepartments", $("#departmentSearch").value); renderReports("homeRecent", reports.slice().reverse().slice(0, 4)); renderDashboard(); renderIssues(); if (selectedDepartment) renderDepartmentReports();
      return;
    }
    const save = event.target.closest("[data-save-status]");
    if (save) {
      const id = save.dataset.saveStatus;
      const select = document.querySelector(`[data-status-select="${CSS.escape(id)}"]`);
      const report = reports.find((item) => item.id === id);
      if (!report || !select) return;
      report.status = select.value;
      report.updated = "Just updated in this browser";
      renderStats("homeStats");
      renderStats("dashboardStats");
      renderDepartments("homeDepartments");
      renderDepartments("allDepartments", $("#departmentSearch").value);
      renderReports("homeRecent", reports.slice().reverse().slice(0, 4));
      renderDashboard();
      renderIssues();
      if (selectedDepartment) renderDepartmentReports();
      const message = document.createElement("div");
      message.className = "notice";
      message.textContent = "Demo only: the status changed in this browser. Nothing was saved to a database or official record.";
      save.closest(".report-card")?.appendChild(message);
    }
  });

  $("#departmentSearch").addEventListener("input", (event) => renderDepartments("allDepartments", event.target.value));
  ["issueSearch", "issueDepartmentFilter", "issueStatusFilter"].forEach((id) => $("#" + id).addEventListener(id === "issueSearch" ? "input" : "change", renderIssues));
  ["departmentReportSearch", "departmentStatusFilter"].forEach((id) => $("#" + id).addEventListener(id === "departmentReportSearch" ? "input" : "change", renderDepartmentReports));
  init();
})();