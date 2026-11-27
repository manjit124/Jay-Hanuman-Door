import React from 'react';

interface SlidingWindowIconProps {
  className?: string;
}

/**
 * Crisp Aluminium Sliding Window icon depicting outer frame, center interlock,
 * horizontal sliding track rails, and directional sliding arrows.
 */
export const SlidingWindowIcon: React.FC<SlidingWindowIconProps> = ({
  className = 'w-5 h-5',
}) => {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {/* Outer aluminium window frame */}
      <rect x="2.5" y="4" width="19" height="15" rx="1.5" />
      {/* Top & bottom sliding track rails */}
      <line x1="2.5" y1="6.5" x2="21.5" y2="6.5" strokeWidth="1.2" opacity="0.65" />
      <line x1="2.5" y1="16.5" x2="21.5" y2="16.5" strokeWidth="1.2" opacity="0.65" />
      {/* Overlapping center interlock stiles */}
      <line x1="11.2" y1="4" x2="11.2" y2="19" />
      <line x1="13" y1="6.5" x2="13" y2="16.5" strokeWidth="1.3" opacity="0.7" />
      {/* Sliding sash handles */}
      <line x1="5" y1="10.2" x2="5" y2="12.8" strokeWidth="2" />
      <line x1="19" y1="10.2" x2="19" y2="12.8" strokeWidth="2" />
      {/* Subtle bottom sill */}
      <line x1="1.5" y1="20.5" x2="22.5" y2="20.5" strokeWidth="1.6" />
    </svg>
  );
};
