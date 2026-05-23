"use client";

import { useState, useEffect } from "react";
import { getEtiquetteLessons } from "@/app/lib/api";

interface Lesson {
  id: string;
  title: string;
  category: string;
  icon: string;
  duration: string;
  content: string;
  key_points: string[];
  common_mistakes: string[];
  practice_prompt: string;
}

export default function EtiquettePage() {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [activeCategory, setActiveCategory] = useState("全部");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchLessons();
  }, []);

  const fetchLessons = async () => {
    try {
      const data = await getEtiquetteLessons();
      setLessons(data as Lesson[]);
    } catch {
      // Fallback to empty
    } finally {
      setIsLoading(false);
    }
  };

  const categories = ["全部", ...Array.from(new Set(lessons.map((l) => l.category)))];

  const filteredLessons =
    activeCategory === "全部"
      ? lessons
      : lessons.filter((l) => l.category === activeCategory);

  if (selectedLesson) {
    return <LessonDetail lesson={selectedLesson} onBack={() => setSelectedLesson(null)} />;
  }

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h1 className="text-xl font-bold">社交礼仪</h1>
        <p className="text-sm text-gray-500 mt-1">从小课开始，逐步提升社交分寸感</p>
      </div>

      {/* Category filter */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-3 py-1.5 rounded-full text-xs whitespace-nowrap transition-all ${
              activeCategory === cat
                ? "bg-primary text-white"
                : "bg-white text-gray-500 border border-purple-100"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Lesson list */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="card text-center py-8 text-gray-400 text-sm">加载中...</div>
        ) : filteredLessons.length === 0 ? (
          <div className="card text-center py-8 text-gray-400 text-sm">暂无课程</div>
        ) : (
          filteredLessons.map((lesson) => (
            <button
              key={lesson.id}
              onClick={() => setSelectedLesson(lesson)}
              className="card w-full text-left hover:shadow-md transition-shadow"
            >
              <div className="flex items-start gap-3">
                <span className="text-2xl">{lesson.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-purple-400">{lesson.category}</span>
                    <span className="text-xs text-gray-400">⏱ {lesson.duration}</span>
                  </div>
                  <div className="font-medium text-sm mt-1">{lesson.title}</div>
                  <p className="text-xs text-gray-400 mt-1 line-clamp-2">
                    {lesson.content.substring(0, 60)}...
                  </p>
                </div>
                <span className="text-gray-300">→</span>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}

function LessonDetail({
  lesson,
  onBack,
}: {
  lesson: Lesson;
  onBack: () => void;
}) {
  const [showPractice, setShowPractice] = useState(false);
  const [practiceInput, setPracticeInput] = useState("");
  const [practiceFeedback, setPracticeFeedback] = useState("");

  const handlePractice = () => {
    if (!practiceInput.trim()) return;
    setPracticeFeedback(
      "练习已提交！你的表达不错，建议注意：\n1. 保持自然的语气\n2. 不要过度客套\n3. 表达真诚最重要"
    );
  };

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="text-sm text-primary flex items-center gap-1">
        ← 返回课程列表
      </button>

      <div className="text-center">
        <span className="text-4xl">{lesson.icon}</span>
        <h1 className="text-lg font-bold mt-2">{lesson.title}</h1>
        <div className="flex items-center justify-center gap-2 mt-1">
          <span className="tag text-xs">{lesson.category}</span>
          <span className="text-xs text-gray-400">⏱ {lesson.duration}</span>
        </div>
      </div>

      {/* Content */}
      <div className="card">
        <p className="text-sm text-gray-700 leading-relaxed">{lesson.content}</p>
      </div>

      {/* Key points */}
      <div className="card border-green-200">
        <h3 className="text-sm font-semibold text-green-700 mb-3">✅ 核心要点</h3>
        <ul className="space-y-2">
          {lesson.key_points.map((point, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
              <span className="text-green-500 mt-0.5">•</span>
              {point}
            </li>
          ))}
        </ul>
      </div>

      {/* Common mistakes */}
      <div className="card border-red-200">
        <h3 className="text-sm font-semibold text-red-700 mb-3">❌ 常见误区</h3>
        <ul className="space-y-2">
          {lesson.common_mistakes.map((mistake, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
              <span className="text-red-400 mt-0.5">×</span>
              {mistake}
            </li>
          ))}
        </ul>
      </div>

      {/* Practice */}
      <div className="card bg-purple-50 border-purple-200">
        <h3 className="text-sm font-semibold mb-2">🎯 练习任务</h3>
        <p className="text-sm text-gray-600 mb-3">{lesson.practice_prompt}</p>

        {!showPractice ? (
          <button onClick={() => setShowPractice(true)} className="btn-primary w-full">
            开始练习
          </button>
        ) : (
          <div className="space-y-3">
            <textarea
              value={practiceInput}
              onChange={(e) => setPracticeInput(e.target.value)}
              placeholder="在这里写下你的练习表达..."
              className="w-full h-24 p-3 rounded-xl border border-purple-200 bg-white text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary-light"
            />
            {practiceFeedback && (
              <div className="text-sm text-gray-700 bg-white p-3 rounded-xl whitespace-pre-line">
                {practiceFeedback}
              </div>
            )}
            <div className="flex gap-2">
              <button onClick={handlePractice} className="btn-primary flex-1">
                提交练习
              </button>
              <button
                onClick={() => {
                  setShowPractice(false);
                  setPracticeInput("");
                  setPracticeFeedback("");
                }}
                className="btn-secondary"
              >
                关闭
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
