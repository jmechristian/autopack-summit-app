import { autopackColors } from '../theme';

export const ui = {
  colors: {
    bg: '#FFFFFF',
    surface: '#FFFFFF',
    border: '#E5E7EB',
    text: '#111827',
    muted: '#6B7280',
    subtle: '#F3F4F6',
    danger: '#DC2626',
    primary: autopackColors.apBlue,
    secondary: autopackColors.apYellow,
  },
  radius: {
    card: 14,
    input: 12,
    pill: 999,
  },
  space: {
    xs: 6,
    sm: 10,
    md: 12,
    lg: 16,
    xl: 24,
  },
  fonts: {
    oswald: 'Oswald-Regular',
    oswaldBold: 'Oswald-Bold',
    oswaldLight: 'Oswald-Light',
    oswaldMedium: 'Oswald-Medium',
    oswaldSemiBold: 'Oswald-SemiBold',
  },
  text: {
    h1: {
      fontSize: 22,
      fontWeight: '700' as const,
      color: '#111827',
      fontFamily: 'Oswald-Bold',
    },
    h2: {
      fontSize: 18,
      fontWeight: '700' as const,
      color: '#111827',
      fontFamily: 'Oswald-Bold',
    },
    body: { fontSize: 16, color: '#111827' },
    muted: { fontSize: 14, color: '#6B7280' },
    small: { fontSize: 12, color: '#6B7280' },
  },
};
