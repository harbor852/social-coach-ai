import type { TrainingFeedback, AgentTurnResponse } from "./mockData";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

export async function submitTrainingTurn(params: {
  user_id: string;
  session_id: string;
  mode: string;
  text: string;
}): Promise<AgentTurnResponse> {
  const res = await fetch(`${API_BASE}/agent/turn`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`API error ${res.status}: ${errorText}`);
  }

  return res.json();
}

export async function checkHealth(): Promise<{ status: string }> {
  const res = await fetch(`${API_BASE}/health`);
  return res.json();
}
