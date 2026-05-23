"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useVoiceChat } from "@/app/components/VoiceChatContext";
import Avatar from "@/app/components/Avatar";
import VoiceInputBar from "@/app/components/VoiceInputBar";
import VoiceFeedbackPanel from "@/app/components/VoiceFeedbackPanel";
import VoiceSettingsModal from "@/app/components/VoiceSettingsModal";
import {
  getScenarios,
  getRoles,
  submitTrainingTurn,
  getStoredUserId,
  type Scenario,
  type RolePreset,
} from "@/app/lib/api";
import { mockScenarios, mockRoles, type AgentTurnResponse } from "@/app/lib/mockData";

type Step = "select" | "describe" | "feedback";

export default function SceneTrainingPage() {
  const router = useRouter();
  const {
    setAvatarState,
    setTranscript,
    playText,
    stopAudio,
    transcript,
    setShowSettings,
    showSettings,
    setError,
  } = useVoiceChat();

  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [roles, setRoles] = useState<RolePreset[]>([]);
  const [step, setStep] = useState<Step>("select");
  const [activeScenario, setActiveScenario] = useState<Scenario | null>(null);
  const [activeRole, setActiveRole] = useState<RolePreset | null>(null);
  const [input, setInput] = useState("");
  const [feedback, setFeedback] = useState<AgentTurnResponse | null>(null);
  const [error, setLocalError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [sc, rl] = await Promise.all([getScenarios(), getRoles()]);
        if (sc.length > 0) setScenarios(sc);
        if (rl.length > 0) setRoles(rl);
      } catch {
        // fallback to mock
      }
    })();
  }, []);

  const scenarioList = scenarios.length > 0 ? scenarios : (mockScenarios as Scenario[]);
  const roleList = roles.length > 0 ? roles : (mockRoles as RolePreset[]);

  const reset = useCallback(() => {
    stopAudio();
    setStep("select");
    setActiveScenario(null);
    setActiveRole(null);
    setInput("");
    setTranscript("");
    setFeedback(null);
    setLocalError("");
    setError(null);
    setAvatarState("idle");
  }, [stopAudio, setTranscript, setError, setAvatarState]);

  const pickScenario = useCallback((sc: Scenario) => {
    setActiveScenario(sc);
    setActiveRole(null);
    setStep("describe");
    setInput("");
    setTranscript("");
    setFeedback(null);
    setLocalError("");
  }, [setTranscript]);

  const pickRole = useCallback((role: RolePreset) => {
    setActiveRole(role);
    setActiveScenario(null);
    setStep("describe");
    setInput("");
    setTranscript("");
    setFeedback(null);
    setLocalError("");
  }, [setTranscript]);

  const handleTranscript = useCallback((text: string) => {
    setTranscript(text);
    setInput(text);
  }, [setTranscript]);

  const submit = useCallback(async () => {
    const text = input.trim() || transcript.trim();
    if (!text) {
      setLocalError("请先描述场景或输入你的表达");
      return;
    }
    setIsLoading(true);
    setLocalError("");
    setAvatarState("thinking");

    try {
      const prompt = activeScenario
        ? `场景：${activeScenario.title}。${text}`
        : activeRole
        ? `角色扮演：${activeRole.name}。${text}`
        : text;

      const result = await submitTrainingTurn({
        user_id: getStoredUserId(),
        session_id: `scene_${Date.now()}`,
        mode: activeRole ? "roleplay" : "scene_analysis",
        text: prompt,
      });
      setFeedback(result);
      setStep("feedback");
      setAvatarState("idle");

      if (result.safety.risk_level === "none") {
        await playText(result.reply_text);
      }
    } catch (e) {
      setLocalError(e instanceof Error ? e.message : "提交失败");
      setAvatarState("idle");
    } finally {
      setIsLoading(false);
    }
  }, [input, transcript, activeScenario, activeRole, setAvatarState, playText]);

  const continuePractice = useCallback(() => {
    stopAudio();
    setStep("describe");
    setTranscript("");
    setInput("");
    setFeedback(null);
    setAvatarState("idle");
  }, [stopAudio, setTranscript, setAvatarState]);

  if (step === "select") {
    return (
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">场景训练</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              选择场景，和 AI 语音模拟对话
            </p>
          </div>
          <button
            onClick={() => setShowSettings(true)}
            className="w-9 h-9 rounded-full bg-purple-50 border border-purple-200 flex items-center justify-center text-lg hover:bg-purple-100 transition-colors"
          >
            ⚙️
          </button>
        </div>

        <Avatar size="md" showWaveform={false} />

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => router.push("/train/expression")}
            className="card hover:shadow-md transition-shadow text-center"
          >
            <div className="text-3xl mb-2">📝</div>
            <div className="font-medium text-sm">文字训练</div>
            <div className="text-xs text-gray-400 mt-1">打字对话</div>
          </button>
          <button
            onClick={() => router.push("/train/voice")}
            className="card hover:shadow-md transition-shadow text-center"
          >
            <div className="text-3xl mb-2">🎙️</div>
            <div className="font-medium text-sm">自由语音</div>
            <div className="text-xs text-gray-400 mt-1">自由对话</div>
          </button>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-3">训练场景</h2>
          <div className="space-y-2">
            {scenarioList.map((s) => (
              <button
                key={s.id}
                onClick={() => pickScenario(s)}
                className="card w-full flex items-center gap-3 hover:shadow-md transition-shadow text-left"
              >
                <div className="text-2xl">{s.icon}</div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm">{s.title}</div>
                  <div className="text-xs text-gray-400 truncate">
                    {s.description}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="tag text-xs">{s.category}</span>
                  <span className="text-xs text-gray-300">
                    {"⭐".repeat(s.difficulty)}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-3">角色扮演</h2>
          <p className="text-sm text-gray-500 mb-3">
            选择 AI 扮演的角色，练习不同对象的沟通
          </p>
          <div className="grid grid-cols-3 gap-2">
            {roleList.map((role) => (
              <button
                key={role.id}
                onClick={() => pickRole(role)}
                className="card text-center hover:shadow-md transition-shadow"
              >
                <div className="text-2xl mb-1">{role.icon}</div>
                <div className="text-sm font-medium">{role.name}</div>
                <div className="text-xs text-gray-400">{role.category}</div>
              </button>
            ))}
          </div>
        </div>

        <VoiceSettingsModal open={showSettings} onClose={() => setShowSettings(false)} />
      </div>
    );
  }

  if (step === "describe") {
    const context = activeScenario || activeRole;
    return (
      <div className="space-y-5">
        <button onClick={reset} className="text-sm text-primary">
          ← 返回选择
        </button>

        {context && (
          <div className="card flex items-center gap-3">
            <div className="text-3xl">{activeScenario?.icon || activeRole?.icon}</div>
            <div>
              <div className="font-medium text-sm">
                {activeScenario?.title || `扮演：${activeRole?.name}`}
              </div>
              <div className="text-xs text-gray-400">
                {activeScenario?.description || activeRole?.category}
              </div>
            </div>
          </div>
        )}

        <Avatar size="md" showWaveform={true} />

        <div className="card bg-purple-50 border-purple-200">
          <p className="text-sm text-gray-600">
            💡 {activeScenario
              ? "描述你遇到的具体情况，AI 会帮你分析并给出建议"
              : `AI 会扮演${activeRole?.name}和你对话。请先输入场景或开场白。`}
          </p>
        </div>

        {isLoading ? (
          <div className="card text-center py-8">
            <div className="flex items-center justify-center gap-1 mb-3">
              <div className="w-2 h-2 rounded-full bg-primary thinking-dot" />
              <div className="w-2 h-2 rounded-full bg-primary thinking-dot" />
              <div className="w-2 h-2 rounded-full bg-primary thinking-dot" />
            </div>
            <div className="text-sm text-gray-500">AI 正在分析...</div>
          </div>
        ) : (
          <>
            {error && (
              <div className="card border-red-200 bg-red-50 text-red-700 text-sm">
                {error}
              </div>
            )}
            <VoiceInputBar
              onTranscript={handleTranscript}
              onSubmit={submit}
              placeholder={
                activeScenario
                  ? "描述你遇到的具体情况..."
                  : "输入场景或开场白..."
              }
            />
          </>
        )}

        <VoiceSettingsModal open={showSettings} onClose={() => setShowSettings(false)} />
      </div>
    );
  }

  if (step === "feedback" && feedback) {
    return (
      <div className="space-y-5">
        <button onClick={reset} className="text-sm text-primary">
          ← 返回选择
        </button>

        <Avatar size="md" showWaveform={true} />

        <VoiceFeedbackPanel
          feedback={feedback}
          onPlayAgain={reset}
          onContinue={continuePractice}
        />

        <VoiceSettingsModal open={showSettings} onClose={() => setShowSettings(false)} />
      </div>
    );
  }

  return null;
}
