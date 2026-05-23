"use client";

import { useState, useCallback } from "react";
import { useVoiceChat } from "@/app/components/VoiceChatContext";
import Avatar from "@/app/components/Avatar";
import VoiceInputBar from "@/app/components/VoiceInputBar";
import VoiceFeedbackPanel from "@/app/components/VoiceFeedbackPanel";
import VoiceSettingsModal from "@/app/components/VoiceSettingsModal";
import { submitTrainingTurn, getStoredUserId } from "@/app/lib/api";
import type { AgentTurnResponse } from "@/app/lib/mockData";

type Step = "input" | "thinking" | "feedback";

export default function ExpressionTrainingPage() {
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

  const [step, setStep] = useState<Step>("input");
  const [feedback, setFeedback] = useState<AgentTurnResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const handleTranscript = useCallback((text: string) => {
    setTranscript(text);
  }, [setTranscript]);

  const handleSubmit = useCallback(async () => {
    const text = transcript.trim();
    if (!text) {
      setLocalError("请先输入或说出你的观点");
      return;
    }
    setIsLoading(true);
    setLocalError(null);
    setAvatarState("thinking");

    try {
      const result = await submitTrainingTurn({
        user_id: getStoredUserId(),
        session_id: `expr_${Date.now()}`,
        mode: "expression_training",
        text: text,
      });
      setFeedback(result);
      setStep("feedback");
      setAvatarState("idle");

      if (result.safety.risk_level === "none") {
        await playText(result.reply_text);
      }
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : "请求失败");
      setAvatarState("idle");
    } finally {
      setIsLoading(false);
    }
  }, [transcript, setAvatarState, playText]);

  const handleRetry = useCallback(() => {
    stopAudio();
    setTranscript("");
    setFeedback(null);
    setLocalError(null);
    setStep("input");
    setAvatarState("idle");
  }, [stopAudio, setTranscript, setAvatarState]);

  const handleContinue = useCallback(() => {
    stopAudio();
    setTranscript("");
    setFeedback(null);
    setStep("input");
    setAvatarState("idle");
  }, [stopAudio, setTranscript, setAvatarState]);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">观点表达训练</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            用 PREP 结构训练逻辑表达
          </p>
        </div>
        <button
          onClick={() => setShowSettings(true)}
          className="w-9 h-9 rounded-full bg-purple-50 border border-purple-200 flex items-center justify-center text-lg hover:bg-purple-100 transition-colors"
        >
          ⚙️
        </button>
      </div>

      {/* Avatar */}
      <div className="flex justify-center py-2">
        <Avatar size="md" showWaveform={true} />
      </div>

      {step === "input" && (
        <>
          <div className="card">
            <p className="text-sm text-gray-600 mb-3">
              💡 <strong>PREP 结构：</strong>Point（观点）→ Reason（理由）→
              Example（例子）→ Point（回到结论）
            </p>
            <p className="text-sm text-gray-500">
              试着表达一个你想说但不知道怎么说的观点：
            </p>
          </div>

          {localError && (
            <div className="card border-red-200 bg-red-50 text-red-700 text-sm">
              {localError}
            </div>
          )}

          <VoiceInputBar
            onTranscript={handleTranscript}
            onSubmit={handleSubmit}
            placeholder="例如：我觉得这个方案可能不太好，但我不知道怎么说"
          />
        </>
      )}

      {step === "thinking" && (
        <div className="card text-center py-8">
          <div className="flex items-center justify-center gap-1 mb-3">
            <div className="w-2 h-2 rounded-full bg-primary thinking-dot" />
            <div className="w-2 h-2 rounded-full bg-primary thinking-dot" />
            <div className="w-2 h-2 rounded-full bg-primary thinking-dot" />
          </div>
          <div className="text-sm text-gray-500">AI 正在分析你的表达...</div>
        </div>
      )}

      {step === "feedback" && feedback && (
        <VoiceFeedbackPanel
          feedback={feedback}
          onPlayAgain={handleRetry}
          onContinue={handleContinue}
        />
      )}

      <VoiceSettingsModal open={showSettings} onClose={() => setShowSettings(false)} />
    </div>
  );
}
