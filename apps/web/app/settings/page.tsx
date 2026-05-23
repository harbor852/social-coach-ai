"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  getLLMConfig,
  setLLMConfig,
  getTTSConfig,
  setTTSConfig,
  listVoices,
  type LLMConfig,
  type TTSConfig,
} from "@/app/lib/api";

const PROVIDERS = [
  { value: "deepseek", label: "DeepSeek", defaultModel: "deepseek-chat", defaultBase: "https://api.deepseek.com/v1" },
  { value: "openai", label: "OpenAI", defaultModel: "gpt-4o-mini", defaultBase: "https://api.openai.com/v1" },
  { value: "anthropic", label: "Anthropic (Claude)", defaultModel: "claude-sonnet-4-6", defaultBase: "https://api.anthropic.com/v1" },
  { value: "kimi", label: "Kimi (Moonshot)", defaultModel: "moonshot-v1-8k", defaultBase: "https://api.moonshot.cn/v1" },
];

const TTS_PROVIDERS = [
  { value: "browser" as const, label: "浏览器原生语音（免费）", defaultModel: "", defaultBase: "", defaultVoice: "" },
  { value: "alibaba" as const, label: "阿里通义 CosyVoice", defaultModel: "cosyvoice-v1", defaultBase: "https://dashscope.aliyuncs.com/compatible-mode/v1", defaultVoice: "longxiaochun" },
  { value: "openai" as const, label: "OpenAI TTS", defaultModel: "tts-1", defaultBase: "https://api.openai.com/v1", defaultVoice: "nova" },
  { value: "mock" as const, label: "测试模式（无语音）", defaultModel: "", defaultBase: "", defaultVoice: "" },
];

