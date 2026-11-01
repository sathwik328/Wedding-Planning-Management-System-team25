export const ROYAL_COLORS = {
  ivory: '#FAF7F4',
  alabaster: '#F5EFEB',
  wine: '#3D1420',
  wineDark: '#2B0D16',
  wineLight: '#FDF2F4',
  gold: '#BFA064',
  goldLight: '#F7EEDC',
  goldDark: '#8A6D3B',
  charcoal: '#24201D',
  slate: '#4A443E',
  muted: '#78716A',
  border: '#EDE6DF',
  borderDark: '#D8CFCE',
  success: '#2D633C',
  successLight: '#F0F6F2',
  warning: '#965522',
  warningLight: '#FEF6EC',
  danger: '#9C2B2B',
  dangerLight: '#FDF1F1',
  info: '#246287',
  infoLight: '#F1F6FA'
} as const;

export type BadgeVariant = 'wine' | 'gold' | 'success' | 'warning' | 'danger' | 'info' | 'neutral';

export const BADGE_STYLES: Record<BadgeVariant, { bg: string; text: string; border: string }> = {
  wine: {
    bg: 'bg-[#FDF2F4]',
    text: 'text-[#6E1C30]',
    border: 'border-[#F8D2DA]'
  },
  gold: {
    bg: 'bg-[#FAF5EB]',
    text: 'text-[#8A6D3B]',
    border: 'border-[#F0E2C8]'
  },
  success: {
    bg: 'bg-[#F0F6F2]',
    text: 'text-[#2D633C]',
    border: 'border-[#D4E6D8]'
  },
  warning: {
    bg: 'bg-[#FEF6EC]',
    text: 'text-[#965522]',
    border: 'border-[#F7DECA]'
  },
  danger: {
    bg: 'bg-[#FDF1F1]',
    text: 'text-[#9C2B2B]',
    border: 'border-[#F8D5D5]'
  },
  info: {
    bg: 'bg-[#F1F6FA]',
    text: 'text-[#246287]',
    border: 'border-[#D4E5F2]'
  },
  neutral: {
    bg: 'bg-[#F6F3EF]',
    text: 'text-[#5A544C]',
    border: 'border-[#E8E2D9]'
  }
};
