"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface JamureLogoProps {
  size?: "sm" | "md" | "lg";
  showText?: boolean;
  className?: string;
  textClassName?: string;
}

export function JamureLogo({
  size = "md",
  showText = true,
  className,
  textClassName,
}: JamureLogoProps) {
  const sizeMap = {
    sm: { icon: 24, text: "text-sm font-semibold", gap: "gap-2" },
    md: { icon: 30, text: "text-base font-bold", gap: "gap-2.5" },
    lg: { icon: 40, text: "text-xl font-bold", gap: "gap-3" },
  };

  const { icon, text, gap } = sizeMap[size];

  return (
    <div className={cn("inline-flex items-center notranslate select-none", gap, className)} translate="no">
      {/* Crisp Solid SVG Icon without Gradients */}
      <svg
        width={icon}
        height={icon}
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0 rounded-lg transition-transform hover:scale-105"
      >
        {/* Solid Background Squircle */}
        <rect x="2" y="2" width="36" height="36" rx="8" fill="#2563EB" />
        <rect x="2.5" y="2.5" width="35" height="35" rx="7.5" stroke="#FFFFFF" strokeOpacity="0.2" strokeWidth="1" />

        {/* Crisp Solid White Voice Bars */}
        <rect x="9" y="16" width="3" height="8" rx="1.5" fill="#FFFFFF" fillOpacity="0.8" />
        <rect x="14" y="11" width="3" height="18" rx="1.5" fill="#FFFFFF" fillOpacity="0.9" />
        <rect x="19" y="8" width="3" height="24" rx="1.5" fill="#FFFFFF" />
        <rect x="24" y="12" width="3" height="16" rx="1.5" fill="#FFFFFF" fillOpacity="0.9" />
        <rect x="29" y="16" width="3" height="8" rx="1.5" fill="#FFFFFF" fillOpacity="0.8" />
      </svg>

      {/* Solid Clean Typography */}
      {showText && (
        <span className={cn("tracking-tight text-foreground", text, textClassName)}>
          Jamure Voice AI
        </span>
      )}
    </div>
  );
}

export default JamureLogo;
