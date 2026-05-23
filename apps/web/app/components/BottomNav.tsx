"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function BottomNav() {
  const pathname = usePathname();

  // Hide on onboarding flow for an immersive experience.
  if (pathname?.startsWith("/onboarding")) return null;

  const navItems = [
    { href: "/", label: "首页", icon: "🏠" },
    { href: "/train/expression", label: "表达", icon: "💬" },
    { href: "/train/voice", label: "语音", icon: "🎙️" },
    { href: "/train/etiquette", label: "礼仪", icon: "📚" },
    { href: "/growth", label: "成长", icon: "📈" },
    { href: "/settings", label: "设置", icon: "⚙️" },
  ];

  return (
    <nav className="bottom-nav">
      {navItems.map((item) => {
        const isActive =
          item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={isActive ? "active" : ""}
          >
            <span className="nav-icon">{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
