import React, { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { colors } from '../theme';

interface RecordButtonProps {
  isRecording: boolean;
  isSummarizing?: boolean;
  onPress: () => void;
  disabled?: boolean;
}

const BUTTON_SIZE = 80;
const RING_SIZE = BUTTON_SIZE + 28;
const OUTER_RING_SIZE = BUTTON_SIZE + 58;

export default function RecordButton({
  isRecording,
  isSummarizing = false,
  onPress,
  disabled = false,
}: RecordButtonProps) {
  const pulse1 = useSharedValue(0);
  const pulse2 = useSharedValue(0);
  const scale = useSharedValue(1);

  useEffect(() => {
    if (isRecording) {
      pulse1.value = 0;
      pulse2.value = 0;
      pulse1.value = withRepeat(
        withTiming(1, { duration: 1600, easing: Easing.out(Easing.ease) }),
        -1,
        false,
      );
      pulse2.value = withRepeat(
        withSequence(
          withTiming(0, { duration: 400 }),
          withTiming(1, { duration: 1600, easing: Easing.out(Easing.ease) }),
        ),
        -1,
        false,
      );
      scale.value = withRepeat(
        withSequence(
          withTiming(0.94, { duration: 700, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 700, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        true,
      );
    } else if (isSummarizing) {
      pulse1.value = withRepeat(
        withSequence(
          withTiming(0.5, { duration: 600 }),
          withTiming(0, { duration: 600 }),
        ),
        -1,
        true,
      );
      pulse2.value = 0;
      scale.value = withRepeat(
        withSequence(
          withTiming(0.96, { duration: 500 }),
          withTiming(1.04, { duration: 500 }),
        ),
        -1,
        true,
      );
    } else {
      pulse1.value = withTiming(0, { duration: 300 });
      pulse2.value = withTiming(0, { duration: 300 });
      scale.value = withTiming(1, { duration: 200 });
    }
  }, [isRecording, isSummarizing]); // eslint-disable-line react-hooks/exhaustive-deps

  const ring1Style = useAnimatedStyle(() => ({
    opacity: interpolate(pulse1.value, [0, 0.5, 1], [0.5, 0.2, 0]),
    transform: [{ scale: interpolate(pulse1.value, [0, 1], [1, 1.85]) }],
  }));

  const ring2Style = useAnimatedStyle(() => ({
    opacity: interpolate(pulse2.value, [0, 0.5, 1], [0.3, 0.15, 0]),
    transform: [{ scale: interpolate(pulse2.value, [0, 1], [1, 2.3]) }],
  }));

  const buttonScale = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const buttonBg = isRecording
    ? colors.recording
    : isSummarizing
      ? colors.primaryDark
      : colors.primary;

  const glowColor = isRecording ? colors.recordingGlow : colors.primaryGlow;

  return (
    <View style={styles.container}>
      {/* Button area: rings + button share the same center */}
      <View style={styles.buttonArea}>
        <Animated.View
          style={[
            styles.ring,
            {
              width: OUTER_RING_SIZE,
              height: OUTER_RING_SIZE,
              borderRadius: OUTER_RING_SIZE / 2,
              backgroundColor: glowColor,
            },
            ring2Style,
          ]}
        />
        <Animated.View
          style={[
            styles.ring,
            {
              width: RING_SIZE,
              height: RING_SIZE,
              borderRadius: RING_SIZE / 2,
              backgroundColor: glowColor,
            },
            ring1Style,
          ]}
        />

        <Animated.View style={buttonScale}>
          <Pressable
            style={[styles.button, { backgroundColor: buttonBg }]}
            onPress={onPress}
            disabled={disabled}
            android_ripple={{ color: 'rgba(255,255,255,0.2)', borderless: true, radius: BUTTON_SIZE / 2 }}
          >
            {isSummarizing ? (
              <Text style={styles.iconText}>◎</Text>
            ) : isRecording ? (
              <View style={styles.stopIcon} />
            ) : (
              <Text style={styles.iconText}>◉</Text>
            )}
          </Pressable>
        </Animated.View>
      </View>

      <Text style={[styles.label, { color: isRecording ? colors.recording : colors.textMuted }]}>
        {isSummarizing ? 'Обработка...' : isRecording ? 'Нажми чтобы остановить' : 'Нажми для записи'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: 16,
  },
  buttonArea: {
    width: OUTER_RING_SIZE,
    height: OUTER_RING_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
  },
  button: {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    borderRadius: BUTTON_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: {
    fontSize: 28,
    color: colors.background,
    fontWeight: '700',
  },
  stopIcon: {
    width: 26,
    height: 26,
    borderRadius: 6,
    backgroundColor: colors.background,
  },
  label: {
    fontSize: 12,
    fontWeight: '500',
    letterSpacing: 0.3,
    marginTop: 4,
  },
});
