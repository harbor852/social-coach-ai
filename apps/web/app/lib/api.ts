import type { AgentTurnResponse } from "./mockData";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

// --- LLM Config ---

export interface LLMConfig {
  provider: string;
  api_key: string;
  model?: string;
  base_url?: string;
}

export function getLLMConfig(): LLMConfig | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem("llm_config");
  if (!raw) return null;
  try {
    return JSON.parse(raw) as LLMConfig;
  } catch {
    return null;
  }
}

export function setLLMConfig(config: LLMConfig | null) {
  if (typeof window === "undefined") return;
  if (config) {
    window.localStorage.setItem("llm_config", JSON.stringify(config));
  } else {
    window.localStorage.removeItem("llm_config");
  }
}

// --- TTS Config ---

export interface TTSConfig {
  provider: "browser" | "alibaba" | "openai" | "mock";
  api_key?: string;
  model?: string;
  base_url?: string;
  voice?: string;
  rate?: number;
  pitch?: number;
}

export function getTTSConfig(): TTSConfig | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem("tts_config");
  if (!raw) return null;
  try {
    return JSON.parse(raw) as TTSConfig;
  } catch {
    return null;
  }
}

export function setTTSConfig(config: TTSConfig | null) {
  if (typeof window === "undefined") return;
  if (config) {
    window.localStorage.setItem("tts_config", JSON.stringify(config));
  } else {
    window.localStorage.removeItem("tts_config");
  }
}

export function isTTSConfigured(): boolean {
  const cfg = getTTSConfig();
  return !!(cfg && cfg.api_key);
}

// --- Agent ---

export async function submitTrainingTurn(params: {
  user_id: string;
  session_id: string;
  mode: string;
  text: string;
  user_stage?: string;
}): Promise<AgentTurnResponse> {
  const body: Record<string, unknown> = {
    ...params,
    user_stage: params.user_stage ?? getStoredStage(),
  };
  const llm = getLLMConfig();
  if (llm) {
    body.llm_config = llm;
  }
  const res = await fetch(`${API_BASE}/agent/turn`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`API error ${res.status}: ${errorText}`);
  }

  return res.json();
}

export async function checkHealth(): Promise<{ status: string; version: string }> {
  const res = await fetch(`${API_BASE}/health`);
  return res.json();
}

// --- Voice / TTS ---

export async function synthesizeSpeech(text: string, voice?: string): Promise<Blob> {
  const form = new FormData();
  form.append("text", text);
  if (voice) form.append("voice", voice);

  const tts = getTTSConfig();
  if (tts) {
    form.append("tts_config", JSON.stringify(tts));
  }

  const res = await fetch(`${API_BASE}/voice/synthesize`, {
    method: "POST",
    body: form,
  });

  if (!res.ok) {
    throw new Error(`TTS error ${res.status}`);
  }

  return res.blob();
}

export async function listVoices(): Promise<Record<string, { id: string; name: string; gender: string; style: string; locale: string }[]>> {
  const res = await fetch(`${API_BASE}/voice/voices`);
  if (!res.ok) throw new Error(`list voices failed: ${res.status}`);
  return res.json();
}

// --- Profile / Onboarding ---

export interface OnboardingPayload {
  nickname: string;
  age_stage: string;
  challenges: string[];
  goals: string[];
  preferred_tone: string;
}

export interface OnboardingResponse {
  user_id: string;
  nickname: string;
  age_stage: string;
  message?: string;
  recommended_first_training?: string;
  recommended_scenarios?: { id: string; title: string; reason: string }[];
}

export async function submitOnboarding(payload: OnboardingPayload): Promise<OnboardingResponse> {
  const res = await fetch(`${API_BASE}/users/onboarding`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`onboarding failed: ${res.status}`);
  return res.json();
}

export async function getUserProfile(userId: string) {
  const res = await fetch(`${API_BASE}/users/${userId}/profile`);
  if (!res.ok) throw new Error(`profile failed: ${res.status}`);
  return res.json();
}

// --- Training ---

export interface ProgressResponse {
  total_sessions: number;
  total_minutes: number;
  streak_days: number;
  latest_scores: Record<string, number>;
  trends: Record<string, number[]>;
  recent_sessions: {
    id: string;
    date: string;
    mode: string;
    scene: string;
    score: number;
  }[];
}

