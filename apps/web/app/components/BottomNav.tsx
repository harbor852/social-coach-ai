"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function BottomNav() {
  const pathname = usePathname();

  const navItems = [
    { href: "/", label: "首页", icon: "🏠" },
    { href: "/train/expression", label: "表达训练", icon: "💬" },
    { href: "/train/scene", label: "场景训练", icon: "🎭" },
    { href: "/growth", label: "成长", icon: "📈" },
  ];

  return (
    <nav className="bottom-nav">
      {navItems.map((item) => {
        const isActive = pathname === item.href;
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
