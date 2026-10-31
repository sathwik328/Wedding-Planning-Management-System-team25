export const ROYAL_COLORS = {
  ivory: '#FDFBF7',
  alabaster: '#F7F4EE',
  wine: '#5B1424',
  wineDark: '#430C18',
  wineLight: '#F5EBE6',
  gold: '#C5A059',
  goldLight: '#E8D8B0',
  goldDark: '#8C6F31',
  charcoal: '#1E2229',
  slate: '#4A5568',
  muted: '#718096',
  border: '#E7E2D8',
  borderDark: '#D4CBBF',
  success: '#2E7D32',
  successLight: '#E8F5E9',
  warning: '#ED6C02',
  warningLight: '#FFF3E0',
  danger: '#C62828',
  dangerLight: '#FFEBEE',
  info: '#0288D1',
  infoLight: '#E1F5FE'
} as const;

export type BadgeVariant = 'wine' | 'gold' | 'success' | 'warning' | 'danger' | 'info' | 'neutral';

export const BADGE_STYLES: Record<BadgeVariant, { bg: string; text: string; border: string }> = {
  wine: {
    bg: 'bg-red-50',
    text: 'text-[#5B1424]',
    border: 'border-[#5B1424]/30'
  },
  gold: {
    bg: 'bg-amber-50',
    text: 'text-[#8C6F31]',
    border: 'border-[#C5A059]/40'
  },
  success: {
    bg: 'bg-emerald-50',
    text: 'text-emerald-800',
    border: 'border-emerald-300'
  },
  warning: {
    bg: 'bg-amber-50',
    text: 'text-amber-800',
    border: 'border-amber-300'
  },
  danger: {
    bg: 'bg-rose-50',
    text: 'text-rose-800',
    border: 'border-rose-300'
  },
  info: {
    bg: 'bg-sky-50',
    text: 'text-sky-800',
    border: 'border-sky-300'
  },
  neutral: {
    bg: 'bg-stone-100',
    text: 'text-stone-700',
    border: 'border-stone-300'
  }
};
