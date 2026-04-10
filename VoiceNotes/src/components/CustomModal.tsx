import React, { useEffect } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { colors, radius, spacing, typography } from '../theme';

export interface ModalButton {
  label: string;
  onPress: () => void;
  style?: 'default' | 'destructive' | 'cancel';
}

interface CustomModalProps {
  visible: boolean;
  title: string;
  message?: string;
  buttons: ModalButton[];
  onClose?: () => void;
}

export default function CustomModal({
  visible,
  title,
  message,
  buttons,
  onClose,
}: CustomModalProps) {
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.88);

  useEffect(() => {
    if (visible) {
      opacity.value = withTiming(1, { duration: 180 });
      scale.value = withTiming(1, { duration: 200 });
    } else {
      opacity.value = withTiming(0, { duration: 140 });
      scale.value = withTiming(0.88, { duration: 150 });
    }
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps

  const overlayStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));
  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Modal visible={visible} transparent statusBarTranslucent animationType="none">
      <Pressable style={styles.overlay} onPress={onClose}>
        <Animated.View style={[StyleSheet.absoluteFill, styles.overlayBg, overlayStyle]} />
        <Pressable onPress={() => {}} style={styles.hitSlop}>
          <Animated.View style={[styles.card, cardStyle]}>
            {/* Title */}
            <View style={styles.titleRow}>
              <View style={styles.titleAccent} />
              <Text style={styles.title}>{title}</Text>
            </View>

            {/* Message */}
            {message ? <Text style={styles.message}>{message}</Text> : null}

            {/* Divider */}
            <View style={styles.divider} />

            {/* Buttons */}
            <View style={styles.buttons}>
              {buttons.map((btn, i) => (
                <Pressable
                  key={i}
                  style={({ pressed }) => [
                    styles.button,
                    btn.style === 'destructive' && styles.buttonDestructive,
                    btn.style === 'cancel' && styles.buttonCancel,
                    pressed && styles.buttonPressed,
                  ]}
                  onPress={() => {
                    onClose?.();
                    btn.onPress();
                  }}
                  android_ripple={{ color: colors.primaryGlow }}
                >
                  <Text
                    style={[
                      styles.buttonText,
                      btn.style === 'destructive' && styles.buttonTextDestructive,
                      btn.style === 'cancel' && styles.buttonTextCancel,
                    ]}
                  >
                    {btn.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </Animated.View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  overlayBg: {
    backgroundColor: colors.overlay,
  },
  hitSlop: {
    width: '100%',
  },
  card: {
    backgroundColor: colors.cardElevated,
    borderRadius: radius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    paddingBottom: spacing.sm,
  },
  titleAccent: {
    width: 3,
    height: 18,
    borderRadius: 2,
    backgroundColor: colors.primary,
  },
  title: {
    ...typography.h3,
    color: colors.textPrimary,
    flex: 1,
  },
  message: {
    ...typography.body,
    color: colors.textSecondary,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    lineHeight: 21,
  },
  divider: {
    height: 1,
    backgroundColor: colors.divider,
  },
  buttons: {
    flexDirection: 'column',
  },
  button: {
    paddingVertical: 15,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
    alignItems: 'center',
  },
  buttonDestructive: {},
  buttonCancel: {},
  buttonPressed: {
    backgroundColor: colors.card,
  },
  buttonText: {
    ...typography.body,
    color: colors.primary,
    fontWeight: '600',
  },
  buttonTextDestructive: {
    color: colors.error,
  },
  buttonTextCancel: {
    color: colors.textMuted,
    fontWeight: '400',
  },
});
