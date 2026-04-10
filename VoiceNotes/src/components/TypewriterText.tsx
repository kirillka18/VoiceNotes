import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, TextStyle, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { colors } from '../theme';

interface TypewriterTextProps {
  text: string;
  isStreaming?: boolean;
  style?: TextStyle;
  showCursor?: boolean;
}

export default function TypewriterText({
  text,
  isStreaming = false,
  style,
  showCursor = true,
}: TypewriterTextProps) {
  const [displayed, setDisplayed] = useState('');
  const targetRef = useRef('');
  const posRef = useRef(0);
  const animFrameRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cursorOpacity = useSharedValue(1);

  // Cursor blink animation
  useEffect(() => {
    if (isStreaming) {
      cursorOpacity.value = 1;
    } else {
      cursorOpacity.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 400 }),
          withTiming(0, { duration: 400 }),
        ),
        -1,
        false,
      );
    }
  }, [isStreaming]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!text) {
      setDisplayed('');
      targetRef.current = '';
      posRef.current = 0;
      return;
    }

    // If new text is longer (streaming chunks arriving), animate the new chars
    if (text.startsWith(targetRef.current)) {
      const newPart = text.slice(targetRef.current.length);
      targetRef.current = text;

      if (newPart.length === 0) return;

      // Animate new characters one by one
      const animateChars = (chars: string, index: number) => {
        if (index >= chars.length) return;
        setDisplayed(text.slice(0, text.length - chars.length + index + 1));
        animFrameRef.current = setTimeout(() => animateChars(chars, index + 1), 18);
      };

      if (animFrameRef.current) clearTimeout(animFrameRef.current);
      animateChars(newPart, 0);
    } else {
      // Text changed completely (e.g. new session)
      if (animFrameRef.current) clearTimeout(animFrameRef.current);
      targetRef.current = text;
      posRef.current = 0;
      setDisplayed('');

      const animateAll = (index: number) => {
        if (index >= text.length) return;
        setDisplayed(text.slice(0, index + 1));
        animFrameRef.current = setTimeout(() => animateAll(index + 1), 12);
      };
      animateAll(0);
    }

    return () => {
      if (animFrameRef.current) clearTimeout(animFrameRef.current);
    };
  }, [text]);

  const cursorStyle = useAnimatedStyle(() => ({
    opacity: cursorOpacity.value,
  }));

  const hasText = displayed.length > 0;

  return (
    <View style={styles.container}>
      <Text style={[styles.text, style]}>
        {displayed}
        {showCursor && (isStreaming || hasText) && (
          <Animated.Text style={[styles.cursor, cursorStyle]}>▋</Animated.Text>
        )}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  text: {
    color: colors.textPrimary,
    fontSize: 14,
    lineHeight: 22,
    fontWeight: '400',
  },
  cursor: {
    color: colors.primary,
    fontSize: 14,
  },
});
