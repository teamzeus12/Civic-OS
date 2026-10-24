"use strict";

/* =========================================================
   Civic OS — script.js
   Report. Connect. Resolve.

   1. Reference data
   2. Demo AI engine
   3. Demo data
   4. App state & helpers
   5. Screen switching
   6. Home
   7. Report flow
   8. Issue explorer + detail sheet
   9. Dashboard
   10. Community matching
   11. Civic AI
   12. Event binding
   13. Init
   ========================================================= */


/* =========================================================
   1. REFERENCE DATA
   ========================================================= */

const CATEGORIES = {
  roads: {
    label: "Roads",
    aiLabel: "Road Infrastructure",
    department: "Public Works",
    icon: "construction",
    keywords: [
      "pothole", "road", "street", "crack", "asphalt",
      "pavement", "footpath", "sidewalk", "speed bump", "manhole"
    ],
    action:
      "Inspect the affected road and determine whether repair or resurfacing is required.",
    skills: ["Infrastructure Assessment", "Mapping", "Photography"],
  },

  garbage: {
    label: "Garbage",
    aiLabel: "Waste & Sanitation",
    department: "MAHUD / Urban Local Body",
    icon: "trash-2",
    keywords: [
      "garbage", "trash", "waste", "litter", "dump",
      "bin", "rubbish", "smell", "collection"
    ],
    action:
      "Schedule a sanitation crew to clear the waste and review the local collection route.",
    skills: ["Community Outreach", "Event Organizing", "Graphic Design"],
  },

  streetlights: {
    label: "Streetlights",
    aiLabel: "Public Lighting",
    department: "Public Lighting",
    icon: "lightbulb",
    keywords: [
      "streetlight", "street light", "lamp", "light",
      "dark", "bulb", "pole", "wire"
    ],
    action:
      "Send a lighting technician to inspect the fixture, wiring and power supply.",
    skills: ["Electrical Repair", "Mapping"],
  },

  water: {
    label: "Water",
    aiLabel: "Water & Drainage",
    department: "Water Department",
    icon: "droplets",
    keywords: [
      "water", "leak", "pipe", "drain", "sewage",
      "flood", "tap", "supply", "overflow", "waterlog"
    ],
    action:
      "Dispatch a water crew to locate the source, isolate the problem and restore safe supply.",
    skills: ["Plumbing", "Infrastructure Assessment"],
  },

  health: {
    label: "Public health",
    aiLabel: "Public Health",
    department: "Public Health",
    icon: "heart-pulse",
    keywords: [
      "mosquito", "disease", "health", "clinic",
      "hospital", "stagnant", "dengue", "rats",
      "hygiene", "sick"
    ],
    action:
      "Request a public health inspection and schedule preventive treatment of the area.",
    skills: ["Public Health", "Community Outreach"],
  },

  education: {
    label: "Education",
    aiLabel: "Education Facilities",
    department: "Education Department",
    icon: "graduation-cap",
    keywords: [
      "school", "classroom", "teacher", "student",
      "desk", "library", "college", "books"
    ],
    action:
      "Ask the education department to audit the facility and plan repairs or resources.",
    skills: ["Teaching", "Project Management", "Infrastructure Assessment"],
  },

  environment: {
    label: "Environment",
    aiLabel: "Environment",
    department: "Environment Department",
    icon: "leaf",
    keywords: [
      "tree", "pollution", "smoke", "air", "noise",
      "river", "lake", "park", "burning", "cut down"
    ],
    action:
      "Have the environment department assess the impact and enforce applicable regulations.",
    skills: ["Environmental Science", "Mapping", "Data Analysis"],
  },

  safety: {
    label: "Public safety",
    aiLabel: "Public Safety",
    department: "Public Safety",
    icon: "shield-alert",
    keywords: [
      "signal", "crime", "theft", "unsafe", "harass",
      "accident", "fire", "traffic light", "junction", "crossing"
    ],
    action:
      "Alert public safety officers to secure the area and coordinate an urgent response.",
    skills: ["Community Outreach", "Mapping"],
  },

  agriculture: {
    label: "Agriculture",
    aiLabel: "Agriculture & Farming",
    department: "Agriculture Department",
    icon: "sprout",
    keywords: ["farmer", "farm", "agriculture", "crop", "paddy", "irrigation", "fertilizer", "seed", "livestock", "harvest"],
    action: "Refer the issue to the agriculture team for assessment and practical support.",
    skills: ["Agriculture", "Environmental Science", "Data Analysis"],
  },

  transport: {
    label: "Transport",
    aiLabel: "Transport & Mobility",
    department: "Transport Department",
    icon: "bus",
    keywords: ["bus", "transport", "vehicle", "traffic jam", "traffic congestion", "public transport", "bus stop", "parking", "road blockage"],
    action: "Ask the transport team to assess the disruption and coordinate a suitable response.",
    skills: ["Mapping", "Community Outreach", "Data Analysis"],
  },

  animals: {
    label: "Animals",
    aiLabel: "Animal Welfare",
    department: "Animal Welfare Services",
    icon: "paw-print",
    keywords: ["animal", "dog", "stray dog", "cattle", "injured animal", "animal welfare", "livestock", "wildlife"],
    action: "Refer the report to the appropriate animal welfare or veterinary service.",
    skills: ["Animal Welfare", "Community Outreach"],
  },

  sports: {
    label: "Sports",
    aiLabel: "Sports & Recreation",
    department: "Sports Department",
    icon: "trophy",
    keywords: ["sports", "sport", "playground", "football ground", "basketball court", "sports equipment", "stadium", "athletics"],
    action: "Ask the sports team to assess the facility or equipment gap and identify support options.",
    skills: ["Sports", "Project Management", "Community Outreach"],
  },

  other: {
    label: "Other",
    aiLabel: "General Civic Issue",
    department: "Municipal Helpdesk",
    icon: "ellipsis",
    keywords: [],
    action:
      "Review the report and route it to the most relevant municipal department.",
    skills: ["Community Outreach"],
  },
};

const STATUSES = [
  "Reported",
  "Verified",
  "In Progress",
  "Resolved"
];

const SAFETY_REVIEW_SIGNALS = ["danger","dangerous","accident","flood","fire","emergency","unsafe","injur","collapse","exposed wire","live wire","electrocut","sparking"];

const IMPACT_SIGNALS = [
  "school",
  "children",
  "kids",
  "hospital",
  "elderly",
  "blocked",
  "large",
  "deep",
  "night",
  "every day",
  "many",
];

const SKILLS = [
  "Mapping",
  "Data Analysis",
  "Graphic Design",
  "Social Media",
  "Community Outreach",
  "Event Organizing",
  "Infrastructure Assessment",
  "Electrical Repair",
  "Plumbing",
  "Public Health",
  "Environmental Science",
  "Photography",
  "Teaching",
  "Project Management",
];

const STOPWORDS = new Set([
  "near",
  "there",
  "with",
  "from",
  "that",
  "this",
  "have",
  "been",
  "very",
  "into",
  "outside",
  "front",
  "behind",
  "next",
  "close",
  "area",
  "side",
  "some",
  "they",
  "which",
  "their",
  "about",
  "still",
  "since",
  "days",
  "week",
  "morning",
  "people",
  "every",
]);


/* =========================================================
   2. DEMO AI ENGINE
   ========================================================= */

function matchTerms(text, terms) {
  return terms.filter((term) =>
    new RegExp("\\b" + escapeRegExp(term), "i").test(text)
  );
}

function detectCategory(text) {
  let bestKey = "other";
  let bestHits = 0;

  for (const [key, cat] of Object.entries(CATEGORIES)) {
    const hits = matchTerms(text, cat.keywords).length;

    if (hits > bestHits) {
      bestKey = key;
      bestHits = hits;
    }
  }

  return {
    key: bestKey,
    hits: bestHits
  };
}

function analyzeReport({
  categoryKey,
  description,
  location,
  hasPhoto
}) {
  // This demo analyzer uses the written description, not image recognition.
  const text = String(description || "").toLowerCase();
  const detected = detectCategory(text);

  const selectedCategory =
    categoryKey &&
    categoryKey !== "other" &&
    CATEGORIES[categoryKey]
      ? categoryKey
      : null;

  const chosenHits =
    selectedCategory
      ? matchTerms(
          text,
          CATEGORIES[selectedCategory].keywords
        ).length
      : 0;

  // Respect a selected category only when the written report supports it.
  // Never infer a category from the mere presence of an uploaded image.
  const categoryNeedsReview = Boolean(
    selectedCategory &&
    chosenHits === 0 &&
    detected.hits === 0
  );

  const categoryMismatch =
    Boolean(
      selectedCategory &&
      chosenHits === 0 &&
      detected.hits > 0 &&
      detected.key !== selectedCategory
    );

  const key =
    categoryNeedsReview
      ? "other"
      : categoryMismatch
        ? detected.key
        : selectedCategory && chosenHits > 0
          ? selectedCategory
          : detected.key;

  const autoDetected =
    detected.hits > 0 &&
    (
      !selectedCategory ||
      chosenHits === 0
    );

  const suggestion =
    categoryMismatch
      ? detected.key
      : null;

  const cat = CATEGORIES[key] || CATEGORIES.other;

  const reviewSignals = matchTerms(text, SAFETY_REVIEW_SIGNALS);
  const impactHits = matchTerms(text, IMPACT_SIGNALS);

  // Civic AI describes the report; authorised officials decide urgency and response order.
  // Do not increase confidence merely because a photo was attached.
  // There is no visual model connected in this prototype.
  const hasCategoryEvidence =
    detected.hits > 0 ||
    chosenHits > 0;

  const confidence = hasCategoryEvidence
    ? Math.min(
        97,
        62 +
          Math.min(
            Math.max(
              detected.hits,
              chosenHits
            ),
            3
          ) * 8 +
          (
            selectedCategory &&
            chosenHits > 0
              ? 8
              : 0
          ) +
          Math.min(
            reviewSignals.length + impactHits.length,
            3
          ) * 3
      )
    : 35;

  let riskNote = "";
  if (reviewSignals.length) {
    riskNote = ` The description includes safety-related details (${reviewSignals.join(", ")}). An authorised official should review these details.`;
  } else if (impactHits.length >= 2) {
    riskNote = ` The description includes several community-impact details (${impactHits.join(", ")}). An authorised official should review the report.`;
  }

  const summary =
    `A citizen reports a ${cat.aiLabel.toLowerCase()} problem at ${location}. ` +
    `${firstSentence(description)}${riskNote}`;

  const recommendation = cat.action;

  return {
    categoryKey: key,
    categoryLabel: cat.aiLabel,
    department: cat.department,
    confidence,
    summary,
    recommendation,
    signals: [
      ...reviewSignals,
      ...impactHits
    ],
    skills: cat.skills,
    autoDetected,
    suggestion,
    categoryNeedsReview,
    imageNotAnalyzed: Boolean(hasPhoto),
    duplicate: findPossibleDuplicate(
      key,
      location,
      description
    ),
  };
}

function tokenize(text) {
  return [
    ...new Set(
      text
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .filter(
          (w) =>
            w.length >= 4 &&
            !STOPWORDS.has(w)
        )
    )
  ];
}

function findPossibleDuplicate(
  categoryKey,
  location,
  description
) {
  const tokens = tokenize(
    `${location} ${description}`
  );

  let best = null;
  let bestScore = 0;

  for (const issue of issues) {
    if (
      issue.status === "Resolved" ||
      issue.category !== categoryKey
    ) {
      continue;
    }

    const issueTokens = new Set(
      tokenize(
        `${issue.location} ${issue.title}`
      )
    );

    const score = tokens.filter(
      (t) => issueTokens.has(t)
    ).length;

    if (score > bestScore) {
      best = issue;
      bestScore = score;
    }
  }

  return bestScore >= 2
    ? best
    : null;
}


/* =========================================================
   3. DEMO DATA
   ========================================================= */

const NOW = Date.now();
const HOUR = 36e5;

const SEED_ISSUES = []; // Real reports are loaded from Supabase only.

let issues = [];
let nextIssueNumber = 1043;
let dashboardMapInstance = null;
const dashboardMapMarkers = new Map();

const PEOPLE = []; // Community profiles must be sourced from real users.

const MISSIONS = []; // Missions must be populated from genuine community/database records.

function escapeHtml(value) {
  return String(value).replace(
    /[&<>"']/g,
    (ch) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
      })[ch]
  );
}

function escapeRegExp(value) {
  return value.replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&"
  );
}

function refreshIcons() {
  if (
    window.lucide &&
    typeof window.lucide.createIcons ===
      "function"
  ) {
    window.lucide.createIcons();
  }
}

function firstSentence(text) {
  const clean = text
    .trim()
    .replace(/\s+/g, " ");

  const match = clean.match(
    /^.*?[.!?](\s|$)/
  );

  let sentence = (
    match ? match[0] : clean
  ).trim();

  if (sentence.length > 160) {
    sentence =
      sentence.slice(0, 157).trimEnd() +
      "…";
  }

  if (!/[.!?…]$/.test(sentence)) {
    sentence += ".";
  }

  return (
    sentence.charAt(0).toUpperCase() +
    sentence.slice(1)
  );
}

function makeTitle(description) {
  let title = firstSentence(description)
    .replace(/[.!?…]$/, "")
    .replace(
      /^(there is|there are|there's|i saw|i noticed|we have|we've got)\s+(a|an|the|some)?\s*/i,
      ""
    );

  if (title.length > 64) {
    title =
      title.slice(0, 61).trimEnd() +
      "…";
  }

  return (
    title.charAt(0).toUpperCase() +
    title.slice(1)
  );
}

function timeAgo(timestamp) {
  const minutes = Math.round(
    (Date.now() - timestamp) / 60000
  );

  if (minutes < 1) return "just now";

  if (minutes < 60) {
    return `${minutes}m ago`;
  }

  const hours = Math.round(
    minutes / 60
  );

  if (hours < 24) {
    return `${hours}h ago`;
  }

  const days = Math.round(
    hours / 24
  );

  return `${days}d ago`;
}

function slug(value) {
  return String(value)
    .toLowerCase()
    .replace(/\s+/g, "-");
}

function initials(name) {
  return name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function statusPill(status) {
  return `
    <span class="pill status-${slug(status)}">
      <span class="dot"></span>
      ${escapeHtml(status)}
    </span>
  `;
}

let toastTimer;

function toast(
  message,
  icon = "circle-check"
) {
  const el = $("#toast");

  if (!el) return;

  el.innerHTML = `
    <i data-lucide="${icon}"></i>
    <span>${escapeHtml(message)}</span>
  `;

  refreshIcons();

  el.classList.add("show");

  clearTimeout(toastTimer);

  toastTimer = setTimeout(
    () => el.classList.remove("show"),
    2800
  );
}

function buildUpdates(
  status,
  reportedAt,
  department
) {
  const notes = {
    Reported:
      `Report received. Civic AI categorised it and routed it to ${department}.`,

    Verified:
      "Verified by the ward officer after a site check.",

    "In Progress":
      `${department} team assigned and work scheduled.`,

    Resolved:
      "Work completed and issue closed. Supporters were notified."
  };

  const lastIndex =
    STATUSES.indexOf(status);

  const elapsed =
    Date.now() - reportedAt;

  return STATUSES.slice(
    0,
    lastIndex + 1
  ).map((s, i) => ({
    status: s,
    note: notes[s],
    time:
      reportedAt +
      (elapsed * i) /
        (lastIndex + 1)
  }));
}

function parseIssueCoordinates(locationValue) {
  const value = String(locationValue || "").trim();
  // Accept only an explicit GPS prefix or a bare coordinate pair; never guess
  // coordinates from a street address or ward name.
  const match = value.match(/^(?:GPS\s*)?(-?\d{1,2}(?:\.\d+)?)\s*,\s*(-?\d{1,3}(?:\.\d+)?)$/i);
  if (!match) return null;

  const latitude = Number(match[1]);
  const longitude = Number(match[2]);
  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    latitude < -90 || latitude > 90 ||
    longitude < -180 || longitude > 180
  ) {
    return null;
  }

  return { latitude, longitude };
}

function getIssueMapCoordinates(issue) {
  if (
    issue &&
    issue.latitude !== null &&
    issue.latitude !== undefined &&
    issue.longitude !== null &&
    issue.longitude !== undefined
  ) {
    const latitude = Number(issue.latitude);
    const longitude = Number(issue.longitude);
    if (
      Number.isFinite(latitude) &&
      Number.isFinite(longitude) &&
      latitude >= -90 && latitude <= 90 &&
      longitude >= -180 && longitude <= 180
    ) {
      return { latitude, longitude };
    }
  }

  return parseIssueCoordinates(issue?.location);
}

