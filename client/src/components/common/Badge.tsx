import React from 'react';
import { BADGE_STYLES, BadgeVariant } from '../../theme/tokens';

export interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  size?: 'sm' | 'md';
  className?: string;
  dot?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'neutral',
  size = 'md',
  className = '',
  dot = false
}) => {
  const styles = BADGE_STYLES[variant];
  const sizeClass = size === 'sm' ? 'text-[11px] px-2.5 py-0.5' : 'text-xs px-3 py-1';

  return (
    <span
      className={`inline-flex items-center font-medium border rounded-full tracking-wide ${styles.bg} ${styles.text} ${styles.border} ${sizeClass} ${className}`}
    >
      {dot && (
        <span
          className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
            variant === 'wine'
              ? 'bg-[#6E1C30]'
              : variant === 'gold'
              ? 'bg-[#8A6D3B]'
              : variant === 'success'
              ? 'bg-[#2D633C]'
              : variant === 'danger'
              ? 'bg-[#9C2B2B]'
              : variant === 'warning'
              ? 'bg-[#965522]'
              : 'bg-stone-400'
          }`}
        />
      )}
      {children}
    </span>
  );
};
