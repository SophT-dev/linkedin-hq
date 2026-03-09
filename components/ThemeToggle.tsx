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
        background: "var(--surface-1)",
        borderColor: "var(--border-accent)",
        boxShadow: "0 2px 12px oklch(0 0 0 / 30%)",
      }}
    >
      {dark ? (
        <Sun size={16} style={{ color: "var(--color-accent)" }} />
      ) : (
        <Moon size={16} style={{ color: "var(--color-accent)" }} />
      )}
    </button>
  );
}
