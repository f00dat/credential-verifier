const credentials = {
  caimlpen: {
    code: "C AI/MLPen",
    title: "Certified AI/ML Pentester (C AI/MLPen)",
    id: "10716446"
  },
  cbp: {
    code: "CBP",
    title: "Certified Blockchain Practitioner (CBP)",
    id: "9757745"
  },
  cnsp: {
    code: "CNSP",
    title: "Certified Network Security Practitioner (CNSP)",
    id: "9315147"
  },
  cap: {
    code: "CAP",
    title: "Certified AppSec Practitioner (CAP)",
    id: "8354532"
  }
};

const params = new URLSearchParams(window.location.search);
const selectedSlug = params.get("cert");

const list = document.getElementById("credential-list");
const verifyButton = document.getElementById("verify-button");
const statusBadge = document.getElementById("status-badge");
const details = document.getElementById("credential-details");
const titleNode = document.getElementById("credential-title");
const idNode = document.getElementById("certificate-id");
const message = document.getElementById("message");
const officialResponse = document.getElementById("official-response");
const officialResponseText = document.getElementById("official-response-text");

function buildCredentialCards() {
  Object.entries(credentials).forEach(([slug, credential]) => {
    const link = document.createElement("a");
    link.className = "credential-card";
    link.href = `?cert=${encodeURIComponent(slug)}`;

    if (slug === selectedSlug) {
      link.classList.add("active");
    }

    const code = document.createElement("div");
    code.className = "credential-code";
    code.textContent = credential.code;

    const heading = document.createElement("h3");
    heading.textContent = credential.title;

    const certId = document.createElement("div");
    certId.className = "credential-id";
    certId.textContent = `Certificate ID: ${credential.id}`;

    link.append(code, heading, certId);
    list.appendChild(link);
  });
}

function setStatus(type, text) {
  statusBadge.className = `status status-${type}`;
  statusBadge.textContent = text;
}

function parseOfficialResponse(value) {
  if (typeof value !== "string") {
    return {
      intro: "Official validator response",
      description: "",
      fields: [],
      fallback: JSON.stringify(value, null, 2)
    };
  }

  const parsed = new DOMParser().parseFromString(value, "text/html");

  let text = (parsed.body.textContent || "")
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .replace(/([.!?])(?=[A-Z])/g, "$1 ")
    .trim();

  const fieldPattern = /(Candidate Name|Exam Name|Issued Date|Certificate ID|Certificate Number|Status)\s*:\s*/gi;
  const matches = [...text.matchAll(fieldPattern)];

  if (!matches.length) {
    return {
      intro: "Official validator response",
      description: "",
      fields: [],
      fallback: text
    };
  }

  const firstFieldIndex = matches[0].index ?? text.length;
  const introText = text.slice(0, firstFieldIndex).trim();
  const firstSentenceMatch = introText.match(/^(.+?[.!?])(?:\s+|$)(.*)$/);

  const intro = firstSentenceMatch?.[1]?.trim() || introText;
  const description = firstSentenceMatch?.[2]?.trim() || "";

  const fields = matches.map((match, index) => {
    const valueStart = (match.index ?? 0) + match[0].length;
    const valueEnd = index + 1 < matches.length
      ? matches[index + 1].index
      : text.length;

    return {
      label: match[1].trim(),
      value: text.slice(valueStart, valueEnd).trim()
    };
  }).filter((field) => field.value);

  return {
    intro,
    description,
    fields,
    fallback: ""
  };
}

function renderOfficialResponse(value, success) {
  const result = parseOfficialResponse(value);
  officialResponseText.replaceChildren();

  if (result.fallback) {
    const fallback = document.createElement("div");
    fallback.className = "official-response-fallback";
    fallback.textContent = result.fallback;
    officialResponseText.appendChild(fallback);
    return;
  }

  const summary = document.createElement("div");
  summary.className = `official-response-summary ${success ? "is-valid" : "is-invalid"}`;

  const icon = document.createElement("span");
  icon.className = "official-response-icon";
  icon.setAttribute("aria-hidden", "true");
  icon.textContent = success ? "✓" : "!";

  const summaryCopy = document.createElement("div");
  summaryCopy.className = "official-response-summary-copy";

  const intro = document.createElement("div");
  intro.className = "official-response-intro";
  intro.textContent = result.intro;
  summaryCopy.appendChild(intro);

  if (result.description) {
    const description = document.createElement("div");
    description.className = "official-response-description";
    description.textContent = result.description;
    summaryCopy.appendChild(description);
  }

  summary.append(icon, summaryCopy);
  officialResponseText.appendChild(summary);

  if (result.fields.length) {
    const grid = document.createElement("dl");
    grid.className = "official-response-grid";

    result.fields.forEach((field) => {
      const item = document.createElement("div");
      item.className = "official-response-field";

      const label = document.createElement("dt");
      label.textContent = field.label;

      const fieldValue = document.createElement("dd");
      fieldValue.textContent = field.value;

      item.append(label, fieldValue);
      grid.appendChild(item);
    });

    officialResponseText.appendChild(grid);
  }
}

async function verifyCredential(slug) {
  const credential = credentials[slug];

  if (!credential) {
    setStatus("invalid", "UNKNOWN");
    message.textContent = "Unknown credential.";
    verifyButton.disabled = true;
    details.hidden = true;
    return;
  }

  const workerUrl = window.CREDENTIAL_VERIFIER_CONFIG?.workerUrl;

  if (!workerUrl || workerUrl.includes("YOUR_WORKER_SUBDOMAIN")) {
    setStatus("invalid", "CONFIG");
    message.textContent = "Worker URL is not configured yet.";
    return;
  }

  verifyButton.disabled = true;
  officialResponse.hidden = true;
  setStatus("loading", "VERIFYING");
  message.textContent = "Requesting a live validation from PentestingExams...";

  try {
    const endpoint = new URL(workerUrl);
    endpoint.searchParams.set("cert", slug);

    const response = await fetch(endpoint.toString(), {
      method: "GET",
      headers: {
        "Accept": "application/json"
      },
      cache: "no-store"
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data?.error || `Verification request failed with HTTP ${response.status}`);
    }

    const officialSuccess = Boolean(data?.verification?.success);
    const officialData = data?.verification?.data ?? "";

    renderOfficialResponse(officialData || "No text was returned by the official validator.", officialSuccess);
    officialResponse.hidden = false;

    if (officialSuccess) {
      setStatus("valid", "VALID");
      message.textContent = "The official validation service returned a successful response.";
    } else {
      setStatus("invalid", "NOT VALIDATED");
      message.textContent = "The official validation service did not return a successful validation.";
    }
  } catch (error) {
    setStatus("invalid", "UNAVAILABLE");
    message.textContent = "The live verification service is temporarily unavailable.";
    renderOfficialResponse(error.message, false);
    officialResponse.hidden = false;
  } finally {
    verifyButton.disabled = false;
  }
}

function initialize() {
  buildCredentialCards();

  const credential = credentials[selectedSlug];

  if (!credential) {
    return;
  }

  details.hidden = false;
  titleNode.textContent = credential.title;
  idNode.textContent = credential.id;
  verifyButton.disabled = false;
  message.textContent = "This credential is ready for live verification.";

  verifyButton.addEventListener("click", () => verifyCredential(selectedSlug));

  verifyCredential(selectedSlug);
}

initialize();
