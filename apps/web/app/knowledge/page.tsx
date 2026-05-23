"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  createKnowledge,
  getKnowledge,
  deleteKnowledge,
  getStoredUserId,
  type KnowledgeEntry,
} from "@/app/lib/api";

export default function KnowledgePage() {
  const router = useRouter();
  const [entries, setEntries] = useState<KnowledgeEntry[]>([]);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const userId = getStoredUserId();

  const fetchEntries = useCallback(async () => {
    try {
      const data = await getKnowledge(userId);
      setEntries(data);
    } catch {
      // silent fail
    }
  }, [userId]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  const handleSubmit = async () => {
    if (!title.trim() || !content.trim()) {
      setError("请输入标题和内容");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await createKnowledge(userId, title.trim(), content.trim());
      setTitle("");
      setContent("");
      await fetchEntries();
    } catch (e) {
      setError(e instanceof Error ? e.message : "添加失败");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await deleteKnowledge(id, userId);
      await fetchEntries();
    } catch (e) {
      setError(e instanceof Error ? e.message : "删除失败");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-xl font-bold">知识库</h1>
        <p className="text-sm text-gray-500 mt-1">
          添加社交技巧、心理学知识，AI 会参考它们给你建议
        </p>
      </div>

      {/* Create form */}
      <div className="card space-y-3">
        <div className="flex items-center gap-2">
          <span className="text-xl">➕</span>
          <h2 className="font-semibold">添加新知识</h2>
        </div>

        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="标题，例如：非暴力沟通原则"
          className="w-full p-3 rounded-xl border border-purple-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-light"
        />

        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="粘贴你想让 AI 学习的知识内容..."
          className="w-full h-40 p-3 rounded-xl border border-purple-200 bg-white text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary-light"
        />

        <p className="text-xs text-gray-400">💡 提示：内容会被自动分段，训练时 AI 会检索最相关的段落作为参考。</p>

        {error && (
          <div className="text-sm text-red-600">{error}</div>
        )}

        <button
          onClick={handleSubmit}
          disabled={loading}
          className="btn-primary w-full"
        >
          {loading ? "保存中..." : "添加到知识库"}
        </button>
      </div>

      {/* List */}
      <div className="space-y-3">
        {entries.length === 0 ? (
          <div className="card text-center text-sm text-gray-400 py-8">
            还没有知识条目，添加一条试试吧
          </div>
        ) : (
          entries.map((entry) => (
            <div key={entry.id} className="card relative">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm truncate">
                    {entry.title}
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    {entry.content.slice(0, 80)}
                    {entry.content.length > 80 ? "..." : ""}
                  </div>
                  <div className="text-[10px] text-gray-300 mt-2">
                    {new Date(entry.created_at).toLocaleDateString("zh-CN")}
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(entry.id)}
                  disabled={deletingId === entry.id}
                  className="text-xs text-red-400 hover:text-red-600 px-2 py-1 rounded-lg hover:bg-red-50 transition-colors"
                >
                  {deletingId === entry.id ? "删除中..." : "删除"}
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <button onClick={() => router.push("/")} className="btn-secondary w-full">
        ← 返回首页
      </button>
    </div>
  );
}
