import Link from "next/link";
import { mockScenarios, mockRoles } from "@/app/lib/mockData";

export default function SceneTrainingPage() {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-xl font-bold">场景训练</h1>
        <p className="text-sm text-gray-500 mt-1">
          选择场景，AI 陪你模拟真实社交对话
        </p>
      </div>

      {/* Mode Selection */}
      <div className="grid grid-cols-2 gap-3">
        <Link href="/train/expression" className="card hover:shadow-md transition-shadow text-center">
          <div className="text-3xl mb-2">📝</div>
          <div className="font-medium">文字训练</div>
          <div className="text-xs text-gray-400 mt-1">打字对话 + AI 反馈</div>
        </Link>
        <div className="card text-center opacity-50">
          <div className="text-3xl mb-2">🎙️</div>
          <div className="font-medium">语音陪练</div>
          <div className="text-xs text-gray-400 mt-1">即将上线</div>
        </div>
      </div>

      {/* Scenario List */}
      <div>
        <h2 className="text-lg font-semibold mb-3">训练场景</h2>
        <div className="space-y-2">
          {mockScenarios.map((s) => (
            <Link
              key={s.id}
              href="/train/expression"
              className="card flex items-center gap-3 hover:shadow-md transition-shadow"
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
            </Link>
          ))}
        </div>
      </div>

      {/* Role Selection */}
      <div>
        <h2 className="text-lg font-semibold mb-3">角色扮演</h2>
        <p className="text-sm text-gray-500 mb-3">
          选择 AI 要扮演的角色，练习不同对象的沟通方式
        </p>
        <div className="grid grid-cols-3 gap-2">
          {mockRoles.map((role) => (
            <div
              key={role.id}
              className="card text-center hover:shadow-md transition-shadow cursor-pointer"
            >
              <div className="text-2xl mb-1">{role.icon}</div>
              <div className="text-sm font-medium">{role.name}</div>
              <div className="text-xs text-gray-400">{role.category}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Difficulty Info */}
      <div className="card bg-purple-50 border-purple-200">
        <h3 className="text-sm font-semibold mb-2">💡 难度说明</h3>
        <div className="text-xs text-gray-600 space-y-1">
          <p>⭐ 友善对象，轻度回应 — 适合初学者</p>
          <p>⭐⭐ 普通对象，会追问 — 日常练习</p>
          <p>⭐⭐⭐ 有压力对象，会质疑 — 进阶挑战</p>
        </div>
      </div>
    </div>
  );
}
