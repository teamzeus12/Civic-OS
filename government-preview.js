(() => {
  const rows = Array.from(document.querySelectorAll("#sampleReportRows tr"));
  const search = document.getElementById("reportSearch");
  const empty = document.getElementById("noSampleReports");
  const filters = Array.from(document.querySelectorAll(".gov-filter"));
  let activeFilter = "all";

  function render() {
    const query = (search.value || "").trim().toLowerCase();
    let visible = 0;
    rows.forEach((row) => {
      const matchesStatus = activeFilter === "all" || row.dataset.status === activeFilter;
      const matchesText = row.textContent.toLowerCase().includes(query);
      const show = matchesStatus && matchesText;
      row.hidden = !show;
      if (show) visible += 1;
    });
    empty.hidden = visible > 0;
  }

  filters.forEach((button) => button.addEventListener("click", () => {
    activeFilter = button.dataset.filter;
    filters.forEach((item) => item.classList.toggle("active", item === button));
    render();
  }));
  search.addEventListener("input", render);
})();

  document.querySelectorAll(".demo-nav-btn").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelectorAll(".demo-nav-btn").forEach((item) => item.classList.toggle("active", item === button));
      document.querySelectorAll("[data-demo-view]").forEach((view) => { view.hidden = view.dataset.demoView !== button.dataset.view; });
    });
  });
  const department = document.getElementById("demoDepartment");
  const priority = document.getElementById("demoPriority");
  const toolMessage = document.getElementById("demoToolMessage");
  function updateDemoFilters() {
    if (toolMessage) toolMessage.textContent = "Preview filter: " + department.value + " · " + priority.value + ". This is a simulated filter; no report records or official data are changed.";
  }
  department?.addEventListener("change", updateDemoFilters);
  priority?.addEventListener("change", updateDemoFilters);
  document.querySelectorAll("[data-map-label]").forEach((pin) => pin.addEventListener("click", () => {
    const message = document.getElementById("mapDemoMessage");
    if (message) message.textContent = pin.dataset.mapLabel + " (illustrative demo count).";
  }));
  document.getElementById("demoAnnouncementButton")?.addEventListener("click", () => {
    const message = document.getElementById("announcementDemoMessage");
    if (message) message.textContent = "Preview only: a real announcement would require confirmation and authorised publication. Nothing has been sent.";
  });
