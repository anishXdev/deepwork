import React from 'react';

interface DeepworkLogoProps {
  className?: string;
  size?: number;
  showText?: boolean;
}

export const DeepworkLogo: React.FC<DeepworkLogoProps> = ({ 
  className = '', 
  size = 32,
  showText = false 
}) => {
  return (
    <div className={`inline-flex items-center gap-2 select-none ${className}`}>
      <svg 
        width={size} 
        height={size} 
        viewBox="0 0 120 120" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
        className="transition-transform duration-300 hover:scale-105"
      >
        <defs>
          {/* Oceanic Liquid Gradient for Stem & Loop */}
          <linearGradient id="deepwork-grad" x1="15" y1="10" x2="105" y2="110" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#2dd4bf" />
            <stop offset="35%" stopColor="#06b6d4" />
            <stop offset="70%" stopColor="#0d9488" />
            <stop offset="100%" stopColor="#10b981" />
          </linearGradient>

          {/* Deep Core Glow */}
          <radialGradient id="deepwork-core" cx="50" cy="70" r="35" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.8" />
            <stop offset="60%" stopColor="#0d9488" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#0284c7" stopOpacity="0" />
          </radialGradient>

          {/* Specular Light Highlight */}
          <linearGradient id="deepwork-highlight" x1="30" y1="20" x2="80" y2="60" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </linearGradient>

          <filter id="deepwork-glow" x="-10" y="-10" width="140" height="140" filterUnits="userSpaceOnUse">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Ambient Back Glow Ring */}
        <circle cx="60" cy="65" r="36" fill="url(#deepwork-core)" />

        {/* Lowercase 'd' Geometric Sculpture:
            - Circular vortex bowl (left-bottom, center cx=52, cy=70, r=28)
            - Ascending high-velocity stem (x=76, from y=18 down to y=98 with smooth base terminal)
        */}
        
        {/* The Bowl: Dynamic Torus with Aperture */}
        <path 
          d="M 76 44 
             A 28 28 0 1 0 76 96 
             L 76 44 Z" 
          fill="url(#deepwork-grad)" 
          fillOpacity="0.15"
        />

        {/* Outer Continuous 'd' Path */}
        <path 
          d="M 78 18
             C 78 14 74 12 70 16
             L 74 46
             A 28 28 0 1 0 78 88
             L 78 18 Z" 
          stroke="url(#deepwork-grad)" 
          strokeWidth="10" 
          strokeLinecap="round" 
          strokeLinejoin="round"
          filter="url(#deepwork-glow)"
        />

        {/* Core Vortex Inner Orbit (Focus Pupil) */}
        <circle 
          cx="52" 
          cy="68" 
          r="12" 
          fill="url(#deepwork-grad)" 
        />

        {/* Crystalline Focus Beacon at the top of 'd' */}
        <circle 
          cx="76" 
          cy="18" 
          r="4.5" 
          fill="#ffffff" 
          className="animate-pulse"
        />

        {/* Sleek Specular Light Arc on Bowl */}
        <path 
          d="M 32 60 A 24 24 0 0 1 60 44" 
          stroke="url(#deepwork-highlight)" 
          strokeWidth="3.5" 
          strokeLinecap="round" 
        />
      </svg>

      {showText && (
        <span className="font-extrabold tracking-tight text-base sm:text-lg font-sans text-slate-900 dark:text-slate-100 flex items-center">
          <span>d</span>
          <span className="bg-gradient-to-r from-teal-500 via-cyan-400 to-emerald-400 bg-clip-text text-transparent">study</span>
        </span>
      )}
    </div>
  );
};
