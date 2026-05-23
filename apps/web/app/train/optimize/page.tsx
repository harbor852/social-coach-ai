"use client";

import { useState, useCallback } from "react";
import { useVoiceChat } from "@/app/components/VoiceChatContext";
import Avatar from "@/app/components/Avatar";
import VoiceInputBar from "@/app/components/VoiceInputBar";
import VoiceSettingsModal from "@/app/components/VoiceSettingsModal";
import { submitTrainingTurn, getStoredUserId } from "@/app/lib/api";

interface OptimizeVersion {
  label: string;
  icon: string;
  color: string;
  content: string;
}

interface OptimizeResult {
  reply_text: string;
  versions: OptimizeVersion[];
  analysis: string;
  tone_scores: Record<string, number>;
}

export default function OptimizePage() {
  const {
    setAvatarState,
    setTranscript,
    playText,
    stopAudio,
    transcript,
    setShowSettings,
    showSettings,
    setError,
  } = useVoiceChat();

  const [result, setResult] = useState<OptimizeResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [localError, setLocalError] = useState("");

  const handleTranscript = useCallback((text: string) => {
    setTranscript(text);
  }, [setTranscript]);

  const handleSubmit = useCallback(async () => {
    const text = transcript.trim();
    if (!text) {
      setLocalError("请输入或说出你想优化的话术");
      return;
    }
    setIsLoading(true);
    setLocalError("");
    setAvatarState("thinking");

    try {
      const response = await submitTrainingTurn({
        user_id: getStoredUserId(),
        session_id: `opt_${Date.now()}`,
        mode: "scene_analysis",
        text: `话术优化：${text}`,
      });

      const versions = generateVersions(text, response.reply_text);

      const optimizeResult: OptimizeResult = {
        reply_text: response.reply_text,
        versions,
        analysis: analyzeInput(text),
        tone_scores: {
          温和度: 7,
          直接度: 5,
          自信度: 5,
          边界感: 6,
        },
      };

      setResult(optimizeResult);
      setActiveTab(0);
      setAvatarState("idle");

      if (response.safety.risk_level === "none") {
        await playText(response.reply_text);
      }
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : "请求失败");
      setAvatarState("idle");
    } finally {
      setIsLoading(false);
    }
  }, [transcript, setAvatarState, playText]);

  const handleReset = useCallback(() => {
    stopAudio();
    setResult(null);
    setTranscript("");
    setLocalError("");
    setActiveTab(0);
    setAvatarState("idle");
  }, [stopAudio, setTranscript, setAvatarState]);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">话术优化</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            输入纠结的表达，AI 帮你生成多版本
          </p>
        </div>
        <button
          onClick={() => setShowSettings(true)}
          className="w-9 h-9 rounded-full bg-purple-50 border border-purple-200 flex items-center justify-center text-lg hover:bg-purple-100 transition-colors"
        >
          ⚙️
        </button>
      </div>

      {/* Avatar */}
      <div className="flex justify-center py-2">
        <Avatar size="md" showWaveform={true} />
      </div>

      {!result && (
        <>
          {/* Examples */}
          <div className="card bg-purple-50 border-purple-200">
            <p className="text-sm text-gray-600 mb-2">💡 试试这些话术：</p>
            <div className="space-y-1">
              {[
                "你老是不回我消息，我很烦",
                "不好意思啊，如果你不方便就算了",
                "我觉得这个方案可能不太好",
                "能不能帮我看一下这个",
              ].map((ex, i) => (
                <button
                  key={i}
                  onClick={() => setTranscript(ex)}
                  className="block w-full text-left text-xs text-gray-500 hover:text-primary py-1 px-2 rounded hover:bg-purple-100 transition-colors"
                >
                  &ldquo;{ex}&rdquo;
                </button>
              ))}
            </div>
          </div>

          {isLoading ? (
            <div className="card text-center py-8">
              <div className="flex items-center justify-center gap-1 mb-3">
                <div className="w-2 h-2 rounded-full bg-primary thinking-dot" />
                <div className="w-2 h-2 rounded-full bg-primary thinking-dot" />
                <div className="w-2 h-2 rounded-full bg-primary thinking-dot" />
              </div>
              <div className="text-sm text-gray-500">AI 正在优化...</div>
            </div>
          ) : (
            <>
              {localError && (
                <div className="card border-red-200 bg-red-50 text-red-700 text-sm">
                  {localError}
                </div>
              )}
              <VoiceInputBar
                onTranscript={handleTranscript}
                onSubmit={handleSubmit}
                placeholder="输入你想说但不知道怎么表达的话..."
              />
            </>
          )}
        </>
      )}

      {result && (
        <div className="space-y-4">
          {/* Original */}
          <div className="card border-gray-200">
            <div className="text-xs text-gray-400 mb-1">你的原表达</div>
            <p className="text-sm text-gray-700 italic">
              &ldquo;{transcript}&rdquo;
            </p>
          </div>

          {/* Analysis */}
          <div className="card bg-purple-50 border-purple-200">
            <h3 className="text-sm font-semibold mb-2">📊 表达分析</h3>
            <p className="text-sm text-gray-600">{result.analysis}</p>
            <div className="grid grid-cols-2 gap-2 mt-3">
              {Object.entries(result.tone_scores).map(([key, val]) => (
                <div key={key} className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 w-12">{key}</span>
                  <div className="flex-1 score-bar">
                    <div className="score-fill" style={{ width: `${val * 10}%` }} />
                  </div>
                  <span className="text-xs">{val}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Version tabs */}
          <div>
            <div className="flex gap-2 overflow-x-auto pb-2">
              {result.versions.map((v, i) => (
                <button
                  key={i}
                  onClick={() => setActiveTab(i)}
                  className={`card min-w-[80px] flex-shrink-0 py-2 px-3 text-center text-xs transition-all ${
                    activeTab === i
                      ? "border-primary bg-purple-50"
                      : "hover:shadow-md"
                  }`}
                >
                  <span className="text-lg">{v.icon}</span>
                  <div className="font-medium mt-1">{v.label}</div>
                </button>
              ))}
            </div>

            <div className="card mt-2">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">
                  {result.versions[activeTab]?.icon}
                </span>
                <span className="font-medium text-sm">
                  {result.versions[activeTab]?.label}
                </span>
              </div>
              <p className="text-sm text-gray-700 leading-relaxed">
                {result.versions[activeTab]?.content}
              </p>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(
                    result.versions[activeTab]?.content || ""
                  );
                }}
                className="mt-3 text-xs text-primary hover:underline"
              >
                📋 复制这段话
              </button>
            </div>
          </div>

          {/* Why better */}
          <div className="card border-green-200 bg-green-50">
            <h3 className="text-sm font-semibold text-green-700 mb-2">
              ✅ 为什么更好
            </h3>
            <ul className="text-xs text-gray-600 space-y-1">
              <li>1. 表达了具体请求而不是笼统抱怨</li>
              <li>2. 给了对方选择的空间</li>
              <li>3. 语气礼貌但不委屈自己</li>
              <li>4. 降低了对方的防御心理</li>
            </ul>
          </div>

          <button onClick={handleReset} className="btn-primary w-full">
            再试一句
          </button>
        </div>
      )}

      <VoiceSettingsModal open={showSettings} onClose={() => setShowSettings(false)} />
    </div>
  );
}