export async function getProgress(userId: string): Promise<ProgressResponse> {
  const res = await fetch(`${API_BASE}/training/${encodeURIComponent(userId)}/progress`);
  if (!res.ok) throw new Error(`progress failed: ${res.status}`);
  const raw = await res.json();
  return {
    total_sessions: raw.total_sessions ?? 0,
    total_minutes:
      (raw.recent_sessions || []).reduce(
        (acc: number, s: any) => acc + (s.turn_count ?? 0) * 2,
        0,
      ) || 0,
    streak_days: 0,
    latest_scores: {
      clarity: raw.score_trends?.clarity?.at?.(-1) ?? 0,
      logic: raw.score_trends?.logic?.at?.(-1) ?? 0,
      confidence: raw.score_trends?.confidence?.at?.(-1) ?? 0,
      etiquette: raw.score_trends?.etiquette?.at?.(-1) ?? 0,
    },
    trends: {
      clarity: raw.score_trends?.clarity || [],
      logic: raw.score_trends?.logic || [],
      confidence: raw.score_trends?.confidence || [],
      etiquette: raw.score_trends?.etiquette || [],
    },
    recent_sessions: (raw.recent_sessions || []).map((s: any) => ({
      id: s.session_id,
      date: s.started_at ? new Date(s.started_at).toISOString().slice(0, 10) : "",
      mode: s.mode || "training",
      scene: s.scene_type || s.mode || "训练",
      score: s.avg_score ?? 0,
    })),
  };
}

export async function getSessions(userId: string, limit: number = 20) {
  const res = await fetch(
    `${API_BASE}/training/${encodeURIComponent(userId)}/sessions?limit=${limit}`,
  );
  if (!res.ok) throw new Error(`sessions failed: ${res.status}`);
  return res.json();
}

// --- Content ---

export interface Scenario {
  id: string;
  title: string;
  category: string;
  icon: string;
  description: string;
  difficulty: number;
  tags: string[];
}

export interface RolePreset {
  id: string;
  name: string;
  icon: string;
  category: string;
  description: string;
  difficulty: number;
}

export interface EtiquetteLesson {
  id: string;
  title: string;
  category: string;
  icon: string;
  duration: string;
  content: string;
  key_points: string[];
  common_mistakes: string[];
  practice_prompt: string;
}

export async function getScenarios(category?: string): Promise<Scenario[]> {
  const url = category
    ? `${API_BASE}/content/scenarios?category=${encodeURIComponent(category)}`
    : `${API_BASE}/content/scenarios`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`scenarios failed: ${res.status}`);
  return res.json();
}

export async function getRoles(): Promise<RolePreset[]> {
  const res = await fetch(`${API_BASE}/content/roles`);
  if (!res.ok) throw new Error(`roles failed: ${res.status}`);
  return res.json();
}

export async function getEtiquetteLessons(): Promise<EtiquetteLesson[]> {
  const res = await fetch(`${API_BASE}/content/etiquette`);
  if (!res.ok) throw new Error(`lessons failed: ${res.status}`);
  return res.json();
}

// --- Knowledge Base ---

export interface KnowledgeEntry {
  id: string;
  user_id: string;
  title: string;
  content: string;
  source_type: string;
  created_at: string;
}

export async function createKnowledge(
  userId: string,
  title: string,
  content: string,
): Promise<KnowledgeEntry> {
  const res = await fetch(`${API_BASE}/knowledge`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_id: userId, title, content }),
  });
  if (!res.ok) throw new Error(`create knowledge failed: ${res.status}`);
  return res.json();
}

export async function getKnowledge(userId: string): Promise<KnowledgeEntry[]> {
  const res = await fetch(
    `${API_BASE}/knowledge?user_id=${encodeURIComponent(userId)}`,
  );
  if (!res.ok) throw new Error(`get knowledge failed: ${res.status}`);
  return res.json();
}

export async function deleteKnowledge(entryId: string, userId: string): Promise<{ ok: boolean }> {
  const res = await fetch(
    `${API_BASE}/knowledge/${entryId}?user_id=${encodeURIComponent(userId)}`,
    { method: "DELETE" },
  );
  if (!res.ok) throw new Error(`delete knowledge failed: ${res.status}`);
  return res.json();
}

// --- Helpers ---

export function getStoredUserId(): string {
  if (typeof window === "undefined") return "demo";
  return window.localStorage.getItem("user_id") || "demo";
}

export function getStoredNickname(): string {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem("nickname") || "";
}

export function getStoredStage(): string {
  if (typeof window === "undefined") return "other";
  return window.localStorage.getItem("age_stage") || "other";
}
