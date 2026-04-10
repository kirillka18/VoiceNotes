export const colors = {
  // Тёплый тёмный фон (не чёрный, а кофейный)
  background: '#110E0B',
  backgroundSecondary: '#1A1612',
  card: '#211C17',
  cardElevated: '#2B2420',

  // Мягкий терракотово-оранжевый (не кислотный)
  primary: '#C97B45',
  primaryLight: '#D9965E',
  primaryDark: '#A5622F',
  primaryGlow: 'rgba(201, 123, 69, 0.18)',
  accent: '#B8906A',
  accentDark: '#9A7355',

  // Запись — тихий красно-оранжевый
  recording: '#B84A32',
  recordingGlow: 'rgba(184, 74, 50, 0.25)',
  recordingDark: '#963D28',

  // Текст — кремово-бежевый, глаза не режет
  textPrimary: '#F0E8DF',       // тёплый кремовый
  textSecondary: '#C4B09A',     // тёплый бежевый
  textMuted: '#7A6755',         // кофейно-серый
  textDisabled: '#3D3228',      // совсем приглушённый

  // Границы и разделители
  border: '#2E2520',
  borderLight: '#3D3028',
  divider: '#1C1713',

  // Статусы
  success: '#5A9E4E',
  successBg: 'rgba(90, 158, 78, 0.13)',
  error: '#C05050',
  errorBg: 'rgba(192, 80, 80, 0.13)',

  // Оверлей
  overlay: 'rgba(0, 0, 0, 0.65)',
  shadow: 'rgba(201, 123, 69, 0.12)',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
};

export const typography = {
  h1: { fontSize: 28, fontWeight: '700' as const, letterSpacing: -0.5 },
  h2: { fontSize: 22, fontWeight: '700' as const, letterSpacing: -0.3 },
  h3: { fontSize: 18, fontWeight: '600' as const },
  body: { fontSize: 15, fontWeight: '400' as const, lineHeight: 22 },
  bodySmall: { fontSize: 13, fontWeight: '400' as const, lineHeight: 19 },
  caption: { fontSize: 11, fontWeight: '500' as const, letterSpacing: 0.5 },
  mono: { fontSize: 14, fontWeight: '400' as const, lineHeight: 21 },
};

export const shadows = {
  glow: {
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.45,
    shadowRadius: 18,
    elevation: 8,
  },
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 4,
  },
};
