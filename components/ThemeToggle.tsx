"use client";

import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";

export default function ThemeToggle() {
  const [dark, setDark] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem("theme");
    const isDark = stored ? stored === "dark" : true;
    setDark(isDark);
    document.documentElement.classList.toggle("dark", isDark);
  }, []);

  const toggle = () => {
    const next = !dark;
    setDark(next);
    localStorage.setItem("theme", next ? "dark" : "light");
    document.documentElement.classList.toggle("dark", next);
  };

  return (
    <button
      onClick={toggle}
      aria-label="Toggle theme"
      className="fixed top-4 right-4 z-50 flex items-center justify-center w-9 h-9 rounded-full border transition-all hover:scale-110 active:scale-95"
      style={{
        background: dark ? "oklch(0.14 0.015 25)" : "oklch(0.96 0 0)",
        borderColor: dark ? "oklch(0.60 0.22 25 / 30%)" : "oklch(0.85 0 0)",
        boxShadow: "0 2px 12px oklch(0 0 0 / 30%)",
      }}
    >
      {dark ? (
        <Sun size={16} style={{ color: "oklch(0.65 0.22 25)" }} />
      ) : (
        <Moon size={16} style={{ color: "oklch(0.40 0.10 25)" }} />
      )}
    </button>
  );
}
