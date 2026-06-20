const domain = process.env.EXPO_PUBLIC_DOMAIN;
const API_BASE = domain ? `https://${domain}/api` : "http://localhost:8080/api";

async function apiFetch(path: string, options?: RequestInit): Promise<Response> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    // @ts-ignore
    signal: options?.signal ?? AbortSignal.timeout(120_000),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`API ${res.status}: ${text}`);
  }
  return res;
}

export interface AnalysisResult {
  scan_id: string;
  filename: string;
  file_type: string;
  timestamp: string;
  processing_time_seconds: number;
  overall_score: number;
  letter_grade: string;
  sub_scores: Record<string, number>;
  keywords: {
    matched: string[];
    missing: string[];
    partial: string[];
    total_jd_keywords: number;
    keyword_score: number;
  };
  career_intelligence: {
    detected_roles: string[];
    seniority_level: string;
    industry_signals: string[];
    career_stage: string;
  } | null;
  action_verbs: {
    found: string[];
    weak_verbs: string[];
    missing_categories: string[];
    score: number;
  } | null;
  sections: {
    found: string[];
    missing: string[];
    score: number;
  } | null;
  formatting: {
    issues: string[];
    score: number;
    ats_friendly: boolean;
  } | null;
  skill_prediction: {
    predicted_skills: string[];
    confidence: number;
  } | null;
  feedback: Array<{
    category: string;
    severity: string;
    title: string;
    message: string;
    suggestion: string;
  }>;
  resume_preview: string;
  jd_preview: string;
}

export async function uploadAndAnalyze(
  fileUri: string,
  fileName: string,
  mimeType: string,
  jobDescription: string,
  onProgress?: (stage: string) => void
): Promise<AnalysisResult> {
  onProgress?.("Uploading resume...");
  const form = new FormData();
  // @ts-ignore - React Native FormData accepts uri-based file objects
  form.append("file", { uri: fileUri, name: fileName, type: mimeType });
  form.append("job_description", jobDescription);

  const uploadRes = await apiFetch("/upload", { method: "POST", body: form });
  const { scan_id } = await uploadRes.json();

  onProgress?.("Running ATS analysis...");
  const analysisRes = await apiFetch(`/analyze/${scan_id}`, { method: "POST" });
  onProgress?.("Complete");
  return analysisRes.json();
}

export async function getHistory(): Promise<any[]> {
  const res = await apiFetch("/history");
  return res.json();
}

export async function getHistoryItem(scanId: string): Promise<AnalysisResult> {
  const res = await apiFetch(`/history/${scanId}`);
  return res.json();
}

export async function compareScans(id1: string, id2: string): Promise<any> {
  const res = await apiFetch(`/compare/${id1}/${id2}`);
  return res.json();
}