function getIssueMapUrl(issue) {
  const coords = getIssueMapCoordinates(issue);
  const query = coords
    ? `${coords.latitude},${coords.longitude}`
    : String(issue?.location || "").trim();

  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

function renderDashboardMapIssue(issue) {
  const panel = $("#dashboardMapSelection");
  if (!panel || !issue) return;

  const coords = getIssueMapCoordinates(issue);
  const locationLabel = String(issue.location || "Location not supplied");
  const categoryLabel = CATEGORIES[issue.category]?.label || "Other";
  const locationNote = issue.locationPrecision === "approximate" && coords
    ? "Approximate demo pin · area-level location"
    : coords
      ? `GPS pin · ${coords.latitude.toFixed(5)}, ${coords.longitude.toFixed(5)}`
      : "Address text only · exact map pin unavailable";

  panel.innerHTML = `
    <div class="dashboard-map-detail-top">
      <span class="dashboard-map-issue-id">${escapeHtml(issue.id)}</span>
      <span class="dashboard-map-reported-time">${escapeHtml(timeAgo(issue.reportedAt))}</span>
    </div>
    <h4 class="dashboard-map-detail-title">${escapeHtml(issue.title)}</h4>
    <div class="dashboard-map-tags">
      ${statusPill(issue.status)}
      <span class="pill">${escapeHtml(categoryLabel)}</span>
    </div>
    <p class="dashboard-map-description">${escapeHtml(issue.description)}</p>
    <div class="dashboard-map-location">
      <i data-lucide="map-pin"></i>
      <div>
        <strong>${escapeHtml(locationLabel)}</strong>
        <small>${escapeHtml(locationNote)}</small>
      </div>
    </div>
    <div class="dashboard-map-facts">
      <span><i data-lucide="building-2"></i>${escapeHtml(issue.department || "Municipal Helpdesk")}</span>
      <span><i data-lucide="users"></i>${Number(issue.supporters) || 0} supporters</span>
    </div>
    <div class="dashboard-map-detail-actions">
      <a
        class="btn btn-primary btn-sm"
        href="${escapeHtml(getIssueMapUrl(issue))}"
        target="_blank"
        rel="noopener noreferrer"
      ><i data-lucide="external-link"></i> Open location</a>
      <button
        type="button"
        class="btn btn-ghost btn-sm"
        data-issue="${escapeHtml(issue.id)}"
      ><i data-lucide="file-text"></i> Full report</button>
    </div>
  `;

  dashboardMapMarkers.forEach((entry, id) => {
    const selected = id === issue.id;
    entry.marker.setStyle({
      radius: selected ? entry.baseRadius + 3 : entry.baseRadius,
      weight: selected ? 4 : 2
    });
    if (selected && dashboardMapInstance) {
      const coordsForMarker = getIssueMapCoordinates(issue);
      if (coordsForMarker) {
        dashboardMapInstance.setView(
          [coordsForMarker.latitude, coordsForMarker.longitude],
          Math.max(dashboardMapInstance.getZoom(), 14),
          { animate: true }
        );
      }
    }
  });

  refreshIcons();
}

function initDashboardMap() {
  const mapElement = $("#dashboardMap");
  const statusElement = $("#dashboardMapStatus");
  const mappedIssues = issues.filter((issue) => getIssueMapCoordinates(issue));
  const unpinnedIssues = issues.filter((issue) => !getIssueMapCoordinates(issue));

  $$("#dashboardMap [data-map-select]").forEach((button) => {
    button.addEventListener("click", () => {
      const issue = getIssue(button.dataset.mapSelect);
      if (issue) renderDashboardMapIssue(issue);
    });
  });

  $$("#dashboardUnpinnedList [data-map-select]").forEach((button) => {
    button.addEventListener("click", () => {
      const issue = getIssue(button.dataset.mapSelect);
      if (issue) renderDashboardMapIssue(issue);
    });
  });

  if (statusElement) {
    statusElement.textContent =
      `${mappedIssues.length} of ${issues.length} reports have map coordinates. Seeded demo pins are approximate area-level locations; reports submitted with GPS use exact coordinates.`;
  }

  if (!mapElement) return;
  if (!window.L || typeof window.L.map !== "function") {
    mapElement.innerHTML = `
      <div class="dashboard-map-fallback">
        <i data-lucide="map"></i>
        <strong>Map could not be loaded</strong>
        <span>Your reports are still listed in the side panel with location links.</span>
      </div>
    `;
    refreshIcons();
    return;
  }

  if (dashboardMapInstance) {
    dashboardMapInstance.remove();
    dashboardMapInstance = null;
  }
  dashboardMapMarkers.clear();

  dashboardMapInstance = window.L.map(mapElement, {
    scrollWheelZoom: false
  }).setView([24.817, 93.9368], 12);

  window.L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap contributors</a>'
  }).addTo(dashboardMapInstance);

  const statusColors = {
    Reported: "#64748b",
    Verified: "#2563eb",
    "In Progress": "#b86c08",
    Resolved: "#0f9f78"
  };

  const points = [];
  mappedIssues.forEach((issue) => {
    const coords = getIssueMapCoordinates(issue);
    if (!coords) return;
    const color = statusColors[issue.status] || "#0f766e";
    const baseRadius = 7;
    const marker = window.L.circleMarker(
      [coords.latitude, coords.longitude],
      {
        radius: baseRadius,
        color,
        weight: 2,
        opacity: 1,
        fillColor: color,
        fillOpacity: 0.9
      }
    ).addTo(dashboardMapInstance);

    marker.bindTooltip(
      `${escapeHtml(issue.id)} · ${escapeHtml(issue.title)}`,
      { direction: "top", offset: [0, -6] }
    );
    marker.on("click", () => renderDashboardMapIssue(issue));
    dashboardMapMarkers.set(issue.id, { marker, baseRadius });
    points.push([coords.latitude, coords.longitude]);
  });

  if (points.length === 1) {
    dashboardMapInstance.setView(points[0], 15);
  } else if (points.length > 1) {
    dashboardMapInstance.fitBounds(points, { padding: [28, 28], maxZoom: 15 });
  }

  const emptySelection = $("#dashboardMapSelection");
  if (emptySelection) {
    emptySelection.innerHTML = mappedIssues.length
      ? `
        <div class="dashboard-map-empty-selection">
          <span class="dashboard-map-empty-icon"><i data-lucide="mouse-pointer-click"></i></span>
          <strong>Select a map pin</strong>
          <p>Click any marker to see its report details, status and location link here.</p>
        </div>
      `
      : `
        <div class="dashboard-map-empty-selection">
          <span class="dashboard-map-empty-icon"><i data-lucide="map-pin"></i></span>
          <strong>No exact GPS pins yet</strong>
          <p>Reports with GPS coordinates will appear on the map. Select an address-only report below to see its details and open the address in Maps.</p>
        </div>
      `;

    refreshIcons();
  }
}

function createIssue(seed) {
  const analysis =
    analyzeReport({
      categoryKey: seed.category,
      description: seed.description,
      location: seed.location,
      hasPhoto: Boolean(seed.photo)
    });

  const reportedAt =
    seed.reportedAt ??
    NOW - seed.hoursAgo * HOUR;

  const department =
    CATEGORIES[seed.category]?.department ||
    "Municipal Helpdesk";

  const parsedLocationCoordinates = parseIssueCoordinates(seed.location);
  const coordinates =
    Number.isFinite(Number(seed.latitude)) &&
    seed.latitude !== null &&
    seed.latitude !== undefined &&
    Number.isFinite(Number(seed.longitude)) &&
    seed.longitude !== null &&
    seed.longitude !== undefined
      ? { latitude: Number(seed.latitude), longitude: Number(seed.longitude) }
      : parsedLocationCoordinates;

  const locationPrecision =
    seed.locationPrecision ||
    (parsedLocationCoordinates ? "gps" : coordinates ? "approximate" : null);

  return {
    id: seed.id,

    title: seed.title,

    category: seed.category,

    description: seed.description,

    location: seed.location,

    latitude: coordinates?.latitude ?? null,

    longitude: coordinates?.longitude ?? null,

    locationPrecision,

    area: seed.area,

    status:
      seed.status ??
      "Reported",

    supporters:
      seed.supporters ?? 1,

    photo:
      seed.photo ?? null,

    reportedAt,

    department,

    summary: analysis.summary,

    recommendation: analysis.recommendation || CATEGORIES[seed.category]?.action || CATEGORIES.other.action,

    updates: buildUpdates(
      seed.status ?? "Reported",
      reportedAt,
      department
    )
  };
}

function getIssue(id) {
  return issues.find(
    (i) => i.id === id
  );
}

function statusCounts() {
  const counts = Object.fromEntries(
    STATUSES.map((s) => [s, 0])
  );

  issues.forEach(
    (i) => counts[i.status]++
  );

  return counts;
}


/* =========================================================
   5. SCREEN SWITCHING
   ========================================================= */

const SCREEN_HASH = {
  homeScreen: "home",
  reportScreen: "report",
  issuesScreen: "issues",
  communityScreen: "community",
  actionsScreen: "actions",
  createActivityScreen: "create-activity",
  actionDetailScreen: "action-detail",
  dashboardScreen: "dashboard"
};

const SCREEN_TITLE = {
  homeScreen:
    "Civic OS — Report. Connect. Resolve.",

  reportScreen:
    "Report a problem · Civic OS",

  issuesScreen:
    "Civic issues · Civic OS",

  communityScreen:
    "Civic community · Civic OS",

  actionsScreen:
    "Civic Actions · Civic OS",

  createActivityScreen: 
    "Civic OS — Create Activity",

  actionDetailScreen:
    "Civic Action · Civic OS",

  dashboardScreen:
    "Civic dashboard · Civic OS"
};

function screenFromHash() {
  const hash =
    location.hash.replace("#", "");

  return (
    Object.keys(SCREEN_HASH).find(
      (id) =>
        SCREEN_HASH[id] === hash
    ) || "homeScreen"
  );
}

function showScreen(
  id,
  { push = true } = {}
) {
  if (!document.getElementById(id)) {
    id = "homeScreen";
  }

  const dialog =
    $("#issueDialog");

  if (
    dialog &&
    dialog.open
  ) {
    dialog.close();
  }

  state.screen = id;

  $$(".screen").forEach(
    (screen) => {
      screen.classList.toggle(
        "active",
        screen.id === id
      );
    }
  );

  $$("[data-nav]").forEach(
    (btn) => {
      const isActive =
        btn.dataset.goto === id;

      btn.classList.toggle(
        "active",
        isActive
      );

      if (isActive) {
        btn.setAttribute(
          "aria-current",
          "page"
        );
      } else {
        btn.removeAttribute(
          "aria-current"
        );
      }
    }
  );

  renderScreen(id);

  document.title =
    SCREEN_TITLE[id] ||
    "Civic OS — Report. Connect. Resolve.";

  window.scrollTo({
    top: 0,
    behavior: "instant"
  });

  const hashName =
    SCREEN_HASH[id];

  if (hashName) {
    const hash =
      "#" + hashName;

    if (
      push &&
      location.hash !== hash
    ) {
      history.pushState(
        { screen: id },
        "",
        hash
      );
    }
  }
}

function renderScreen(id) {
  if (id === "homeScreen") {
    renderHome();
  }

  if (id === "reportScreen") {
    updateStepper();
  }

  if (id === "issuesScreen") {
    renderIssues();
  }

  if (id === "dashboardScreen") {
    renderDashboard();
  }

  if (id === "communityScreen") {
    renderCommunity();
  }

  if (id === "actionsScreen") {
    renderCivicActions();
  }

  refreshIcons();
}


/* =========================================================
   6. HOME
   ========================================================= */

function renderHome() {
  const latest =
    [...issues].sort(
      (a, b) =>
        b.reportedAt -
        a.reportedAt
    )[0];

  if (!latest) return;

  const cat =
    CATEGORIES[latest.category] ||
    CATEGORIES.other;

  const stepIndex =
    STATUSES.indexOf(
      latest.status
    );

  const heroSignal =
    $("#heroSignal");

  if (heroSignal) {
    heroSignal.innerHTML = `
      <div class="signal-head">
        <span class="signal-live">
          <span
            class="pulse-dot"
            aria-hidden="true"
          ></span>
          Live civic signal
        </span>

        <span class="signal-id">
          ${escapeHtml(latest.id)}
        </span>
      </div>

      <p class="kicker">
        ${escapeHtml(cat.aiLabel)}
        ·
        ${timeAgo(latest.reportedAt)}
      </p>

      <h3 class="signal-title">
        ${escapeHtml(latest.title)}
      </h3>

      <p class="signal-loc">
        <i data-lucide="map-pin"></i>
        ${escapeHtml(latest.location)}
      </p>

      <div class="tag-row">
        ${statusPill(latest.status)}
      </div>

      <div class="signal-ai">
        <span class="signal-ai-label">
          <i data-lucide="sparkles"></i>
          Civic AI recommendation
        </span>

        <p>
          ${escapeHtml(
            latest.recommendation
          )}
        </p>
      </div>

      <ol
        class="pipeline"
        aria-label="Issue progress"
      >
        ${STATUSES.map(
          (s, i) => `
            <li
              class="pipeline-step
              ${i <= stepIndex ? "done" : ""}
              ${i === stepIndex ? "current" : ""}"
            >
              ${escapeHtml(s)}
            </li>
          `
        ).join("")}
      </ol>

      <div class="signal-foot">
        <span class="signal-dept">
          <i data-lucide="building-2"></i>
          ${escapeHtml(
            latest.department
          )}
        </span>

        <button
          type="button"
          class="link-btn"
          data-issue="${escapeHtml(
            latest.id
          )}"
        >
          View report
          <i data-lucide="arrow-right"></i>
        </button>
      </div>
    `;
  }

  const counts =
    statusCounts();

  const awaiting =
    counts.Reported +
    counts.Verified;

  const homeStats =
    $("#homeStats");

  if (homeStats) {
    homeStats.innerHTML = [
      {
        value: issues.length,
        label: "Total reports"
      },
      {
        value: counts.Resolved,
        label: "Issues resolved",
        accent: true
      },
      {
        value:
          counts["In Progress"],
        label: "In progress"
      },
      {
        value: awaiting,
        label: "Awaiting action"
      }
    ]
      .map(
        (s) => `
          <div
            class="stat glass ${
              s.accent
                ? "stat-accent"
                : ""
            }"
          >
            <div class="stat-value">
              ${s.value}
            </div>

            <div class="stat-label">
              ${escapeHtml(s.label)}
            </div>
          </div>
        `
      )
      .join("");
  }

  const recent =
    $("#recentIssues");

  if (recent) {
    recent.innerHTML =
      [...issues]
        .sort(
          (a, b) =>
            b.reportedAt -
            a.reportedAt
        )
        .slice(0, 3)
        .map(issueCard)
        .join("");
  }

  const openMissions =
    MISSIONS.filter(
      (m) =>
        m.joined < m.needed
    ).length;

  const teaser =
    $("#communityTeaser");

  if (teaser) {
    teaser.innerHTML = `
      <div>
        <p class="kicker">
          Connect
        </p>

        <h2
          id="teaserTitle"
          class="teaser-title"
        >
          Your skills can fix your city.
        </h2>

        <p class="teaser-sub">
          Students, designers, technicians
          and volunteers matched to real
          civic problems.
        </p>
      </div>

      <div class="teaser-meta">
        <div
          class="avatar-stack"
          aria-hidden="true"
        >
          ${PEOPLE.slice(0, 5)
            .map(
              (p, i) => `
                <span
                  class="avatar tone-${i % 4}"
                >
                  ${initials(p.name)}
                </span>
              `
            )
            .join("")}
        </div>

        <span class="muted-text">
          ${PEOPLE.length}
          contributors ·
          ${openMissions}
          open missions
        </span>

        <button
          type="button"
          class="btn btn-ghost"
          data-goto="communityScreen"
        >
          Find a mission
          <i data-lucide="arrow-right"></i>
        </button>
      </div>
    `;
  }

  refreshIcons();
}

function issueCard(issue) {
  const cat =
    CATEGORIES[issue.category] ||
    CATEGORIES.other;

  const iconTone = issue.status === "Resolved" ? "is-resolved" : "";

  return `
    <button
      type="button"
      class="issue-card glass"
      data-issue="${escapeHtml(issue.id)}"
    >
      <span
        class="issue-icon ${iconTone}"
        aria-hidden="true"
      >
        <i data-lucide="${cat.icon}"></i>
      </span>

      <span class="issue-main">

        <span class="issue-top">
          <span>${escapeHtml(issue.id)}</span>
          <span aria-hidden="true">·</span>
          <span>${timeAgo(issue.reportedAt)}</span>
          <span aria-hidden="true">·</span>
          <span>${escapeHtml(cat.label)}</span>
        </span>

        <span class="issue-title">
          ${escapeHtml(issue.title)}
        </span>

        <span class="issue-meta">
          <span>
            <i data-lucide="map-pin"></i>
            ${escapeHtml(issue.location)}
          </span>

          <span>
            <i data-lucide="building-2"></i>
            ${escapeHtml(issue.department)}
          </span>
        </span>

        <span class="issue-tags">
          ${statusPill(issue.status)}

          <span class="pill">
            <i data-lucide="users"></i>
            ${issue.supporters}
            <span class="sr-only">
              supporters
            </span>
          </span>
        </span>

      </span>

      <i
        data-lucide="chevron-right"
        class="issue-chevron"
      ></i>
    </button>
  `;
}


/* =========================================================
   7. REPORT FLOW
   ========================================================= */

function renderCategoryOptions() {
  const grid =
    $("#categoryGrid");

  if (!grid) return;

  grid.innerHTML =
    Object.entries(CATEGORIES)
      .map(
        ([key, cat]) => `
          <div class="cat-option">

            <input
              type="radio"
              name="category"
              id="cat-${key}"
              value="${key}"
            />

            <label
              for="cat-${key}"
              class="cat-card"
            >
              <i data-lucide="${cat.icon}"></i>
              ${escapeHtml(cat.label)}
            </label>

          </div>
        `
      )
      .join("");

  refreshIcons();
}

function getDraft() {
  const form =
    $("#reportForm");

  if (!form) {
    return {
      categoryKey: null,
      description: "",
      location: "",
      hasPhoto: false
    };
  }

  const checked =
    form.querySelector(
      'input[name="category"]:checked'
    );

  return {
    categoryKey:
      checked
        ? checked.value
        : null,

    description:
      $("#description")?.value.trim() ||
      "",

    location:
      $("#location")?.value.trim() ||
      "",

    hasPhoto:
      state.draftEvidenceUrls.length > 0,

    coordinates:
      parseIssueCoordinates(
        $("#location")?.value.trim() || ""
      )
  };
}

function updateStepper() {
  const form =
    $("#reportForm");

  const stepper =
    $("#reportStepper");

  if (!form || !stepper) return;

  const draft =
    getDraft();

  const submitted =
    form.hidden;

  const done = {
    category:
      Boolean(
        draft.categoryKey
      ) || submitted,

    details:
      (
        draft.description.length >=
          10 &&
        draft.location.length >=
          3
      ) || submitted,

    analyze:
      Boolean(
        state.analysis
      ) || submitted,

    submit:
      submitted
  };

  let currentMarked =
    false;

  $$("#reportStepper li")
    .forEach((li) => {
      const isDone =
        done[li.dataset.step];

      li.classList.toggle(
        "done",
        isDone
      );

      const isCurrent =
        !isDone &&
        !currentMarked;

      li.classList.toggle(
        "current",
        isCurrent
      );

      if (isCurrent) {
        currentMarked = true;

        li.setAttribute(
          "aria-current",
          "step"
        );
      } else {
        li.removeAttribute(
          "aria-current"
        );
      }
    });
}

function showFormError(
  message
) {
  const el =
    $("#formError");

  if (!el) return;

  if (!message) {
    el.hidden = true;
    el.textContent = "";
    return;
  }

  el.innerHTML = `
    <i data-lucide="triangle-alert"></i>
    <span>
      ${escapeHtml(message)}
    </span>
  `;

  el.hidden = false;

  refreshIcons();
}

function invalidateAnalysis() {
  if (
    !state.analysis &&
    !state.analyzing
  ) {
    return;
  }

  state.analysis = null;

  const panel =
    $("#aiPanel");

  if (panel) {
    panel.innerHTML = "";
  }
}

async function geocodeCivicLocation(query) {
  const textQuery = String(query || "").trim();
  const existing = parseIssueCoordinates(textQuery);
  if (!textQuery || existing) return existing;

  // Best-effort address lookup. Reporting remains available if lookup fails.
  try {
    const url = new URL("https://nominatim.openstreetmap.org/search");
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("limit", "1");
    url.searchParams.set("countrycodes", "in");
    url.searchParams.set("q", /manipur|india/i.test(textQuery)
      ? textQuery
      : `${textQuery}, Manipur, India`);
    const response = await fetch(url.toString(), {
      headers: { Accept: "application/json" }
    });
    if (!response.ok) return null;
    const results = await response.json();
    const match = Array.isArray(results) ? results[0] : null;
    if (!match) return null;
    const latitude = Number(match.lat);
    const longitude = Number(match.lon);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
    if (latitude < 23 || latitude > 25.8 || longitude < 92 || longitude > 95.8) return null;
    return { latitude, longitude };
  } catch (error) {
    console.warn("Location lookup unavailable; keeping the typed address:", error);
    return null;
  }
}

