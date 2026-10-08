/**
 * Civic OS — secure multimodal AI gateway
 * Deploy as a serverless function (Vercel-compatible).
 *
 * Required environment variable:
 *   OPENAI_API_KEY
 *
 * Recommended:
 *   OPENAI_MODEL=gpt-5
 *   CIVIC_ALLOWED_ORIGIN=https://<your-github-pages-domain>
 *   CIVIC_RATE_LIMIT_PER_MINUTE=20
 *
 * The browser never receives OPENAI_API_KEY.
 */

const MAX_BODY_BYTES = 12 * 1024 * 1024;
const MAX_IMAGE_DATA_URL_BYTES = 10 * 1024 * 1024;

const OUTPUT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    detectedProblem: { type: "string" },
    domain: { type: "string" },
    category: { type: "string" },
    severity: { type: "number", minimum: 0, maximum: 100 },
    priority: { type: "number", minimum: 0, maximum: 100 },
    confidence: { type: "number", minimum: 0, maximum: 100 },
    publicImpact: { type: "string" },
    imageFindings: {
      type: "array",
      items: { type: "string" },
      maxItems: 12
    },
    consequences: {
      type: "array",
      items: { type: "string" },
      maxItems: 8
    },
    damageAssessment: { type: "string" },
    reasoning: { type: "string" },
    recommendedAction: {
      type: "array",
      items: { type: "string" },
      maxItems: 8
    },
    estimatedResponseWindow: { type: "string" },
    primaryDepartmentId: { type: "string" },
    supportingDepartmentIds: {
      type: "array",
      items: { type: "string" },
      maxItems: 6
    },
    routingReason: { type: "string" },
    verificationRequired: { type: "boolean" },
    verificationReason: { type: "string" }
  },
  required: [
    "detectedProblem",
    "domain",
    "category",
    "severity",
    "priority",
    "confidence",
    "publicImpact",
    "imageFindings",
    "consequences",
    "damageAssessment",
    "reasoning",
    "recommendedAction",
    "estimatedResponseWindow",
    "primaryDepartmentId",
    "supportingDepartmentIds",
    "routingReason",
    "verificationRequired",
    "verificationReason"
  ]
};

function json(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(body));
}

function allowedOrigin(origin) {
  const configured = String(process.env.CIVIC_ALLOWED_ORIGIN || "").trim();
  if (!configured) return true;

  return configured
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .includes(origin);
}

function getClientIp(req) {
  const forwarded = String(req.headers["x-forwarded-for"] || "");
  return forwarded.split(",")[0].trim() || String(req.socket?.remoteAddress || "unknown");
}

const rateState = new Map();

function checkRateLimit(req) {
  const limit = Math.max(
    1,
    Number(process.env.CIVIC_RATE_LIMIT_PER_MINUTE || 20)
  );
  const now = Date.now();
  const key = getClientIp(req);
  const previous = rateState.get(key) || [];
  const recent = previous.filter((time) => now - time < 60_000);

  if (recent.length >= limit) {
    rateState.set(key, recent);
    return false;
  }

  recent.push(now);
  rateState.set(key, recent);
  return true;
}

function safeString(value, max = 6000) {
  return String(value ?? "").slice(0, max);
}

function normalizeKnowledge(list) {
  if (!Array.isArray(list)) return [];

  return list
    .filter((item) => item && typeof item === "object" && item.id)
    .slice(0, 80)
    .map((item) => ({
      id: safeString(item.id, 120),
      officialName: safeString(item.officialName, 240),
      responsibilityAreas: Array.isArray(item.responsibilityAreas)
        ? item.responsibilityAreas.slice(0, 20).map((x) => safeString(x, 160))
        : [],
      problemTypes: Array.isArray(item.problemTypes)
        ? item.problemTypes.slice(0, 20).map((x) => safeString(x, 160))
        : [],
      visualSignals: Array.isArray(item.visualSignals)
        ? item.visualSignals.slice(0, 20).map((x) => safeString(x, 160))
        : [],
      escalationConditions: Array.isArray(item.escalationConditions)
        ? item.escalationConditions.slice(0, 20).map((x) => safeString(x, 200))
        : []
    }));
}

function validateAndGround(result, knowledge) {
  const validIds = new Set(knowledge.map((item) => item.id));

  if (!validIds.has(result.primaryDepartmentId)) {
    result.primaryDepartmentId = "";
    result.verificationRequired = true;
    result.verificationReason =
      "The model could not ground the primary department to the supplied civic knowledge base.";
  }

  result.supportingDepartmentIds = Array.from(
    new Set(
      (Array.isArray(result.supportingDepartmentIds)
        ? result.supportingDepartmentIds
        : []
      ).filter((id) => validIds.has(id) && id !== result.primaryDepartmentId))
    ).slice(0, 6);

  result.imageFindings = Array.isArray(result.imageFindings)
    ? result.imageFindings.slice(0, 12)
    : [];

  result.consequences = Array.isArray(result.consequences)
    ? result.consequences.slice(0, 8)
    : [];

  result.recommendedAction = Array.isArray(result.recommendedAction)
    ? result.recommendedAction.slice(0, 8)
    : [];

  // Never let a high confidence score hide missing evidence.
  if (result.confidence < 70 || result.imageFindings.length === 0) {
    result.verificationRequired = true;
    if (!result.verificationReason) {
      result.verificationReason =
        "Field verification is recommended because the available evidence is limited.";
    }
  }

  return result;
}

