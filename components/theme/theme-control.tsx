"use client";

import React from "react";
import { useTheme, type Theme } from "./theme-provider";

export function ThemeControl() {
  const { theme, setTheme } = useTheme();

  const options: { value: Theme; label: string; title: string }[] = [
    { value: "system", label: "Auto", title: "Follow system preference" },
    { value: "light", label: "Light", title: "Force light theme" },
    { value: "dark", label: "Dark", title: "Force dark theme" },
  ];

  return (
    <div
      role="group"
      aria-label="Theme selection"
      className="inline-flex items-center rounded border border-surface-border bg-surface-subtle p-0.5 text-xs font-mono"
    >
      {options.map((option) => {
        const isActive = theme === option.value;
        return (
          <button
            key={option.value}
            type="button"
            title={option.title}
            aria-pressed={isActive}
            onClick={() => setTheme(option.value)}
            className={`cursor-pointer rounded px-2 py-0.5 transition-colors ${
              isActive
                ? "bg-surface text-foreground font-semibold shadow-xs"
                : "text-muted-text hover:text-foreground"
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
