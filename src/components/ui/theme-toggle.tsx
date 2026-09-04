"use client";

import { useEffect, useState } from "react";

type ThemeMode = "dark" | "light";

function getCurrentTheme(): ThemeMode {
  if (typeof document === "undefined") {
    return "dark";
  }

  const value = document.documentElement.getAttribute("data-theme");
  return value === "light" ? "light" : "dark";
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<ThemeMode>("dark");

  useEffect(() => {
    setTheme(getCurrentTheme());
  }, []);

  const toggleTheme = () => {
    const nextTheme: ThemeMode = theme === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", nextTheme);
    window.sessionStorage.setItem("tradehub-theme", nextTheme);
    setTheme(nextTheme);
  };

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="button-secondary focus-ring px-3 py-2 text-xs sm:text-sm"
      aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
    >
      <span aria-hidden="true" className="flex items-center">
        {theme === "dark" ? (
          <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current stroke-[1.8]">
            <path
              d="M12 3v2.5M12 18.5V21M4.93 4.93l1.77 1.77M17.3 17.3l1.77 1.77M3 12h2.5M18.5 12H21M4.93 19.07 6.7 17.3M17.3 6.7l1.77-1.77M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current stroke-[1.8]">
            <path
              d="M20.4 14.5A8.5 8.5 0 1 1 9.5 3.6a7 7 0 0 0 10.9 10.9Z"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </span>
      <span className="hidden sm:inline">{theme === "dark" ? "Dark" : "Light"}</span>
    </button>
  );
}
