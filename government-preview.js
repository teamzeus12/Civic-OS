(() => {
  "use strict";
  const config = window.CIVIC_SUPABASE_CONFIG;
  const client = window.supabase && config?.url && config?.publishableKey
    ? window.supabase.createClient(config.url, config.publishableKey)
    : null;
  const rowsBody = document.getElementById("sampleReportRows");
  const search = document.getElementById("reportSearch");
  const empty = document.getElementById("noSampleReports");
  const message = document.getElementById("liveReportMessage");
  const filters = Array.from(document.querySelectorAll(".gov-filter"));
  const DEVELOPMENT_DEMO_MODE = true; // This branch uses sample data only; never reads or writes production reports.
  const stats = document.getElementById("liveReportStats");
  const bannerBadge = document.getElementById("governmentAccessBadge");
  const bannerTitle = document.getElementById("governmentAccessTitle");
  const bannerMessage = document.getElementById("governmentAccessMessage");
  let reports = [];
  let activeFilter = "all";
  let authorized = false;

  function setBanner(badge, title, text) {
    bannerBadge.textContent = badge;
    bannerTitle.textContent = title;
    bannerMessage.textContent = text;
  }
  function statusClass(status) {
    if (status === "Resolved") return "resolved";
    if (status === "In Progress") return "progress";
    if (status === "Verified") return "review";
    return "new";
  }
  function priorityClass(priority) {
    if (priority === "Critical" || priority === "High") return "high";
    if (priority === "Low") return "low";
    return "medium";
  }
  function addCell(row, child) {
    const cell = document.createElement("td");
    if (typeof child === "string") cell.textContent = child;
    else if (child) cell.appendChild(child);
    row.appendChild(cell);
    return cell;
  }
  function updateStats() {
    document.getElementById("statTotal").textContent = String(reports.length);
    document.getElementById("statReview").textContent = String(reports.filter(r => r.status === "Reported" || r.status === "Verified").length);
    document.getElementById("statProgress").textContent = String(reports.filter(r => r.status === "In Progress").length);
    document.getElementById("statResolved").textContent = String(reports.filter(r => r.status === "Resolved").length);
  }
  function render() {
    if (!authorized) return;
    const query = (search.value || "").trim().toLowerCase();
    const visible = reports.filter(r => {
      const matchesStatus = activeFilter === "all" || r.status === activeFilter;
      const loc = r.location && typeof r.location === "object"
        ? (r.location.address || r.location.name || JSON.stringify(r.location))
        : (r.location || "");
      return matchesStatus && [r.public_id,r.title,r.category,r.description,loc,r.priority,r.status].join(" ").toLowerCase().includes(query);
    });
    rowsBody.replaceChildren();
    visible.forEach(report => {
      const row = document.createElement("tr");
      row.dataset.status = report.status || "Reported";
      const reportCell = document.createElement("td");
      const title = document.createElement("strong");
      title.textContent = report.title || "Untitled report";
      const id = document.createElement("small");
      id.textContent = report.public_id || "Civic report";
      reportCell.append(title,id);
      row.appendChild(reportCell);
      addCell(row,String(report.category || "Other").replace(/_/g," "));
      const location = report.location && typeof report.location === "object"
        ? (report.location.address || report.location.name || (report.location.latitude != null && report.location.longitude != null ? report.location.latitude + ", " + report.location.longitude : "Location not provided"))
        : (report.location || "Location not provided");
      addCell(row,location);
      const priority = document.createElement("span");
      priority.className = "priority " + priorityClass(report.priority);
      priority.textContent = report.priority || "Medium";
      addCell(row,priority);
      const status = document.createElement("span");
      status.className = "status " + statusClass(report.status);
      status.textContent = report.status || "Reported";
      addCell(row,status);
      const actions = document.createElement("td");
      const select = document.createElement("select");
      select.className = "live-status-select";
      select.setAttribute("aria-label","Update status for " + (report.public_id || report.title));
      ["Reported","Verified","In Progress","Resolved"].forEach(value => {
        const option = document.createElement("option");
        option.value = value;
        option.textContent = value;
        option.selected = value === (report.status || "Reported");
        select.appendChild(option);
      });
      const note = document.createElement("input");
      note.className = "live-note-input";
      note.type = "text";
      note.maxLength = 1000;
      note.placeholder = "Optional progress note";
      note.setAttribute("aria-label","Progress note for " + (report.public_id || report.title));
      const save = document.createElement("button");
      save.type = "button";
      save.className = "live-save-button";
      save.textContent = "Save update";
      save.addEventListener("click", async () => {
        if (DEVELOPMENT_DEMO_MODE) {
          message.classList.remove("live-report-error");
          message.textContent = "Development demo only: this status change was not saved to any database.";
          return;
        }
        if (!authorized || !client) return;
        save.disabled = true;
        message.classList.remove("live-report-error");
        message.textContent = "Saving update for " + report.public_id + "…";
        try {
          const { error } = await client.rpc("government_update_report_status", {
            p_public_id: report.public_id,
            p_new_status: select.value,
            p_note: note.value.trim() || null
          });
          if (error) throw error;
          message.textContent = "Saved " + report.public_id + ". Citizen status has been updated.";
          await loadReports();
        } catch (error) {
          message.classList.add("live-report-error");
          message.textContent = error?.message || "Could not save the status update.";
        } finally {
          save.disabled = false;
        }
      });
      actions.append(select,note,save);
      row.appendChild(actions);
      rowsBody.appendChild(row);
    });
    empty.hidden = visible.length > 0;
    if (!visible.length) empty.textContent = reports.length ? "No live reports match your search." : "No reports have been submitted yet.";
  }
  async function loadReports() {
    if (!authorized) return;
    const { data,error } = await client.from("reports")
      .select("id,public_id,title,category,description,status,priority,priority_score,location,reported_at,verification_required")
      .order("reported_at",{ascending:false});
    if (error) throw error;
    reports = data || [];
    updateStats();
    render();
  }
  async function initLiveReports() {
    stats.hidden = true;
    search.disabled = true;
    if (DEVELOPMENT_DEMO_MODE) {
      reports = [
        { public_id: "DEMO-001", title: "Large pothole near market", category: "roads", description: "Sample road damage report for testing.", location: "Imphal West", priority: "High", status: "Reported" },
        { public_id: "DEMO-002", title: "Waste collection missed", category: "garbage", description: "Sample sanitation report for testing.", location: "Imphal East", priority: "Medium", status: "Verified" },
        { public_id: "DEMO-003", title: "Streetlight not working", category: "electricity", description: "Sample streetlight report for testing.", location: "Thoubal", priority: "Low", status: "In Progress" },
        { public_id: "DEMO-004", title: "School water supply issue", category: "education", description: "Sample public-service report for testing.", location: "Bishnupur", priority: "High", status: "Resolved" }
      ];
      authorized = true;
      setBanner("DEVELOPMENT DEMO", "Sample data only", "This development preview uses fictional sample reports. No live citizen records are loaded, and status updates are not saved. Official access controls remain in production.");
      stats.hidden = false;
      search.disabled = false;
      updateStats();
      render();
      message.textContent = "Demo reports loaded. Search and filters work locally; no database is connected for this table.";
      return;
    }
    if (!client) {
      setBanner("CONFIG ERROR","Secure connection unavailable","The Civic OS database client did not load. Refresh or contact the project administrator.");
      rowsBody.replaceChildren();
      const row = document.createElement("tr");
      const cell = addCell(row,"Live report connection is unavailable.");
      cell.colSpan = 6;
      rowsBody.appendChild(row);
      return;
    }
    try {
      const { data: sessionData,error: sessionError } = await client.auth.getSession();
      if (sessionError) throw sessionError;
      const user = sessionData?.session?.user;
      if (!user) {
        setBanner("SIGN-IN REQUIRED","Authorised access only","Sign in with a pre-authorised Government Portal account to load live reports. Citizen accounts cannot access this workspace.");
        rowsBody.replaceChildren();
        const row = document.createElement("tr");
        const cell = addCell(row,"Live reports are hidden until an authorised government account signs in.");
        cell.colSpan = 6;
        rowsBody.appendChild(row);
        return;
      }
      const { data: profile,error: profileError } = await client.from("profiles").select("role").eq("id",user.id).maybeSingle();
      if (profileError) throw profileError;
      if (!profile || !["government","admin"].includes(profile.role)) {
        setBanner("ACCESS RESTRICTED","Government role required","This account is not authorised to view government reports. Sign out and use a pre-authorised government account. No report data was loaded.");
        rowsBody.replaceChildren();
        const row = document.createElement("tr");
        const cell = addCell(row,"Access denied. Live reports are available only to authorised government/admin accounts.");
        cell.colSpan = 6;
        rowsBody.appendChild(row);
        return;
      }
      authorized = true;
      setBanner("LIVE REPORTS","Government Portal connected","Live reports are loaded from the Civic OS database. Status updates are saved with an audit trail. The map, announcements and analytics below remain demo previews.");
      stats.hidden = false;
      search.disabled = false;
      await loadReports();
      message.textContent = "Live report records loaded successfully.";
    } catch (error) {
      authorized = false;
      setBanner("CONNECTION ERROR","Could not load live reports",error?.message || "Check the database connection and access policies.");
      rowsBody.replaceChildren();
      const row = document.createElement("tr");
      const cell = addCell(row,"Live reports could not be loaded. " + (error?.message || ""));
      cell.colSpan = 6;
      rowsBody.appendChild(row);
    }
  }

  filters.forEach(button => button.addEventListener("click",() => {
    activeFilter = button.dataset.filter;
    filters.forEach(item => item.classList.toggle("active",item === button));
    render();
  }));
  search.addEventListener("input",render);
  document.querySelectorAll(".demo-nav-btn").forEach(button => button.addEventListener("click",() => {
    document.querySelectorAll(".demo-nav-btn").forEach(item => item.classList.toggle("active",item === button));
    document.querySelectorAll("[data-demo-view]").forEach(view => { view.hidden = view.dataset.demoView !== button.dataset.view; });
  }));
  const department = document.getElementById("demoDepartment");
  const priority = document.getElementById("demoPriority");
  const toolMessage = document.getElementById("demoToolMessage");
  function updateDemoFilters() {
    if (toolMessage) toolMessage.textContent = "Preview filter: " + department.value + " · " + priority.value + ". This is a simulated filter; no report records or official data are changed.";
  }
  department?.addEventListener("change",updateDemoFilters);
  priority?.addEventListener("change",updateDemoFilters);
  document.querySelectorAll("[data-map-label]").forEach(pin => pin.addEventListener("click",() => {
    const mapMessage = document.getElementById("mapDemoMessage");
    if (mapMessage) mapMessage.textContent = pin.dataset.mapLabel + " (illustrative demo count).";
  }));
  document.getElementById("demoAnnouncementButton")?.addEventListener("click",() => {
    const announcementMessage = document.getElementById("announcementDemoMessage");
    if (announcementMessage) announcementMessage.textContent = "Preview only: a real announcement would require confirmation and authorised publication. Nothing has been sent.";
  });
  initLiveReports();
})();