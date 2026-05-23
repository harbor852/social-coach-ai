"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useVoiceChat } from "@/app/components/VoiceChatContext";
import Avatar from "@/app/components/Avatar";
import VoiceInputBar from "@/app/components/VoiceInputBar";
import VoiceSettingsModal from "@/app/components/VoiceSettingsModal";
import VoiceFeedbackPanel from "@/app/components/VoiceFeedbackPanel";
import { submitTrainingTurn, getStoredUserId, isTTSConfigured } from "@/app/lib/api";
import type { AgentTurnResponse } from "@/app/lib/mockData";

type Step = "idle" | "listening" | "thinking" | "feedback";

export default function VoicePracticePage() {
  const {
    avatarState,
    setAvatarState,
    transcript,
    setTranscript,
    playText,
    stopAudio,
    setShowSettings,
    showSettings,
    isPlaying,
    error: voiceError,
    setError,
    ttsConfigured,
  } = useVoiceChat();

  const [step, setStep] = useState<Step>("idle");
  const [feedback, setFeedback] = useState<AgentTurnResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Check TTS config on mount
  useEffect(() => {
    isTTSConfigured();
  }, []);

  const handleTranscript = useCallback(
    (text: string) => {
      setTranscript(text);
    },
    [setTranscript]
  );

  const handleSubmit = useCallback(
    async (textOverride?: string) => {
      const text = textOverride || transcript;
      if (!text?.trim()) {
        setError("还没有录制到内容");
        return;
      }

      setIsLoading(true);
      setStep("thinking");
      setAvatarState("thinking");
      setError(null);

      try {
        const result = await submitTrainingTurn({
          user_id: getStoredUserId(),
          session_id: `voice_${Date.now()}`,
          mode: "voice_practice",
          text: text.replace(/（[^）]*）/g, ""),
        });
        setFeedback(result);
        setStep("feedback");
        setAvatarState("idle");

        // Auto-play the reply
        if (result.safety.risk_level === "none") {
          await playText(result.reply_text);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "提交失败");
        setStep("idle");
        setAvatarState("idle");
      } finally {
        setIsLoading(false);
      }
    },
    [transcript, setAvatarState, setError, playText]
  );

  const handleVoiceInputBarSubmit = useCallback(() => {
    handleSubmit();
  }, [handleSubmit]);

  const reset = useCallback(() => {
    stopAudio();
    setStep("idle");
    setTranscript("");
    setFeedback(null);
    setError(null);
    setAvatarState("idle");
  }, [stopAudio, setTranscript, setError, setAvatarState]);

  const continuePractice = useCallback(() => {
    stopAudio();
    setStep("idle");
    setTranscript("");
    setFeedback(null);
    setAvatarState("idle");
  }, [stopAudio, setTranscript, setAvatarState]);

  return (
    <div className="space-y-5">
      {/* Header with settings button */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">语音陪练</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            和 AI 教练语音对话
          </p>
        </div>
        <button
          onClick={() => setShowSettings(true)}
          className="w-9 h-9 rounded-full bg-purple-50 border border-purple-200 flex items-center justify-center text-lg hover:bg-purple-100 transition-colors"
          title="语音设置"
        >
          ⚙️
        </button>
      </div>

      {/* Avatar */}
      <div className="flex justify-center py-2">
        <Avatar size="lg" showWaveform={true} />
      </div>

      {/* TTS not configured hint */}
      {!ttsConfigured && (
        <div
          className="card border-amber-200 bg-amber-50 text-amber-700 text-sm cursor-pointer"
          onClick={() => setShowSettings(true)}
        >
          <div className="flex items-center gap-2">
            <span>⚠️</span>
            <div>
              <p>语音合成未配置，AI 将以静音模式回复</p>
              <p className="text-xs mt-0.5 underline">点击配置阿里通义 / OpenAI TTS</p>
            </div>
          </div>
        </div>
      )}

      {/* Thinking state */}
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

      {/* Feedback */}
      {step === "feedback" && feedback && (
        <VoiceFeedbackPanel
          feedback={feedback}
          onPlayAgain={reset}
          onContinue={continuePractice}
        />
      )}

      {/* Input area */}
      {step !== "feedback" && (
        <>
          {/* Hint */}
          {step === "idle" && (
            <div className="card bg-purple-50 border-purple-200">
              <h3 className="text-sm font-semibold mb-2">💡 练习建议</h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• 找一个安静的环境</li>
                <li>• 自然表达，不用背稿</li>
                <li>• 主题示例：自我介绍 / 分享一件事 / 表达观点</li>
              </ul>
            </div>
          )}

          <VoiceInputBar
            onTranscript={handleTranscript}
            onSubmit={handleVoiceInputBarSubmit}
            placeholder="按住说话，或点击键盘输入文字..."
            disabled={isLoading}
          />
        </>
      )}

      {/* Settings Modal */}
      <VoiceSettingsModal open={showSettings} onClose={() => setShowSettings(false)} />
    </div>
  );
}
