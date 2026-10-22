"use client";

import { useSyncExternalStore } from "react";
import { THEME_KEY, THEMES, parseTheme, type Theme } from "@/lib/theme";

const CHANGE_EVENT = "themechange";

function readTheme(): Theme {
  try {
    return parseTheme(localStorage.getItem(THEME_KEY));
  } catch {
    return "system"; // storage blocked, e.g. some private windows
  }
}

function subscribe(onChange: () => void) {
  window.addEventListener(CHANGE_EVENT, onChange);
  window.addEventListener("storage", onChange); // other tabs
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

function applyTheme(theme: Theme) {
  try {
    if (theme === "system") localStorage.removeItem(THEME_KEY);
    else localStorage.setItem(THEME_KEY, theme);
  } catch {}
  if (theme === "system") delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = theme;
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

const LABELS: Record<Theme, string> = { system: "Match system", light: "Light", dark: "Dark" };

function Icon({ theme }: { theme: Theme }) {
  const common = {
    width: 16,
    height: 16,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };
  if (theme === "light") {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
      </svg>
    );
  }
  if (theme === "dark") {
    return (
      <svg {...common}>
        <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <rect x="3" y="4" width="18" height="12" rx="2" />
      <path d="M8 20h8M12 16v4" />
    </svg>
  );
}

export function ThemeToggle() {
  // Server render has no storage, so it assumes "system" until hydrated
  const current = useSyncExternalStore(subscribe, readTheme, () => "system" as Theme);

  return (
    <div role="group" aria-label="Theme" className="flex rounded-md bg-bar-soft p-0.5">
      {THEMES.map((theme) => (
        <button
          key={theme}
          type="button"
          onClick={() => applyTheme(theme)}
          aria-pressed={current === theme}
          aria-label={LABELS[theme]}
          title={LABELS[theme]}
          className={`cursor-pointer rounded p-1.5 ${
            current === theme ? "bg-paper text-ink shadow-sm" : "text-slate hover:text-ink"
          }`}
        >
          <Icon theme={theme} />
        </button>
      ))}
    </div>
  );
}
