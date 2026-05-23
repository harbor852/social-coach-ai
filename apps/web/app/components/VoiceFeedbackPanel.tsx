"use client";

import { useVoiceChat } from "./VoiceChatContext";
import type { AgentTurnResponse } from "@/app/lib/mockData";

interface VoiceFeedbackPanelProps {
  feedback: AgentTurnResponse | null;
  onPlayAgain?: () => void;
  onContinue?: () => void;
}

export default function VoiceFeedbackPanel({
  feedback,
  onPlayAgain,
  onContinue,
}: VoiceFeedbackPanelProps) {
  const { isPlaying, playText, stopAudio, audioUrl } = useVoiceChat();

  if (!feedback) return null;

  const isSafe = feedback.safety.risk_level === "none";

  const handlePlayReply = () => {
    if (isPlaying) {
      stopAudio();
    } else {
      playText(feedback.reply_text);
    }
  };

  const ScoreBar = ({ label, value }: { label: string; value: number }) => (
    <div className="flex items-center gap-2 mb-1.5">
      <span className="text-xs text-gray-500 w-14">{label}</span>
      <div className="flex-1 score-bar">
        <div className="score-fill" style={{ width: `${value * 10}%` }} />
      </div>
      <span className="text-xs font-medium text-primary">{value}</span>
    </div>
  );

  return (
    <div className="space-y-4">
      {!isSafe && (
        <div
          className={`card border-2 ${
            feedback.safety.risk_level === "crisis"
              ? "border-red-300 bg-red-50"
              : "border-amber-300 bg-amber-50"
          }`}
        >
          <p className="text-sm">{feedback.reply_text}</p>
        </div>
      )}

      {isSafe && (
        <>
          {/* AI Reply with play button */}
          <div className="card bg-purple-50 border-purple-200">
            <div className="flex items-start gap-2">
              <span className="text-xl">🤖</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-sm font-medium text-purple-900">AI 教练</p>
                  <button
                    onClick={handlePlayReply}
                    className="text-xs px-2 py-0.5 rounded-full bg-primary text-white hover:opacity-80 transition-opacity"
                  >
                    {isPlaying ? "⏸ 暂停" : "▶ 播放语音"}
                  </button>
                </div>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">
                  {feedback.reply_text}
                </p>
              </div>
            </div>
          </div>

          {/* Scores */}
          <div className="card">
            <h3 className="text-sm font-semibold mb-3">📊 本轮评分</h3>
            <ScoreBar label="清晰度" value={feedback.scores.clarity} />
            <ScoreBar label="逻辑性" value={feedback.scores.logic} />
            <ScoreBar label="自信度" value={feedback.scores.confidence} />
            <ScoreBar label="礼貌度" value={feedback.scores.etiquette} />
            <ScoreBar label="证据力" value={feedback.scores.evidence} />
            <ScoreBar label="边界感" value={feedback.scores.boundary} />
          </div>

          {/* Strengths & Improvements */}
          <div className="grid grid-cols-2 gap-3">
            <div className="card border-green-200">
              <h3 className="text-sm font-semibold text-green-700 mb-2">
                ✅ 亮点
              </h3>
              <ul className="text-xs text-gray-600 space-y-1">
                {feedback.scores.strengths.map((s, i) => (
                  <li key={i}>• {s}</li>
                ))}
              </ul>
            </div>
            <div className="card border-amber-200">
              <h3 className="text-sm font-semibold text-amber-700 mb-2">
                🔧 可优化
              </h3>
              <ul className="text-xs text-gray-600 space-y-1">
                {feedback.scores.improvements.map((s, i) => (
                  <li key={i}>• {s}</li>
                ))}
              </ul>
            </div>
          </div>

          {/* Rewritten */}
          {feedback.scores.rewritten_expression && (
            <div className="card border-primary bg-purple-50">
              <h3 className="text-sm font-semibold text-primary mb-2">
                ✨ 改写示范
              </h3>
              <p className="text-sm text-gray-700 italic">
                &ldquo;{feedback.scores.rewritten_expression}&rdquo;
              </p>
            </div>
          )}

          {/* Next step */}
          <div className="card">
            <h3 className="text-sm font-semibold mb-2">🎯 下一步</h3>
            <p className="text-sm text-gray-600 whitespace-pre-wrap">
              {feedback.scores.next_practice}
            </p>
          </div>
        </>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <button onClick={onContinue} className="btn-primary flex-1">
          继续练习
        </button>
        <button onClick={onPlayAgain} className="btn-secondary flex-1">
          再练一次
        </button>
      </div>
    </div>
  );
}
