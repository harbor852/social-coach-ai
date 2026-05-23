"use client";

import { useEffect, useState } from "react";
import { mockGrowthData } from "@/app/lib/mockData";
import { getProgress, getStoredUserId } from "@/app/lib/api";

type Scores = { clarity: number; logic: number; confidence: number; etiquette: number };

interface GrowthData {
  totalSessions: number;
  totalPracticeMinutes: number;
  streakDays: number;
  latestScores: Scores;
  trends: { clarity: number[]; logic: number[]; confidence: number[]; etiquette: number[] };
  recentSessions: { id?: string; date: string; scene: string; mode: string; score: number }[];
  isLive: boolean;
}

const FALLBACK: GrowthData = {
  totalSessions: mockGrowthData.totalSessions,
  totalPracticeMinutes: mockGrowthData.totalPracticeMinutes,
  streakDays: mockGrowthData.streakDays,
  latestScores: {
    clarity: mockGrowthData.scores.clarity.at(-1) ?? 0,
    logic: mockGrowthData.scores.logic.at(-1) ?? 0,
    confidence: mockGrowthData.scores.confidence.at(-1) ?? 0,
    etiquette: mockGrowthData.scores.etiquette.at(-1) ?? 0,
  },
  trends: mockGrowthData.scores,
  recentSessions: mockGrowthData.recentSessions,
  isLive: false,
};

export default function GrowthPage() {
  const [data, setData] = useState<GrowthData>(FALLBACK);

  useEffect(() => {
    const userId = getStoredUserId();
    (async () => {
      try {
        const p = await getProgress(userId);
        if (!p || (p.total_sessions ?? 0) === 0) return; // keep fallback when no real history
        const latest = (p.latest_scores || {}) as Record<string, number>;
        setData({
          totalSessions: p.total_sessions ?? 0,
          totalPracticeMinutes: p.total_minutes ?? 0,
          streakDays: p.streak_days ?? 0,
          latestScores: {
            clarity: latest.clarity ?? 0,
            logic: latest.logic ?? 0,
            confidence: latest.confidence ?? 0,
            etiquette: latest.etiquette ?? 0,
          },
          trends: {
            clarity: p.trends?.clarity || [],
            logic: p.trends?.logic || [],
            confidence: p.trends?.confidence || [],
            etiquette: p.trends?.etiquette || [],
          },
          recentSessions: (p.recent_sessions || []).map((r: any) => ({
            id: r.id,
            date: r.date,
            scene: r.scene,
            mode: r.mode,
            score: r.score,
          })),
          isLive: true,
        });
      } catch {
        // keep fallback
      }
    })();
  }, []);

  const { latestScores, trends, recentSessions, totalSessions, totalPracticeMinutes, streakDays, isLive } =
    data;

  const avgScore =
    Math.round(
      (Object.values(latestScores).reduce((a, b) => a + b, 0) /
        Math.max(1, Object.keys(latestScores).length)) *
        10,
    ) / 10;

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-xl font-bold">我的成长</h1>
        <p className="text-sm text-gray-500 mt-1">
          {isLive ? "实时记录每一次进步" : "示例数据 · 训练后将看到真实记录"}
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="card text-center">
          <div className="text-2xl font-bold text-primary">{totalSessions}</div>
          <div className="text-xs text-gray-500 mt-1">总训练次数</div>
        </div>
        <div className="card text-center">
          <div className="text-2xl font-bold text-primary">{totalPracticeMinutes}</div>
          <div className="text-xs text-gray-500 mt-1">练习分钟</div>
        </div>
        <div className="card text-center">
          <div className="text-2xl font-bold text-accent">{streakDays}</div>
          <div className="text-xs text-gray-500 mt-1">连续天数</div>
        </div>
      </div>

      <div className="card">
        <h3 className="text-sm font-semibold mb-4">📊 能力评分</h3>
        <div className="space-y-3">
          {Object.entries(latestScores).map(([key, value]) => (
            <div key={key}>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">
                  {key === "clarity" && "清晰度"}
                  {key === "logic" && "逻辑性"}
                  {key === "confidence" && "自信度"}
                  {key === "etiquette" && "礼貌度"}
                </span>
                <span className="font-medium text-primary">{value}/10</span>
              </div>
              <div className="score-bar">
                <div className="score-fill" style={{ width: `${value * 10}%` }} />
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 pt-3 border-t border-purple-100 text-center">
          <div className="text-3xl font-bold text-primary">{avgScore}</div>
          <div className="text-xs text-gray-400">综合评分</div>
        </div>
      </div>

      <div className="card">
        <h3 className="text-sm font-semibold mb-3">📈 评分趋势</h3>
        {Object.values(trends).every((arr) => arr.length === 0) ? (
          <div className="text-xs text-gray-400 text-center py-4">
            完成几次训练后，这里会显示评分趋势
          </div>
        ) : (
          <div className="space-y-2">
            {(["clarity", "logic", "confidence", "etiquette"] as const).map((key) => {
              const labels: Record<string, string> = {
                clarity: "清晰度",
                logic: "逻辑性",
                confidence: "自信度",
                etiquette: "礼貌度",
              };
              const values = trends[key] || [];
              if (values.length === 0) {
                return (
                  <div key={key} className="flex items-center gap-2">
                    <span className="text-xs text-gray-500 w-12">{labels[key]}</span>
                    <span className="text-xs text-gray-300 flex-1">暂无数据</span>
                  </div>
                );
              }
              return (
                <div key={key} className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 w-12">{labels[key]}</span>
                  <div className="flex-1 flex gap-1">
                    {values.map((v, j) => (
                      <div
                        key={j}
                        className="flex-1 h-6 rounded bg-purple-100 relative"
                        title={`${v}/10`}
                      >
                        <div
                          className="absolute bottom-0 left-0 right-0 rounded bg-primary transition-all"
                          style={{ height: `${v * 10}%` }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div>
        <h3 className="text-sm font-semibold mb-3">📋 最近训练</h3>
        {recentSessions.length === 0 ? (
          <div className="card text-center text-sm text-gray-400 py-6">
            还没有训练记录，点击下方导航开始第一次练习吧！
          </div>
        ) : (
          <div className="space-y-2">
            {recentSessions.map((session, i) => (
              <div key={session.id || i} className="card flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-sm">
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{session.scene}</div>
                  <div className="flex gap-2 text-xs text-gray-400">
                    <span>{session.date}</span>
                    <span>{session.mode}</span>
                  </div>
                </div>
                <div className="text-lg font-bold text-primary">{session.score}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
