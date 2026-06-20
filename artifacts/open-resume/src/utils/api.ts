import axios from "axios";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";
const API_BASE = `${BASE}/api`;

const api = axios.create({
  baseURL: API_BASE,
  timeout: 120000,
});

export async function uploadAndAnalyze(
  file: File,
  jobDescription: string,
  onProgress?: (stage: string) => void
) {
  onProgress?.("Uploading resume...");
  const form = new FormData();
  form.append("file", file);
  form.append("job_description", jobDescription);

  const uploadRes = await api.post("/upload", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  const { scan_id } = uploadRes.data;

  onProgress?.("Running ATS analysis...");
  const analysisRes = await api.post(`/analyze/${scan_id}`);

  onProgress?.("Complete");
  return analysisRes.data;
}

export async function getHistory() {
  const res = await api.get("/history");
  return res.data;
}

export async function getHistoryItem(scanId: string) {
  const res = await api.get(`/history/${scanId}`);
  return res.data;
}

export async function compareScans(id1: string, id2: string) {
  const res = await api.get(`/compare/${id1}/${id2}`);
  return res.data;
}

export async function exportReport(scanId: string) {
  const res = await api.get(`/export/${scanId}`, { responseType: "blob" });
  const url = URL.createObjectURL(res.data);
  const a = document.createElement("a");
  a.href = url;
  a.download = `ats_report_${scanId}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function checkHealth() {
  const res = await api.get("/health");
  return res.data;
}

export default api;
