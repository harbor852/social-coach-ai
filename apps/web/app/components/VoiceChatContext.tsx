"use client";

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  useEffect,
} from "react";
import { synthesizeSpeech, getTTSConfig } from "@/app/lib/api";

type AvatarState = "idle" | "listening" | "thinking" | "talking";

interface VoiceChatState {
  avatarState: AvatarState;
  transcript: string;
  isRecording: boolean;
  isPlaying: boolean;
  audioBlob: Blob | null;
  audioUrl: string | null;
  error: string | null;
  showSettings: boolean;
  ttsConfigured: boolean;
}

interface VoiceChatActions {
  setAvatarState: (s: AvatarState) => void;
  setTranscript: (t: string) => void;
  setIsRecording: (v: boolean) => void;
  setIsPlaying: (v: boolean) => void;
  setAudioBlob: (b: Blob | null) => void;
  setAudioUrl: (u: string | null) => void;
  setError: (e: string | null) => void;
  setShowSettings: (v: boolean) => void;
  playText: (text: string) => Promise<void>;
  stopAudio: () => void;
  checkTTSConfig: () => boolean;
}

const VoiceChatContext = createContext<
  (VoiceChatState & VoiceChatActions) | null
>(null);

export function useVoiceChat() {
  const ctx = useContext(VoiceChatContext);
  if (!ctx) throw new Error("useVoiceChat must be used within VoiceChatProvider");
  return ctx;
}

// Browser native TTS helper
function getBrowserVoices(): SpeechSynthesisVoice[] {
  if (typeof window === "undefined" || !window.speechSynthesis) return [];
  return window.speechSynthesis.getVoices();
}

function findBestChineseVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | undefined {
  // Priority: Microsoft Chinese voices > Google > other zh voices
  const priorities = [
    (v: SpeechSynthesisVoice) => v.name.includes("Yaoyao") || v.name.includes("xiaoxiao"),
    (v: SpeechSynthesisVoice) => v.name.includes("Microsoft") && v.lang.startsWith("zh"),
    (v: SpeechSynthesisVoice) => v.name.includes("Google") && v.lang.startsWith("zh"),
    (v: SpeechSynthesisVoice) => v.lang.startsWith("zh-CN"),
    (v: SpeechSynthesisVoice) => v.lang.startsWith("zh"),
  ];
  for (const check of priorities) {
    const found = voices.find(check);
    if (found) return found;
  }
  return voices.find((v) => v.lang.startsWith("zh"));
}

export function VoiceChatProvider({ children }: { children: React.ReactNode }) {
  const [avatarState, setAvatarState] = useState<AvatarState>("idle");
  const [transcript, setTranscript] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [ttsConfigured, setTtsConfigured] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const cfg = getTTSConfig();
      // Browser TTS is always "configured" (it's free)
      setTtsConfigured(!cfg || cfg.provider === "browser" || !!(cfg && cfg.api_key));
      // Preload voices
      if (window.speechSynthesis) {
        window.speechSynthesis.getVoices();
      }
    }
  }, []);

  const checkTTSConfig = useCallback(() => {
    const cfg = getTTSConfig();
    const ok = !cfg || cfg.provider === "browser" || !!(cfg && cfg.api_key);
    setTtsConfigured(ok);
    return ok;
  }, []);

  const stopAudio = useCallback(() => {
    // Stop backend audio player
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    // Stop browser TTS
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    utteranceRef.current = null;
    setIsPlaying(false);
    setAudioUrl(null);
    if (avatarState === "talking") setAvatarState("idle");
  }, [avatarState]);

  // Play with browser native TTS (free)
  const playWithBrowserTTS = useCallback(
    async (text: string): Promise<void> => {
      return new Promise((resolve, reject) => {
        if (typeof window === "undefined" || !window.speechSynthesis) {
          reject(new Error("当前浏览器不支持语音合成，建议使用 Chrome / Edge"));
          return;
        }

        const cfg = getTTSConfig();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = "zh-CN";
        utterance.rate = cfg?.rate ?? 1.0;
        utterance.pitch = cfg?.pitch ?? 1.0;
        utterance.volume = 1.0;

        // Select voice
        const voices = getBrowserVoices();
        const zhVoice = findBestChineseVoice(voices);
        if (zhVoice) {
          utterance.voice = zhVoice;
        }

        utterance.onstart = () => {
          setIsPlaying(true);
          setAvatarState("talking");
        };

        utterance.onend = () => {
          setIsPlaying(false);
          setAvatarState("idle");
          utteranceRef.current = null;
          resolve();
        };

        utterance.onerror = (e) => {
          setIsPlaying(false);
          setAvatarState("idle");
          utteranceRef.current = null;
          if (e.error !== "canceled" && e.error !== "interrupted") {
            setError(`语音播放失败：${e.error}`);
          }
          reject(e);
        };

        utteranceRef.current = utterance;
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(utterance);
      });
    },
    [setAvatarState, setIsPlaying, setError]
  );

  // Play with backend API (paid)
  const playWithBackendTTS = useCallback(
    async (text: string): Promise<void> => {
      const blob = await synthesizeSpeech(text);
      const url = URL.createObjectURL(blob);
      setAudioBlob(blob);
      setAudioUrl(url);

      const audio = new Audio(url);
      audioRef.current = audio;

      audio.onplay = () => {
        setIsPlaying(true);
        setAvatarState("talking");
      };

      audio.onended = () => {
        setIsPlaying(false);
        setAvatarState("idle");
        URL.revokeObjectURL(url);
      };

      audio.onerror = () => {
        setIsPlaying(false);
        setAvatarState("idle");
        setError("语音播放失败");
      };

      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {
          setIsPlaying(false);
          setAvatarState("idle");
          setError("请点击播放按钮以收听语音");
        });
      }
    },
    [setAvatarState, setIsPlaying, setError]
  );

  const playText = useCallback(
    async (text: string) => {
      stopAudio();
      setError(null);
      setAvatarState("thinking");

      const cfg = getTTSConfig();
      const useBackend = cfg && cfg.provider !== "browser" && cfg.provider !== "mock" && cfg.api_key;

      try {
        if (useBackend) {
          await playWithBackendTTS(text);
        } else {
          await playWithBrowserTTS(text);
        }
      } catch (err) {
        setAvatarState("idle");
        // If browser TTS fails, show a helpful message
        if (!useBackend) {
          setError("浏览器语音合成失败，请尝试：1) 使用 Chrome/Edge 浏览器 2) 在设置中配置后端 TTS API");
        } else {
          setError(err instanceof Error ? err.message : "语音合成失败");
        }
      }
    },
    [stopAudio, setAvatarState, setError, playWithBrowserTTS, playWithBackendTTS]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, [audioUrl]);

  const value: VoiceChatState & VoiceChatActions = {
    avatarState,
    transcript,
    isRecording,
    isPlaying,
    audioBlob,
    audioUrl,
    error,
    showSettings,
    ttsConfigured,
    setAvatarState,
    setTranscript,
    setIsRecording,
    setIsPlaying,
    setAudioBlob,
    setAudioUrl,
    setError,
    setShowSettings,
    playText,
    stopAudio,
    checkTTSConfig,
  };

  return (
    <VoiceChatContext.Provider value={value}>
      {children}
    </VoiceChatContext.Provider>
  );
}
