const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";
const API_BASE = `${BASE}/api`;

async function apiFetch(path: string, options?: RequestInit) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    signal: options?.signal ?? AbortSignal.timeout(120_000),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`API ${res.status}: ${text}`);
  }
  return res;
}

export async function uploadAndAnalyze(
  file: File,
  jobDescription: string,
  onProgress?: (stage: string) => void,
  scanName?: string,
) {
  onProgress?.("Uploading resume...");
  const form = new FormData();
  form.append("file", file);
  form.append("job_description", jobDescription);
  if (scanName) form.append("scan_name", scanName);

  const uploadRes = await apiFetch("/upload", { method: "POST", body: form });
  const { scan_id } = await uploadRes.json();

  onProgress?.("Running ATS analysis...");
  const analysisRes = await apiFetch(`/analyze/${scan_id}`, { method: "POST" });

  onProgress?.("Complete");
  return analysisRes.json();
}

export async function getHistory() {
  const res = await apiFetch("/history");
  return res.json();
}

export async function getHistoryItem(scanId: string) {
  const res = await apiFetch(`/history/${scanId}`);
  return res.json();
}

export async function compareScans(id1: string, id2: string) {
  const res = await apiFetch(`/compare/${id1}/${id2}`);
  return res.json();
}

export async function exportReport(scanId: string) {
  const res = await apiFetch(`/export/${scanId}`);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `ats_report_${scanId}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function checkHealth() {
  const res = await apiFetch("/healthz");
  return res.json();
}

export async function runAIEvaluation(resumeText: string, jdText: string) {
  const res = await apiFetch("/evaluate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ resume_text: resumeText, jd_text: jdText }),
  });
  return res.json();
}

export async function generateCoverLetter(resumeText: string, jdText: string, tone: string = "professional") {
  const res = await apiFetch("/cover_letter", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ resume_text: resumeText, jd_text: jdText, tone }),
  });
  return res.json();
}

export async function analyzePortfolio(resumeText: string) {
  const res = await apiFetch("/portfolio", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ resume_text: resumeText }),
  });
  return res.json();
}
