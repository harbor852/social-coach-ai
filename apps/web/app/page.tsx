"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { mockGrowthData, mockScenarios, mockEtiquetteLessons } from "./lib/mockData";
import { getProgress, getStoredUserId, getStoredNickname } from "./lib/api";

interface HomeStats {
  totalSessions: number;
  streakDays: number;
  latestScore: number;
  nickname: string;
}

const QUICK_ACTIONS = [
  {
    href: "/train/expression",
    icon: "💬",
    title: "观点表达训练",
    desc: "用 PREP 结构训练逻辑表达",
    accent: "from-violet-500 to-purple-600",
  },
  {
    href: "/train/scene",
    icon: "🎭",
    title: "场景 & 角色扮演",
    desc: "模拟真实社交对话",
    accent: "from-fuchsia-500 to-pink-500",
  },
  {
    href: "/train/optimize",
    icon: "📝",
    title: "话术优化",
    desc: "一段话生成多版本改写",
    accent: "from-sky-500 to-indigo-500",
  },
  {
    href: "/train/voice",
    icon: "🎙️",
    title: "语音陪练",
    desc: "按住说话，AI 实时反馈",
    accent: "from-amber-500 to-orange-500",
  },
];

export default function HomePage() {
  const router = useRouter();
  const [stats, setStats] = useState<HomeStats>({
    totalSessions: mockGrowthData.totalSessions,
    streakDays: mockGrowthData.streakDays,
    latestScore: mockGrowthData.recentSessions[0]?.score ?? 0,
    nickname: "",
  });
  const [checkedOnboarding, setCheckedOnboarding] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const uid = window.localStorage.getItem("user_id");
    if (!uid) {
      const dismissed = window.localStorage.getItem("dismissed_onboarding");
      if (!dismissed) {
        router.push("/onboarding");
        return;
      }
    }
    setCheckedOnboarding(true);
  }, [router]);

  useEffect(() => {
    if (!checkedOnboarding) return;
    const userId = getStoredUserId();
    const nickname = getStoredNickname();
    setStats((s) => ({ ...s, nickname }));

    (async () => {
      try {
        const p = await getProgress(userId);
        const latest = p.recent_sessions?.[0]?.score ?? mockGrowthData.recentSessions[0]?.score ?? 0;
        setStats({
          totalSessions: p.total_sessions ?? 0,
          streakDays: p.streak_days ?? 0,
          latestScore: Number(latest) || 0,
          nickname,
        });
      } catch {
        // backend offline -- keep mock
      }
    })();
  }, [checkedOnboarding]);

  return (
    <div className="space-y-6">
      {/* Hero header */}
      <div className="relative overflow-hidden rounded-3xl p-5 text-white shadow-lg">
        <div className="absolute inset-0 bg-gradient-to-br from-violet-500 via-purple-600 to-fuchsia-600" />
        <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-white/15 blur-xl" />
        <div className="absolute -bottom-10 -left-10 w-40 h-40 rounded-full bg-white/10 blur-2xl" />
        <div className="relative">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs uppercase tracking-widest opacity-80">SpeakUp AI</div>
              <h1 className="text-2xl font-bold mt-1">
                {stats.nickname ? `Hi，${stats.nickname} 👋` : "你的 AI 社交教练"}
              </h1>
              <p className="text-sm opacity-90 mt-1">每天一点点，自信地表达自己</p>
            </div>
            <div className="text-4xl icon-float">🌟</div>
          </div>

          <div className="grid grid-cols-3 gap-2 mt-5">
            <StatCard label="训练" value={stats.totalSessions} />
            <StatCard label="连续天数" value={stats.streakDays} />
            <StatCard label="最新评分" value={stats.latestScore} accent />
          </div>
        </div>
      </div>

      {/* Quick start */}
      <div>
        <h2 className="section-title mb-3">
          <span>🚀</span> 快速开始
        </h2>
        <div className="grid grid-cols-2 gap-3">
          {QUICK_ACTIONS.map((a) => (
            <Link
              key={a.href}
              href={a.href}
              className="card group relative overflow-hidden"
            >
              <div
                className={`absolute -top-6 -right-6 w-20 h-20 rounded-full bg-gradient-to-br ${a.accent} opacity-20 group-hover:opacity-30 transition-opacity`}
              />
              <div className="relative">
                <div className="text-2xl mb-2">{a.icon}</div>
                <div className="font-semibold text-sm">{a.title}</div>
                <div className="text-xs text-gray-500 mt-1 leading-relaxed">{a.desc}</div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Recommended scenarios */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="section-title">
            <span>✨</span> 推荐场景
          </h2>
          <Link href="/train/scene" className="text-xs text-primary font-medium">
            全部 →
          </Link>
        </div>
        <div className="space-y-2">
          {mockScenarios.slice(0, 4).map((s) => (
            <Link
              key={s.id}
              href="/train/scene"
              className="card flex items-center gap-3"
            >
              <div className="w-12 h-12 rounded-2xl bg-purple-50 flex items-center justify-center text-2xl flex-shrink-0">
                {s.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm">{s.title}</div>
                <div className="flex gap-2 mt-1 items-center">
                  <span className="tag">{s.category}</span>
                  <span className="text-xs text-amber-500">
                    {"⭐".repeat(s.difficulty)}
                  </span>
                </div>
              </div>
              <div className="text-purple-300 text-xl">→</div>
            </Link>
          ))}
        </div>
      </div>

      {/* Etiquette quick lessons */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="section-title">
            <span>📚</span> 社交礼仪小课
          </h2>
          <Link href="/train/etiquette" className="text-xs text-primary font-medium">
            全部 →
          </Link>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1">
          {mockEtiquetteLessons.slice(0, 5).map((lesson, i) => (
            <Link
              key={lesson.id}
              href="/train/etiquette"
              className="card min-w-[160px] flex-shrink-0 relative overflow-hidden"
            >
              <div
                className={`absolute -bottom-4 -right-4 w-16 h-16 rounded-full opacity-15 ${
                  i % 3 === 0
                    ? "bg-violet-500"
                    : i % 3 === 1
                    ? "bg-pink-500"
                    : "bg-amber-500"
                }`}
              />
              <div className="relative">
                <div className="text-xs text-purple-500 font-medium mb-1">
                  {lesson.category}
                </div>
                <div className="font-medium text-sm leading-snug">{lesson.title}</div>
                <div className="text-xs text-gray-400 mt-3 flex items-center gap-1">
                  <span>⏱</span> {lesson.duration}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Tip card */}
      <div className="card bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200">
        <div className="flex items-start gap-3">
          <div className="text-2xl">💡</div>
          <div>
            <div className="font-semibold text-sm text-amber-900">今天的小提示</div>
            <p className="text-xs text-amber-800 mt-1 leading-relaxed">
              表达自信不是天生的能力，而是一项可以训练的技能。
              每天 5 分钟，让 AI 帮你练到敢说、会说、说得动人。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: boolean;
}) {
  return (
    <div className="rounded-2xl bg-white/15 backdrop-blur p-3 text-center border border-white/20">
      <div
        className={`text-xl font-bold ${
          accent ? "text-amber-200" : "text-white"
        }`}
      >
        {value}
      </div>
      <div className="text-[10px] uppercase tracking-wider opacity-80 mt-0.5">
        {label}
      </div>
    </div>
  );
}
