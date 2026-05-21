"use client";

import { useState } from "react";
import type { AgentTurnResponse } from "@/app/lib/mockData";
import { submitTrainingTurn } from "@/app/lib/api";

export default function ExpressionTrainingPage() {
  const [input, setInput] = useState("");
  const [feedback, setFeedback] = useState<AgentTurnResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<"input" | "feedback" | "retry">("input");

  const handleSubmit = async () => {
    if (!input.trim()) return;
    setIsLoading(true);
    setError(null);

    try {
      const result = await submitTrainingTurn({
        user_id: "demo",
        session_id: `s_${Date.now()}`,
        mode: "expression_training",
        text: input,
      });

      setFeedback(result);
      setStep("feedback");
    } catch (err) {
      setError(err instanceof Error ? err.message : "请求失败，请确认后端服务已启动");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRetry = () => {
    setInput("");
    setFeedback(null);
    setError(null);
    setStep("input");
  };

  const ScoreBar = ({ label, value }: { label: string; value: number }) => (
    <div className="flex items-center gap-2 mb-1">
      <span className="text-xs text-gray-500 w-16">{label}</span>
      <div className="flex-1 score-bar">
        <div className="score-fill" style={{ width: `${value * 10}%` }} />
      </div>
      <span className="text-xs font-medium text-primary">{value}/10</span>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h1 className="text-xl font-bold">观点表达训练</h1>
        <p className="text-sm text-gray-500 mt-1">
          用 PREP 结构训练清晰、有逻辑地表达观点
        </p>
      </div>

      {step === "input" && (
        <div className="space-y-4">
          <div className="card">
            <p className="text-sm text-gray-600 mb-3">
              💡 <strong>PREP 结构：</strong>Point（观点）→ Reason（理由）→
              Example（例子）→ Point（回到结论）
            </p>
            <p className="text-sm text-gray-500">
              试着表达一个你想说但不知道怎么说的观点：
            </p>
          </div>

          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder='例如："我觉得这个方案可能不太好，但我不知道怎么说"'
            className="w-full h-32 p-4 rounded-xl border border-purple-200 bg-white text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary-light"
          />

          {error && (
            <div className="card border-red-200 bg-red-50 text-red-700 text-sm">
              ❌ {error}
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={!input.trim() || isLoading}
            className="btn-primary w-full"
          >
            {isLoading ? "分析中..." : "提交练习"}
          </button>
        </div>
      )}

      {step === "feedback" && feedback && (
        <div className="space-y-4">
          {/* Safety Warning */}
          {feedback.safety.risk_level !== "none" && (
            <div
              className={`card border-2 ${
                feedback.safety.risk_level === "crisis"
                  ? "border-red-300 bg-red-50"
                  : "border-amber-300 bg-amber-50"
              }`}
            >
              <div className="flex items-start gap-2">
                <span className="text-xl">
                  {feedback.safety.risk_level === "crisis" ? "🚨" : "⚠️"}
                </span>
                <div>
                  <p className="text-sm font-medium">
                    {feedback.safety.risk_level === "crisis"
                      ? "安全提醒"
                      : "温馨提示"}
                  </p>
                  <p className="text-sm mt-1">{feedback.reply_text}</p>
                </div>
              </div>
            </div>
          )}

          {/* Normal feedback */}
          {feedback.safety.risk_level === "none" && (
            <>
              {/* AI Reply */}
              <div className="card bg-purple-50 border-purple-200">
                <div className="flex items-start gap-2">
                  <span className="text-xl">🤖</span>
                  <div>
                    <p className="text-sm font-medium text-purple-900 mb-1">
                      AI 教练反馈
                    </p>
                    <p className="text-sm text-gray-700">
                      {feedback.reply_text}
                    </p>
                  </div>
                </div>
              </div>

              {/* Scores */}
              <div className="card">
                <h3 className="text-sm font-semibold mb-3">📊 本轮评分</h3>
                <ScoreBar
                  label="清晰度"
                  value={feedback.scores.clarity}
                />
                <ScoreBar label="逻辑性" value={feedback.scores.logic} />
                <ScoreBar
                  label="自信度"
                  value={feedback.scores.confidence}
                />
                <ScoreBar
                  label="礼貌度"
                  value={feedback.scores.etiquette}
                />
                <ScoreBar
                  label="证据力"
                  value={feedback.scores.evidence}
                />
                <ScoreBar
                  label="边界感"
                  value={feedback.scores.boundary}
                />
              </div>

              {/* Strengths & Improvements */}
              <div className="grid grid-cols-2 gap-3">
                <div className="card border-green-200">
                  <h3 className="text-sm font-semibold text-green-700 mb-2">
                    ✅ 做得好的
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

              {/* Rewritten Version */}
              <div className="card border-primary bg-purple-50">
                <h3 className="text-sm font-semibold text-primary mb-2">
                  ✨ 推荐表达
                </h3>
                <p className="text-sm text-gray-700 italic">
                  &ldquo;{feedback.scores.rewritten_expression}&rdquo;
                </p>
              </div>

              {/* Next Practice */}
              <div className="card">
                <h3 className="text-sm font-semibold mb-2">🎯 下一轮练习</h3>
                <p className="text-sm text-gray-600">
                  {feedback.scores.next_practice}
                </p>
              </div>
            </>
          )}

          <div className="flex gap-3">
            <button onClick={handleRetry} className="btn-primary flex-1">
              重新练习
            </button>
            <button onClick={handleRetry} className="btn-secondary">
              换一个场景
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