function analyzeInput(text: string): string {
  const issues: string[] = [];
  if (text.includes("不好意思") || text.includes("抱歉")) {
    issues.push("过度道歉会削弱表达的力量感");
  }
  if (text.includes("可能") || text.includes("大概")) {
    issues.push("过多模糊词会让观点显得不够坚定");
  }
  if (text.includes("随便") || text.includes("都行")) {
    issues.push("使用模糊词会让对方感受不到你的真实需求");
  }
  if (text.includes("很烦") || text.includes("讨厌")) {
    issues.push("情绪化表达容易引发对方防御");
  }
  if (!text.includes("因为") && !text.includes("所以")) {
    issues.push("缺少理由支撑，建议用'因为...所以...'结构");
  }

  if (issues.length === 0) {
    return "你的表达基础不错，我们可以帮你优化得更自然流畅。";
  }
  return `你的表达有${issues.length}个可以优化的地方：${issues.join("；")}。`;
}

function generateVersions(input: string, reply: string): OptimizeVersion[] {
  return [
    {
      label: "温和版",
      icon: "😊",
      color: "green",
      content: generateGentle(input),
    },
    {
      label: "直接版",
      icon: "🎯",
      color: "blue",
      content: generateDirect(input),
    },
    {
      label: "自信版",
      icon: "💪",
      color: "purple",
      content: generateConfident(input),
    },
    {
      label: "边界版",
      icon: "🛡️",
      color: "amber",
      content: generateBoundary(input),
    },
  ];
}

