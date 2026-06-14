import React from 'react';

interface LogoProps {
  className?: string;
  size?: number;
}

export const Logo: React.FC<LogoProps> = ({ className = '', size = 32 }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        {/* Purple/Indigo gradient for the lens frame and handle */}
        <linearGradient id="lens-grad" x1="34" y1="32" x2="60" y2="58" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#a855f7" />
          <stop offset="100%" stopColor="#6366f1" />
        </linearGradient>
        
        {/* Soft reflection gradient for the glass lens */}
        <linearGradient id="glass-grad" x1="35" y1="33" x2="53" y2="51" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="rgba(255, 255, 255, 0.45)" />
          <stop offset="100%" stopColor="rgba(255, 255, 255, 0.05)" />
        </linearGradient>
      </defs>

      {/* Document Sheet */}
      <path
        className="fill-zinc-100 dark:fill-zinc-800 stroke-zinc-350 dark:stroke-zinc-700 transition-colors duration-200"
        d="M14 6C14 4.89543 14.8954 4 16 4H38L50 16V56C50 57.1046 49.1046 58 48 58H16C14.8954 58 14 57.1046 14 56V6Z"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />

      {/* Folded Corner */}
      <path
        className="fill-zinc-250 dark:fill-zinc-750 stroke-zinc-350 dark:stroke-zinc-700 transition-colors duration-200"
        d="M38 4V16H50L38 4Z"
        strokeWidth="2"
        strokeLinejoin="round"
      />

      {/* Horizontal Document Lines */}
      {/* Header line */}
      <line
        x1="22"
        y1="22"
        x2="32"
        y2="22"
        className="stroke-zinc-400 dark:stroke-zinc-500 transition-colors duration-200"
        strokeWidth="3.5"
        strokeLinecap="round"
      />
      {/* Content lines */}
      <line
        x1="22"
        y1="30"
        x2="42"
        y2="30"
        className="stroke-zinc-350 dark:stroke-zinc-600 transition-colors duration-200"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <line
        x1="22"
        y1="38"
        x2="34"
        y2="38"
        className="stroke-zinc-350 dark:stroke-zinc-600 transition-colors duration-200"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <line
        x1="22"
        y1="46"
        x2="28"
        y2="46"
        className="stroke-zinc-350 dark:stroke-zinc-600 transition-colors duration-200"
        strokeWidth="2.5"
        strokeLinecap="round"
      />

      {/* Magnifying Glass (overlays the document sheet) */}
      {/* Glass drop shadow */}
      <circle
        cx="44"
        cy="42"
        r="10"
        fill="black"
        fillOpacity="0.12"
      />
      
      {/* Glass surface highlight */}
      <circle
        cx="44"
        cy="42"
        r="9"
        fill="url(#glass-grad)"
      />

      {/* Purple metal frame */}
      <circle
        cx="44"
        cy="42"
        r="9.5"
        stroke="url(#lens-grad)"
        strokeWidth="2.5"
      />

      {/* Handle */}
      <path
        d="M51 49L59 57"
        stroke="url(#lens-grad)"
        strokeWidth="3.5"
        strokeLinecap="round"
      />

      {/* Specular curved glint */}
      <path
        d="M38.5 39.5C39.5 38.2 41.5 37.5 43 38"
        stroke="white"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeOpacity="0.8"
      />
    </svg>
  );
};
