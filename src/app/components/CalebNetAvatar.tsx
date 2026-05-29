import React from 'react';

export interface AvatarOption {
  id: string;
  emoji: string;
  bg: string;
  border: string;
  label: string;
}

export const AVATAR_OPTIONS: AvatarOption[] = [
  { id: 'av1', emoji: '😊', bg: 'bg-[#7C3AED]/15', border: 'border-[#7C3AED]/30', label: 'Smile' },
  { id: 'av2', emoji: '😎', bg: 'bg-blue-500/15', border: 'border-blue-500/30', label: 'Cool' },
  { id: 'av3', emoji: '🤓', bg: 'bg-emerald-500/15', border: 'border-emerald-500/30', label: 'Nerd' },
  { id: 'av4', emoji: '😄', bg: 'bg-[#FCD34D]/15', border: 'border-[#FCD34D]/30', label: 'Grin' },
  { id: 'av5', emoji: '🎯', bg: 'bg-red-500/15', border: 'border-red-500/30', label: 'Focus' },
  { id: 'av6', emoji: '✨', bg: 'bg-amber-400/15', border: 'border-amber-400/30', label: 'Star' },
  { id: 'av7', emoji: '🔥', bg: 'bg-orange-500/15', border: 'border-orange-500/30', label: 'Fire' },
  { id: 'av8', emoji: '💎', bg: 'bg-teal-500/15', border: 'border-teal-500/30', label: 'Gem' },
];

export function getAvatarById(id?: string | null): AvatarOption {
  return AVATAR_OPTIONS.find((a) => a.id === id) || AVATAR_OPTIONS[0];
}

interface CalebNetAvatarProps {
  avatarId?: string | null;
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
  className?: string;
}

const sizeMap = {
  sm: 'w-9 h-9 text-lg',
  md: 'w-11 h-11 text-xl',
  lg: 'w-16 h-16 text-3xl',
};

export function CalebNetAvatar({ avatarId, size = 'md', onClick, className = '' }: CalebNetAvatarProps) {
  const avatar = getAvatarById(avatarId);

  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        ${sizeMap[size]}
        ${avatar.bg}
        rounded-full border-2 ${avatar.border}
        flex items-center justify-center
        transition-all duration-200
        hover:scale-110 hover:shadow-lg
        active:scale-95
        flex-shrink-0
        ${onClick ? 'cursor-pointer' : 'cursor-default'}
        ${className}
      `}
      aria-label="Profile avatar"
    >
      <span className="leading-none select-none">{avatar.emoji}</span>
    </button>
  );
}

interface AvatarPickerProps {
  selectedId?: string | null;
  onSelect: (id: string) => void;
}

export function AvatarPicker({ selectedId, onSelect }: AvatarPickerProps) {
  return (
    <div className="grid grid-cols-4 gap-3">
      {AVATAR_OPTIONS.map((option) => {
        const isSelected = option.id === (selectedId || 'av1');
        return (
          <button
            key={option.id}
            type="button"
            onClick={() => onSelect(option.id)}
            className={`
              flex flex-col items-center gap-1.5 rounded-2xl p-3 border-2 transition-all duration-200
              ${isSelected
                ? 'border-[#7C3AED] bg-[#7C3AED]/10 shadow-md scale-105'
                : 'border-border bg-card hover:border-[#7C3AED]/30 hover:bg-muted/50'
              }
            `}
          >
            <span className="text-2xl leading-none select-none">{option.emoji}</span>
            <span className={`text-[10px] font-bold uppercase tracking-widest ${isSelected ? 'text-[#7C3AED]' : 'text-muted-foreground'}`}>
              {option.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
