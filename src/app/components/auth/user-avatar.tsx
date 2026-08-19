"use client";

import { useState } from "react";

interface UserAvatarProps {
  image?: string | null;
  email?: string | null;
  name?: string | null;
  username?: string | null;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
}

const SIZE_CLASSES = {
  xs: "h-6 w-6 text-xs",
  sm: "h-8 w-8 text-xs font-semibold",
  md: "h-10 w-10 text-sm font-bold",
  lg: "h-14 w-14 text-lg font-bold",
  xl: "h-20 w-20 text-2xl font-bold",
};

// Deterministic vibrant gradient based on initial letter
const GRADIENTS = [
  "from-sky-500 to-indigo-600",
  "from-blue-600 to-cyan-500",
  "from-indigo-500 to-purple-600",
  "from-violet-600 to-fuchsia-500",
  "from-emerald-500 to-teal-600",
  "from-teal-500 to-cyan-600",
  "from-amber-500 to-orange-600",
  "from-rose-500 to-pink-600",
];

function getGradientForString(str: string): string {
  if (!str) return GRADIENTS[0];
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % GRADIENTS.length;
  return GRADIENTS[index];
}

export default function UserAvatar({
  image,
  email,
  name,
  username,
  size = "md",
  className = "",
}: UserAvatarProps) {
  const [imageError, setImageError] = useState(false);

  // Determine fallback letter from email first, then name/username
  const identifier = email || name || username || "U";
  const initialLetter = identifier.trim().charAt(0).toUpperCase() || "U";
  const gradientClass = getGradientForString(identifier);
  const sizeClass = SIZE_CLASSES[size] || SIZE_CLASSES.md;

  const hasValidImage = image && !imageError;

  return (
    <div
      className={`relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full shadow-inner select-none ${sizeClass} ${className}`}
    >
      {hasValidImage ? (
        <img
          src={image}
          alt={name || username || email || "User avatar"}
          referrerPolicy="no-referrer"
          crossOrigin="anonymous"
          onError={() => setImageError(true)}
          className="h-full w-full object-cover"
        />
      ) : (
        <div
          className={`flex h-full w-full items-center justify-center bg-gradient-to-br ${gradientClass} text-white shadow-md`}
        >
          <span>{initialLetter}</span>
        </div>
      )}
    </div>
  );
}
