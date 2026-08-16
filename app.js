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

function extractOfficialText(value) {
  if (typeof value !== "string") {
    return JSON.stringify(value, null, 2);
  }

  const parsed = new DOMParser().parseFromString(value, "text/html");
  return parsed.body.textContent.trim();
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
    const officialText = extractOfficialText(data?.verification?.data ?? "");

    officialResponseText.textContent = officialText || "No text was returned by the official validator.";
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
    officialResponseText.textContent = error.message;
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
