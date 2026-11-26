import React from 'react';

interface PhoneMockupProps {
  src: string;
  alt: string;
  className?: string;
  accent?: 'violet' | 'gold';
  priority?: boolean;
}

/**
 * Custom Titanium-bezel mobile hardware frame for presenting genuine
 * CalebDeck app screens with crisp proportions, specular edge rim,
 * and zero third-party stock clutter.
 */
export const PhoneMockup: React.FC<PhoneMockupProps> = ({
  src,
  alt,
  className = '',
  accent = 'violet',
  priority = false,
}) => {
  const rimGlow =
    accent === 'gold'
      ? 'shadow-[0_32px_80px_-16px_rgba(18,12,36,0.55),0_0_0_1px_rgba(252,211,77,0.28)]'
      : 'shadow-[0_32px_80px_-16px_rgba(28,14,68,0.42),0_0_0_1px_rgba(124,58,237,0.28)]';

  return (
    <div
      className={`relative rounded-[2.6rem] p-[9px] bg-gradient-to-b from-[#2E2A3B] via-[#171421] to-[#0D0B14] ${rimGlow} select-none ${className}`}
    >
      {/* Subtle side hardware buttons */}
      <span
        aria-hidden="true"
        className="absolute -left-[2.5px] top-24 w-[2.5px] h-9 rounded-l-sm bg-[#3A344A]"
      />
      <span
        aria-hidden="true"
        className="absolute -left-[2.5px] top-36 w-[2.5px] h-12 rounded-l-sm bg-[#3A344A]"
      />
      <span
        aria-hidden="true"
        className="absolute -right-[2.5px] top-28 w-[2.5px] h-14 rounded-r-sm bg-[#3A344A]"
      />

      {/* Inner OLED Bezel */}
      <div className="relative rounded-[2.15rem] overflow-hidden bg-white ring-1 ring-black/40">
        {/* Top Dynamic Island Pill */}
        <div
          aria-hidden="true"
          className="absolute top-2.5 left-1/2 -translate-x-1/2 z-20 w-20 h-5 rounded-full bg-[#0B0A0F] flex items-center justify-end pr-2 shadow-sm"
        >
          <span className="w-2 h-2 rounded-full bg-[#1C1929] ring-1 ring-white/10" />
        </div>

        {/* Screen Capture */}
        <div className="pt-7 bg-white">
          <img
            src={src}
            alt={alt}
            loading={priority ? 'eager' : 'lazy'}
            decoding={priority ? 'sync' : 'async'}
            className="w-full h-auto block object-cover"
          />
        </div>

        {/* Bottom Home Indicator Bar */}
        <div aria-hidden="true" className="bg-white py-2 flex justify-center">
          <span className="w-24 h-1 rounded-full bg-black/20" />
        </div>
      </div>
    </div>
  );
};
