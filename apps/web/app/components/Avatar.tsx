"use client";

import { useState, useEffect } from "react";
import { useVoiceChat } from "./VoiceChatContext";

type Gender = "male" | "female";

interface AvatarProps {
  size?: "sm" | "md" | "lg";
  showWaveform?: boolean;
}

const SKIN = "#F5D0C5";
const SKIN_SHADOW = "#E8B8A8";
const MALE_HAIR = "#3D3229";
const FEMALE_HAIR = "#5C3D2E";
const MALE_SHIRT = "#5B8DB8";
const MALE_SHIRT_DARK = "#4A7AA3";
const FEMALE_SHIRT = "#D484A8";
const FEMALE_SHIRT_DARK = "#C06E94";
const EYE = "#2D2D2D";
const BLUSH = "#E891A0";
const MOUTH = "#C4786E";

export default function Avatar({ size = "md", showWaveform = true }: AvatarProps) {
  const { avatarState, isPlaying } = useVoiceChat();
  const [gender, setGender] = useState<Gender>("female");
  const [blink, setBlink] = useState(false);

  // Load saved gender
  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = window.localStorage.getItem("avatar_gender") as Gender;
      if (saved === "male" || saved === "female") setGender(saved);
    }
  }, []);

  const saveGender = (g: Gender) => {
    setGender(g);
    if (typeof window !== "undefined") {
      window.localStorage.setItem("avatar_gender", g);
    }
  };

  // Blink animation
  useEffect(() => {
    if (avatarState === "talking" || avatarState === "listening") return;
    const interval = setInterval(() => {
      setBlink(true);
      setTimeout(() => setBlink(false), 150);
    }, 3000 + Math.random() * 2000);
    return () => clearInterval(interval);
  }, [avatarState]);

  const isMale = gender === "male";
  const hairColor = isMale ? MALE_HAIR : FEMALE_HAIR;
  const shirtColor = isMale ? MALE_SHIRT : FEMALE_SHIRT;
  const shirtDark = isMale ? MALE_SHIRT_DARK : FEMALE_SHIRT_DARK;

  // State-based transforms
  const bodyFloat =
    avatarState === "idle"
      ? "translateY(0px)"
      : avatarState === "listening"
      ? "translateY(2px) scale(1.01)"
      : avatarState === "thinking"
      ? "translateY(0px) rotate(-2deg)"
      : avatarState === "talking"
      ? "translateY(-1px)"
      : "translateY(0px)";

  const headTilt =
    avatarState === "thinking"
      ? "rotate(-3deg)"
      : avatarState === "talking"
      ? "rotate(1deg)"
      : "rotate(0deg)";

  const mouthOpen = avatarState === "talking";

  const sizeMap = {
    sm: { w: 140, h: 180, scale: 0.7 },
    md: { w: 180, h: 230, scale: 0.9 },
    lg: { w: 220, h: 280, scale: 1.1 },
  };
  const { w, h, scale } = sizeMap[size];

  return (
    <div className="flex flex-col items-center">
      {/* Avatar container */}
      <div className="relative" style={{ width: w, height: h }}>
        {/* Outer glow */}
        <div
          className="absolute inset-0 rounded-full transition-all duration-700"
          style={{
            background:
              avatarState === "listening"
                ? "radial-gradient(circle, rgba(124,58,237,0.18) 0%, transparent 65%)"
                : avatarState === "thinking"
                ? "radial-gradient(circle, rgba(245,158,11,0.12) 0%, transparent 65%)"
                : avatarState === "talking"
                ? "radial-gradient(circle, rgba(124,58,237,0.2) 0%, transparent 65%)"
                : "radial-gradient(circle, rgba(124,58,237,0.06) 0%, transparent 65%)",
            filter: "blur(8px)",
            animation:
              avatarState === "listening"
                ? "pulse-ring 1.5s infinite"
                : avatarState === "talking"
                ? "pulse-ring 2s infinite"
                : "none",
          }}
        />

        {/* SVG Avatar */}
        <svg
          viewBox="0 0 200 260"
          className="w-full h-full"
          style={{
            transform: `scale(${scale})`,
            transformOrigin: "center bottom",
            transition: "transform 0.3s ease",
          }}
        >
          {/* === BODY === */}
          <g
            style={{
              transform: bodyFloat,
              transformOrigin: "100px 200px",
              transition: "transform 0.4s ease",
            }}
          >
            {/* Body / Shirt */}
            <path
              d={isMale
                ? "M50 150 Q50 140 60 138 L85 135 L85 145 L115 145 L115 135 L140 138 Q150 140 150 150 L155 260 L45 260 Z"
                : "M55 150 Q55 142 65 140 L85 138 L85 145 L115 145 L115 138 L135 140 Q145 142 145 150 L150 260 L50 260 Z"
              }
              fill={shirtColor}
            />
            {/* Shirt shadow / fold */}
            <path
              d={isMale
                ? "M85 145 L100 180 L115 145"
                : "M85 145 L100 175 L115 145"
              }
              fill="none"
              stroke={shirtDark}
              strokeWidth="1.5"
              opacity="0.4"
            />
            {/* Collar */}
            <path
              d={isMale
                ? "M85 138 Q100 145 115 138"
                : "M85 138 Q100 148 115 138"
              }
              fill="none"
              stroke={shirtDark}
              strokeWidth="2"
              strokeLinecap="round"
            />

            {/* Neck */}
            <rect x="88" y="115" width="24" height="30" rx="8" fill={SKIN} />
            <rect x="88" y="130" width="24" height="15" fill={SKIN_SHADOW} opacity="0.3" />

            {/* === HEAD GROUP === */}
            <g
              style={{
                transform: headTilt,
                transformOrigin: "100px 90px",
                transition: "transform 0.3s ease",
              }}
            >
              {/* Hair back (female only) */}
              {!isMale && (
                <>
                  <ellipse cx="70" cy="100" rx="18" ry="35" fill={hairColor} />
                  <ellipse cx="130" cy="100" rx="18" ry="35" fill={hairColor} />
                  <ellipse cx="75" cy="130" rx="12" ry="25" fill={hairColor} />
                  <ellipse cx="125" cy="130" rx="12" ry="25" fill={hairColor} />
                </>
              )}

              {/* Face shape */}
              <ellipse cx="100" cy="85" rx="38" ry="42" fill={SKIN} />

              {/* Ears */}
              <ellipse cx="62" cy="85" rx="6" ry="10" fill={SKIN} />
              <ellipse cx="138" cy="85" rx="6" ry="10" fill={SKIN} />

              {/* Hair top */}
              {isMale ? (
                // Male: short hair
                <>
                  <path
                    d="M62 65 Q62 35 100 30 Q138 35 138 65 L138 72 Q138 60 100 55 Q62 60 62 72 Z"
                    fill={hairColor}
                  />
                  {/* Hair texture */}
                  <path d="M75 42 Q85 38 95 42" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" strokeLinecap="round" />
                  <path d="M105 40 Q115 36 125 42" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" strokeLinecap="round" />
                  {/* Sideburns */}
                  <rect x="60" y="65" width="6" height="18" rx="3" fill={hairColor} />
                  <rect x="134" y="65" width="6" height="18" rx="3" fill={hairColor} />
                </>
              ) : (
                // Female: longer hair with bangs
                <>
                  <path
                    d="M58 70 Q58 25 100 22 Q142 25 142 70 L142 80 Q142 50 100 45 Q58 50 58 80 Z"
                    fill={hairColor}
                  />
                  {/* Bangs */}
                  <path
                    d="M62 55 Q75 48 88 55 Q100 48 112 55 Q125 48 138 55"
                    fill="none"
                    stroke={hairColor}
                    strokeWidth="8"
                    strokeLinecap="round"
                  />
                  {/* Hair shine */}
                  <path d="M80 35 Q90 30 100 33" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="2" strokeLinecap="round" />
                  <path d="M108 32 Q118 28 128 34" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="2" strokeLinecap="round" />
                </>
              )}

              {/* Eyebrows */}
              <path
                d={avatarState === "talking" ? "M78 68 Q85 63 92 68" : "M78 70 Q85 65 92 70"}
                fill="none"
                stroke={hairColor}
                strokeWidth="2.5"
                strokeLinecap="round"
                style={{ transition: "d 0.2s ease" }}
              />
              <path
                d={avatarState === "talking" ? "M108 68 Q115 63 122 68" : "M108 70 Q115 65 122 70"}
                fill="none"
                stroke={hairColor}
                strokeWidth="2.5"
                strokeLinecap="round"
                style={{ transition: "d 0.2s ease" }}
              />

              {/* Eyes */}
              <g style={{ transform: blink ? "scaleY(0.1)" : "scaleY(1)", transformOrigin: "100px 82px", transition: "transform 0.12s ease" }}>
                {/* Left eye */}
                <ellipse cx="85" cy="82" rx="7" ry="8" fill="white" />
                <circle cx="85" cy="82" r="4.5" fill={EYE} />
                <circle cx="86.5" cy="80" r="1.8" fill="white" />
                {/* Right eye */}
                <ellipse cx="115" cy="82" rx="7" ry="8" fill="white" />
                <circle cx="115" cy="82" r="4.5" fill={EYE} />
                <circle cx="116.5" cy="80" r="1.8" fill="white" />
              </g>

              {/* Eye shine (when not blinking) */}
              {!blink && (
                <>
                  <circle cx="82" cy="79" r="1.2" fill="white" opacity="0.8" />
                  <circle cx="112" cy="79" r="1.2" fill="white" opacity="0.8" />
                </>
              )}

              {/* Nose */}
              <path
                d="M100 88 L98 96 L102 96"
                fill="none"
                stroke={SKIN_SHADOW}
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Cheeks */}
              <ellipse cx="72" cy="95" rx="8" ry="5" fill={BLUSH} opacity="0.35" />
              <ellipse cx="128" cy="95" rx="8" ry="5" fill={BLUSH} opacity="0.35" />

              {/* Mouth */}
              {mouthOpen ? (
                <>
                  <ellipse cx="100" cy="108" rx="9" ry="7" fill={MOUTH} />
                  <ellipse cx="100" cy="110" rx="5" ry="3" fill="rgba(255,255,255,0.25)" />
                </>
              ) : (
                <path
                  d={avatarState === "thinking" ? "M94 108 Q100 112 106 108" : "M94 108 Q100 111 106 108"}
                  fill="none"
                  stroke={MOUTH}
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              )}

              {/* Thinking bubble */}
              {avatarState === "thinking" && (
                <g>
                  <circle cx="145" cy="45" r="12" fill="white" stroke="#ddd" strokeWidth="1" />
                  <text x="145" y="50" textAnchor="middle" fontSize="14">💭</text>
                  <circle cx="135" cy="62" r="4" fill="white" stroke="#ddd" strokeWidth="0.8" />
                  <circle cx="128" cy="70" r="2.5" fill="white" stroke="#ddd" strokeWidth="0.6" />
                </g>
              )}

              {/* Listening indicator */}
              {avatarState === "listening" && (
                <g>
                  <circle cx="55" cy="75" r="10" fill="rgba(124,58,237,0.1)" stroke="rgba(124,58,237,0.3)" strokeWidth="1">
                    <animate attributeName="r" values="10;14;10" dur="1s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0.3;0.1;0.3" dur="1s" repeatCount="indefinite" />
                  </circle>
                  <circle cx="145" cy="75" r="10" fill="rgba(124,58,237,0.1)" stroke="rgba(124,58,237,0.3)" strokeWidth="1">
                    <animate attributeName="r" values="10;14;10" dur="1s" repeatCount="indefinite" begin="0.3s" />
                    <animate attributeName="opacity" values="0.3;0.1;0.3" dur="1s" repeatCount="indefinite" begin="0.3s" />
                  </circle>
                </g>
              )}
            </g>
          </g>
        </svg>

        {/* Status label */}
        <div
          className="absolute -bottom-1 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-[10px] font-medium text-white whitespace-nowrap"
          style={{
            background:
              avatarState === "listening"
                ? "linear-gradient(135deg, #8b5cf6, #7c3aed)"
                : avatarState === "thinking"
                ? "linear-gradient(135deg, #f59e0b, #d97706)"
                : avatarState === "talking"
                ? "linear-gradient(135deg, #8b5cf6, #ec4899)"
                : "linear-gradient(135deg, #9ca3af, #6b7280)",
            boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
          }}
        >
          {avatarState === "idle" && "待机中"}
          {avatarState === "listening" && "聆听中..."}
          {avatarState === "thinking" && "思考中..."}
          {avatarState === "talking" && "说话中..."}
        </div>
      </div>

      {/* Gender toggle */}
      <div className="flex items-center gap-1 mt-4 bg-gray-100 rounded-full p-1"
        style={{ transform: `scale(${scale * 0.9})` }}
      >
        <button
          onClick={() => saveGender("female")}
          className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all ${
            gender === "female"
              ? "bg-white text-pink-500 shadow-sm"
              : "text-gray-400 hover:text-gray-600"
          }`}
        >
          👩 女教练
        </button>
        <button
          onClick={() => saveGender("male")}
          className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all ${
            gender === "male"
              ? "bg-white text-blue-500 shadow-sm"
              : "text-gray-400 hover:text-gray-600"
          }`}
        >
          👨 男教练
        </button>
      </div>

      {/* Audio waveform */}
      {showWaveform && isPlaying && (
        <div className="flex items-end gap-[3px] h-10 mt-3 justify-center">
          {Array.from({ length: 16 }).map((_, i) => (
            <div
              key={i}
              className="w-[3px] rounded-full bg-gradient-to-t from-primary to-purple-400"
              style={{
                height: `${Math.max(20, Math.random() * 100)}%`,
                animation: `waveform-bounce 0.5s ease-in-out ${i * 0.04}s infinite alternate`,
                opacity: 0.6 + Math.random() * 0.4,
              }}
            />
          ))}
        </div>
      )}

      {/* Listening waveform */}
      {showWaveform && avatarState === "listening" && (
        <div className="flex items-center gap-[3px] mt-3 h-6 justify-center">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="w-[3px] rounded-full bg-primary"
              style={{
                height: "6px",
                animation: `listening-pulse 0.6s ease-in-out ${i * 0.1}s infinite`,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
