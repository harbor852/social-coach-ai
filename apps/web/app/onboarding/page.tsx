"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { submitOnboarding } from "@/app/lib/api";

const STEPS = [
  {
    id: "welcome",
    title: "欢迎来到 SpeakUp AI",
    description: "你的 AI 社交成长教练",
  },
  {
    id: "stage",
    title: "你目前处于哪个阶段？",
    description: "这会影响我们为你推荐的训练内容",
  },
  {
    id: "challenges",
    title: "你目前主要困扰是什么？",
    description: "可多选，帮助我们更好地了解你",
  },
  {
    id: "tone",
    title: "你更喜欢哪种沟通风格？",
    description: "我们会根据你的偏好调整反馈方式",
  },
  {
    id: "complete",
    title: "准备就绪！",
    description: "你的专属训练计划已生成",
  },
];

const STAGE_OPTIONS = [
  { value: "teen", label: "初高中生", icon: "🎒", desc: "校园社交、课堂表达" },
  { value: "college", label: "大学生", icon: "📚", desc: "面试、社团、小组讨论" },
  { value: "new_worker", label: "初入职场", icon: "💼", desc: "会议、汇报、同事沟通" },
  { value: "other", label: "其他", icon: "🌟", desc: "提升通用社交能力" },
];

const CHALLENGE_OPTIONS = [
  { value: "不敢说话", label: "不敢说话", icon: "😰" },
  { value: "表达混乱", label: "表达混乱", icon: "😵" },
  { value: "不会聊天", label: "不会聊天", icon: "😳" },
  { value: "不会拒绝", label: "不会拒绝", icon: "🙅" },
  { value: "职场沟通困难", label: "职场沟通困难", icon: "😓" },
];