async function handleAnalyze(event) {
  event.preventDefault();

  if (state.analyzing) return;

  const draft =
    getDraft();

  const descEl =
    $("#description");

  const locEl =
    $("#location");

  if (!descEl || !locEl) return;

  descEl.removeAttribute(
    "aria-invalid"
  );

  locEl.removeAttribute(
    "aria-invalid"
  );

  if (
    draft.description.length <
    10
  ) {
    descEl.setAttribute(
      "aria-invalid",
      "true"
    );

    showFormError(
      "Please describe the problem in at least a few words."
    );

    descEl.focus();

    return;
  }

  if (
    draft.location.length <
    3
  ) {
    locEl.setAttribute(
      "aria-invalid",
      "true"
    );

    showFormError(
      "Please add a location so the right team can find it."
    );

    locEl.focus();

    return;
  }

  showFormError(null);

  state.analyzing = true;
  const analyzeBtn = $("#analyzeBtn");
  if (analyzeBtn) analyzeBtn.disabled = true;

  // GPS text already contains coordinates. Resolve typed places when possible.
  if (!draft.coordinates) {
    draft.coordinates = await geocodeCivicLocation(draft.location);
  }
  state.draft = draft;

  const steps = [
    "Reading your description",
    "Detecting the issue category",
    "Preparing report summary",
    "Routing to a department",
    "Checking for duplicate reports"
  ];

  const panel =
    $("#aiPanel");

  if (!panel) return;

  panel.innerHTML = `
    <div class="ai-card is-loading">

      <div class="ai-head">
        <span class="ai-title">
          <i data-lucide="brain-circuit"></i>
          Civic AI is analyzing…
        </span>

        <span class="demo-badge">
          Demo AI
        </span>
      </div>

      <ol class="ai-steps">
        ${steps
          .map(
            (s) => `
              <li class="ai-step">
                <span class="ai-step-icon">
                  <i data-lucide="loader-circle"></i>
                </span>
                ${escapeHtml(s)}
              </li>
            `
          )
          .join("")}
      </ol>

    </div>
  `;

  refreshIcons();

  panel.scrollIntoView({
    behavior: "smooth",
    block: "start"
  });

  const stepEls =
    $$(".ai-step", panel);

  let index = 0;

  const tick = async () => {
    stepEls.forEach(
      (el, i) => {
        el.classList.toggle(
          "done",
          i < index
        );

        el.classList.toggle(
          "active",
          i === index
        );
      }
    );

    if (
      index <
      stepEls.length
    ) {
      index++;

      setTimeout(
        tick,
        380
      );

      return;
    }

    let modelAnalysis = null;
    let modelUnavailableReason = '';
    try {
      const client = window.civicSupabase;
      if (!client) throw new Error('Secure Civic AI client is unavailable.');
      const evidenceTypes = state.draftEvidenceFiles.map((file) =>
        file.type.startsWith('video/') ? 'video' :
        file.type.startsWith('audio/') ? 'audio' : 'image'
      );
      const imageFiles = state.draftEvidenceFiles.filter((file) => file.type.startsWith('image/')).slice(0, 3);
      const imageDataUrls = [];
      for (const file of imageFiles) imageDataUrls.push(await civicImageToDataUrl(file));
      const { data, error } = await client.functions.invoke('civic-ai-analyze-dev', {
        body: { categoryKey: draft.categoryKey || 'other', description: draft.description, location: draft.location, hasPhoto: draft.hasPhoto, evidenceTypes, imageDataUrls }
      });
      if (error) throw error;
      if (!data || !data.categoryKey) throw new Error('The AI service returned an incomplete result.');
      modelAnalysis = {
        categoryKey: data.categoryKey, categoryLabel: data.categoryLabel,
        department: data.department, confidence: data.confidence,
        summary: data.summary, recommendation: data.recommendation,
        signals: data.signals, skills: data.skills, autoDetected: data.autoDetected,
        suggestion: data.suggestion, categoryNeedsReview: data.categoryNeedsReview,
        imageNotAnalyzed: data.imageNotAnalyzed, duplicate: data.duplicate,
        engine: data.engine || 'groq'
      };
    } catch (error) {
      console.warn('Real Civic AI unavailable; using clearly labelled prototype analysis:', error);
      modelUnavailableReason = 'Real AI is not configured or temporarily unavailable. This result uses the local keyword prototype.';
    }

    state.analysis = modelAnalysis || { ...analyzeReport(draft), engine: 'prototype', modelUnavailableReason };
    state.analyzing = false;
    if (analyzeBtn) analyzeBtn.disabled = false;
    renderAnalysis();
  };

  tick();
}

async function civicImageToDataUrl(file) {
  if (file.size > 10 * 1024 * 1024) throw new Error("Image is too large for visual analysis.");
  const sourceUrl = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Could not read the selected image."));
    reader.readAsDataURL(file);
  });
  const image = await new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not decode the selected image."));
    img.src = sourceUrl;
  });
  const maxSide = 1280;
  const scale = Math.min(1, maxSide / Math.max(image.naturalWidth || image.width, image.naturalHeight || image.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round((image.naturalWidth || image.width) * scale));
  canvas.height = Math.max(1, Math.round((image.naturalHeight || image.height) * scale));
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Image processing is unavailable in this browser.");
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  const compressedBlob = await new Promise((resolve, reject) => {
    canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("Could not compress the image.")), "image/jpeg", 0.72);
  });
  return await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Could not prepare the image for AI analysis."));
    reader.readAsDataURL(compressedBlob);
  });
}

async function generateImprovementPreview() {
  const imageFile = state.draftEvidenceFiles.find((file) => file.type.startsWith("image/"));
  if (!imageFile) {
    toast("Add a clear photo of the place first, then generate an improvement preview.", "image-plus");
    document.querySelector("#photo")?.click();
    return;
  }

  const button = document.querySelector('[data-action="generate-improvement"]');
  const preview = document.getElementById("improvementPreview");
  if (!button || !preview) return;

  button.disabled = true;
  button.setAttribute("aria-busy", "true");
  button.innerHTML = '<i data-lucide="loader-circle"></i> Generating preview…';
  preview.hidden = false;
  preview.innerHTML = '<div class="improvement-loading"><i data-lucide="loader-circle"></i><strong>Creating an improved-place concept…</strong><span>This may take a little while. Keep this page open.</span></div>';
  refreshIcons();

  try {
    const client = window.civicSupabase;
    if (!client) throw new Error("Secure Civic OS connection is unavailable.");
    const imageDataUrl = await civicImageToDataUrl(imageFile);
    const draft = state.draft || {};
    const { data, error } = await client.functions.invoke("civic-generate-improvement", {
      body: {
        imageDataUrl,
        categoryKey: draft.categoryKey || "other",
        description: String(draft.description || "").slice(0, 1500),
        location: String(draft.location || "").slice(0, 300)
      }
    });
    if (error) throw error;
    if (!data || !data.imageDataUrl) throw new Error(data?.error || "The image service did not return a generated preview.");
    preview.innerHTML = `
      <h4>After-improvement concept</h4>
      <img class="improvement-generated-image" src="${escapeHtml(data.imageDataUrl)}" alt="AI-generated concept of how the reported place could look after improvement">
      <p class="improvement-image-note">Compare this concept with the original photo. The AI may alter details or add features that are not present in the real location.</p>
      <a class="btn btn-ghost btn-lg" href="${escapeHtml(data.imageDataUrl)}" download="civic-os-improvement-concept.png"><i data-lucide="download"></i> Save concept image</a>
    `;
  } catch (error) {
    console.error("Improvement image generation failed:", error);
    const message = String(error?.message || "");
    const setupMissing = message.includes("not configured") || message.includes("CLOUDFLARE");
    preview.innerHTML = `
      <div class="improvement-error">
        <strong>${setupMissing ? "Image generation needs setup" : "Could not generate the preview"}</strong>
        <p>${setupMissing ? "The secure image-generation service still needs Cloudflare Workers AI credentials added as Supabase secrets. Do not put them in website files." : "Please try again later. If the problem continues, the image-generation service needs troubleshooting."}</p>
      </div>
    `;
  } finally {
    button.disabled = false;
    button.removeAttribute("aria-busy");
    button.innerHTML = '<i data-lucide="image-plus"></i> Visualize After Improvement';
    refreshIcons();
  }
}

function renderAnalysis() {
  const a =
    state.analysis;

  const d =
    state.draft;

  const panel =
    $("#aiPanel");

  if (!a || !d || !panel) {
    return;
  }

  const note =
    a.autoDetected
      ? `
        <div class="ai-note">
          <i data-lucide="sparkles"></i>
          <span>
            Civic AI detected the category
            <strong>
              ${escapeHtml(
                a.categoryLabel
              )}
            </strong>
            from your description.
          </span>
        </div>
      `
      : a.suggestion
        ? `
          <div class="ai-note">
            <i data-lucide="sparkles"></i>
            <span>
              Your description sounds more like
              <strong>
                ${escapeHtml(
                  CATEGORIES[
                    a.suggestion
                  ].label
                )}
              </strong>.

              <button
                type="button"
                class="link-btn"
                data-action="use-suggestion"
                data-key="${escapeHtml(
                  a.suggestion
                )}"
              >
                Switch category
              </button>
            </span>
          </div>
        `
        : "";

  const photoNote =
    a.imageNotAnalyzed
      ? `
        <div class="ai-warning ai-evidence-warning">
          <i data-lucide="image-off"></i>
          <div class="ai-warning-body">
            <strong>Photo not visually analyzed</strong>
            <span>The image could not be sent to the vision model. Check your connection or submit with a clear written description.</span>
          </div>
        </div>
      `
      : a.mediaRelevant === false
        ? `
          <div class="ai-warning ai-evidence-warning">
            <i data-lucide="image-off"></i>
            <div class="ai-warning-body">
              <strong>Evidence may not match the report</strong>
              <span>${escapeHtml(a.mediaMismatchReason || "The uploaded image does not clearly support the reported civic issue.")} ${escapeHtml(a.mediaSummary || "")} Please attach a genuine, relevant photo or correct the report before submitting.</span>
            </div>
          </div>
        `
        : a.mediaSummary
          ? `
            <div class="ai-note">
              <i data-lucide="scan-eye"></i>
              <span><strong>Visual check:</strong> ${escapeHtml(a.mediaSummary)} The image check is an aid, not proof; please verify the result.</span>
            </div>
          `
          : d.hasPhoto
            ? `
              <div class="ai-warning ai-evidence-warning">
                <i data-lucide="image-off"></i>
                <div class="ai-warning-body">
                  <strong>Photo not visually analyzed</strong>
                  <span>Only text analysis was returned. Do not treat the image as verified evidence.</span>
                </div>
              </div>
            `
            : "";

  const categoryReviewNote =
    a.categoryNeedsReview
      ? `
        <div class="ai-warning ai-evidence-warning">
          <i data-lucide="circle-alert"></i>
          <div class="ai-warning-body">
            <strong>Category needs review</strong>
            <span>
              The selected category is not supported by the written description, so this report is shown as
              General Civic Issue instead of assuming a specific problem. Add details about the civic issue
              or choose a category supported by your description.
            </span>
          </div>
        </div>
      `
      : "";

  const duplicate =
    a.duplicate
      ? `
        <div class="ai-warning">

          <i data-lucide="copy-check"></i>

          <div class="ai-warning-body">

            <span>
              <strong>
                Possible duplicate:
              </strong>

              ${escapeHtml(
                a.duplicate.id
              )}

              ·

              ${escapeHtml(
                a.duplicate.title
              )}

              (${a.duplicate.supporters}
              supporters,
              ${escapeHtml(
                a.duplicate.status.toLowerCase()
              )}).
            </span>

            <span>

              <button
                type="button"
                class="link-btn"
                data-action="support-duplicate"
                data-id="${escapeHtml(
                  a.duplicate.id
                )}"
              >
                Support existing report instead
                <i data-lucide="arrow-right"></i>
              </button>

            </span>

          </div>
        </div>
      `
      : "";

  const signals =
    a.signals.length
      ? `
        <div class="ai-cell wide">

          <span class="ai-label">
            Risk signals detected
          </span>

          <div class="signal-list">

            ${a.signals
              .map(
                (s) => `
                  <span class="pill pill-high">
                    ${escapeHtml(s)}
                  </span>
                `
              )
              .join("")}

          </div>
        </div>
      `
      : "";

  panel.innerHTML = `
    <div class="ai-card">

      <div class="ai-head">

        <span class="ai-title">
          <i data-lucide="brain-circuit"></i>
          Civic AI analysis
        </span>

        <span class="demo-badge">
          ${a.engine === "groq" ? "Real model" : "Prototype"}
        </span>

      </div>

      ${a.modelUnavailableReason ? `
        <div class="ai-warning ai-evidence-warning">
          <i data-lucide="info"></i>
          <div class="ai-warning-body">
            <strong>Prototype analysis only</strong>
            <span>${escapeHtml(a.modelUnavailableReason)} Configure the server-side GROQ_API_KEY to enable real-model analysis. Do not put that key in website files.</span>
          </div>
        </div>
      ` : ""}
      ${note}
      ${photoNote}
      ${categoryReviewNote}

      <div class="ai-grid">

        <div class="ai-cell">
          <span class="ai-label">
            Issue category
          </span>

          <span class="ai-value">
            ${escapeHtml(
              a.categoryLabel
            )}
          </span>
        </div>

        <div class="ai-cell">
          <span class="ai-label">
            Suggested department
          </span>

          <span class="ai-value">
            ${escapeHtml(
              a.department
            )}
          </span>
        </div>

        <div class="ai-cell">
          <span class="ai-label">
            Location
          </span>

          <span class="ai-value">
            ${escapeHtml(
              d.location
            )}
          </span>
        </div>

        <div class="ai-cell">

          <span class="ai-label">
            Confidence
          </span>

          <div class="confidence">

            <span class="ai-value">
              ${a.confidence}%
            </span>

            <span class="confidence-track">

              <span
                class="confidence-fill"
                style="display:block;width:${a.confidence}%"
              ></span>

            </span>

          </div>

        </div>

        <div class="ai-cell wide">

          <span class="ai-label">
            AI summary
          </span>

          <p class="ai-text">
            ${escapeHtml(
              a.summary
            )}
          </p>

        </div>

        ${signals}

      </div>

      <div class="ai-reco">

        <span class="ai-label">
          <i data-lucide="sparkles"></i>
          AI recommendation
        </span>

        <p class="ai-text">
          ${escapeHtml(
            a.recommendation
          )}
        </p>

        <div class="ai-improvement">
          <button
            type="button"
            class="btn btn-primary btn-lg"
            data-action="generate-improvement"
          >
            <i data-lucide="image-plus"></i>
            Visualize After Improvement
          </button>
          <p class="ai-improvement-caption">Generate a concept preview based on your report photo, showing how this place could look after repair, cleanup, or improvement.</p>
          <div id="improvementPreview" class="improvement-preview" hidden aria-live="polite"></div>
          <p class="ai-improvement-disclaimer">AI-generated concept only. It is not a guarantee of the exact result or a substitute for an approved engineering plan.</p>
        </div>

      </div>

      ${duplicate}

      <div class="ai-actions">

        <button
          type="button"
          class="btn btn-primary btn-lg"
          data-action="submit-report"
        >
          <i data-lucide="send"></i>
          Submit report
        </button>

        <button
          type="button"
          class="btn btn-ghost btn-lg"
          data-action="edit-report"
        >
          Edit details
        </button>

      </div>

    </div>
  `;

  refreshIcons();

  updateStepper();
}


let civicAuthMode = "signin";
let civicPendingSubmit = false;

function civicAuthMessage(message, isError = false) {
  const target = document.getElementById("civicAuthMessage");
  if (!target) return;
  target.textContent = message || "";
  target.classList.toggle("is-error", Boolean(isError));
}

function openCivicAuth() {
  const dialog = document.getElementById("civicAuthDialog");
  if (!dialog) return;
  dialog.hidden = false;
  document.body.classList.add("civic-auth-open");
  civicAuthMessage("");
  document.getElementById("civicAuthEmail")?.focus();
}

function closeCivicAuth() {
  const dialog = document.getElementById("civicAuthDialog");
  if (dialog) dialog.hidden = true;
  document.body.classList.remove("civic-auth-open");
}

function setCivicAuthMode(mode) {
  civicAuthMode = mode === "signup" ? "signup" : "signin";
  const signup = civicAuthMode === "signup";
  const name = document.getElementById("civicAuthName");
  const nameLabel = document.getElementById("civicAuthNameLabel");
  const password = document.getElementById("civicAuthPassword");
  const signInTab = document.getElementById("civicAuthSignInTab");
  const signUpTab = document.getElementById("civicAuthSignUpTab");
  const submit = document.getElementById("civicAuthSubmit");
  if (name) { name.hidden = !signup; name.required = signup; }
  if (nameLabel) nameLabel.hidden = !signup;
  if (password) password.autocomplete = signup ? "new-password" : "current-password";
  if (signInTab) signInTab.className = signup ? "btn btn-ghost" : "btn btn-primary";
  if (signUpTab) signUpTab.className = signup ? "btn btn-primary" : "btn btn-ghost";
  if (submit) submit.textContent = signup ? "Create account and continue" : "Sign in and continue";
  civicAuthMessage("");
}

async function ensureCivicProfile(user) {
  if (!user || !window.civicSupabase) return;
  const client = window.civicSupabase;
  const { data, error } = await client.from("profiles").select("id").eq("id", user.id).maybeSingle();
  if (error) throw error;
  if (!data) {
    const fullName = (user.user_metadata?.full_name || "").trim() || null;
    const result = await client.from("profiles").insert({ id: user.id, full_name: fullName });
    if (result.error) throw result.error;
  }
}

async function handleCivicAuth(event) {
  event.preventDefault();
  if (!window.civicSupabase) {
    civicAuthMessage("The secure database client did not load. Refresh the page and try again.", true);
    return;
  }
  const email = document.getElementById("civicAuthEmail")?.value.trim();
  const password = document.getElementById("civicAuthPassword")?.value || "";
  const fullName = document.getElementById("civicAuthName")?.value.trim();
  const submit = document.getElementById("civicAuthSubmit");
  if (submit) { submit.disabled = true; submit.textContent = "Please wait…"; }
  civicAuthMessage("");
  try {
    const client = window.civicSupabase;
    if (civicAuthMode === "signup") {
      const { data, error } = await client.auth.signUp({
        email, password, options: { data: { full_name: fullName || "" } }
      });
      if (error) throw error;
      if (!data.session) {
        civicAuthMessage("Account created. Check your email for the confirmation link, then return and sign in. Your report draft has not been submitted yet.");
        setCivicAuthMode("signin");
        return;
      }
    } else {
      const { error } = await client.auth.signInWithPassword({ email, password });
      if (error) throw error;
    }
    const { data: sessionData, error: sessionError } = await client.auth.getSession();
    if (sessionError) throw sessionError;
    if (!sessionData.session?.user) {
      civicAuthMessage("Please confirm your email first, then sign in to continue.", true);
      return;
    }
    await ensureCivicProfile(sessionData.session.user);
    closeCivicAuth();
    if (civicPendingSubmit) {
      civicPendingSubmit = false;
      await submitReport();
    }
  } catch (error) {
    console.error("Civic OS account action failed:", error);
    civicAuthMessage(error?.message || "Account action failed. Please try again.", true);
  } finally {
    if (submit) {
      submit.disabled = false;
      submit.textContent = civicAuthMode === "signup" ? "Create account and continue" : "Sign in and continue";
    }
  }
}

