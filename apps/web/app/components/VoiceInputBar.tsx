"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useVoiceChat } from "./VoiceChatContext";

interface VoiceInputBarProps {
  onTranscript: (text: string) => void;
  onSubmit?: () => void;
  placeholder?: string;
  disabled?: boolean;
}

function checkBrowserSupport() {
  if (typeof window === "undefined") return { speechRecognition: false };
  return {
    speechRecognition: !!(window as any).SpeechRecognition || !!(window as any).webkitSpeechRecognition,
  };
}

export default function VoiceInputBar({
  onTranscript,
  onSubmit,
  placeholder = "输入你想说的话...",
  disabled = false,
}: VoiceInputBarProps) {
  const {
    setAvatarState,
    setIsRecording,
    isRecording,
    transcript,
    setTranscript,
    error: voiceError,
    setError,
  } = useVoiceChat();

  const [showTextInput, setShowTextInput] = useState(false);
  const [textInput, setTextInput] = useState("");
  const [supportStatus, setSupportStatus] = useState<"checking" | "supported" | "unsupported">("checking");
  const [micPermission, setMicPermission] = useState<"unknown" | "granted" | "denied">("unknown");

  // Refs - 避免闭包问题和重复创建实例
  const recognitionRef = useRef<any>(null);
  const transcriptRef = useRef("");
  const onTranscriptRef = useRef(onTranscript);
  const onSubmitRef = useRef(onSubmit);
  const isStartingRef = useRef(false);
  const isStoppingRef = useRef(false);
  const hasFinalResultRef = useRef(false);

  // Sync refs with props
  useEffect(() => {
    onTranscriptRef.current = onTranscript;
    onSubmitRef.current = onSubmit;
  }, [onTranscript, onSubmit]);

  // Sync transcript ref with state
  useEffect(() => {
    transcriptRef.current = transcript;
  }, [transcript]);

  // Browser support check - run once
  useEffect(() => {
    if (typeof window === "undefined") return;
    const support = checkBrowserSupport();
    if (!support.speechRecognition) {
      setSupportStatus("unsupported");
      setShowTextInput(true);
    } else {
      setSupportStatus("supported");
      // Check mic permission silently
      navigator.mediaDevices?.getUserMedia({ audio: true })
        .then(() => setMicPermission("granted"))
        .catch(() => {});
    }
  }, []);

  // Initialize SpeechRecognition ONCE - never recreate
  useEffect(() => {
    if (typeof window === "undefined") return;
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;

    const rec = new SR();
    rec.lang = "zh-CN";
    rec.continuous = true;   // 持续录音直到主动 stop
    rec.interimResults = true;

    rec.onresult = (event: any) => {
      let finalText = "";
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const result = event.results[i];
        if (result.isFinal) {
          finalText += result[0].transcript;
          hasFinalResultRef.current = true;
        } else {
          interim += result[0].transcript;
        }
      }
      const newText = (finalText || interim).trim();
      if (newText) {
        setTranscript(newText);
        onTranscriptRef.current(newText);
      }
    };

    rec.onerror = (e: any) => {
      if (e.error === "aborted") return;
      isStartingRef.current = false;
      setIsRecording(false);
      setAvatarState("idle");

      if (e.error === "no-speech") {
        setError("没有检测到语音，请大声一点");
      } else if (e.error === "audio-capture") {
        setError("无法访问麦克风");
      } else if (e.error === "not-allowed") {
        setError("麦克风权限被拒绝");
        setMicPermission("denied");
      } else if (e.error !== "network") {
        setError(`语音识别错误: ${e.error}`);
      }
    };

    rec.onend = () => {
      isStartingRef.current = false;
      setIsRecording(false);
      setAvatarState("idle");

      // 只有用户主动松开（isStoppingRef=true）时才提交
      if (isStoppingRef.current) {
        isStoppingRef.current = false;
        setTimeout(() => {
          const text = transcriptRef.current.trim();
          if (text && onSubmitRef.current) {
            onSubmitRef.current();
          }
        }, 200);
      }
    };

    recognitionRef.current = rec;

    return () => {
      try { rec.stop(); } catch {}
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startRecording = useCallback(async () => {
    if (disabled || isStartingRef.current) return;

    if (supportStatus === "unsupported") {
      setShowTextInput(true);
      return;
    }

    setError(null);
    setTranscript("");
    transcriptRef.current = "";
    hasFinalResultRef.current = false;
    isStoppingRef.current = false;

    // Check mic permission
    if (navigator.mediaDevices?.getUserMedia) {
      try {
        await navigator.mediaDevices.getUserMedia({ audio: true });
        setMicPermission("granted");
      } catch (err: any) {
        if (err.name === "NotAllowedError") {
          setError("麦克风权限被拒绝");
          setMicPermission("denied");
          setShowTextInput(true);
          return;
        }
      }
    }

    if (!recognitionRef.current) {
      setShowTextInput(true);
      return;
    }

    try {
      isStartingRef.current = true;
      recognitionRef.current.start();
      setIsRecording(true);
      setAvatarState("listening");
    } catch (err: any) {
      isStartingRef.current = false;
      if (err.message?.includes("already started")) {
        setIsRecording(true);
      } else {
        setShowTextInput(true);
      }
    }
  }, [disabled, supportStatus, setError, setTranscript, setIsRecording, setAvatarState]);

  const stopRecording = useCallback(() => {
    isStoppingRef.current = true;
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
    }
  }, []);

  // Click toggle: click to start, click again to stop
  const handleToggleRecord = useCallback(() => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  }, [isRecording, startRecording, stopRecording]);

  const handleTextSubmit = () => {
    if (!textInput.trim()) return;
    setTranscript(textInput);
    onTranscript(textInput);
    if (onSubmit) onSubmit();
  };

  // Unsupported browser - show text only
  if (supportStatus === "unsupported") {
    return (
      <div className="space-y-3">
        <div className="card bg-amber-50 border-amber-200 text-amber-800 text-sm">
          <div className="flex items-start gap-2">
            <span className="text-lg">⚠️</span>
            <div>
              <p className="font-medium">当前浏览器不支持语音识别</p>
              <p className="text-xs mt-1 text-amber-700">
                建议换用 <strong>Chrome</strong> 或 <strong>Edge</strong> 浏览器
              </p>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleTextSubmit()}
            placeholder={placeholder}
            className="flex-1 px-4 py-3 rounded-xl border border-purple-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-light"
            disabled={disabled}
          />
          <button onClick={handleTextSubmit} disabled={!textInput.trim() || disabled} className="btn-primary px-4">
            发送
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Error */}
      {voiceError && (
        <div className="card border-red-200 bg-red-50 text-red-700 text-sm">
          <div className="flex items-start gap-2">
            <span>❌</span>
            <div className="flex-1">
              {voiceError}
              {micPermission === "denied" && (
                <p className="text-xs mt-1 text-red-600">
                  💡 点击地址栏左侧 🔒 图标 → 网站设置 → 麦克风 → 允许
                </p>
              )}
            </div>
          </div>
          <button
            onClick={() => { setError(null); setShowTextInput(true); }}
            className="mt-2 text-xs underline text-primary"
          >
            改用文字输入
          </button>
        </div>
      )}

      {/* Text input mode */}
      {showTextInput && (
        <div className="space-y-2">
          <div className="flex gap-2">
            <input
              type="text"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleTextSubmit()}
              placeholder={placeholder}
              className="flex-1 px-4 py-3 rounded-xl border border-purple-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-light"
              disabled={disabled}
            />
            <button onClick={handleTextSubmit} disabled={!textInput.trim() || disabled} className="btn-primary px-4">
              发送
            </button>
          </div>
          <div className="text-center">
            <button
              onClick={() => { setShowTextInput(false); setTextInput(""); setError(null); }}
              className="text-xs text-gray-400 hover:text-primary transition-colors"
            >
              🎙️ 使用语音输入
            </button>
          </div>
        </div>
      )}

      {/* Voice input mode */}
      {!showTextInput && (
        <div className="space-y-3">
          {isRecording && (
            <div className="card bg-purple-50 border-purple-200 text-sm text-gray-700 min-h-[48px] flex items-center">
              <span className="animate-pulse mr-2">🎤</span>
              {transcript || "正在聆听，请说话..."}
            </div>
          )}

          <button
            onClick={handleToggleRecord}
            disabled={disabled}
            className={`w-full py-5 rounded-2xl flex items-center justify-center gap-3 transition-all duration-200 select-none ${
              isRecording
                ? "bg-gradient-to-br from-red-500 to-red-600 text-white animate-pulse"
                : "bg-gradient-to-br from-primary to-purple-600 text-white"
            }`}
            style={{
              boxShadow: isRecording
                ? "0 0 30px rgba(239,68,68,0.4)"
                : "0 4px 14px -4px rgba(124,58,237,0.5)",
            }}
          >
            {isRecording ? (
              <>
                <span className="text-2xl">🔴</span>
                <span className="font-semibold">点击结束录音</span>
              </>
            ) : (
              <>
                <span className="text-2xl">🎙️</span>
                <span className="font-semibold">点击开始录音</span>
              </>
            )}
          </button>

          <div className="text-center">
            <button onClick={() => setShowTextInput(true)} className="text-xs text-gray-400 hover:text-primary transition-colors">
              ⌨️ 改用键盘输入
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