function generateGentle(input: string): string {
  if (input.includes("不回")) {
    return "我发现我们最近回复节奏不太一样。你长时间不回的时候，我会有点不确定。我们可以说一下彼此舒服的沟通方式吗？";
  }
  if (input.includes("不好")) {
    return "我理解这个方案的优点，不过我有一个担心点想补充一下。从数据来看，如果我们调整一下方向，效果可能会更好。";
  }
  if (input.includes("帮")) {
    return "你现在方便帮我看一下这个文档吗？主要想请你帮忙看逻辑是否清楚。如果你今天没时间，我也可以明天再发你。";
  }
  return `我有一些想法想和你分享。${input.replace(/很烦|讨厌|不爽/g, "有些困扰")}，不知道你怎么看？`;
}

function generateDirect(input: string): string {
  if (input.includes("不回")) {
    return "我发消息你经常不回，这让我觉得不被尊重。如果你不想聊，可以直接告诉我。";
  }
  if (input.includes("不好")) {
    return "这个方案有问题，主要体现在三个方面。我建议我们重新评估一下。";
  }
  if (input.includes("帮")) {
    return "帮我看一下这个文档，需要确认三点：逻辑、数据和结论。有空的时候给我反馈。";
  }
  return input.replace(/不好意思啊|抱歉|对不起/g, "").replace(/可能|大概/g, "");
}

function generateConfident(input: string): string {
  if (input.includes("不回")) {
    return "我更喜欢稳定、清楚的沟通。如果你暂时没有精力保持联系，也没关系，我们可以把节奏放慢。";
  }
  if (input.includes("不好")) {
    return "基于目前的数据分析，我建议采用另一个方向。上次类似方案的转化率是18%，低于预期。我有信心调整后会有更好的效果。";
  }
  if (input.includes("帮")) {
    return "我想请你帮我审阅一下这个方案，重点看数据和结论部分。你的意见对我很重要，方便的话今天给我反馈。";
  }
  return `我有明确的观点想表达：${input.replace(/不好意思|抱歉|可能|大概/g, "")}。我相信这样做是对的。`;
}

function generateBoundary(input: string): string {
  if (input.includes("不回")) {
    return "我能理解你忙，但如果经常没有回应，我会觉得这段沟通不太被重视。如果你最近不方便聊天，可以直接告诉我。";
  }
  if (input.includes("不好")) {
    return "我的建议是不要完全沿用这个方案。我有自己的判断依据，也想听听你的看法。";
  }
  if (input.includes("帮")) {
    return "我想请你帮忙看一下这个文档。如果你不方便，完全没关系，我可以找其他人。";
  }
  return `关于这件事，我有自己的立场：${input}。我尊重你的想法，但也希望你能理解我的感受。`;
}
