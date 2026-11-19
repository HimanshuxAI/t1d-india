'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  className?: string;
}

export function BrandLogo({ size = 'md', showText = true, className }: LogoProps) {
  const iconSizes = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-14 h-14',
  };

  return (
    <div className={cn('flex items-center gap-3 select-none group', className)}>
      {/* Handcrafted Medical Emblem */}
      <div
        className={cn(
          iconSizes[size],
          'relative rounded-2xl bg-gradient-to-br from-[#2A3F8F] via-[#213272] to-[#182352] p-1.5 flex items-center justify-center shadow-[0_4px_14px_rgba(42,63,143,0.22)] ring-1 ring-black/5 dark:ring-white/10 group-hover:scale-105 transition-all duration-200 shrink-0'
        )}
      >
        <svg
          viewBox="0 0 48 48"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full"
        >
          {/* Subtle concentric calibration grid */}
          <circle cx="24" cy="24" r="21" stroke="#FAF4E8" strokeOpacity="0.15" strokeWidth="1" strokeDasharray="2 3" />
          
          {/* The Universal Diabetes Blue Circle Ring (IDF Symbol) in Neel Indigo */}
          <circle
            cx="24"
            cy="24"
            r="16.5"
            stroke="#FAF4E8"
            strokeWidth="2.5"
            strokeLinecap="round"
            className="opacity-90"
          />

          {/* Saffron / Haldi Glycemic Balance Orbit Dot */}
          <circle cx="37" cy="15" r="2.5" fill="#E8A33D" />

          {/* Central Stylized Glucose Drop in Gulal Pink (#E0527F) */}
          <path
            d="M24 11C24 11 15 21.5 15 26.5C15 31.47 19.03 35.5 24 35.5C28.97 35.5 33 31.47 33 26.5C33 21.5 24 11 24 11Z"
            fill="url(#gulalGradient)"
          />

          {/* Inner Negative Space Wheat Grain & Pulse Glyph (Carb & Insulin Convergence) */}
          <path
            d="M24 16V31M21 21L24 23.5L27 21M21 25.5L24 28L27 25.5"
            stroke="#FAF4E8"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Subtle micro reflection */}
          <ellipse cx="21" cy="24" rx="2" ry="4" fill="#FAF4E8" fillOpacity="0.25" transform="rotate(-25 21 24)" />

          <defs>
            <linearGradient id="gulalGradient" x1="15" y1="11" x2="33" y2="35.5" gradientUnits="userSpaceOnUse">
              <stop stopColor="#F06292" />
              <stop offset="0.6" stopColor="#E0527F" />
              <stop offset="1" stopColor="#C2185B" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {/* Brand Typography */}
      {showText && (
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5 leading-none">
            <span className="font-serif font-black tracking-tight text-2xl text-[#231F2B] dark:text-[#F3EEE4]">
              T1D<span className="text-[#2A3F8F] dark:text-[#7F93E6] ml-1">India</span>
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#E0527F] mb-0.5" />
          </div>
          <div className="flex items-center gap-1.5 mt-1">
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#5C5665] dark:text-[#8C8496]">
              देसी DIABETES CARE
            </span>
            <span className="text-[9px] text-[#2E8B57] font-semibold bg-[#2E8B57]/10 px-1.5 py-0.2 rounded">
              ABDM
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
