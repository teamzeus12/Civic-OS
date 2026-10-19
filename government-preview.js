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
