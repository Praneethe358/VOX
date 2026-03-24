import React from 'react';

interface VoxLogoProps {
  size?: 'sm' | 'md' | 'lg';
  showTagline?: boolean;
  className?: string;
}

const SIZE_MAP = {
  sm: {
    icon: 'h-8 w-8',
    title: 'text-xl tracking-[0.22em]',
    subtitle: 'text-[10px] tracking-[0.2em]',
  },
  md: {
    icon: 'h-11 w-11',
    title: 'text-4xl tracking-[0.26em]',
    subtitle: 'text-xs tracking-[0.26em]',
  },
  lg: {
    icon: 'h-14 w-14',
    title: 'text-6xl tracking-[0.28em]',
    subtitle: 'text-sm tracking-[0.3em]',
  },
} as const;

export default function VoxLogo({
  size = 'md',
  showTagline = true,
  className = '',
}: VoxLogoProps) {
  const s = SIZE_MAP[size];

  return (
    <div className={`inline-flex items-center gap-3 ${className}`}>
      <div className={`relative ${s.icon} rounded-2xl border border-indigo-400/35 bg-gradient-to-b from-indigo-500/20 to-blue-500/10 flex items-center justify-center shadow-[0_0_24px_rgba(99,102,241,0.2)]`}>
        <svg viewBox="0 0 24 24" className="h-5 w-5 text-indigo-200" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <rect x="8" y="4" width="8" height="12" rx="4" stroke="currentColor" strokeWidth="1.8" />
          <path d="M6 10.5C6 13.5376 8.46243 16 11.5 16H12.5C15.5376 16 18 13.5376 18 10.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
          <path d="M12 16V20" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
          <path d="M9 20H15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
        </svg>
        <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-cyan-300 shadow-[0_0_10px_rgba(103,232,249,0.8)]" />
      </div>

      <div className="flex flex-col">
        <span className={`font-black leading-none text-white ${s.title}`}>VOX</span>
        {showTagline && (
          <span className={`mt-1 uppercase text-slate-400 font-medium leading-none ${s.subtitle}`}>
            Voice Oriented Experience
          </span>
        )}
      </div>
    </div>
  );
}
