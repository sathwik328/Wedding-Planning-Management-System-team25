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
  const sizeClass = size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-xs px-2.5 py-1';

  return (
    <span
      className={`inline-flex items-center font-medium border rounded-full ${styles.bg} ${styles.text} ${styles.border} ${sizeClass} ${className}`}
    >
      {dot && (
        <span
          className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
            variant === 'wine'
              ? 'bg-[#5B1424]'
              : variant === 'gold'
              ? 'bg-[#C5A059]'
              : variant === 'success'
              ? 'bg-emerald-600'
              : variant === 'danger'
              ? 'bg-rose-600'
              : variant === 'warning'
              ? 'bg-amber-600'
              : 'bg-stone-500'
          }`}
        />
      )}
      {children}
    </span>
  );
};