function setupCivicBackend() {
  const config = window.CIVIC_SUPABASE_CONFIG;
  if (window.supabase?.createClient && config?.url && config?.publishableKey) {
    window.civicSupabase = window.supabase.createClient(config.url, config.publishableKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
    });
  } else {
    console.warn("Civic OS Supabase config or client is missing.");
  }
  document.getElementById("civicAuthForm")?.addEventListener("submit", handleCivicAuth);
  document.getElementById("civicAuthSignInTab")?.addEventListener("click", () => setCivicAuthMode("signin"));
  document.getElementById("civicAuthSignUpTab")?.addEventListener("click", () => setCivicAuthMode("signup"));
  document.getElementById("civicAuthClose")?.addEventListener("click", () => {
    civicPendingSubmit = false;
    closeCivicAuth();
  });
  document.getElementById("civicAuthDialog")?.addEventListener("click", (event) => {
    if (event.target.id === "civicAuthDialog") {
      civicPendingSubmit = false;
      closeCivicAuth();
    }
  });
  if (window.civicSupabase) {
    window.civicSupabase.auth.onAuthStateChange((event, session) => {
      const user = session?.user;
      const label = document.getElementById("civicAccountButton");
      if (label) label.textContent = user ? "Account: " + (user.email || "signed in") : "Sign in";
    });
    loadPersistentCivicReports();
  }
}

async function loadPersistentCivicReports() {
  if (!window.civicSupabase) return;
  try {
    const client = window.civicSupabase;
    const { data: sessionData, error: sessionError } = await client.auth.getSession();
    if (sessionError) throw sessionError;

    // The public map intentionally exposes only reports approved for public display.
    const { data: publicRows, error: publicError } = await client.rpc("get_public_issue_map");
    if (publicError) throw publicError;

    // Citizens must still be able to reload their own reports while they await verification.
    // RLS limits this query to reports the signed-in user is permitted to read.
    let ownRows = [];
    const user = sessionData.session?.user;
    if (user) {
      const { data, error } = await client
        .from("reports")
        .select("id,public_id,title,category,description,status,public_impact,location,reported_at,resolved_at")
        .eq("reported_by", user.id)
        .order("reported_at", { ascending: true });
      if (error) throw error;
      ownRows = data || [];
    }

    const rowsById = new Map();
    for (const row of [...(publicRows || []), ...ownRows]) {
      if (row.public_id) rowsById.set(row.public_id, row);
    }

    const existing = new Set(issues.map((issue) => issue.id));
    for (const row of [...rowsById.values()].reverse()) {
      if (!row.public_id || existing.has(row.public_id)) continue;
      const place = typeof row.location === "string"
        ? row.location
        : row.location?.address || row.location?.label || row.location?.name || "Location not specified";
      const issue = createIssue({
        id: row.public_id,
        title: row.title,
        category: row.category,
        description: row.description || row.public_impact || row.title,
        location: place,
        latitude: typeof row.location === "object" ? row.location.latitude : null,
        longitude: typeof row.location === "object" ? row.location.longitude : null,
        locationPrecision: typeof row.location === "object" ? row.location.precision : null,
        area: "Saved citizen report",
        status: row.status || "Reported",
        supporters: 1,
        reportedAt: row.reported_at ? new Date(row.reported_at).getTime() : Date.now()
      });
      issue.databaseId = row.id;
      issue.persisted = true;
      if (row.resolved_at) issue.resolvedAt = new Date(row.resolved_at).getTime();
      issues.unshift(issue);
      existing.add(row.public_id);
    }
    renderHome();
    renderIssues();
    renderDashboard();
  } catch (error) {
    console.error("Could not load saved Civic OS reports:", error);
    toast("Saved reports could not be loaded. Demo reports are still available.", "triangle-alert");
  }
}

async function saveReportEvidence(reportId, userId) {
  const supabase = window.civicSupabase;
  const files = [...state.draftEvidenceFiles];
  if (!files.length) return 0;

  const bucket = "civic-report-evidence";
  const uploadedPaths = [];
  const evidenceRows = [];
  try {
    for (const file of files) {
      const originalName = String(file.name || "evidence-image").replace(/[^a-zA-Z0-9._-]/g, "_").slice(-100);
      const extension = (originalName.match(/\.([a-zA-Z0-9]{1,8})$/)?.[1] || "img").toLowerCase();
      const path = `${userId}/${reportId}/${crypto.randomUUID()}.${extension}`;
      const { error: uploadError } = await supabase.storage.from(bucket).upload(path, file, {
        contentType: file.type,
        upsert: false
      });
      if (uploadError) throw uploadError;
      uploadedPaths.push(path);
      const mediaType = file.type.startsWith("video/") ? "video" : file.type.startsWith("audio/") ? "audio" : "image";
      evidenceRows.push({
        report_id: reportId,
        storage_path: path,
        media_type: mediaType,
        original_name: originalName
      });
    }

    const { error: evidenceError } = await supabase.from("report_evidence").insert(evidenceRows);
    if (evidenceError) throw evidenceError;
    return evidenceRows.length;
  } catch (error) {
    if (uploadedPaths.length) {
      const { error: cleanupError } = await supabase.storage.from(bucket).remove(uploadedPaths);
      if (cleanupError) console.warn("Evidence cleanup failed; check private storage:", cleanupError);
    }
    throw error;
  }
}

async function retryCivicEvidenceUpload() {
  const pending = state.pendingEvidenceReport;
  if (!pending || !state.draftEvidenceFiles.length) return;
  const button = $('[data-action="retry-evidence-upload"]');
  if (button) { button.disabled = true; button.textContent = "Uploading…"; }
  try {
    const count = await saveReportEvidence(pending.id, pending.userId);
    state.pendingEvidenceReport = null;
    clearPhoto({ revoke: true });
    resetReportForm();
    const panel = $("#aiPanel");
    const warning = panel?.querySelector(".evidence-warning");
    if (warning) warning.remove();
    const retry = panel?.querySelector('[data-action="retry-evidence-upload"]');
    if (retry) retry.remove();
    const success = panel?.querySelector(".success-sub");
    if (success) success.textContent = `Your report is saved to Civic OS. ${count} evidence file(s) were securely uploaded. initial category and department suggestions are AI-assisted and should be reviewed by an authorised official.`;
    refreshIcons();
    toast(`${count} evidence file(s) uploaded`);
  } catch (error) {
    console.error("Civic OS evidence retry failed:", error);
    if (button) { button.disabled = false; button.textContent = "Retry photo upload"; }
    toast("Evidence upload failed again. Check your connection and retry.", "triangle-alert");
  }
}

