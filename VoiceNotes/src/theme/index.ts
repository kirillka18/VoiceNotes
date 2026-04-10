export const colors = {
  // Deep dark navy-purple backgrounds
  background: '#0D1121',
  backgroundSecondary: '#131729',
  card: '#171D35',
  cardElevated: '#1C2340',

  // Teal / cyan-green accent
  primary: '#00E5A0',
  primaryLight: '#33EBB3',
  primaryDark: '#00B87A',
  primaryGlow: 'rgba(0, 229, 160, 0.13)',
  primaryGlowStrong: 'rgba(0, 229, 160, 0.22)',
  accent: '#00C48C',
  accentDark: '#008F65',

  // Recording — vivid red
  recording: '#FF4757',
  recordingGlow: 'rgba(255, 71, 87, 0.22)',
  recordingDark: '#CC3244',

  // Text — cool-toned whites and grays
  textPrimary: '#E8EDF8',
  textSecondary: '#8F9BBF',
  textMuted: '#4A5278',
  textDisabled: '#2A3058',

  // Borders and dividers
  border: '#1E2540',
  borderLight: '#262E4A',
  divider: '#131729',

  // Status
  success: '#00E5A0',
  successBg: 'rgba(0, 229, 160, 0.10)',
  error: '#FF4757',
  errorBg: 'rgba(255, 71, 87, 0.12)',

  // Overlay
  overlay: 'rgba(0, 0, 0, 0.75)',
  shadow: 'rgba(0, 229, 160, 0.10)',
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
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 5,
  },
};