export default function SettingsPage() {
  const router = useRouter();

  // LLM state
  const [provider, setProvider] = useState("deepseek");
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [saved, setSaved] = useState(false);
  const [hasConfig, setHasConfig] = useState(false);

  // TTS state
  const [ttsProvider, setTTSProvider] = useState<TTSConfig["provider"]>("alibaba");
  const [ttsApiKey, setTTSApiKey] = useState("");
  const [ttsModel, setTTSModel] = useState("");
  const [ttsBaseUrl, setTTSBaseUrl] = useState("");
  const [ttsVoice, setTTSVoice] = useState("");
  const [voices, setVoices] = useState<Record<string, { id: string; name: string; gender: string; style: string; locale: string }[]>>({});
  const [ttsSaved, setTtsSaved] = useState(false);
  const [hasTTSConfig, setHasTTSConfig] = useState(false);
  const [loadingVoices, setLoadingVoices] = useState(false);
  const [ttsRate, setTTSRate] = useState(1.0);
  const [ttsPitch, setTTSPitch] = useState(1.0);

  useEffect(() => {
    // Load LLM config
    const cfg = getLLMConfig();
    if (cfg) {
      setProvider(cfg.provider);
      setApiKey(cfg.api_key);
      setModel(cfg.model || "");
      setBaseUrl(cfg.base_url || "");
      setHasConfig(true);
    } else {
      const p = PROVIDERS.find((x) => x.value === "deepseek")!;
      setModel(p.defaultModel);
      setBaseUrl(p.defaultBase);
    }

    // Load TTS config
    const ttsCfg = getTTSConfig();
    if (ttsCfg) {
      setTTSProvider(ttsCfg.provider);
      setTTSApiKey(ttsCfg.api_key || "");
      setTTSModel(ttsCfg.model || "");
      setTTSBaseUrl(ttsCfg.base_url || "");
      setTTSVoice(ttsCfg.voice || "");
      setTTSRate(ttsCfg.rate ?? 1.0);
      setTTSPitch(ttsCfg.pitch ?? 1.0);
      setHasTTSConfig(true);
    } else {
      setTTSProvider("browser");
    }

    loadVoiceList();
  }, []);

  const loadVoiceList = useCallback(async () => {
    setLoadingVoices(true);
    try {
      const v = await listVoices();
      setVoices(v);
    } catch {
      setVoices({
        alibaba: [
          { id: "longxiaochun", name: "龙小淳", gender: "female", style: "温柔知性", locale: "zh-CN" },
          { id: "longchen", name: "龙辰", gender: "male", style: "稳重沉稳", locale: "zh-CN" },
          { id: "longhua", name: "龙华", gender: "male", style: "活泼阳光", locale: "zh-CN" },
          { id: "longshu", name: "龙舒", gender: "female", style: "亲切自然", locale: "zh-CN" },
          { id: "yunjian", name: "云健", gender: "male", style: "磁性播音", locale: "zh-CN" },
          { id: "yunxi", name: "云溪", gender: "female", style: "甜美清新", locale: "zh-CN" },
          { id: "yunyang", name: "云扬", gender: "male", style: "年轻活力", locale: "zh-CN" },
        ],
        openai: [
          { id: "nova", name: "Nova", gender: "female", style: "温柔", locale: "zh-CN" },
          { id: "alloy", name: "Alloy", gender: "neutral", style: "均衡", locale: "zh-CN" },
          { id: "shimmer", name: "Shimmer", gender: "female", style: "明亮", locale: "zh-CN" },
          { id: "echo", name: "Echo", gender: "male", style: "沉稳", locale: "zh-CN" },
        ],
      });
    } finally {
      setLoadingVoices(false);
    }
  }, []);

  const handleProviderChange = (val: string) => {
    setProvider(val);
    const p = PROVIDERS.find((x) => x.value === val);
    if (p) {
      setModel(p.defaultModel);
      setBaseUrl(p.defaultBase);
    }
  };

  const handleSaveLLM = () => {
    if (!apiKey.trim()) {
      alert("请输入 API Key");
      return;
    }
    const cfg: LLMConfig = {
      provider,
      api_key: apiKey.trim(),
      model: model.trim() || undefined,
      base_url: baseUrl.trim() || undefined,
    };
    setLLMConfig(cfg);
    setHasConfig(true);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleClearLLM = () => {
    setLLMConfig(null);
    setApiKey("");
    setHasConfig(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleTTSProviderChange = (val: TTSConfig["provider"]) => {
    setTTSProvider(val);
    const p = TTS_PROVIDERS.find((x) => x.value === val);
    if (p) {
      setTTSModel(p.defaultModel);
      setTTSBaseUrl(p.defaultBase);
      setTTSVoice(p.defaultVoice);
    }
  };

  const handleSaveTTS = () => {
    const cfg: TTSConfig = {
      provider: ttsProvider,
    };

    if (ttsProvider === "browser") {
      cfg.rate = ttsRate;
      cfg.pitch = ttsPitch;
    } else if (ttsProvider !== "mock") {
      cfg.api_key = ttsApiKey.trim();
      if (ttsModel.trim()) cfg.model = ttsModel.trim();
      if (ttsBaseUrl.trim()) cfg.base_url = ttsBaseUrl.trim();
      if (ttsVoice.trim()) cfg.voice = ttsVoice.trim();

      if (ttsProvider === "alibaba") {
        if (!cfg.model) cfg.model = "cosyvoice-v1";
        if (!cfg.base_url) cfg.base_url = "https://dashscope.aliyuncs.com/compatible-mode/v1";
        if (!cfg.voice) cfg.voice = "longxiaochun";
      } else if (ttsProvider === "openai") {
        if (!cfg.model) cfg.model = "tts-1";
        if (!cfg.base_url) cfg.base_url = "https://api.openai.com/v1";
        if (!cfg.voice) cfg.voice = "nova";
      }
    }

    setTTSConfig(cfg);
    setHasTTSConfig(true);
    setTtsSaved(true);
    setTimeout(() => setTtsSaved(false), 2000);
  };

  const handleClearTTS = () => {
    setTTSConfig(null);
    setTTSProvider("browser");
    setTTSApiKey("");
    setTTSModel("");
    setTTSBaseUrl("");
    setTTSVoice("");
    setTTSRate(1.0);
    setTTSPitch(1.0);
    setHasTTSConfig(false);
    setTtsSaved(true);
    setTimeout(() => setTtsSaved(false), 2000);
  };

  const currentVoices = voices[ttsProvider] || [];

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-xl font-bold">设置</h1>
        <p className="text-sm text-gray-500 mt-1">自定义你的 AI 教练</p>
      </div>

      {/* LLM API Config Card */}
      <div className="card space-y-4">
        <div className="flex items-center gap-2">
          <span className="text-xl">🧠</span>
          <h2 className="font-semibold">大模型配置</h2>
        </div>

        <p className="text-xs text-gray-500 leading-relaxed">
          配置你自己的大模型 API，AI 教练将使用你的 API Key 进行回答。
        </p>

        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">
              服务商
            </label>
            <select
              value={provider}
              onChange={(e) => handleProviderChange(e.target.value)}
              className="w-full p-3 rounded-xl border border-purple-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-light"
            >
              {PROVIDERS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">
              API Key <span className="text-red-500">*</span>
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-..."
              className="w-full p-3 rounded-xl border border-purple-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-light"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">
              模型名称
            </label>
            <input
              type="text"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder="例如：deepseek-chat"
              className="w-full p-3 rounded-xl border border-purple-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-light"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">
              Base URL（可选）
            </label>
            <input
              type="text"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder="https://api.example.com/v1"
              className="w-full p-3 rounded-xl border border-purple-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-light"
            />
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button onClick={handleSaveLLM} className="btn-primary flex-1">
            {saved ? "✅ 已保存" : "保存配置"}
          </button>
          {hasConfig && (
            <button onClick={handleClearLLM} className="btn-secondary flex-1">
              清除配置
            </button>
          )}
        </div>
      </div>

      {/* TTS Voice Config Card */}
      <div className="card space-y-4">
        <div className="flex items-center gap-2">
          <span className="text-xl">🎙️</span>
          <h2 className="font-semibold">语音合成配置</h2>
        </div>

        <p className="text-xs text-gray-500 leading-relaxed">
          选择语音合成方式。默认使用浏览器原生语音（免费），
          也可配置后端 API 获得更好效果。
        </p>

        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">
              语音服务商
            </label>
            <select
              value={ttsProvider}
              onChange={(e) => handleTTSProviderChange(e.target.value as TTSConfig["provider"])}
              className="w-full p-3 rounded-xl border border-purple-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-light"
            >
              {TTS_PROVIDERS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>

          {ttsProvider === "browser" && (
            <div className="card bg-green-50 border-green-200 space-y-4">
              <div className="flex items-center gap-2">
                <span className="text-lg">🆓</span>
                <div className="text-sm font-medium text-green-800">浏览器原生语音</div>
              </div>
              <p className="text-xs text-green-700">
                使用系统自带的语音合成，完全免费。Chrome / Edge 效果最佳。
              </p>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  语速: {ttsRate.toFixed(1)}x
                </label>
                <input
                  type="range"
                  min="0.5"
                  max="2"
                  step="0.1"
                  value={ttsRate}
                  onChange={(e) => setTTSRate(parseFloat(e.target.value))}
                  className="w-full accent-primary"
                />
                <div className="flex justify-between text-[10px] text-gray-400">
                  <span>慢</span>
                  <span>正常</span>
                  <span>快</span>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  音调: {ttsPitch.toFixed(1)}
                </label>
                <input
                  type="range"
                  min="0.5"
                  max="2"
                  step="0.1"
                  value={ttsPitch}
                  onChange={(e) => setTTSPitch(parseFloat(e.target.value))}
                  className="w-full accent-primary"
                />
                <div className="flex justify-between text-[10px] text-gray-400">
                  <span>低</span>
                  <span>正常</span>
                  <span>高</span>
                </div>
              </div>
            </div>
          )}

          {ttsProvider !== "mock" && ttsProvider !== "browser" && (
            <>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">
                  API Key <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  value={ttsApiKey}
                  onChange={(e) => setTTSApiKey(e.target.value)}
                  placeholder={
                    ttsProvider === "alibaba"
                      ? "sk-xxx (阿里云 DashScope API Key)"
                      : "sk-xxx (OpenAI API Key)"
                  }
                  className="w-full p-3 rounded-xl border border-purple-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-light"
                />
                {ttsProvider === "alibaba" && (
                  <p className="text-xs text-gray-400 mt-1">
                    获取地址：{" "}
                    <a
                      href="https://dashscope.console.aliyun.com/apiKey"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      阿里云 DashScope 控制台
                    </a>
                  </p>
                )}
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">
                  模型（可选）
                </label>
                <input
                  type="text"
                  value={ttsModel}
                  onChange={(e) => setTTSModel(e.target.value)}
                  placeholder="默认自动填充"
                  className="w-full p-3 rounded-xl border border-purple-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-light"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">
                  Base URL（可选）
                </label>
                <input
                  type="text"
                  value={ttsBaseUrl}
                  onChange={(e) => setTTSBaseUrl(e.target.value)}
                  placeholder="默认自动填充"
                  className="w-full p-3 rounded-xl border border-purple-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-light"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">
                  音色
                </label>
                {loadingVoices ? (
                  <div className="text-xs text-gray-400">加载中...</div>
                ) : currentVoices.length > 0 ? (
                  <div className="grid grid-cols-2 gap-2">
                    {currentVoices.map((v) => (
                      <button
                        key={v.id}
                        onClick={() => setTTSVoice(v.id)}
                        className={`p-2 rounded-lg border text-left text-xs transition-all ${
                          ttsVoice === v.id
                            ? "border-primary bg-purple-50"
                            : "border-gray-200 hover:border-purple-200"
                        }`}
                      >
                        <div className="font-medium">{v.name}</div>
                        <div className="text-gray-400">
                          {v.gender === "male" ? "男" : v.gender === "female" ? "女" : "中性"} · {v.style}
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <input
                    type="text"
                    value={ttsVoice}
                    onChange={(e) => setTTSVoice(e.target.value)}
                    placeholder="输入音色 ID"
                    className="w-full p-3 rounded-xl border border-purple-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-light"
                  />
                )}
              </div>
            </>
          )}
        </div>

        <div className="flex gap-3 pt-2">
          <button onClick={handleSaveTTS} className="btn-primary flex-1">
            {ttsSaved ? "✅ 已保存" : "保存语音配置"}
          </button>
          {hasTTSConfig && (
            <button onClick={handleClearTTS} className="btn-secondary flex-1">
              清除配置
            </button>
          )}
        </div>

        <p className="text-xs text-gray-400 text-center">
          配置保存在浏览器本地，不会上传到服务器
        </p>
      </div>

      {/* Knowledge Base Card */}
      <div
        className="card space-y-3 cursor-pointer hover:shadow-md transition-shadow"
        onClick={() => router.push("/knowledge")}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">📚</span>
            <h2 className="font-semibold">知识库管理</h2>
          </div>
          <span className="text-purple-400">→</span>
        </div>
        <p className="text-xs text-gray-500 leading-relaxed">
          添加社交技巧、心理学知识、沟通方法论等，AI 教练会在回答时参考这些内容。
        </p>
      </div>

      {/* About Card */}
      <div className="card space-y-3">
        <div className="flex items-center gap-2">
          <span className="text-xl">ℹ️</span>
          <h2 className="font-semibold">关于</h2>
        </div>
        <div className="text-sm text-gray-600 space-y-1">
          <p>SpeakUp AI - 你的 AI 社交成长教练</p>
          <p className="text-xs text-gray-400">版本 0.3.0 · 语音交互版</p>
        </div>
      </div>

      {/* Back */}
      <button onClick={() => router.push("/")} className="btn-secondary w-full">
        ← 返回首页
      </button>
    </div>
  );
}