async function submitReport() {
  const a = state.analysis;
  const d = state.draft;
  if (!a || !d) return;

  if (!window.civicSupabase) {
    toast("Secure reporting is unavailable right now. Please refresh and try again.", "triangle-alert");
    return;
  }

  const { data: sessionData, error: sessionError } = await window.civicSupabase.auth.getSession();
  if (sessionError) {
    toast("Could not check your account. Please try again.", "triangle-alert");
    return;
  }
  if (!sessionData.session?.user) {
    civicPendingSubmit = true;
    setCivicAuthMode("signin");
    openCivicAuth();
    civicAuthMessage("Sign in or create an account to save this report. Your draft is preserved.");
    return;
  }

  const user = sessionData.session.user;
  const publicId = `CIV-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
  const title = makeTitle(d.description);
  // Assign each new report to its initial responsible department so it appears
  // in that department's authenticated Government Portal and the live development view.
  // This is a routing suggestion; authorised officials can review/reassign it.
  const initialDepartmentByCategory = {
    roads: "pwd",
    garbage: "mahud",
    streetlights: "power",
    water: "water_resources",
    health: "health",
    education: "education",
    environment: "environment_forest",
    agriculture: "agriculture",
    transport: "transport",
    animals: "animal_husbandry",
    sports: "youth_sports"
  };
  const initialDepartmentId = initialDepartmentByCategory[a.categoryKey] || null;

  const insertRow = {
    public_id: publicId,
    title,
    category: a.categoryKey,
    primary_department_id: initialDepartmentId,
    description: d.description,
    location: {
      address: d.location,
      precision: d.coordinates ? "geocoded-or-gps" : "citizen-entered",
      ...(d.coordinates || {})
    },
    reported_by: user.id,
    public_impact: a.summary || title,
    ai_confidence: a.confidence || 35,
    routing_reason: "Initial prototype keyword analysis; department routing requires review.",
    verification_required: true
  };

  const submitButton = document.querySelector('[data-action="submit-report"]');
  if (submitButton) { submitButton.disabled = true; submitButton.setAttribute("aria-busy", "true"); }
  try {
    const { data: saved, error } = await window.civicSupabase
      .from("reports")
      .insert(insertRow)
      .select("id,public_id,status,reported_at")
      .single();
    if (error) throw error;

    let evidenceCount = 0;
    let evidenceError = null;
    if (state.draftEvidenceFiles.length) {
      try {
        evidenceCount = await saveReportEvidence(saved.id, user.id);
      } catch (uploadError) {
        evidenceError = uploadError;
        state.pendingEvidenceReport = { id: saved.id, userId: user.id, publicId: saved.public_id };
        console.error("Report saved but evidence upload failed:", uploadError);
      }
    }

    const issue = createIssue({
      id: saved.public_id,
      title,
      category: a.categoryKey,
      description: d.description,
      location: d.location,
      latitude: d.coordinates?.latitude,
      longitude: d.coordinates?.longitude,
      locationPrecision: d.coordinates ? (parseIssueCoordinates(d.location) ? "gps" : "geocoded") : null,
      area: "Saved citizen report",
      status: saved.status || "Reported",
      supporters: 1,
      photo: null,
      reportedAt: saved.reported_at ? new Date(saved.reported_at).getTime() : Date.now()
    });
    issue.summary = a.summary;
    issue.recommendation = a.recommendation;
    issue.databaseId = saved.id;
    issue.persisted = true;
    issues.unshift(issue);
    state.supported.add(saved.public_id);

    if (!evidenceError) {
      clearPhoto({ revoke: true });
      resetReportForm();
    }
    const reportForm = $("#reportForm");
    if (reportForm) reportForm.hidden = true;
    state.analysis = null;

    const panel = $("#aiPanel");
    if (panel) {
      panel.innerHTML = `
        <div class="ai-card success-card">
          <span class="success-icon"><i data-lucide="check"></i></span>
          <p class="kicker">${escapeHtml(saved.public_id)} · ${escapeHtml(issue.department)}</p>
          <h3 class="success-title">Report saved</h3>
          <p class="success-sub">Your report is saved to Civic OS and can be loaded again after refresh. ${evidenceError ? "Photo upload failed; your selected photos remain available in this session so you can retry." : evidenceCount ? `${evidenceCount} evidence file(s) were securely uploaded.` : "No evidence photos were attached."} Its initial category and department suggestions are AI-assisted and should be reviewed by an authorised official.</p>
          ${evidenceError ? '<p class="evidence-warning" role="status">Your report is saved, but its photos are not attached yet.</p>' : ""}
          <div class="success-actions">
            ${evidenceError ? '<button type="button" class="btn btn-primary" data-action="retry-evidence-upload">Retry photo upload</button>' : ""}
            <button type="button" class="btn btn-primary" data-issue="${escapeHtml(saved.public_id)}"><i data-lucide="activity"></i>Track this issue</button>
            <button type="button" class="btn btn-ghost" data-action="report-another">Report another</button>
          </div>
        </div>`;
      refreshIcons();
      const retryEvidenceButton = panel.querySelector('[data-action="retry-evidence-upload"]');
      if (retryEvidenceButton) retryEvidenceButton.addEventListener("click", retryCivicEvidenceUpload);
    }
    updateStepper();
    renderHome();
    renderIssues();
    renderDashboard();
    window.scrollTo({ top: 0, behavior: "smooth" });
    toast(`${saved.public_id} saved successfully`);
  } catch (error) {
    console.error("Civic OS report save failed:", error);
    const rawMessage = String(error?.message || error?.details || error?.hint || "");
    const errorCode = String(error?.code || "");
    console.error("Report submission diagnostic:", {
      code: errorCode,
      message: rawMessage,
      details: error?.details || null,
      hint: error?.hint || null
    });
    const userMessage = /row-level security|permission denied|42501/i.test(rawMessage)
      ? "Report save was blocked by database permissions. Your draft is still available; please retry shortly."
      : /foreign key|23503/i.test(rawMessage)
        ? "Report could not be routed to its department. Your draft is still available."
        : /check constraint|23514|invalid input/i.test(rawMessage)
          ? "One of the report fields was rejected. Your draft is still available."
          : /duplicate key|23505/i.test(rawMessage)
            ? "This report ID conflicted with an existing record. Please submit again."
            : "Report could not be saved. Your draft is still available; check your connection and retry.";
    toast(userMessage, "triangle-alert");
  } finally {
    if (submitButton) { submitButton.disabled = false; submitButton.removeAttribute("aria-busy"); }
  }
}

function resetReportForm() {
  const form =
    $("#reportForm");

  if (!form) return;

  form.reset();

  clearPhoto({ revoke: true });

  const count =
    $("#descCount");

  if (count) {
    count.textContent =
      "0 / 500";
  }

  showFormError(null);
}


function setPhoto(files) {
  const selected = Array.from(files || []);
  if (!selected.length) return;
  const imageTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "image/heic", "image/heif"]);
  const videoTypes = new Set(["video/mp4", "video/quicktime", "video/webm"]);
  const audioTypes = new Set(["audio/mpeg", "audio/mp4", "audio/aac", "audio/wav", "audio/x-wav", "audio/webm", "audio/ogg"]);
  const currentImages = state.draftEvidenceFiles.filter((file) => file.type.startsWith("image/")).length;
  const currentVideos = state.draftEvidenceFiles.filter((file) => file.type.startsWith("video/")).length;
  const currentAudio = state.draftEvidenceFiles.filter((file) => file.type.startsWith("audio/")).length;
  const accepted = [];
  for (const file of selected) {
    let kind = "";
    let maxBytes = 0;
    if (imageTypes.has(file.type)) { kind = "image"; maxBytes = 10 * 1024 * 1024; }
    else if (videoTypes.has(file.type)) { kind = "video"; maxBytes = 50 * 1024 * 1024; }
    else if (audioTypes.has(file.type)) { kind = "audio"; maxBytes = 20 * 1024 * 1024; }
    else { toast("Unsupported file type. Choose a supported photo, video, or audio clip.", "triangle-alert"); continue; }
    if (file.size > maxBytes) {
      toast(kind === "image" ? "Each photo must be 10 MB or smaller." : kind === "video" ? "Each video must be 50 MB or smaller." : "Each audio clip must be 20 MB or smaller.", "triangle-alert");
      continue;
    }
    if (kind === "image" && currentImages + accepted.filter((f) => f.type.startsWith("image/")).length >= 5) { toast("You can attach up to 5 photos.", "triangle-alert"); continue; }
    if (kind === "video" && currentVideos + accepted.filter((f) => f.type.startsWith("video/")).length >= 1) { toast("You can attach one video.", "triangle-alert"); continue; }
    if (kind === "audio" && currentAudio + accepted.filter((f) => f.type.startsWith("audio/")).length >= 1) { toast("You can attach one audio clip.", "triangle-alert"); continue; }
    accepted.push(file);
  }
  if (!accepted.length) return;
  state.draftEvidenceFiles.push(...accepted);
  state.draftEvidenceUrls.push(...accepted.map((file) => URL.createObjectURL(file)));
  renderPhotoPreviews();
  const photo = $("#photo");
  if (photo) photo.value = "";
  invalidateAnalysis();
}

function renderPhotoPreviews() {
  const preview = $("#photoPreview");
  const dropzone = $("#dropzone");
  if (!preview || !dropzone) return;
  preview.innerHTML = state.draftEvidenceFiles.map((file, index) => {
    const url = state.draftEvidenceUrls[index];
    const type = file.type.startsWith("video/") ? "video" : file.type.startsWith("audio/") ? "audio" : "image";
    const content = type === "image"
      ? '<img src="' + url + '" alt="Selected evidence photo ' + (index + 1) + '" />'
      : type === "video"
        ? '<video src="' + url + '" controls playsinline preload="metadata" aria-label="Selected evidence video ' + (index + 1) + '"></video>'
        : '<audio src="' + url + '" controls preload="metadata" aria-label="Selected evidence audio ' + (index + 1) + '"></audio>';
    return '<div class="photo-thumb media-thumb">' + content
      + '<p class="media-file-name">' + escapeHtml(file.name || ("Evidence " + (index + 1))) + '</p>'
      + '<button type="button" class="icon-btn" data-remove-photo-index="' + index + '" aria-label="Remove evidence ' + (index + 1) + '"><i data-lucide="x"></i></button></div>';
  }).join("") + (state.draftEvidenceFiles.length
    ? '<p class="photo-preview-note">Evidence uploads privately when you submit the report. Images, video, and audio are not publicly accessible.</p>'
    : "");
  preview.hidden = state.draftEvidenceFiles.length === 0;
  const images = state.draftEvidenceFiles.filter((file) => file.type.startsWith("image/")).length;
  const videos = state.draftEvidenceFiles.some((file) => file.type.startsWith("video/"));
  const audio = state.draftEvidenceFiles.some((file) => file.type.startsWith("audio/"));
  dropzone.hidden = images >= 5 && videos && audio;
  refreshIcons();
}

function clearPhoto({ revoke } = {}) {
  if (revoke) {
    state.draftEvidenceUrls.forEach((url) => {
      try { URL.revokeObjectURL(url); } catch {}
    });
  }
  state.draftEvidenceUrls = [];
  state.draftEvidenceFiles = [];
  const photo = $("#photo");
  if (photo) photo.value = "";
  renderPhotoPreviews();
}

function fillExample() {
  const example =
    EXAMPLES[
      state.exampleIndex %
        EXAMPLES.length
    ];

  state.exampleIndex++;

  const radio =
    document.getElementById(
      `cat-${example.category}`
    );

  if (radio) {
    radio.checked = true;
  }

  const description =
    $("#description");

  const location =
    $("#location");

  const count =
    $("#descCount");

  if (description) {
    description.value =
      example.description;
  }

  if (location) {
    location.value =
      example.location;
  }

  if (count) {
    count.textContent =
      `${example.description.length} / 500`;
  }

  invalidateAnalysis();

  showFormError(null);

  updateStepper();
}

function useCurrentLocation() {
  const btn =
    $("#locateBtn");

  if (
    !("geolocation" in navigator)
  ) {
    toast(
      "Location is not available on this device",
      "triangle-alert"
    );

    return;
  }

  if (btn) {
    btn.disabled = true;

    const span =
      btn.querySelector("span");

    if (span) {
      span.textContent =
        "Locating…";
    }
  }

  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const location =
        $("#location");

      if (location) {
        location.value =
          `GPS ${pos.coords.latitude.toFixed(
            5
          )}, ${pos.coords.longitude.toFixed(
            5
          )}`;
      }

      if (btn) {
        btn.disabled = false;

        const span =
          btn.querySelector(
            "span"
          );

        if (span) {
          span.textContent =
            "Use my current location";
        }
      }

      invalidateAnalysis();

      updateStepper();

      toast(
        "Location added"
      );
    },

    () => {
      if (btn) {
        btn.disabled = false;

        const span =
          btn.querySelector(
            "span"
          );

        if (span) {
          span.textContent =
            "Use my current location";
        }
      }

      toast(
        "Couldn't get your location — please type it",
        "triangle-alert"
      );
    },

    {
      enableHighAccuracy: true,
      timeout: 8000
    }
  );
}


/* =========================================================
   8. ISSUE EXPLORER + DETAIL SHEET
   ========================================================= */

function setupIssueFilters() {
  const category =
    $("#filterCategory");

  const chips =
    $("#statusChips");

  if (category) {
    category.innerHTML =
      `<option value="all">All categories</option>` +
      Object.entries(CATEGORIES)
        .map(
          ([key, cat]) =>
            `<option value="${key}">${escapeHtml(
              cat.label
            )}</option>`
        )
        .join("");
  }

  if (chips) {
    chips.innerHTML =
      ["All", ...STATUSES]
        .map(
          (s) => `
            <button
              type="button"
              class="chip"
              data-status-filter="${escapeHtml(s)}"
              aria-pressed="false"
            >
              ${escapeHtml(s)}
              <span class="chip-count"></span>
            </button>
          `
        )
        .join("");
  }
}

function syncFilterControls() {
  const f =
    state.filters;

  const category =
    $("#filterCategory");

  const sort =
    $("#sortIssues");

  const search =
    $("#issueSearch");

  if (category) {
    category.value =
      f.category;
  }

  if (sort) {
    sort.value =
      f.sort;
  }

  if (search) {
    search.value =
      f.query;
  }

  const counts =
    statusCounts();

  $$(
    "[data-status-filter]"
  ).forEach((chip) => {
    const s =
      chip.dataset.statusFilter;

    chip.setAttribute(
      "aria-pressed",
      String(
        s === f.status
      )
    );

    const count =
      chip.querySelector(
        ".chip-count"
      );

    if (count) {
      count.textContent =
        s === "All"
          ? issues.length
          : counts[s] || 0;
    }
  });
}

function getFilteredIssues() {
  const {
    status,
    category,
    sort,
    query
  } = state.filters;

  const q =
    query.trim().toLowerCase();

  const list =
    issues.filter((i) => {
      if (
        status !== "All" &&
        i.status !== status
      ) {
        return false;
      }

      if (
        category !== "all" &&
        i.category !== category
      ) {
        return false;
      }

      if (!q) {
        return true;
      }

      const cat =
        CATEGORIES[i.category] ||
        CATEGORIES.other;

      return [
        i.id,
        i.title,
        i.location,
        i.area,
        i.department,
        i.description,
        cat.label
      ]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });

  if (sort === "supported") {
    list.sort(
      (a, b) =>
        b.supporters -
        a.supporters
    );
  } else {
    list.sort(
      (a, b) =>
        b.reportedAt -
        a.reportedAt
    );
  }

  return list;
}

function renderIssues() {
  syncFilterControls();

  renderIssueList();
}

function renderIssueList() {
  const list =
    getFilteredIssues();

  const count =
    $("#issuesCount");

  const container =
    $("#issuesList");

  if (count) {
    count.textContent =
      `Showing ${list.length} of ${issues.length} reports. Tap any issue to see its AI analysis and progress.`;
  }

  if (!container) return;

  container.innerHTML =
    list.length
      ? list
          .map(issueCard)
          .join("")
      : `
        <div class="empty-state glass">

          <i data-lucide="scan-search"></i>

          <strong>
            No issues match these filters
          </strong>

          <span>
            Try a different status,
            category or search term.
          </span>

          <button
            type="button"
            class="btn btn-ghost btn-sm"
            data-action="clear-filters"
          >
            Clear filters
          </button>

        </div>
      `;

  refreshIcons();
}

function matchedHelpers(issue) {
  const skills =
    (
      CATEGORIES[
        issue.category
      ] ||
      CATEGORIES.other
    ).skills;

  return PEOPLE
    .map((p) => ({
      person: p,

      overlap:
        p.skills.filter(
          (s) =>
            skills.includes(s)
        )
    }))
    .filter(
      (m) =>
        m.overlap.length
    )
    .sort(
      (a, b) =>
        b.overlap.length -
        a.overlap.length
    )
    .slice(0, 3);
}

function openIssue(id) {
  const issue =
    getIssue(id);

  if (!issue) return;

  state.openIssueId =
    id;

  renderIssueSheet(issue);

  const dialog =
    $("#issueDialog");

  if (!dialog) return;

  if (!dialog.open) {
    dialog.showModal();
  }

  const inner =
    $(".sheet-inner");

  if (inner) {
    inner.scrollTop = 0;
  }
}

function renderIssueSheet(issue) {
  const cat =
    CATEGORIES[
      issue.category
    ] ||
    CATEGORIES.other;

  const stepIndex =
    STATUSES.indexOf(
      issue.status
    );

  const supported =
    state.supported.has(
      issue.id
    );

  const helpers =
    matchedHelpers(issue);

  const nextStatus =
    STATUSES[
      stepIndex + 1
    ];

  const body =
    $("#sheetBody");

  if (!body) return;

  body.innerHTML = `
    <div class="sheet-top">
      <span>${escapeHtml(issue.id)}</span>
      <span aria-hidden="true">·</span>
      <span>${timeAgo(issue.reportedAt)}</span>
      <span aria-hidden="true">·</span>
      <span>${escapeHtml(issue.area)}</span>
    </div>

    <h3
      id="sheetTitle"
      class="sheet-title"
    >
      ${escapeHtml(issue.title)}
    </h3>

    <div class="sheet-meta">

      <span>
        <i data-lucide="${cat.icon}"></i>
        ${escapeHtml(cat.label)}
      </span>

      <span>
        <i data-lucide="map-pin"></i>
        ${escapeHtml(issue.location)}
      </span>

    </div>

    <div
      class="tag-row"
      style="margin:0 0 18px"
    >
      ${statusPill(issue.status)}
    </div>

    ${
      issue.photo
        ? `
          <img
            class="sheet-photo"
            src="${issue.photo}"
            alt="Evidence photo for ${escapeHtml(
              issue.title
            )}"
          />
        `
        : ""
    }

    <p class="sheet-desc">
      ${escapeHtml(
        issue.description
      )}
    </p>

    <div class="sheet-section">

      <div class="sheet-section-title">
        <span>Progress</span>
        <span>
          ${stepIndex + 1}
          /
          ${STATUSES.length}
        </span>
      </div>

      <ol class="timeline">

        ${STATUSES.map(
          (s, i) => `
            <li
              class="tl-step
              ${i <= stepIndex ? "done" : ""}
              ${i === stepIndex ? "current" : ""}"
            >
              ${escapeHtml(s)}
            </li>
          `
        ).join("")}

      </ol>

    </div>

    <div class="sheet-section">

      <div class="sheet-section-title">

        <span>
          Civic AI analysis
        </span>

        <span class="demo-badge">
          Demo AI
        </span>

      </div>

      <div class="ai-grid">

        <div class="ai-cell">

          <span class="ai-label">
            Category
          </span>

          <span class="ai-value">
            ${escapeHtml(
              cat.aiLabel
            )}
          </span>

        </div>

        <div class="ai-cell wide">

          <span class="ai-label">
            Department
          </span>

          <span class="ai-value">
            ${escapeHtml(
              issue.department
            )}
          </span>

        </div>

        <div class="ai-cell wide">

          <span class="ai-label">
            Summary
          </span>

          <p class="ai-text">
            ${escapeHtml(
              issue.summary
            )}
          </p>

        </div>

      </div>

      <div class="ai-reco">

        <span class="ai-label">
          <i data-lucide="sparkles"></i>
          Recommendation
        </span>

        <p class="ai-text">
          ${escapeHtml(
            issue.recommendation
          )}
        </p>

      </div>

    </div>

    <div class="sheet-section">

      <div class="sheet-section-title">
        <span>
          Community activity
        </span>
      </div>

      <div class="support-box">

        <div>

          <div class="support-count">
            ${issue.supporters}
          </div>

          <div class="support-label">
            ${
              issue.supporters === 1
                ? "citizen is"
                : "citizens are"
            }
            affected by this
          </div>

        </div>

        <button
          type="button"
          class="btn ${
            supported
              ? "btn-ghost"
              : "btn-primary"
          } btn-sm"
          data-action="support"
          data-id="${escapeHtml(
            issue.id
          )}"
          aria-pressed="${supported}"
        >
          <i
            data-lucide="${
              supported
                ? "check"
                : "thumbs-up"
            }"
          ></i>

          ${
            supported
              ? "Supported"
              : "I'm affected too"
          }

        </button>

      </div>

    </div>

    ${
      helpers.length
        ? `
          <div class="sheet-section">

            <div class="sheet-section-title">

              <span>
                People who could help
              </span>

              <button
                type="button"
                class="link-btn"
                data-goto="communityScreen"
              >
                Community
                <i data-lucide="arrow-right"></i>
              </button>

            </div>

            <div class="helpers">

              ${helpers
                .map(
                  (h, i) => `
                    <div class="helper">

                      <span
                        class="avatar tone-${i % 4}
                        ${
                          h.person.org
                            ? "is-org"
                            : ""
                        }"
                        aria-hidden="true"
                      >
                        ${initials(
                          h.person.name
                        )}
                      </span>

                      <span class="helper-text">

                        <span>
                          ${escapeHtml(
                            h.person.name
                          )}
                        </span>

                        <small>
                          ${h.overlap
                            .map(
                              escapeHtml
                            )
                            .join(
                              " · "
                            )}
                        </small>

                      </span>

                    </div>
                  `
                )
                .join("")}

            </div>
          </div>
        `
        : ""
    }

    <div class="sheet-section">

      <div class="sheet-section-title">
        <span>Updates</span>
      </div>

      <ol class="updates">

        ${[
          ...issue.updates
        ]
          .reverse()
          .map(
            (u) => `
              <li class="update">

                <span
                  class="update-dot"
                  aria-hidden="true"
                ></span>

                <div>

                  <div class="update-head">
                    ${escapeHtml(
                      u.status
                    )}

                    <span class="update-time">
                      ${timeAgo(
                        u.time
                      )}
                    </span>
                  </div>

                  <p class="update-note">
                    ${escapeHtml(
                      u.note
                    )}
                  </p>

                </div>

              </li>
            `
          )
          .join("")}

      </ol>

    </div>

    <div class="sheet-section">

      <div class="official-box">

        <div class="sheet-section-title">
          <span>
            Governance demo control
          </span>
        </div>

        <p>
          For the presentation:
          act as
          ${escapeHtml(
            issue.department
          )}
          and move this issue
          through its lifecycle.
        </p>

        ${
          nextStatus
            ? `
              <button
                type="button"
                class="btn btn-ghost btn-sm"
                data-action="advance"
                data-id="${escapeHtml(
                  issue.id
                )}"
              >
                <i data-lucide="arrow-right"></i>
                Mark as
                ${escapeHtml(
                  nextStatus
                )}
              </button>
            `
            : `
              <span class="pill status-resolved">
                <i data-lucide="badge-check"></i>
                Fully resolved
              </span>
            `
        }

      </div>

    </div>
  `;

  refreshIcons();
}

function advanceIssue(id) {
  const issue =
    getIssue(id);

  if (!issue) return;

  const index =
    STATUSES.indexOf(
      issue.status
    );

  if (
    index <
      0 ||
    index >=
      STATUSES.length - 1
  ) {
    return;
  }

  const next =
    STATUSES[index + 1];

  const notes = {
    Verified:
      "Verified by the ward officer after a site check.",

    "In Progress":
      `${issue.department} team assigned and work scheduled.`,

    Resolved:
      "Work completed and issue closed."
  };

  issue.status =
    next;

  issue.updates.push({
    status: next,
    note: notes[next],
    time: Date.now()
  });

  renderIssueSheet(issue);

  renderScreen(
    state.screen
  );

  toast(
    next === "Resolved"
      ? `${issue.id} resolved`
      : `${issue.id} marked as ${next}`,
    next === "Resolved"
      ? "badge-check"
      : "circle-check"
  );
}

function toggleSupport(id) {
  const issue =
    getIssue(id);

  if (!issue) return;

  if (
    state.supported.has(id)
  ) {
    state.supported.delete(id);

    issue.supporters =
      Math.max(
        0,
        issue.supporters - 1
      );
  } else {
    state.supported.add(id);

    issue.supporters++;

    toast(
      "Thanks — your support raises this issue's visibility"
    );
  }

  renderIssueSheet(issue);

  renderScreen(
    state.screen
  );
}


/* =========================================================
   9. DASHBOARD
   ========================================================= */

function renderDashboard() {
  const body =
    $("#dashboardBody");

  if (!body) return;

  if (dashboardMapInstance) {
    dashboardMapInstance.remove();
    dashboardMapInstance = null;
  }
  dashboardMapMarkers.clear();

  const mappedMapIssues = issues.filter((issue) => getIssueMapCoordinates(issue));
  const unpinnedMapIssues = issues.filter((issue) => !getIssueMapCoordinates(issue));

  const total =
    issues.length;

  const counts =
    statusCounts();

  const open =
    issues.filter(
      (i) =>
        i.status !== "Resolved"
    );

  const awaiting =
    counts.Reported +
    counts.Verified;

  const resolutionRate =
    total
      ? Math.round(
          (counts.Resolved /
            total) *
            100
        )
      : 0;

  const byCategory =
    Object.keys(CATEGORIES)
      .map((key) => ({
        key,
        count:
          issues.filter(
            (i) =>
              i.category ===
              key
          ).length
      }))
      .filter(
        (c) => c.count
      )
      .sort(
        (a, b) =>
          b.count -
          a.count
      );

  const maxCategory =
    byCategory[0]?.count ||
    1;

  const byDepartment = {};

  open.forEach((i) => {
    byDepartment[
      i.department
    ] =
      (byDepartment[
        i.department
      ] || 0) + 1;
  });

  const departments =
    Object.entries(
      byDepartment
    ).sort(
      (a, b) =>
        b[1] - a[1]
    );

  const maxDept =
    departments[0]?.[1] ||
    1;

  const byArea = {};
  open.forEach((issue) => {
    byArea[issue.area] = byArea[issue.area] || { count: 0 };
    byArea[issue.area].count++;
  });
  const hotspots = Object.entries(byArea).sort((a, b) => b[1].count - a[1].count).slice(0, 4);

  const days = [];

  const today =
    new Date();

  today.setHours(
    0,
    0,
    0,
    0
  );

  for (
    let d = 6;
    d >= 0;
    d--
  ) {
    const start =
      today.getTime() -
      d * 24 * HOUR;

    const end =
      start + 24 * HOUR;

    const idx =
      6 - d;

    const reported =
      WEEKLY_BASELINE
        .reported[idx] +
      issues.filter(
        (i) =>
          i.reportedAt >=
            start &&
          i.reportedAt <
            end
      ).length;

    const resolved =
      WEEKLY_BASELINE
        .resolved[idx] +
      issues.filter(
        (i) =>
          i.updates.some(
            (u) =>
              u.status ===
                "Resolved" &&
              u.time >=
                start &&
              u.time <
                end
          )
      ).length;

    days.push({
      label:
        new Date(
          start
        )
          .toLocaleDateString(
            "en",
            {
              weekday:
                "short"
            }
          )
          .slice(0, 2),

      reported,

      resolved
    });
  }

  const maxDay =
    Math.max(
      ...days.map(
        (d) =>
          Math.max(
            d.reported,
            d.resolved
          )
      ),
      1
    );

  const topCategory =
    byCategory[0];

  const topShare =
    topCategory
      ? Math.round(
          (topCategory.count /
            total) *
            100
        )
      : 0;

  const topDept =
    departments[0];

  const topArea =
    hotspots[0];

  const statusColors = {
    Reported:
      "var(--st-reported)",

    Verified:
      "var(--st-verified)",

    "In Progress":
      "var(--st-progress)",

    Resolved:
      "var(--st-resolved)"
  };

  let cursor = 0;

  const donutStops =
    STATUSES.map(
      (s) => {
        const share =
          total
            ? (counts[s] /
                total) *
              100
            : 0;

        const stop =
          `${statusColors[s]} ${cursor}% ${
            cursor + share
          }%`;

        cursor += share;

        return stop;
      }
    ).join(", ");

  body.innerHTML = `
    <div class="kpi-grid">

      <button
        type="button"
        class="kpi glass"
        data-goto="issuesScreen"
        data-status="All"
      >
        <span class="kpi-label">
          <i data-lucide="flag"></i>
          Total reports
        </span>

        <span class="kpi-value">
          ${total}
        </span>

        <span class="kpi-sub">
          ${resolutionRate}% resolution rate
        </span>
      </button>

      <button
        type="button"
        class="kpi glass kpi-resolved"
        data-goto="issuesScreen"
        data-status="Resolved"
      >
        <span class="kpi-label">
          <i data-lucide="badge-check"></i>
          Resolved
        </span>

        <span class="kpi-value">
          ${counts.Resolved}
        </span>

        <span class="kpi-sub">
          Closed by departments
        </span>
      </button>

      <button
        type="button"
        class="kpi glass kpi-progress"
        data-goto="issuesScreen"
        data-status="In Progress"
      >
        <span class="kpi-label">
          <i data-lucide="activity"></i>
          In progress
        </span>

        <span class="kpi-value">
          ${counts["In Progress"]}
        </span>

        <span class="kpi-sub">
          Teams on site
        </span>
      </button>

      <button
        type="button"
        class="kpi glass"
        data-goto="issuesScreen"
        data-status="Reported"
      >
        <span class="kpi-label">
          <i data-lucide="clock"></i>
          Awaiting action
        </span>

        <span class="kpi-value">
          ${awaiting}
        </span>

        <span class="kpi-sub">
          Reported or verified
        </span>
      </button>    </div>

    <div class="insight-card">

      <span class="action-icon">
        <i data-lucide="brain-circuit"></i>
      </span>

      <div>

        <p class="insight-title">
          Civic AI governance summary
          <span class="demo-badge">
            Demo AI
          </span>
        </p>

        <p class="insight-text">

          ${
            topCategory
              ? `
                <strong>
                  ${escapeHtml(
                    CATEGORIES[
                      topCategory.key
                    ].label
                  )}
                </strong>
                is the most reported category
                (${topShare}% of reports).
              `
              : ""
          }

          ${
            topDept
              ? `
                <strong>
                  ${escapeHtml(
                    topDept[0]
                  )}
                </strong>
                carries the largest open workload
                with ${topDept[1]} active issues.
              `
              : ""
          }

          ${
            topArea
              ? `
                <strong>
                  ${escapeHtml(
                    topArea[0]
                  )}
                </strong>
                is the current hotspot with
                ${topArea[1].count}
                open reports
                .
              `
              : ""
          }

          Government officials review reports and determine the appropriate response and timing.

        </p>

      </div>

    </div>

    <section
      class="panel glass dashboard-map-panel"
      aria-labelledby="dashboardMapTitle"
    >
      <div class="panel-head dashboard-map-panel-head">
        <div>
          <h3 id="dashboardMapTitle" class="panel-title">Report locations</h3>
          <p class="panel-sub">Select a pin to inspect the issue and open its location.</p>
        </div>
        <span class="dashboard-map-count"><i data-lucide="map-pin"></i>${mappedMapIssues.length} mapped</span>
      </div>

      <div class="dashboard-map-layout">
        <div class="dashboard-map-column">
          <div id="dashboardMap" class="dashboard-map-canvas" role="application" aria-label="Interactive map of civic report locations"></div>
          <p id="dashboardMapStatus" class="dashboard-map-status" aria-live="polite"></p>
          <div class="dashboard-map-legend" aria-label="Map marker legend">
            <span><i class="map-legend-dot is-reported"></i> Reported</span>
            <span><i class="map-legend-dot is-verified"></i> Verified</span>
            <span><i class="map-legend-dot is-progress"></i> In progress</span>
            <span><i class="map-legend-dot is-resolved"></i> Resolved</span>
            
          </div>
        </div>

        <aside class="dashboard-map-side" aria-label="Selected report details">
          <div id="dashboardMapSelection" class="dashboard-map-selection" aria-live="polite">
            <div class="dashboard-map-empty-selection">
              <span class="dashboard-map-empty-icon"><i data-lucide="mouse-pointer-click"></i></span>
              <strong>Select a map pin</strong>
              <p>Click a marker to see the report details and location link here.</p>
            </div>
          </div>

          <section class="dashboard-unpinned-section" aria-labelledby="dashboardUnpinnedTitle">
            <div class="dashboard-unpinned-head">
              <h4 id="dashboardUnpinnedTitle">Reports without map coordinates</h4>
              <span class="dashboard-map-count is-small">${unpinnedMapIssues.length}</span>
            </div>
            <p class="dashboard-unpinned-help">These reports have text addresses but no exact coordinates. Select one for details and a map search link.</p>
            <div id="dashboardUnpinnedList" class="dashboard-unpinned-list">
              ${unpinnedMapIssues.length
                ? unpinnedMapIssues.map((issue) => `
                  <button type="button" class="dashboard-unpinned-row" data-map-select="${escapeHtml(issue.id)}">
                    <span class="dashboard-unpinned-copy">
                      <strong>${escapeHtml(issue.id)} · ${escapeHtml(issue.title)}</strong>
                      <small><i data-lucide="map-pin"></i>${escapeHtml(issue.location || "Location not supplied")}</small>
                    </span>
                    <i data-lucide="chevron-right" class="dashboard-unpinned-arrow"></i>
                  </button>
                `).join("")
                : `<p class="dashboard-map-all-pinned">All reports have exact GPS coordinates.</p>`
              }
            </div>
          </section>
        </aside>
      </div>
    </section>

    <div class="dash-grid">

      <section
        class="panel glass"
        aria-labelledby="statusPanelTitle"
      >

        <div class="panel-head">

          <div>
            <h3
              id="statusPanelTitle"
              class="panel-title"
            >
              Status breakdown
            </h3>

            <p class="panel-sub">
              Where every report stands
            </p>
          </div>

        </div>

        <div class="donut-wrap">

          <div
            class="donut"
            style="background:conic-gradient(${donutStops})"
            role="img"
            aria-label="${STATUSES.map(
              (s) =>
                `${s}: ${counts[s]}`
            ).join(", ")}"
          >

            <div class="donut-center">

              <span class="donut-value">
                ${total}
              </span>

              <span class="donut-label">
                reports
              </span>

            </div>

          </div>

          <ul class="legend">

            ${STATUSES.map(
              (s) => `
                <li class="legend-item">

                  <span
                    class="legend-swatch"
                    style="background:${statusColors[s]}"
                  ></span>

                  ${escapeHtml(s)}

                  <span class="legend-value">
                    ${counts[s]}
                  </span>

                </li>
              `
            ).join("")}

          </ul>

        </div>

      </section>

      <section
        class="panel glass"
        aria-labelledby="weeklyPanelTitle"
      >

        <div class="panel-head">

          <div>

            <h3
              id="weeklyPanelTitle"
              class="panel-title"
            >
              Resolution activity
            </h3>

            <p class="panel-sub">
              City-wide, last 7 days
              (simulated baseline + live)
            </p>

          </div>

        </div>

        <div
          class="columns"
          role="img"
          aria-label="Reported versus resolved issues over the last 7 days"
        >

          ${days
            .map(
              (d) => `
                <div class="column">

                  <div class="column-bars">

                    <span
                      class="column-bar reported"
                      style="height:${
                        (d.reported /
                          maxDay) *
                        100
                      }%"
                    ></span>

                    <span
                      class="column-bar resolved"
                      style="height:${
                        (d.resolved /
                          maxDay) *
                        100
                      }%"
                    ></span>

                  </div>

                  <span class="column-label">
                    ${escapeHtml(
                      d.label
                    )}
                  </span>

                </div>
              `
            )
            .join("")}

        </div>

        <div
          class="chart-legend"
          style="margin-top:14px"
        >

          <span>
            <span
              class="legend-swatch"
              style="background:rgba(255,255,255,.2)"
            ></span>
            Reported
          </span>

          <span>
            <span
              class="legend-swatch"
              style="background:var(--accent)"
            ></span>
            Resolved
          </span>

        </div>

      </section>

      <section
        class="panel glass"
        aria-labelledby="catPanelTitle"
      >

        <div class="panel-head">

          <div>

            <h3
              id="catPanelTitle"
              class="panel-title"
            >
              Most common categories
            </h3>

            <p class="panel-sub">
              All reports by type
            </p>

          </div>

        </div>

        <div class="hbars">

          ${byCategory
            .map(
              (c) => `
                <div class="hbar-row">

                  <span class="hbar-label">

                    <i
                      data-lucide="${
                        CATEGORIES[
                          c.key
                        ].icon
                      }"
                    ></i>

                    ${escapeHtml(
                      CATEGORIES[
                        c.key
                      ].label
                    )}

                  </span>

                  <span class="hbar-value">
                    ${c.count}
                  </span>

                  <span class="hbar-track">

                    <span
                      class="hbar-fill"
                      style="display:block;width:${
                        (c.count /
                          maxCategory) *
                        100
                      }%"
                    ></span>

                  </span>

                </div>
              `
            )
            .join("")}

        </div>

      </section>

      <section
        class="panel glass"
        aria-labelledby="deptPanelTitle"
      >

        <div class="panel-head">

          <div>

            <h3
              id="deptPanelTitle"
              class="panel-title"
            >
              Department workload
            </h3>

            <p class="panel-sub">
              Open issues routed by Civic AI
            </p>

          </div>

        </div>

        <div class="hbars">

          ${departments
            .map(
              ([name, count]) => `
                <div class="hbar-row">

                  <span class="hbar-label">

                    <i data-lucide="building-2"></i>

                    ${escapeHtml(
                      name
                    )}

                  </span>

                  <span class="hbar-value">
                    ${count}
                  </span>

                  <span class="hbar-track">

                    <span
                      class="hbar-fill is-amber"
                      style="display:block;width:${
                        (count /
                          maxDept) *
                        100
                      }%"
                    ></span>

                  </span>

                </div>
              `
            )
            .join("")}

        </div>

      </section>

      <section
        class="panel glass"
        aria-labelledby="hotspotPanelTitle"
      >

        <div class="panel-head">

          <div>

            <h3
              id="hotspotPanelTitle"
              class="panel-title"
            >
              Civic hotspots
            </h3>

            <p class="panel-sub">
              Areas with the most open reports
            </p>

          </div>

          <i
            data-lucide="radar"
            style="color:var(--accent)"
          ></i>

        </div>

        <ol class="hotspots">

          ${hotspots
            .map(
              ([area, info], i) => `
                <li class="hotspot">

                  <span class="hotspot-rank">
                    0${i + 1}
                  </span>

                  <span class="hotspot-name">

                    ${escapeHtml(
                      area
                    )}

                    <small>
                      ${info.count}
                      open ·
                    </small>

                  </span>

                </li>
              `
            )
            .join("")}

        </ol>

      </section>

      <section class="panel glass" aria-labelledby="urgentPanelTitle">
        <div class="panel-head"><div><h3 id="urgentPanelTitle" class="panel-title">Latest open reports</h3><p class="panel-sub">Reports awaiting further action or resolution.</p></div></div>
        <div class="latest-report-list">
          ${open.length ? open.slice().sort((a, b) => b.reportedAt - a.reportedAt).slice(0, 4).map(issueCard).join("") : '<div class="empty-state"><i data-lucide="shield-check"></i><span>No open reports at the moment.</span></div>'}
        </div>
      </section>

    </div>
  `;

  refreshIcons();
  initDashboardMap();
}


/* =========================================================
   10. COMMUNITY MATCHING
   ========================================================= */

function renderSkillPicker() {
  const picker =
    $("#skillPicker");

  if (!picker) return;

  picker.innerHTML =
    SKILLS.map(
      (s) => `
        <button
          type="button"
          class="chip"
          data-skill="${escapeHtml(s)}"
          aria-pressed="${state.mySkills.has(s)}"
        >
          ${escapeHtml(s)}
        </button>
      `
    ).join("");
}

function syncSkillPicker() {
  $$("[data-skill]")
    .forEach(
      (chip) => {
        chip.setAttribute(
          "aria-pressed",
          String(
            state.mySkills.has(
              chip.dataset.skill
            )
          )
        );
      }
    );

  const count =
    $("#skillCount");

  if (count) {
    count.textContent =
      `${state.mySkills.size} selected`;
  }
}

function myMatch(mission) {
  if (
    !state.mySkills.size
  ) {
    return null;
  }

  const overlap =
    mission.skills.filter(
      (s) =>
        state.mySkills.has(s)
    ).length;

  return Math.round(
    (overlap /
      mission.skills.length) *
      100
  );
}

function topContributors(
  mission
) {
  return PEOPLE
    .map((p) => ({
      person: p,

      score:
        Math.round(
          (p.skills.filter(
            (s) =>
              mission.skills.includes(
                s
              )
          ).length /
            mission.skills.length) *
            100
        )
    }))
    .filter(
      (m) => m.score > 0
    )
    .sort(
      (a, b) =>
        b.score -
        a.score
    )
    .slice(0, 3);
}

function renderMissions() {
  const list =
    $("#missionList");

  if (!list) return;

  const missions =
    [...MISSIONS].sort(
      (a, b) =>
        (myMatch(b) ?? 0) -
        (myMatch(a) ?? 0)
    );

  list.innerHTML =
    missions
      .map(
        (m, index) => {
          const match =
            myMatch(m);

          const joined =
            state.joinedMissions.has(
              m.id
            );

          const contributors =
            topContributors(
              m
            );

          const badgeClass =
            match === null
              ? ""
              : match >= 67
                ? "is-strong"
                : match > 0
                  ? "is-partial"
                  : "";

          return `
            <article
              class="mission-card glass ${
                match &&
                index === 0
                  ? "is-top"
                  : ""
              }"
            >

              <div class="mission-head">

                <div>

                  <p class="mission-linked">

                    <i data-lucide="flag"></i>

                    Linked issue

                    <button
                      type="button"
                      class="link-btn"
                      data-issue="${escapeHtml(
                        m.issueId
                      )}"
                    >
                      ${escapeHtml(
                        m.issueId
                      )}
                    </button>

                  </p>

                  <h4 class="mission-title">
                    ${escapeHtml(
                      m.title
                    )}
                  </h4>

                </div>

                ${
                  match !== null
                    ? `
                      <span
                        class="match-badge ${badgeClass}"
                      >
                        ${match}% match
                      </span>
                    `
                    : ""
                }

              </div>

              <p class="mission-desc">
                ${escapeHtml(
                  m.description
                )}
              </p>

              <div
                class="skill-list"
                aria-label="Skills needed"
              >

                ${m.skills
                  .map(
                    (s) => `
                      <span
                        class="skill-chip ${
                          state.mySkills.has(
                            s
                          )
                            ? "have"
                            : ""
                        }"
                      >
                        ${
                          state.mySkills.has(
                            s
                          )
                            ? '<i data-lucide="check"></i>'
                            : ""
                        }

                        ${escapeHtml(s)}

                      </span>
                    `
                  )
                  .join("")}

              </div>

              <div class="mission-progress">

                <span
                  class="progress"
                  role="progressbar"
                  aria-valuemin="0"
                  aria-valuemax="${m.needed}"
                  aria-valuenow="${m.joined}"
                  aria-label="Volunteers joined"
                >
                  <span
                    style="width:${Math.min(
                      100,
                      (m.joined /
                        m.needed) *
                        100
                    )}%"
                  ></span>
                </span>

                <span>
                  ${m.joined}/${m.needed}
                  volunteers
                </span>

              </div>

              <div class="mission-foot">

                <div class="mission-matches">

                  <span
                    class="avatar-stack"
                    aria-hidden="true"
                  >

                    ${contributors
                      .map(
                        (c, i) => `
                          <span
                            class="avatar tone-${i % 4} ${
                              c.person.org
                                ? "is-org"
                                : ""
                            }"
                          >
                            ${initials(
                              c.person.name
                            )}
                          </span>
                        `
                      )
                      .join("")}

                  </span>

                  <span>
                    Matched:
                    ${contributors
                      .map(
                        (c) =>
                          `${escapeHtml(
                            c.person.name.split(
                              " "
                            )[0]
                          )} ${c.score}%`
                      )
                      .join(", ")}
                  </span>

                </div>

                <button
                  type="button"
                  class="btn btn-sm ${
                    joined
                      ? "btn-ghost"
                      : "btn-primary"
                  }"
                  data-action="join"
                  data-id="${escapeHtml(
                    m.id
                  )}"
                  aria-pressed="${joined}"
                >

                  <i
                    data-lucide="${
                      joined
                        ? "check"
                        : "user-plus"
                    }"
                  ></i>

                  ${
                    joined
                      ? "Joined"
                      : "Join mission"
                  }

                </button>

              </div>

            </article>
          `;
        }
      )
      .join("");

  refreshIcons();
}

function renderPeople() {
  const grid =
    $("#peopleGrid");

  if (!grid) return;

  grid.innerHTML =
    PEOPLE.map(
      (p, i) => `
        <article class="person-card glass">

          <span
            class="avatar tone-${i % 4} ${
              p.org
                ? "is-org"
                : ""
            }"
            aria-hidden="true"
          >
            ${initials(p.name)}
          </span>

          <div class="person-body">

            <span class="person-name">

              ${escapeHtml(
                p.name
              )}

              ${
                p.org
                  ? '<span class="org-badge">Org</span>'
                  : ""
              }

            </span>

            <span class="person-role">

              ${escapeHtml(
                p.role
              )}

              ·

              ${escapeHtml(
                p.area
              )}

            </span>

            <div class="skill-list">

              ${p.skills
                .map(
                  (s) => `
                    <span
                      class="skill-chip ${
                        state.mySkills.has(
                          s
                        )
                          ? "have"
                          : ""
                      }"
                    >
                      ${escapeHtml(s)}
                    </span>
                  `
                )
                .join("")}

            </div>

          </div>

        </article>
      `
    ).join("");
}

function renderCommunity() {
  syncSkillPicker();

  renderMissions();

  renderPeople();
}

function toggleSkill(skill) {
  if (
    state.mySkills.has(
      skill
    )
  ) {
    state.mySkills.delete(
      skill
    );
  } else {
    state.mySkills.add(
      skill
    );
  }

  renderCommunity();

  refreshIcons();
}

function toggleMission(id) {
  const mission =
    MISSIONS.find(
      (m) => m.id === id
    );

  if (!mission) return;

  if (
    state.joinedMissions.has(
      id
    )
  ) {
    state.joinedMissions.delete(
      id
    );

    mission.joined =
      Math.max(
        0,
        mission.joined - 1
      );
  } else {
    state.joinedMissions.add(
      id
    );

    mission.joined++;

    toast(
      `You joined "${mission.title}"`,
      "hand-heart"
    );
  }

  renderMissions();
}


/* =========================================================
   11. CIVIC AI
   ========================================================= */

function getCivicAiContext() {
  if (state.openIssueId) {
    const issue =
      issues.find(
        (item) =>
          item.id ===
          state.openIssueId
      );

    if (issue) {
      return {
        title: issue.title,

        category:
          issue.category,

        description:
          issue.description,

        status:
          issue.status,

        location:
          issue.location
      };
    }
  }

  if (state.draft) {
    return {
      title:
        state.draft.description?.slice(
          0,
          60
        ) ||
        "Current civic report",

      category:
        state.draft.categoryKey ||
        "other",

      description:
        state.draft.description ||
        "",

      location:
        state.draft.location ||
        ""
    };
  }

  return null;
}

function openCivicAi(
  context = null
) {
  state.civicAiOpen =
    true;

  state.civicAiContext =
    context ||
    getCivicAiContext();

  const panel =
    document.getElementById(
      "civicAiPanel"
    );

  const fab =
    document.getElementById(
      "civicAiFab"
    );

  if (!panel || !fab) {
    return;
  }

  panel.classList.add(
    "is-open"
  );

  panel.setAttribute(
    "aria-hidden",
    "false"
  );

  fab.setAttribute(
    "aria-expanded",
    "true"
  );

  refreshIcons();

  const input =
    document.getElementById(
      "civicAiInput"
    );

  if (input) {
    setTimeout(
      () => input.focus(),
      100
    );
  }
}

function closeCivicAi() {
  state.civicAiOpen =
    false;

  const panel =
    document.getElementById(
      "civicAiPanel"
    );

  const fab =
    document.getElementById(
      "civicAiFab"
    );

  if (!panel || !fab) {
    return;
  }

  panel.classList.remove(
    "is-open"
  );

  panel.setAttribute(
    "aria-hidden",
    "true"
  );

  fab.setAttribute(
    "aria-expanded",
    "false"
  );
}

function addCivicAiMessage(
  role,
  text
) {
  const container =
    document.getElementById(
      "civicAiMessages"
    );

  if (!container) return;

  state.civicAiMessages.push({
    role,
    text
  });

  const message =
    document.createElement(
      "div"
    );

  message.className =
    `civic-ai-message ${role}`;

  if (role === "ai") {
    message.innerHTML = `
      <div class="civic-ai-message-avatar">
        <i data-lucide="sparkles"></i>
      </div>

      <div class="civic-ai-bubble">
        ${text}
      </div>
    `;
  } else {
    message.innerHTML = `
      <div class="civic-ai-bubble">
        ${text}
      </div>
    `;
  }

  container.appendChild(
    message
  );

  container.scrollTop =
    container.scrollHeight;

  refreshIcons();
}

function civicAiText(value) {
  return String(value || "")
    .replace(
      /&/g,
      "&amp;"
    )
    .replace(
      /</g,
      "&lt;"
    )
    .replace(
      />/g,
      "&gt;"
    )
    .replace(
      /"/g,
      "&quot;"
    )
    .replace(
      /'/g,
      "&#039;"
    );
}


function isCivicAiImageFile(file) {
  return Boolean(
    file &&
    /^image\/(png|jpe?g|gif|webp|bmp|avif)$/i.test(
      String(file.type || "")
    )
  );
}

function readCivicAiFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
      } else {
        reject(new Error("The selected image could not be read."));
      }
    };

    reader.onerror = () => {
      reject(
        reader.error ||
        new Error("The selected image could not be read.")
      );
    };

    reader.readAsDataURL(file);
  });
}

function formatCivicAiFileSize(bytes) {
  if (!Number.isFinite(bytes) || bytes < 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
function detectCivicCategory(
  text
) {
  const question =
    String(text || "")
      .toLowerCase();

  const keywords = {
    roads: [
      "road",
      "pothole",
      "street",
      "traffic",
      "bridge",
      "footpath",
      "sidewalk",
      "road damage"
    ],

    garbage: [
      "garbage",
      "trash",
      "waste",
      "dump",
      "dumping",
      "litter",
      "rubbish",
      "dirty"
    ],

    streetlights: [
      "streetlight",
      "street light",
      "lamp",
      "lights are off",
      "dark street",
      "dark road"
    ],

    water: [
      "water",
      "pipeline",
      "pipe",
      "leak",
      "leaking",
      "water supply",
      "drinking water",
      "flood"
    ],

    health: [
      "hospital",
      "clinic",
      "health",
      "medicine",
      "sanitation",
      "disease"
    ],

    education: [
      "school",
      "college",
      "classroom",
      "teacher",
      "education",
      "student"
    ],

    environment: [
      "pollution",
      "environment",
      "river",
      "lake",
      "forest",
      "tree",
      "air quality"
    ],

    safety: [
      "unsafe",
      "danger",
      "accident",
      "crime",
      "security",
      "hazard",
      "warning"
    ]
  };

  for (
    const [category, words]
    of Object.entries(
      keywords
    )
  ) {
    if (
      words.some(
        (word) =>
          question.includes(
            word
          )
      )
    ) {
      return category;
    }
  }

  return null;
}

function generateCivicAiResponse(
  prompt
) {
  const question =
    String(prompt || "")
      .toLowerCase();

  const context =
    state.civicAiContext ||
    getCivicAiContext();

  const description =
    context?.description ||
    "";

  const detectedCategory =
    detectCivicCategory(
      prompt
    ) ||
    context?.category ||
    null;

  const category =
    detectedCategory;

  let response = "";

  if (
    question.includes(
      "caus"
    ) ||
    question.includes(
      "why"
    ) ||
    question.includes(
      "problem"
    )
  ) {
    const causes = {
      roads:
        "Possible causes include poor drainage, road wear, overloaded traffic, weak maintenance, or construction damage.",

      garbage:
        "Possible causes include irregular collection, insufficient bins, illegal dumping, poor waste segregation, or limited collection capacity.",

      streetlights:
        "Possible causes include damaged equipment, electrical faults, aging infrastructure, or delayed maintenance.",

      water:
        "Possible causes include pipe damage, leakage, low supply capacity, contamination, or infrastructure maintenance issues.",

      health:
        "Possible causes may include sanitation problems, environmental conditions, service gaps, or limited access to public-health facilities.",

      education:
        "Possible causes may include infrastructure gaps, limited resources, overcrowding, maintenance issues, or access problems.",

      environment:
        "Possible causes may include waste accumulation, pollution, land-use changes, drainage problems, or environmental damage.",

      safety:
        "Possible causes may include poor lighting, damaged infrastructure, unsafe road conditions, insufficient signage, or limited monitoring.",

      other:
        "The exact cause depends on the situation. Useful possibilities can usually be identified by examining the location, timing, visible conditions, and available evidence."
    };

    response = `
      <strong>
        Possible causes
      </strong>

      <p>
        ${
          causes[
            category || "other"
          ]
        }
      </p>

      <p>
        I would treat these as possibilities,
        not confirmed causes. Photos,
        location details and repeated reports
        can help determine what is actually
        happening.
      </p>
    `;
  }

  else if (
    question.includes(
      "prevent"
    ) ||
    question.includes(
      "avoid"
    ) ||
    question.includes(
      "solution"
    )
  ) {
    const prevention = {
      roads:
        "Regular road inspections, drainage maintenance, timely repairs and better reporting of damaged sections can help prevent recurring problems.",

      garbage:
        "Regular collection, adequate bins, waste segregation, public awareness and monitoring of dumping hotspots can reduce the problem.",

      streetlights:
        "Routine inspections, faster fault reporting and preventive maintenance can reduce prolonged streetlight outages.",

      water:
        "Regular infrastructure inspections, leak detection, maintenance and water-quality monitoring can help prevent recurring issues.",

      health:
        "Focus on sanitation, clean surroundings, public-health monitoring and timely reporting. Health-related concerns should be handled by qualified authorities or professionals.",

      education:
        "Regular maintenance, infrastructure checks, resource planning and clear reporting channels can help prevent recurring education-related problems.",

      environment:
        "Monitoring, waste management, protection of vulnerable areas and early reporting can help reduce environmental damage.",

      safety:
        "Better lighting, infrastructure maintenance, visible warnings and timely reporting can help reduce safety risks.",

      other:
        "Prevention depends on the specific problem. First identify the likely cause, then target maintenance, monitoring, infrastructure or public awareness accordingly."
    };

    response = `
      <strong>
        Possible prevention
      </strong>

      <p>
        ${
          prevention[
            category || "other"
          ]
        }
      </p>
    `;
  }

  else if (
    question.includes(
      "evidence"
    ) ||
    question.includes(
      "measure"
    ) ||
    question.includes(
      "proof"
    ) ||
    question.includes(
      "collect"
    )
  ) {
    response = `
      <strong>
        Useful evidence
      </strong>

      <p>
        For a strong civic report,
        consider collecting:
      </p>

      <ul>
        <li>
          Clear photos or videos
        </li>

        <li>
          Exact location
        </li>

        <li>
          Date and approximate time
        </li>

        <li>
          How often the problem occurs
        </li>

        <li>
          Visible impact on people
          or infrastructure
        </li>

        <li>
          Measurements when they
          can be collected safely
        </li>
      </ul>

      <p>
        Multiple independent reports
        from the same area can also
        strengthen the signal that an
        issue needs attention.
      </p>
    `;
  }

  else if (
    question.includes(
      "department"
    ) ||
    question.includes(
      "authority"
    ) ||
    question.includes(
      "who should"
    )
  ) {
    const departments = {
      roads:
        "Public Works / Roads and infrastructure authority",

      garbage:
        "Municipal waste-management authority",

      streetlights:
        "Municipal electrical or street-lighting department",

      water:
        "Water-supply / Public Health Engineering authority",

      health:
        "Public-health or health department",

      education:
        "Education department or local education authority",

      environment:
        "Environment / pollution-control authority",

      safety:
        "Local administration, public-safety or relevant emergency authority",

      other:
        "The responsible authority depends on the location and type of issue."
    };

    response = `
      <strong>
        Likely responsible authority
      </strong>

      <p>
        ${
          departments[
            category || "other"
          ]
        }.
      </p>

      <p>
        Civic OS can use the report
        category and location to help
        route an issue to the appropriate
        authority.
      </p>
    `;
  }

  else if (
    detectedCategory
  ) {
    const detectedResponses = {
      roads: `
        <strong>
          Road issue detected
        </strong>

        <p>
          This sounds like a road or
          infrastructure problem.
        </p>

        <p>
          <strong>
            Possible next step:
          </strong>
          Record the exact location
          and take a clear photo of
          the problem. Civic OS can
          use this information to help
          route the report to the
          appropriate road authority.
        </p>
      `,

      garbage: `
        <strong>
          Waste issue detected
        </strong>

        <p>
          This sounds like a garbage
          or waste-management problem.
        </p>

        <p>
          <strong>
            Possible next step:
          </strong>
          Record the location,
          take a clear photo and
          note whether the waste
          is regularly accumulating.
        </p>
      `,

      streetlights: `
        <strong>
          Streetlight issue detected
        </strong>

        <p>
          This sounds like a
          street-lighting problem.
        </p>

        <p>
          <strong>
            Possible next step:
          </strong>
          Record the location and,
          if possible, note when the
          lights stop working.
        </p>
      `,

      water: `
        <strong>
          Water issue detected
        </strong>

        <p>
          This sounds like a
          water-supply or infrastructure
          problem.
        </p>

        <p>
          <strong>
            Possible next step:
          </strong>
          Record the location,
          describe the issue and
          note how frequently it occurs.
        </p>
      `,

      education: `
        <strong>
          Education issue detected
        </strong>

        <p>
          This sounds like an
          education or school-
          infrastructure concern.
        </p>

        <p>
          <strong>
            Possible next step:
          </strong>
          Describe the specific
          problem and identify the
          affected facility or location.
        </p>
      `,

      health: `
        <strong>
          Public health issue detected
        </strong>

        <p>
          This sounds like a
          public-health or sanitation
          concern.
        </p>

        <p>
          <strong>
            Possible next step:
          </strong>
          Document the location
          and describe the issue
          clearly. Health concerns
          should be handled by the
          appropriate authority or
          qualified professional.
        </p>
      `,

      environment: `
        <strong>
          Environmental issue detected
        </strong>

        <p>
          This sounds like an
          environmental concern.
        </p>

        <p>
          <strong>
            Possible next step:
          </strong>
          Record the location,
          visible impact and supporting
          evidence such as photos.
        </p>
      `,

      safety: `
        <strong>
          Safety issue detected
        </strong>

        <p>
          This sounds like a
          public-safety concern.
        </p>

        <p>
          <strong>
            Possible next step:
          </strong>
          Record the location and
          describe the visible hazard
          clearly. For immediate danger,
          contact the appropriate
          emergency service.
        </p>
      `
    };

    response =
      detectedResponses[
        detectedCategory
      ] || "";
  }

  else {
    response = `
      <strong>
        Here's how I can help
      </strong>

      <p>
        I can help you understand
        this civic problem, explore
        possible causes, suggest
        prevention ideas, identify
        useful evidence, and think
        about the likely responsible
        authority.
      </p>

      ${
        description
          ? `
            <p>
              <strong>
                Current context:
              </strong>

              ${civicAiText(
                description.slice(
                  0,
                  180
                )
              )}
            </p>
          `
          : ""
      }

      <p>
        Try asking:
        <em>
          "What could be causing this?"
        </em>,
        <em>
          "How can it be prevented?"
        </em>,
        or
        <em>
          "What evidence should I collect?"
        </em>
      </p>
    `;
  }

  return response;
}


/* =========================================================
   12. EVENT BINDING
   ========================================================= */

function bindEvents() {

  /* ---------- Global click handling ---------- */

  document.addEventListener(
    "click",
    (event) => {

      const goto =
        event.target.closest(
          "[data-goto]"
        );

      if (goto) {

        if (goto.dataset.status) {
          state.filters = {
            status:
              goto.dataset.status ||
              "All",

            category:
              "all",

            sort:
              "newest",

            query:
              ""
          };
        }

        showScreen(
          goto.dataset.goto
        );

        return;
      }


      const issueBtn =
        event.target.closest(
          "[data-issue]"
        );

      if (issueBtn) {
        openIssue(
          issueBtn.dataset.issue
        );

        return;
      }


      const statusChip =
        event.target.closest(
          "[data-status-filter]"
        );

      if (statusChip) {
        state.filters.status =
          statusChip.dataset
            .statusFilter;

        renderIssues();

        return;
      }


      const skillChip =
        event.target.closest(
          "[data-skill]"
        );

      if (skillChip) {
        toggleSkill(
          skillChip.dataset.skill
        );

        return;
      }

      const civicActionCard =
        event.target.closest(
          "[data-civic-action]"
        );

      if (civicActionCard) {
        openCivicAction(
          civicActionCard.dataset.civicAction
        );

        return;
      }


      const createActionButton =
        event.target.closest(
          "#createActionBtn"
        );

      if (createActionButton) {
        openCreateActivity();

        return;
      }
      const actionBtn =
        event.target.closest(
          "[data-action]"
        );

      if (!actionBtn) {
        return;
      }

      const {
        action,
        id
      } =
        actionBtn.dataset;


      if (
        action ===
        "generate-improvement"
      ) {
        generateImprovementPreview();
      }

      if (
        action ===
        "submit-report"
      ) {
        submitReport();
      }


      if (
        action ===
        "edit-report"
      ) {
        const description =
          $("#description");

        if (description) {
          description.focus();
        }

        const form =
          $("#reportForm");

        if (form) {
          form.scrollIntoView({
            behavior: "smooth",
            block: "start"
          });
        }
      }


      if (
        action ===
        "report-another"
      ) {
        const form =
          $("#reportForm");

        const panel =
          $("#aiPanel");

        if (form) {
          form.hidden =
            false;
        }

        if (panel) {
          panel.innerHTML =
            "";
        }

        state.analysis =
          null;

        state.draft =
          null;

        updateStepper();
      }


      if (
        action ===
        "use-suggestion"
      ) {
        const key =
          actionBtn.dataset.key;

        const radio =
          document.getElementById(
            `cat-${key}`
          );

        if (radio) {
          radio.checked =
            true;
        }

        if (state.draft) {
          state.analysis =
            analyzeReport({
              ...state.draft,
              categoryKey:
                key
            });

          state.draft.categoryKey =
            key;

          renderAnalysis();
        }
      }


      if (
        action ===
        "support-duplicate"
      ) {
        const issue =
          getIssue(id);

        if (!issue) {
          return;
        }

        if (
          !state.supported.has(
            id
          )
        ) {
          state.supported.add(
            id
          );

          issue.supporters++;
        }

        resetReportForm();

        invalidateAnalysis();

        updateStepper();

        toast(
          `Added your support to ${id}`
        );

        openIssue(id);
      }


      if (
        action ===
        "support"
      ) {
        toggleSupport(id);
      }


      if (
        action ===
        "advance"
      ) {
        advanceIssue(id);
      }


      if (
        action ===
        "join"
      ) {
        toggleMission(id);
      }


      if (
        action ===
        "clear-filters"
      ) {
        state.filters = {
          status: "All",
          category: "all",
          sort: "newest",
          query: ""
        };

        renderIssues();
      }

    }
  );


  /* ---------- Browser back / forward ---------- */

  window.addEventListener(
    "popstate",
    () => {
      showScreen(
        screenFromHash(),
        {
          push: false
        }
      );
    }
  );


  /* ---------- Report form ---------- */

  const form =
    $("#reportForm");

  if (form) {

    form.addEventListener(
      "submit",
      handleAnalyze
    );

    form.addEventListener(
      "input",
      (event) => {

        if (
          event.target.id ===
          "description"
        ) {
          const count =
            $("#descCount");

          if (count) {
            count.textContent =
              `${event.target.value.length} / 500`;
          }
        }

        if (
          event.target.matches(
            "[aria-invalid]"
          )
        ) {
          event.target.removeAttribute(
            "aria-invalid"
          );
        }

        if (
          event.target.type !==
          "file"
        ) {
          invalidateAnalysis();
        }

        updateStepper();
      }
    );
  }


  /* ---------- Report photo ---------- */

  const photo =
    $("#photo");

  if (photo) {
    photo.addEventListener(
      "change",
      (event) =>
        setPhoto(
          event.target.files
        )
    );
  }


  const photoPreview = $("#photoPreview");
  if (photoPreview) {
    photoPreview.addEventListener("click", (event) => {
      const button = event.target.closest("[data-remove-photo-index]");
      if (!button) return;
      const index = Number(button.dataset.removePhotoIndex);
      if (!Number.isInteger(index) || index < 0 || index >= state.draftEvidenceUrls.length) return;
      const [url] = state.draftEvidenceUrls.splice(index, 1);
      state.draftEvidenceFiles.splice(index, 1);
      try { URL.revokeObjectURL(url); } catch {}
      renderPhotoPreviews();
      invalidateAnalysis();
    });
  }


  /* ---------- Example report ---------- */

  const exampleBtn =
    $("#exampleBtn");

  if (exampleBtn) {
    exampleBtn.addEventListener(
      "click",
      fillExample
    );
  }


  /* ---------- Location ---------- */

  const locateBtn =
    $("#locateBtn");

  if (locateBtn) {
    locateBtn.addEventListener(
      "click",
      useCurrentLocation
    );
  }


  /* ---------- Issue search ---------- */

  const issueSearch =
    $("#issueSearch");

  if (issueSearch) {
    issueSearch.addEventListener(
      "input",
      (event) => {
        state.filters.query =
          event.target.value;

        renderIssueList();
      }
    );
  }


  const filterCategory =
    $("#filterCategory");

  if (filterCategory) {
    filterCategory.addEventListener(
      "change",
      (event) => {
        state.filters.category =
          event.target.value;

        renderIssueList();
      }
    );
  }


  const sortIssues =
    $("#sortIssues");

  if (sortIssues) {
    sortIssues.addEventListener(
      "change",
      (event) => {
        state.filters.sort =
          event.target.value;

        renderIssueList();
      }
    );
  }


  /* ---------- Issue dialog ---------- */

  const dialog =
    $("#issueDialog");

  const closeSheet =
    $("#closeSheet");

  if (
    dialog &&
    closeSheet
  ) {
    closeSheet.addEventListener(
      "click",
      () => dialog.close()
    );

    dialog.addEventListener(
      "click",
      (event) => {
        if (
          event.target ===
          dialog
        ) {
          dialog.close();
        }
      }
    );

    dialog.addEventListener(
      "close",
      () => {
        state.openIssueId =
          null;
      }
    );
  }


  /* =======================================================
     CIVIC AI FILE UPLOAD
     Keep the local preview in sync with the selected file.
     The real attachment is added to the sent chat message.
     ======================================================= */

  const civicAiFileInput =
    document.getElementById(
      "civicAiFileInput"
    );

  const civicAiFilePreview =
    document.getElementById(
      "civicAiFilePreview"
    );

  if (
    civicAiFileInput &&
    civicAiFilePreview
  ) {
    civicAiFileInput.addEventListener(
      "change",
      () => {
        const file =
          civicAiFileInput.files?.[0];

        const previousPreviewUrl =
          civicAiFilePreview.dataset.previewUrl;

        if (previousPreviewUrl) {
          try {
            URL.revokeObjectURL(previousPreviewUrl);
          } catch {}
        }

        delete civicAiFilePreview.dataset.previewUrl;
        civicAiFilePreview.innerHTML = "";

        if (!file) return;

        const isImage =
          isCivicAiImageFile(file);

        const previewUrl =
          isImage
            ? URL.createObjectURL(file)
            : "";

        if (previewUrl) {
          civicAiFilePreview.dataset.previewUrl = previewUrl;
        }

        civicAiFilePreview.innerHTML = `
          <div class="civic-ai-file">
            ${
              isImage
                ? `
                  <img
                    src="${previewUrl}"
                    class="civic-ai-file-image"
                    alt="Selected image attachment"
                  />
                `
                : `
                  <i data-lucide="file-text"></i>
                `
            }

            <span>
              ${civicAiText(file.name)}
            </span>

            <button
              type="button"
              id="removeCivicAiFile"
              aria-label="Remove file"
            >
              <i data-lucide="x"></i>
            </button>
          </div>
        `;

        refreshIcons();

        const removeButton =
          document.getElementById(
            "removeCivicAiFile"
          );

        if (removeButton) {
          removeButton.addEventListener(
            "click",
            () => {
              const activePreviewUrl =
                civicAiFilePreview.dataset.previewUrl;

              if (activePreviewUrl) {
                try {
                  URL.revokeObjectURL(activePreviewUrl);
                } catch {}
              }

              delete civicAiFilePreview.dataset.previewUrl;
              civicAiFileInput.value = "";
              civicAiFilePreview.innerHTML = "";
            }
          );
        }
      }
    );
  }


  /* =======================================================
     CIVIC AI CHAT
     ======================================================= */

  const civicAiFab =
    document.getElementById(
      "civicAiFab"
    );

  const closeCivicAiButton =
    document.getElementById(
      "closeCivicAi"
    );

  const civicAiForm =
    document.getElementById(
      "civicAiForm"
    );

  const civicAiInput =
    document.getElementById(
      "civicAiInput"
    );


  if (civicAiFab) {
    civicAiFab.addEventListener(
      "click",
      () => {
        openCivicAi();
      }
    );
  }


  if (
    closeCivicAiButton
  ) {
    closeCivicAiButton.addEventListener(
      "click",
      () => {
        closeCivicAi();
      }
    );
  }


  if (
    civicAiForm &&
    civicAiInput
  ) {
    civicAiForm.addEventListener(
      "submit",
      async (event) => {
        event.preventDefault();

        const prompt =
          civicAiInput.value.trim();

        const fileInput =
          document.getElementById(
            "civicAiFileInput"
          );

        const file =
          fileInput?.files?.[0] || null;

        if (!prompt && !file) {
          return;
        }

        const sendButton =
          civicAiForm.querySelector(
            'button[type="submit"]'
          );

        if (sendButton?.disabled) return;

        if (sendButton) {
          sendButton.disabled = true;
          sendButton.setAttribute("aria-busy", "true");
        }

        try {
          let attachmentMarkup = "";
          let attachmentNotice = "";
          let responsePrompt = prompt;

          if (file) {
            const maxBytes = 8 * 1024 * 1024;

            if (file.size > maxBytes) {
              toast(
                "Please attach a file smaller than 8 MB.",
                "triangle-alert"
              );
              return;
            }

            const safeFileName =
              civicAiText(file.name);

            const fileSize =
              civicAiText(
                formatCivicAiFileSize(file.size)
              );

            if (isCivicAiImageFile(file)) {
              // Read the selected image into the actual outgoing message,
              // rather than leaving it only in the local preview.
              const imageDataUrl =
                await readCivicAiFileAsDataUrl(file);

              attachmentMarkup = `
                <div class="civic-ai-message-attachment civic-ai-image-attachment">
                  <img
                    src="${imageDataUrl}"
                    alt="Attached image: ${safeFileName}"
                    loading="lazy"
                  />
                  <div class="civic-ai-attachment-copy">
                    <strong>Image attached</strong>
                    <small>${safeFileName} · ${fileSize}</small>
                  </div>
                </div>
              `;

              attachmentNotice = `
                <p class="civic-ai-attachment-note">
                  Image received: <strong>${safeFileName}</strong>.
                  This demo assistant does not yet inspect image pixels automatically.
                  Include a written description of what the image shows for a targeted assessment.
                </p>
              `;
            } else {
              attachmentMarkup = `
                <div class="civic-ai-message-attachment civic-ai-file-attachment">
                  <i data-lucide="file-text"></i>
                  <div class="civic-ai-attachment-copy">
                    <strong>File attached</strong>
                    <small>${safeFileName} · ${fileSize}</small>
                  </div>
                </div>
              `;

              if (
                file.type === "text/plain" ||
                /\.txt$/i.test(file.name)
              ) {
                let textContents = "";

                try {
                  textContents = await file.text();
                } catch {
                  textContents = "";
                }

                if (textContents) {
                  const truncated =
                    textContents.length > 5000;

                  responsePrompt = [
                    prompt,
                    `Text from attached file "${file.name}":`,
                    textContents.slice(0, 5000),
                    truncated
                      ? "(File text truncated to the first 5,000 characters.)"
                      : ""
                  ].filter(Boolean).join("\n\n");

                  attachmentNotice = `
                    <p class="civic-ai-attachment-note">
                      The text file <strong>${safeFileName}</strong> was attached and its first
                      ${truncated ? "5,000 characters were" : "contents were"} included for this demo response.
                    </p>
                  `;
                }
              } else {
                attachmentNotice = `
                  <p class="civic-ai-attachment-note">
                    File received: <strong>${safeFileName}</strong>.
                    PDF text extraction is not connected in this demo; paste relevant text
                    into your message if you need it reviewed.
                  </p>
                `;
              }
            }
          }

          const messageText = prompt
            ? `<p class="civic-ai-user-copy">${civicAiText(prompt)}</p>`
            : `<p class="civic-ai-user-copy">Please review the attached ${file && isCivicAiImageFile(file) ? "image" : "file"}.</p>`;

          addCivicAiMessage(
            "user",
            `${messageText}${attachmentMarkup}`
          );

          civicAiInput.value = "";

          // Clear the upload tray only after the attachment has been added
          // to the message history.
          const previewUrl =
            civicAiFilePreview?.dataset.previewUrl;

          if (previewUrl) {
            try {
              URL.revokeObjectURL(previewUrl);
            } catch {}
          }

          if (civicAiFilePreview) {
            delete civicAiFilePreview.dataset.previewUrl;
            civicAiFilePreview.innerHTML = "";
          }

          if (fileInput) {
            fileInput.value = "";
          }

          setTimeout(
            () => {
              const response =
                generateCivicAiResponse(responsePrompt);

              addCivicAiMessage(
                "ai",
                `${attachmentNotice}${response}`
              );
            },
            350
          );
        } catch (error) {
          toast(
            "The attachment could not be added. Please try again.",
            "triangle-alert"
          );
        } finally {
          if (sendButton) {
            sendButton.disabled = false;
            sendButton.removeAttribute("aria-busy");
          }
        }
      }
    );
  }


  /* ---------- Civic AI suggestions ---------- */

  document
    .querySelectorAll(
      ".ai-suggestion"
    )
    .forEach(
      (button) => {

        button.addEventListener(
          "click",
          () => {

            const prompt =
              button.dataset
                .aiPrompt;

            if (!prompt) {
              return;
            }

            addCivicAiMessage(
              "user",
              civicAiText(
                prompt
              )
            );

            setTimeout(
              () => {

                const response =
                  generateCivicAiResponse(
                    prompt
                  );

                addCivicAiMessage(
                  "ai",
                  response
                );

              },
              350
            );
          }
        );
      }
    );
  /* =======================================================
     CREATE CIVIC ACTIVITY
     ======================================================= */

  const cancelCreateActivity =
    document.getElementById(
      "cancelCreateActivity"
    );

  if (cancelCreateActivity) {
    cancelCreateActivity.addEventListener(
      "click",
      () => {
        const form = document.getElementById(
          "createActivityForm"
        );

        if (form) {
          form.reset();
        }

        showScreen("actionsScreen");
      }
    );
  }


  const createActivityForm =
    document.getElementById(
      "createActivityForm"
    );

  if (createActivityForm) {

    createActivityForm.addEventListener(
      "submit",
      (event) => {

        event.preventDefault();

        const title =
          document.getElementById(
            "activityTitle"
          )?.value.trim();

        const type =
          document.getElementById(
            "activityType"
          )?.value;

        const participants =
          document.getElementById(
            "activityParticipants"
          )?.value;

        const location =
          document.getElementById(
            "activityLocation"
          )?.value.trim();

        const date =
          document.getElementById(
            "activityDate"
          )?.value;

        const time =
          document.getElementById(
            "activityTime"
          )?.value;

        const description =
          document.getElementById(
            "activityDescription"
          )?.value.trim();

        const support =
          document.getElementById(
            "activitySupport"
          )?.value.trim();


        if (
          !title ||
          !type ||
          !participants ||
          !location ||
          !date ||
          !time ||
          !description
        ) {
          toast(
            "Please complete all required fields."
          );

          return;
        }


        const newActivity = {

          id:
            "activity-" +
            Date.now(),

          title,

          type,

          participants:
            Number(participants),

          location,

          date,

          time,

          description,

          support:
            support ||
            "No additional support requested.",

          image:
            type === "Tree planting"
              ? "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=1400&q=85"
              : type === "Clean-up"
              ? "https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?auto=format&fit=crop&w=1400&q=85"
              : type === "Flood preparedness"
              ? "https://images.unsplash.com/photo-1547683905-f686c993aae5?auto=format&fit=crop&w=1400&q=85"
              : "",

          organizer:
            "Community Member",

          icon:
            type === "Clean-up"
              ? "sparkles"
              : type === "Tree planting"
              ? "trees"
              : type === "Flood preparedness"
              ? "waves"
              : type === "Community support"
              ? "users"
              : "megaphone"
        };


        if (
          !Array.isArray(
            window.civicUserActivities
          )
        ) {

          window.civicUserActivities =
            [];

        }


        window.civicUserActivities.push(
          newActivity
        );


        createActivityForm.reset();


        toast(
          "Activity created successfully!"
        );


        showScreen(
          "actionsScreen"
        );


        if (
          typeof renderCivicActions ===
          "function"
        ) {

          renderCivicActions();

        }

      }
    );

  }
}
/* =========================================================
   CIVIC ACTION DETAILS
   ========================================================= */

const civicActionData = {

  flood: {
    title: "Flood Preparedness & Awareness Drive",
    icon: "waves",
    image: "https://images.unsplash.com/photo-1547683905-f686c993aae5?auto=format&fit=crop&w=1600&q=90",
    location: "Imphal",
    date: "12 October 2026",
    time: "9:00 AM – 12:00 PM",
    organizer: "Local Youth Civic Group",
    participants: 24,
    description:
      "A community-led awareness activity focused on helping residents understand flood preparedness, emergency planning and basic safety measures.",
    support:
      "Government support requested for awareness materials and coordination."
  },

  cleanup: {
    title: "Community Clean-Up Drive",
    icon: "sparkles",
    image: "https://images.unsplash.com/photo-1618477461853-cf6ed80faba5?auto=format&fit=crop&w=1600&q=90",
    location: "Khurai",
    date: "10 October 2026",
    time: "7:00 AM – 10:00 AM",
    organizer: "Khurai Community Volunteers",
    participants: 18,
    description:
      "Residents and volunteers will work together to clean a shared public area and improve the surrounding neighbourhood.",
    support:
      "Government support requested for waste collection after the activity."
  },

  planting: {
    title: "Tree Plantation & Green Space Drive",
    icon: "trees",
    image: "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=1600&q=90",
    location: "Lamphel",
    date: "18 October 2026",
    time: "8:00 AM – 11:00 AM",
    organizer: "Green Manipur Community",
    participants: 31,
    description:
      "A community activity to plant trees and improve a shared green space while encouraging residents to take part in local environmental action.",
    support:
      "Government support requested for saplings, equipment and coordination."
  }

};


function openCivicAction(actionId) {

  const action =
    civicActionData[actionId];

  if (!action) {
    return;
  }

  state.civicActionId = actionId;

  const detail =
    document.getElementById(
      "actionDetailContent"
    );

  if (!detail) {
    return;
  }

  detail.innerHTML = `
    <div class="action-detail-content">

      <div class="action-detail-hero" style="${action.image ? "--action-image: url('" + action.image + "')" : ""}">
        <div class="action-detail-hero-image" aria-hidden="true"></div>

        <div class="action-detail-hero-copy">

          <span class="action-detail-category">
            <i data-lucide="hand-heart"></i>
            Civic Action
          </span>

          <h2
            id="actionDetailTitle"
            class="action-detail-title"
          >
            ${escapeHtml(action.title)}
          </h2>

          <p class="action-detail-description">
            ${escapeHtml(action.description)}
          </p>

        </div>

        <div class="action-detail-hero-icon">
          <i data-lucide="${action.icon}"></i>
        </div>
      </div>

      <div class="action-detail-stats">

        <div class="action-detail-stat">
          <span class="action-stat-icon location">
            <i data-lucide="map-pin"></i>
          </span>
          <span class="action-stat-label">Location</span>
          <strong>${escapeHtml(action.location)}</strong>
        </div>

        <div class="action-detail-stat">
          <span class="action-stat-icon date">
            <i data-lucide="calendar-days"></i>
          </span>
          <span class="action-stat-label">Date</span>
          <strong>${escapeHtml(action.date)}</strong>
        </div>

        <div class="action-detail-stat">
          <span class="action-stat-icon time">
            <i data-lucide="clock-3"></i>
          </span>
          <span class="action-stat-label">Time</span>
          <strong>${escapeHtml(action.time)}</strong>
        </div>

        <div class="action-detail-stat">
          <span class="action-stat-icon people">
            <i data-lucide="users"></i>
          </span>
          <span class="action-stat-label">Participants</span>
          <strong id="actionParticipantCount">${action.participants} joined</strong>
        </div>

      </div>

      <div class="action-detail-organizer">
        <span class="action-organizer-icon">
          <i data-lucide="users-round"></i>
        </span>
        <span>
          <small>Organized by</small>
          <strong>${escapeHtml(action.organizer)}</strong>
          <em>Community Group</em>
        </span>
      </div>

      <div class="action-detail-support">
        <span class="action-support-icon">
          <i data-lucide="landmark"></i>
        </span>
        <span>
          <strong>Government Support</strong>
          <p>${escapeHtml(action.support)}</p>
        </span>
      </div>

      <div class="action-detail-about">
        <span class="action-about-icon">
          <i data-lucide="leaf"></i>
        </span>
        <span>
          <strong>About the Activity</strong>
          <p>${escapeHtml(action.description)}</p>
        </span>
      </div>

      <button
        type="button"
        class="btn btn-primary btn-lg btn-block action-detail-join"
        id="joinCivicActionBtn"
        onclick="joinCivicAction('${actionId}')"
      >
        <i data-lucide="user-plus"></i>
        Join Activity
      </button>

    </div>
  `;

  showScreen(
    "actionDetailScreen"
  );

  refreshIcons();
}

function joinCivicAction(actionId) {

  const action =
    civicActionData[actionId];

  if (!action) {
    return;
  }


  action.participants += 1;


  const count =
    document.getElementById(
      "actionParticipantCount"
    );

  if (count) {
    count.textContent =
      `${action.participants} joined`;
  }


  const button =
    document.getElementById(
      "joinCivicActionBtn"
    );

  if (button) {

    button.disabled = true;

    button.innerHTML = `
      <i data-lucide="check"></i>
      Joined Activity
    `;

    refreshIcons();

  }


  toast(
    "You joined this civic activity!"
  );

}


/* =========================================================
   CIVIC ACTIONS RENDERING
   ========================================================= */

function renderCivicActions() {
  const list = document.getElementById("civicActionsList");
  if (!list) return;

  if (!Array.isArray(window.civicUserActivities)) {
    window.civicUserActivities = [];
  }

  const builtInActions = []; // Do not show fictional community activity.

  const userActions = window.civicUserActivities.map((activity) => {
    civicActionData[activity.id] = activity;
    return activity;
  });

  const builtInMarkup = builtInActions.map((item) => {
    const action = civicActionData[item.id];

    return `
      <button
        type="button"
        class="action-card glass civic-action-card"
        data-civic-action="${item.id}"
      >
        <span
          class="action-card-image"
          style="background-image: linear-gradient(90deg, rgba(4,12,9,.01), rgba(4,12,9,.04)), url('${action.image || ""}')"
          aria-hidden="true"
        ></span>

        <span class="action-icon">
          <i data-lucide="${item.icon}"></i>
        </span>

        <span class="action-text">
          <span class="action-title">${escapeHtml(item.title)}</span>

          <span class="action-desc">
            ${escapeHtml(item.description)}
          </span>

          <span class="action-meta">
            <span>
              <i data-lucide="map-pin"></i>
              ${escapeHtml(action.location)}
            </span>

            <span>
              <i data-lucide="users"></i>
              ${action.participants} joined
            </span>
          </span>
        </span>

        <i
          data-lucide="arrow-up-right"
          class="action-arrow"
        ></i>
      </button>
    `;
  }).join("");

  const userMarkup = userActions.map((activity) => `
    <button
      type="button"
      class="action-card glass civic-action-card user-civic-action-card"
      data-civic-action="${activity.id}"
    >
      <span
        class="action-card-image"
        style="background-image: linear-gradient(90deg, rgba(4,12,9,.01), rgba(4,12,9,.04)), url('${activity.image || ""}')"
        aria-hidden="true"
      ></span>

      <span class="action-icon">
        <i data-lucide="${activity.icon || "megaphone"}"></i>
      </span>

      <span class="action-text">
        <span class="action-title">
          ${escapeHtml(activity.title)}
        </span>

        <span class="action-desc">
          ${escapeHtml(activity.description)}
        </span>

        <span class="action-meta">
          <span>
            <i data-lucide="map-pin"></i>
            ${escapeHtml(activity.location)}
          </span>

          <span>
            <i data-lucide="users"></i>
            ${Number(activity.participants) || 0} expected
          </span>
        </span>
      </span>

      <i
        data-lucide="arrow-up-right"
        class="action-arrow"
      ></i>
    </button>
  `).join("");

  list.innerHTML =
    builtInMarkup +
    userMarkup;

  refreshIcons();
}


/* =========================================================
   CREATE ACTIVITY SCREEN
   ========================================================= */

function openCreateActivity() {

  showScreen(
    "createActivityScreen"
  );

}

/* =========================================================
   13. INIT
   ========================================================= */

function runInitStep(name, fn) {
  try {
    fn();
  } catch (error) {
    console.error(`Civic OS init step failed: ${name}`, error);
  }
}

function init() {

  runInitStep("backend", setupCivicBackend);

  runInitStep("real reports", () => { issues = []; });

  runInitStep("category options", renderCategoryOptions);
  runInitStep("issue filters", setupIssueFilters);
  runInitStep("skill picker", renderSkillPicker);
  runInitStep("event bindings", bindEvents);
  runInitStep("civic actions", renderCivicActions);

  runInitStep("initial screen", () => {
    showScreen(screenFromHash(), { push: false });
  });

  runInitStep("icons", refreshIcons);
}

/*
 * Boot defensively: one optional UI component must never prevent the
 * rest of Civic OS from becoming interactive. This is especially useful
 * on mobile browsers when an external icon library is delayed or fails.
 */
function bootCivicOS() {
  let initialized = false;

  try {
    init();
    initialized = true;
  } catch (error) {
    console.error("Civic OS boot error", error);
  }

  // The normal event delegation is already active after successful init.
  // Add direct navigation listeners only as a recovery path if init throws.
  if (initialized) return;

  document.querySelectorAll("[data-goto]").forEach((element) => {
    if (element.dataset.civicBound === "true") return;
    element.dataset.civicBound = "true";
    element.addEventListener("click", () => {
      const target = element.dataset.goto;
      if (target && typeof showScreen === "function") {
        showScreen(target);
      }
    });
  });
}

bootCivicOS();
