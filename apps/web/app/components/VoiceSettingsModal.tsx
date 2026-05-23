"use client";

import { useState, useEffect, useCallback } from "react";
import {
  getTTSConfig,
  setTTSConfig,
  listVoices,
  type TTSConfig,
} from "@/app/lib/api";

interface VoiceSettingsModalProps {
  open: boolean;
  onClose: () => void;
}

const PROVIDER_OPTIONS = [
  { value: "browser", label: "浏览器原生语音", desc: "免费，无需配置，推荐" },
  { value: "alibaba", label: "阿里通义 CosyVoice", desc: "中文效果最好，需API Key" },
  { value: "openai", label: "OpenAI TTS", desc: "速度快，需API Key" },
  { value: "mock", label: "测试模式", desc: "静音，用于调试" },
];

export default function VoiceSettingsModal({
  open,
  onClose,
}: VoiceSettingsModalProps) {
  const [provider, setProvider] = useState<TTSConfig["provider"]>("browser");
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [voice, setVoice] = useState("");
  const [rate, setRate] = useState(1.0);
  const [pitch, setPitch] = useState(1.0);
  const [voices, setVoices] = useState<
    Record<string, { id: string; name: string; gender: string; style: string; locale: string }[]>
  >({});
  const [saved, setSaved] = useState(false);
  const [loadingVoices, setLoadingVoices] = useState(false);

  useEffect(() => {
    if (!open) return;
    const cfg = getTTSConfig();
    if (cfg) {
      setProvider(cfg.provider);
      setApiKey(cfg.api_key || "");
      setModel(cfg.model || "");
      setBaseUrl(cfg.base_url || "");
      setVoice(cfg.voice || "");
      setRate(cfg.rate ?? 1.0);
      setPitch(cfg.pitch ?? 1.0);
    } else {
      // Default to browser
      setProvider("browser");
      setRate(1.0);
      setPitch(1.0);
    }
    loadVoiceList();
  }, [open]);

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
        ],
        openai: [
          { id: "nova", name: "Nova", gender: "female", style: "温柔", locale: "zh-CN" },
          { id: "alloy", name: "Alloy", gender: "neutral", style: "均衡", locale: "zh-CN" },
        ],
      });
    } finally {
      setLoadingVoices(false);
    }
  }, []);

  const handleProviderChange = (val: TTSConfig["provider"]) => {
    setProvider(val);
    if (val === "alibaba") {
      setModel("cosyvoice-v1");
      setBaseUrl("https://dashscope.aliyuncs.com/compatible-mode/v1");
      setVoice("longxiaochun");
    } else if (val === "openai") {
      setModel("tts-1");
      setBaseUrl("https://api.openai.com/v1");
      setVoice("nova");
    } else if (val === "browser") {
      setApiKey("");
      setModel("");
      setBaseUrl("");
      setVoice("");
    }
  };

  const handleSave = () => {
    const cfg: TTSConfig = {
      provider,
    };

    if (provider === "browser") {
      cfg.rate = rate;
      cfg.pitch = pitch;
    } else if (provider !== "mock") {
      cfg.api_key = apiKey.trim();
      if (model.trim()) cfg.model = model.trim();
      if (baseUrl.trim()) cfg.base_url = baseUrl.trim();
      if (voice.trim()) cfg.voice = voice.trim();

      // Auto-fill defaults
      if (provider === "alibaba") {
        if (!cfg.model) cfg.model = "cosyvoice-v1";
        if (!cfg.base_url) cfg.base_url = "https://dashscope.aliyuncs.com/compatible-mode/v1";
        if (!cfg.voice) cfg.voice = "longxiaochun";
      } else if (provider === "openai") {
        if (!cfg.model) cfg.model = "tts-1";
        if (!cfg.base_url) cfg.base_url = "https://api.openai.com/v1";
        if (!cfg.voice) cfg.voice = "nova";
      }
    }

    setTTSConfig(cfg);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleClear = () => {
    setTTSConfig(null);
    setProvider("browser");
    setApiKey("");
    setModel("");
    setBaseUrl("");
    setVoice("");
    setRate(1.0);
    setPitch(1.0);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const needsApiKey = provider !== "browser" && provider !== "mock";
  const currentVoices = voices[provider] || [];

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

      <div
        className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white/95 backdrop-blur border-b border-purple-100 px-5 py-4 rounded-t-2xl flex items-center justify-between z-10">
          <div>
            <h2 className="text-lg font-bold text-gray-900">语音设置</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              选择语音合成方式
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Provider */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              语音服务商
            </label>
            <div className="grid grid-cols-1 gap-2">
              {PROVIDER_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => handleProviderChange(opt.value as TTSConfig["provider"])}
                  className={`flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all ${
                    provider === opt.value
                      ? "border-primary bg-purple-50"
                      : "border-gray-200 hover:border-purple-200"
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                      provider === opt.value
                        ? "border-primary"
                        : "border-gray-300"
                    }`}
                  >
                    {provider === opt.value && (
                      <div className="w-2 h-2 rounded-full bg-primary" />
                    )}
                  </div>
                  <div>
                    <div className="text-sm font-medium">{opt.label}</div>
                    <div className="text-xs text-gray-500">{opt.desc}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Browser TTS settings */}
          {provider === "browser" && (
            <div className="card bg-green-50 border-green-200 space-y-4">
              <div className="flex items-center gap-2">
                <span className="text-lg">🆓</span>
                <div className="text-sm font-medium text-green-800">浏览器原生语音</div>
              </div>
              <p className="text-xs text-green-700">
                使用系统自带的语音合成，完全免费。Chrome / Edge 效果最佳，
                推荐在电脑端使用。
              </p>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  语速: {rate.toFixed(1)}x
                </label>
                <input
                  type="range"
                  min="0.5"
                  max="2"
                  step="0.1"
                  value={rate}
                  onChange={(e) => setRate(parseFloat(e.target.value))}
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
                  音调: {pitch.toFixed(1)}
                </label>
                <input
                  type="range"
                  min="0.5"
                  max="2"
                  step="0.1"
                  value={pitch}
                  onChange={(e) => setPitch(parseFloat(e.target.value))}
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

          {/* API Key - only for backend providers */}
          {needsApiKey && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                API Key <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={
                  provider === "alibaba"
                    ? "sk-xxx (阿里云 DashScope API Key)"
                    : "sk-xxx (OpenAI API Key)"
                }
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-light focus:border-transparent"
              />
              {provider === "alibaba" && (
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
          )}

          {/* Advanced options for backend */}
          {needsApiKey && (
            <details className="group">
              <summary className="text-sm text-primary cursor-pointer flex items-center gap-1">
                <span className="transition-transform group-open:rotate-90">▶</span>
                高级设置（可选）
              </summary>
              <div className="mt-3 space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">模型</label>
                  <input
                    type="text"
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    placeholder="默认自动填充"
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-light"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Base URL</label>
                  <input
                    type="text"
                    value={baseUrl}
                    onChange={(e) => setBaseUrl(e.target.value)}
                    placeholder="默认自动填充"
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-light"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">音色</label>
                  {loadingVoices ? (
                    <div className="text-xs text-gray-400">加载中...</div>
                  ) : currentVoices.length > 0 ? (
                    <div className="grid grid-cols-2 gap-2">
                      {currentVoices.map((v) => (
                        <button
                          key={v.id}
                          onClick={() => setVoice(v.id)}
                          className={`p-2 rounded-lg border text-left text-xs transition-all ${
                            voice === v.id
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
                      value={voice}
                      onChange={(e) => setVoice(e.target.value)}
                      placeholder="输入音色 ID"
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-light"
                    />
                  )}
                </div>
              </div>
            </details>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={handleSave}
              className="btn-primary flex-1"
            >
              {saved ? "✅ 已保存" : "保存配置"}
            </button>
            <button
              onClick={handleClear}
              className="btn-secondary"
            >
              恢复默认
            </button>
          </div>

          <div className="text-xs text-gray-400 text-center">
            配置保存在浏览器本地，不会上传到服务器
          </div>
        </div>
      </div>
    </div>
  );
}
