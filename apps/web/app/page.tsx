import Link from "next/link";
import { mockGrowthData, mockScenarios, mockEtiquetteLessons } from "./lib/mockData";

export default function HomePage() {
  const latestScore = mockGrowthData.recentSessions[0]?.score ?? 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center py-4">
        <h1 className="text-2xl font-bold text-primary-dark">
          SpeakUp AI
        </h1>
        <p className="text-sm text-purple-400 mt-1">你的 AI 社交成长教练</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="card text-center">
          <div className="text-2xl font-bold text-primary">
            {mockGrowthData.totalSessions}
          </div>
          <div className="text-xs text-gray-500 mt-1">训练次数</div>
        </div>
        <div className="card text-center">
          <div className="text-2xl font-bold text-primary">
            {mockGrowthData.streakDays}
          </div>
          <div className="text-xs text-gray-500 mt-1">连续天数</div>
        </div>
        <div className="card text-center">
          <div className="text-2xl font-bold text-accent">
            {latestScore}
          </div>
          <div className="text-xs text-gray-500 mt-1">最新评分</div>
        </div>
      </div>

      {/* Quick Start */}
      <div>
        <h2 className="text-lg font-semibold mb-3">快速开始</h2>
        <div className="grid grid-cols-2 gap-3">
          <Link href="/train/expression" className="card hover:shadow-md transition-shadow">
            <div className="text-2xl mb-2">💬</div>
            <div className="font-medium text-sm">观点表达训练</div>
            <div className="text-xs text-gray-400 mt-1">用 PREP 结构训练逻辑表达</div>
          </Link>
          <Link href="/train/scene" className="card hover:shadow-md transition-shadow">
            <div className="text-2xl mb-2">🎭</div>
            <div className="font-medium text-sm">角色扮演</div>
            <div className="text-xs text-gray-400 mt-1">模拟真实社交场景对话</div>
          </Link>
          <div className="card">
            <div className="text-2xl mb-2">📝</div>
            <div className="font-medium text-sm">话术优化</div>
            <div className="text-xs text-gray-400 mt-1">多版本表达改写</div>
          </div>
          <div className="card">
            <div className="text-2xl mb-2">🎙️</div>
            <div className="font-medium text-sm">语音陪练</div>
            <div className="text-xs text-gray-400 mt-1">按住说话，AI 实时反馈</div>
          </div>
        </div>
      </div>

      {/* Recommended Scenarios */}
      <div>
        <h2 className="text-lg font-semibold mb-3">推荐场景</h2>
        <div className="space-y-2">
          {mockScenarios.slice(0, 4).map((s) => (
            <Link
              key={s.id}
              href={`/train/scene`}
              className="card flex items-center gap-3 hover:shadow-md transition-shadow"
            >
              <div className="text-2xl">{s.icon}</div>
              <div className="flex-1">
                <div className="font-medium text-sm">{s.title}</div>
                <div className="flex gap-2 mt-1">
                  <span className="tag text-xs">{s.category}</span>
                  <span className="text-xs text-gray-400">
                    {"⭐".repeat(s.difficulty)}
                  </span>
                </div>
              </div>
              <div className="text-gray-300">→</div>
            </Link>
          ))}
        </div>
      </div>

      {/* Etiquette Quick Lessons */}
      <div>
        <h2 className="text-lg font-semibold mb-3">社交礼仪小课</h2>
        <div className="flex gap-2 overflow-x-auto pb-2">
          {mockEtiquetteLessons.slice(0, 4).map((lesson) => (
            <div
              key={lesson.id}
              className="card min-w-[140px] flex-shrink-0"
            >
              <div className="text-xs text-purple-400 mb-1">{lesson.category}</div>
              <div className="font-medium text-sm">{lesson.title}</div>
              <div className="text-xs text-gray-400 mt-2">⏱ {lesson.duration}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
