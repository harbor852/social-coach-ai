import { mockGrowthData } from "@/app/lib/mockData";

export default function GrowthPage() {
  const { scores, recentSessions, totalSessions, totalPracticeMinutes, streakDays } =
    mockGrowthData;

  // Calculate averages from latest scores
  const latestScores = {
    clarity: scores.clarity[scores.clarity.length - 1] ?? 0,
    logic: scores.logic[scores.logic.length - 1] ?? 0,
    confidence: scores.confidence[scores.confidence.length - 1] ?? 0,
    etiquette: scores.etiquette[scores.etiquette.length - 1] ?? 0,
  };

  const avgScore = Math.round(
    (Object.values(latestScores).reduce((a, b) => a + b, 0) /
      Object.keys(latestScores).length) *
      10
  ) / 10;

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-xl font-bold">我的成长</h1>
        <p className="text-sm text-gray-500 mt-1">记录每一次进步</p>
      </div>

      {/* Overall Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="card text-center">
          <div className="text-2xl font-bold text-primary">{totalSessions}</div>
          <div className="text-xs text-gray-500 mt-1">总训练次数</div>
        </div>
        <div className="card text-center">
          <div className="text-2xl font-bold text-primary">
            {totalPracticeMinutes}
          </div>
          <div className="text-xs text-gray-500 mt-1">练习分钟</div>
        </div>
        <div className="card text-center">
          <div className="text-2xl font-bold text-accent">{streakDays}</div>
          <div className="text-xs text-gray-500 mt-1">连续天数</div>
        </div>
      </div>

      {/* Radar-like score display */}
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
                <div
                  className="score-fill"
                  style={{ width: `${value * 10}%` }}
                />
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 pt-3 border-t border-purple-100 text-center">
          <div className="text-3xl font-bold text-primary">{avgScore}</div>
          <div className="text-xs text-gray-400">综合评分</div>
        </div>
      </div>

      {/* Score Trend (simplified) */}
      <div className="card">
        <h3 className="text-sm font-semibold mb-3">📈 评分趋势</h3>
        <div className="space-y-2">
          {["清晰度", "逻辑性", "自信度", "礼貌度"].map((label, i) => {
            const key = Object.keys(scores)[i] as keyof typeof scores;
            const values = scores[key];
            return (
              <div key={label} className="flex items-center gap-2">
                <span className="text-xs text-gray-500 w-12">{label}</span>
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
      </div>

      {/* Recent Sessions */}
      <div>
        <h3 className="text-sm font-semibold mb-3">📋 最近训练</h3>
        <div className="space-y-2">
          {recentSessions.map((session, i) => (
            <div key={i} className="card flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-sm">
                {i + 1}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">
                  {session.scene}
                </div>
                <div className="flex gap-2 text-xs text-gray-400">
                  <span>{session.date}</span>
                  <span>{session.mode}</span>
                </div>
              </div>
              <div className="text-lg font-bold text-primary">
                {session.score}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