const TONE_OPTIONS = [
  { value: "gentle", label: "温和型", desc: "鼓励为主，慢慢引导" },
  { value: "direct", label: "直接型", desc: "一针见血，直指问题" },
  { value: "warm", label: "温暖型", desc: "像朋友一样聊天" },
  { value: "formal", label: "专业型", desc: "系统训练，结构化反馈" },
  { value: "natural", label: "自然型", desc: "灵活调整，顺其自然" },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [nickname, setNickname] = useState("");
  const [stage, setStage] = useState("");
  const [challenges, setChallenges] = useState<string[]>([]);
  const [tone, setTone] = useState("natural");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const toggleChallenge = (value: string) => {
    setChallenges((prev) =>
      prev.includes(value)
        ? prev.filter((c) => c !== value)
        : [...prev, value]
    );
  };

  const handleNext = async () => {
    if (step === 0 && !nickname.trim()) {
      setError("请输入你的名字");
      return;
    }
    if (step === 1 && !stage) {
      setError("请选择一个阶段");
      return;
    }
    if (step === 2 && challenges.length === 0) {
      setError("请至少选择一个困扰");
      return;
    }

    setError("");

    if (step === STEPS.length - 2) {
      setIsLoading(true);
      try {
        const data = await submitOnboarding({
          nickname: nickname.trim(),
          age_stage: stage,
          challenges,
          goals: challenges,
          preferred_tone: tone,
        });
        localStorage.setItem("user_id", data.user_id);
        localStorage.setItem("nickname", data.nickname);
        localStorage.setItem("age_stage", data.age_stage);
      } catch (e) {
        // Allow user to continue offline with a local id
        const fallbackId = `local_${Date.now()}`;
        localStorage.setItem("user_id", fallbackId);
        localStorage.setItem("nickname", nickname.trim());
        localStorage.setItem("age_stage", stage);
        localStorage.setItem("offline_mode", "1");
      }
      setIsLoading(false);
    }

    if (step < STEPS.length - 1) {
      setStep(step + 1);
    } else {
      router.push("/");
    }
  };

  const handleBack = () => {
    if (step > 0) setStep(step - 1);
  };

  const progress = ((step + 1) / STEPS.length) * 100;

  return (
    <div className="min-h-screen flex flex-col">
      {/* Progress bar */}
      <div className="w-full h-1 bg-purple-100">
        <div
          className="h-full bg-primary transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="flex-1 flex flex-col px-4 pt-8 pb-6">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-xl font-bold">{STEPS[step].title}</h1>
          <p className="text-sm text-gray-500 mt-1">{STEPS[step].description}</p>
        </div>

        {error && (
          <div className="card border-red-200 bg-red-50 text-red-700 text-sm mb-4">
            {error}
          </div>
        )}

        {/* Step content */}
        <div className="flex-1">
          {step === 0 && (
            <div className="space-y-6">
              <div className="text-center text-6xl mb-6">🎯</div>
              <div className="card">
                <label className="block text-sm font-medium mb-2">
                  怎么称呼你？
                </label>
                <input
                  type="text"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder="输入你的名字或昵称"
                  className="w-full px-4 py-3 rounded-xl border border-purple-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-light"
                  maxLength={20}
                />
              </div>
              <div className="card bg-purple-50 border-purple-200">
                <p className="text-sm text-gray-600">
                  SpeakUp AI 会帮你：
                </p>
                <ul className="text-sm text-gray-600 mt-2 space-y-1">
                  <li>• 克服开口障碍，勇敢表达</li>
                  <li>• 学会礼貌、清晰、有边界的沟通</li>
                  <li>• 用 PREP 结构有逻辑地表达观点</li>
                </ul>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-3">
              {STAGE_OPTIONS.map((opt) => {
                const selected = stage === opt.value;
                return (
                  <button
                    key={opt.value}
                    onClick={() => setStage(opt.value)}
                    className={`card w-full text-left flex items-center gap-4 transition-all ${
                      selected
                        ? "border-primary bg-purple-50 ring-2 ring-primary-light transform scale-[1.02]"
                        : "hover:shadow-md hover:scale-[1.01]"
                    }`}
                  >
                    <span className="text-3xl">{opt.icon}</span>
                    <div className="flex-1">
                      <div className="font-medium">{opt.label}</div>
                      <div className="text-xs text-gray-400">{opt.desc}</div>
                    </div>
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                        selected
                          ? "bg-primary text-white scale-100"
                          : "bg-gray-200 text-gray-400 scale-90"
                      }`}
                    >
                      {selected ? "✓" : ""}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-3">
              {CHALLENGE_OPTIONS.map((opt) => {
                const selected = challenges.includes(opt.value);
                return (
                  <button
                    key={opt.value}
                    onClick={() => toggleChallenge(opt.value)}
                    className={`card w-full text-left flex items-center gap-4 transition-all ${
                      selected
                        ? "border-primary bg-purple-50 ring-2 ring-primary-light transform scale-[1.02]"
                        : "hover:shadow-md hover:scale-[1.01]"
                    }`}
                  >
                    <span className="text-2xl">{opt.icon}</span>
                    <div className="flex-1">{opt.label}</div>
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                        selected
                          ? "bg-primary text-white scale-100"
                          : "bg-gray-200 text-gray-400 scale-90"
                      }`}
                    >
                      {selected ? "✓" : ""}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {step === 3 && (
            <div className="space-y-3">
              {TONE_OPTIONS.map((opt) => {
                const selected = tone === opt.value;
                return (
                  <button
                    key={opt.value}
                    onClick={() => setTone(opt.value)}
                    className={`card w-full text-left flex items-center gap-4 transition-all ${
                      selected
                        ? "border-primary bg-purple-50 ring-2 ring-primary-light transform scale-[1.02]"
                        : "hover:shadow-md hover:scale-[1.01]"
                    }`}
                  >
                    <div className="flex-1">
                      <div className="font-medium">{opt.label}</div>
                      <div className="text-xs text-gray-400 mt-1">{opt.desc}</div>
                    </div>
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                        selected
                          ? "bg-primary text-white scale-100"
                          : "bg-gray-200 text-gray-400 scale-90"
                      }`}
                    >
                      {selected ? "✓" : ""}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {step === 4 && (
            <div className="text-center space-y-6">
              <div className="text-6xl">🎉</div>
              <div>
                <h2 className="text-lg font-bold">
                  欢迎，{nickname || "新朋友"}！
                </h2>
                <p className="text-sm text-gray-500 mt-2">
                  你的训练计划已经生成。建议从「观点表达训练」开始。
                </p>
              </div>
              <div className="card bg-purple-50 border-purple-200 text-left">
                <h3 className="text-sm font-semibold mb-3">📋 你的档案</h3>
                <div className="text-sm text-gray-600 space-y-1">
                  <p>
                    阶段：
                    {STAGE_OPTIONS.find((s) => s.value === stage)?.label || "-"}
                  </p>
                  <p>
                    困扰：
                    {challenges.length > 0
                      ? challenges.join("、")
                      : "-"}
                  </p>
                  <p>
                    偏好：
                    {TONE_OPTIONS.find((t) => t.value === tone)?.label || "-"}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer buttons */}
        <div className="flex gap-3 pt-4">
          {step > 0 && (
            <button onClick={handleBack} className="btn-secondary flex-1">
              上一步
            </button>
          )}
          <button
            onClick={handleNext}
            disabled={isLoading}
            className="btn-primary flex-1"
          >
            {isLoading
              ? "生成中..."
              : step === STEPS.length - 1
              ? "开始训练"
              : "下一步"}
          </button>
        </div>
      </div>
    </div>
  );
}