function buildInstructions(knowledge) {
  return [
    "You are Civic OS AI, a multimodal civic-intelligence engine for Manipur, India.",
    "Your job is to analyze a citizen's civic report and produce a structured assessment that can be consumed by a government operations dashboard.",
    "",
    "CORE RULES:",
    "1. Analyze the citizen's description and any supplied image evidence together.",
    "2. Do not invent objects, damage, measurements, people, causes, government responsibility, or repair times that are not supported by the evidence or supplied knowledge.",
    "3. Separate what is visibly observed from what is inferred. Use cautious language for uncertain inferences.",
    "4. Identify the most likely civic domain even when the citizen's category hint is wrong or vague.",
    "5. Route to a department only when its responsibility is supported by the supplied Manipur civic knowledge. Do not route merely because a keyword matches.",
    "6. A supporting department is appropriate only when the problem genuinely crosses responsibilities.",
    "7. Priority reflects public risk, urgency, scale of impact, service disruption, vulnerability, and likelihood of worsening.",
    "8. Severity describes the condition itself; priority describes how urgently government should respond. They are not interchangeable.",
    "9. Consequences must be plausible consequences of the observed/reported condition, not fabricated predictions.",
    "10. Estimated response windows must be expressed as an operational estimate, never as a guaranteed government SLA. If no evidence supports a timeframe, say it is subject to field verification.",
    "11. If an image is blurry, incomplete, ambiguous, or unrelated, explicitly say so and set verificationRequired=true.",
    "12. Never claim that a department has officially accepted, assigned, inspected, or resolved a report.",
    "13. The final primaryDepartmentId and supportingDepartmentIds MUST come from the supplied knowledge IDs.",
    "14. Return ONLY the requested structured object.",
    "",
    "MANIPUR CIVIC KNOWLEDGE:",
    JSON.stringify(knowledge)
  ].join("\n");
}

async function callOpenAI(payload, knowledge) {
  const apiKey = String(process.env.OPENAI_API_KEY || "").trim();
  if (!apiKey) throw new Error("OPENAI_API_KEY is not configured.");

  const model = String(process.env.OPENAI_MODEL || "gpt-5").trim();

  const content = [
    {
      type: "input_text",
      text: [
        "Analyze this Civic OS report.",
        "REPORT:",
        JSON.stringify(payload.report || {}),
        "",
        "EVIDENCE NOTES:",
        JSON.stringify(payload.evidence || {})
      ].join("\n")
    }
  ];

  const image = payload?.evidence?.image;
  if (typeof image === "string" && image.startsWith("data:image/")) {
    if (image.length > MAX_IMAGE_DATA_URL_BYTES) {
      throw new Error("Evidence image is too large.");
    }

    content.push({
      type: "input_image",
      image_url: image,
      detail: "high"
    });
  }

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + apiKey
    },
    body: JSON.stringify({
      model,
      instructions: buildInstructions(knowledge),
      input: [
        {
          role: "user",
          content
        }
      ],
      text: {
        format: {
          type: "json_schema",
          name: "civic_assessment",
          strict: true,
          schema: OUTPUT_SCHEMA
        }
      },
      max_output_tokens: 1800
    })
  });

  const rawText = await response.text();

  if (!response.ok) {
    throw new Error(
      "OpenAI request failed (" + response.status + "): " + rawText.slice(0, 500)
    );
  }

  let raw;
  try {
    raw = JSON.parse(rawText);
  } catch {
    throw new Error("OpenAI returned invalid JSON.");
  }

  const outputText =
    typeof raw.output_text === "string"
      ? raw.output_text
      : Array.isArray(raw.output)
        ? raw.output
            .flatMap((item) => Array.isArray(item.content) ? item.content : [])
            .filter((item) => item && item.type === "output_text")
            .map((item) => item.text)
            .join("")
        : "";

  if (!outputText) {
    throw new Error("OpenAI returned no structured assessment.");
  }

  let assessment;
  try {
    assessment = JSON.parse(outputText);
  } catch {
    throw new Error("Structured assessment could not be parsed.");
  }

  return validateAndGround(assessment, knowledge);
}

module.exports = async function handler(req, res) {
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", req.headers.origin || "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    res.statusCode = 204;
    res.end();
    return;
  }

  if (req.method !== "POST") {
    json(res, 405, { error: "Method not allowed." });
    return;
  }

  const origin = String(req.headers.origin || "");
  if (!allowedOrigin(origin)) {
    json(res, 403, { error: "Origin not allowed." });
    return;
  }

  if (!checkRateLimit(req)) {
    json(res, 429, { error: "Too many AI requests. Please try again shortly." });
    return;
  }

  try {
    const rawBody =
      typeof req.body === "string"
        ? req.body
        : JSON.stringify(req.body || {});

    if (Buffer.byteLength(rawBody, "utf8") > MAX_BODY_BYTES) {
      json(res, 413, { error: "Request payload is too large." });
      return;
    }

    const payload = JSON.parse(rawBody);

    if (!payload || payload.task !== "multimodal_civic_triage") {
      json(res, 400, { error: "Invalid Civic OS AI request." });
      return;
    }

    const description = safeString(payload?.report?.description, 5000).trim();
    if (!description) {
      json(res, 400, { error: "A civic report description is required." });
      return;
    }

    const knowledge = normalizeKnowledge(payload.knowledge);
    if (!knowledge.length) {
      json(res, 400, { error: "Civic knowledge base is missing." });
      return;
    }

    const assessment = await callOpenAI(payload, knowledge);

    res.setHeader("Access-Control-Allow-Origin", origin || "*");
    json(res, 200, {
      version: "civic-os-ai-v1",
      source: "multimodal-ai",
      assessment
    });
  } catch (error) {
    console.error("Civic OS AI gateway error:", error);
    json(res, 500, {
      error: "Civic AI could not complete this assessment.",
      verificationRequired: true
    });
  }
};
