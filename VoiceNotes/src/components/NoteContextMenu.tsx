import React, { useEffect, useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  ToastAndroid,
  View,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import * as Clipboard from 'expo-clipboard';
import { cacheDirectory, writeAsStringAsync, EncodingType } from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Note, formatDate, formatDuration } from '../services/storageService';
import { colors, radius, spacing, typography } from '../theme';
import CustomModal from './CustomModal';

interface NoteContextMenuProps {
  note: Note | null;
  visible: boolean;
  onClose: () => void;
  onDelete: (id: string) => void;
}

interface MenuItem {
  icon: string;
  label: string;
  sublabel?: string;
  onPress: () => void;
  destructive?: boolean;
}

export default function NoteContextMenu({
  note,
  visible,
  onClose,
  onDelete,
}: NoteContextMenuProps) {
  const translateY = useSharedValue(300);
  const overlayOpacity = useSharedValue(0);
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);

  useEffect(() => {
    if (visible) {
      overlayOpacity.value = withTiming(1, { duration: 200 });
      translateY.value = withTiming(0, { duration: 280, easing: Easing.out(Easing.back(1.05)) });
    } else {
      overlayOpacity.value = withTiming(0, { duration: 180 });
      translateY.value = withTiming(320, { duration: 220, easing: Easing.in(Easing.ease) });
    }
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps

  const overlayStyle = useAnimatedStyle(() => ({ opacity: overlayOpacity.value }));
  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  if (!note) return null;

  const toast = (msg: string) => ToastAndroid.show(msg, ToastAndroid.SHORT);

  const handleCopySummary = async () => {
    onClose();
    await Clipboard.setStringAsync(note.summary);
    toast('AI заметки скопированы');
  };

  const handleCopyTranscript = async () => {
    onClose();
    if (!note.transcript) {
      toast('Расшифровка не сохранена для этой заметки');
      return;
    }
    await Clipboard.setStringAsync(note.transcript);
    toast('Расшифровка скопирована');
  };

  const handleSaveToFile = async () => {
    onClose();
    try {
      const date = formatDate(note.createdAt);
      const duration = formatDuration(note.duration);
      const content = [
        `VoiceNotes — Заметка`,
        `═══════════════════════════════`,
        `Дата: ${date}`,
        `Длительность: ${duration}`,
        `Слов: ${note.wordCount}`,
        ``,
        `AI ЗАМЕТКИ`,
        `───────────────────────────────`,
        note.summary,
        ``,
        ...(note.transcript
          ? [
              `ПОЛНАЯ РАСШИФРОВКА`,
              `───────────────────────────────`,
              note.transcript,
            ]
          : []),
      ].join('\n');

      const safeTitle = note.title
        .replace(/[^a-zA-Zа-яА-Я0-9 ]/g, '')
        .trim()
        .slice(0, 30)
        .replace(/\s+/g, '_');
      const fileName = `VN_${safeTitle}_${Date.now()}.txt`;
      const fileUri = `${cacheDirectory}${fileName}`;

      await writeAsStringAsync(fileUri, content, {
        encoding: EncodingType.UTF8,
      });

      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'text/plain',
          dialogTitle: 'Сохранить заметку',
        });
      } else {
        toast('Функция сохранения недоступна на этом устройстве');
      }
    } catch (e) {
      toast('Ошибка при сохранении файла');
    }
  };

  const handleDeletePress = () => {
    onClose();
    setTimeout(() => setDeleteConfirmVisible(true), 250);
  };

  const menuItems: MenuItem[] = [
    {
      icon: '✦',
      label: 'Скопировать AI заметки',
      sublabel: 'Суммаризация в буфер обмена',
      onPress: handleCopySummary,
    },
    {
      icon: '📄',
      label: 'Скопировать расшифровку',
      sublabel: 'Полный оригинальный текст',
      onPress: handleCopyTranscript,
    },
    {
      icon: '💾',
      label: 'Сохранить в файл .txt',
      sublabel: 'Экспорт через «Поделиться»',
      onPress: handleSaveToFile,
    },
    {
      icon: '🗑',
      label: 'Удалить заметку',
      onPress: handleDeletePress,
      destructive: true,
    },
  ];

  return (
    <>
      <Modal visible={visible} transparent statusBarTranslucent animationType="none">
        <Pressable style={styles.overlay} onPress={onClose}>
          <Animated.View style={[StyleSheet.absoluteFill, styles.overlayBg, overlayStyle]} />
        </Pressable>

        <Animated.View style={[styles.sheet, sheetStyle]} pointerEvents="box-none">
          {/* Handle */}
          <View style={styles.handle} />

          {/* Note info */}
          <View style={styles.noteInfo}>
            <View style={styles.noteInfoDot} />
            <View style={styles.noteInfoText}>
              <Text style={styles.noteTitle} numberOfLines={1}>{note.title}</Text>
              <Text style={styles.noteMeta}>
                {formatDate(note.createdAt)} · {formatDuration(note.duration)}
              </Text>
            </View>
          </View>

          <View style={styles.menuDivider} />

          {/* Menu items */}
          {menuItems.map((item, i) => (
            <Pressable
              key={i}
              style={({ pressed }) => [
                styles.menuItem,
                item.destructive && styles.menuItemDestructive,
                pressed && styles.menuItemPressed,
              ]}
              onPress={item.onPress}
              android_ripple={{ color: item.destructive ? colors.errorBg : colors.primaryGlow }}
            >
              <Text style={[styles.menuIcon, item.destructive && styles.menuIconDestructive]}>
                {item.icon}
              </Text>
              <View style={styles.menuItemText}>
                <Text style={[styles.menuLabel, item.destructive && styles.menuLabelDestructive]}>
                  {item.label}
                </Text>
                {item.sublabel && (
                  <Text style={styles.menuSublabel}>{item.sublabel}</Text>
                )}
              </View>
            </Pressable>
          ))}

          <View style={styles.bottomPad} />
        </Animated.View>
      </Modal>

      {/* Delete confirmation — custom modal */}
      <CustomModal
        visible={deleteConfirmVisible}
        title="Удалить заметку?"
        message={`«${note.title}» будет удалена безвозвратно.`}
        onClose={() => setDeleteConfirmVisible(false)}
        buttons={[
          {
            label: 'Удалить',
            style: 'destructive',
            onPress: () => {
              setDeleteConfirmVisible(false);
              onDelete(note.id);
            },
          },
          {
            label: 'Отмена',
            style: 'cancel',
            onPress: () => setDeleteConfirmVisible(false),
          },
        ]}
      />
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
  overlayBg: {
    backgroundColor: colors.overlay,
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.cardElevated,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderTopWidth: 1,
    borderColor: colors.borderLight,
    paddingTop: spacing.sm,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: 'center',
    marginBottom: spacing.sm,
  },
  noteInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  noteInfoDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
    flexShrink: 0,
  },
  noteInfoText: {
    flex: 1,
    gap: 2,
  },
  noteTitle: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  noteMeta: {
    ...typography.caption,
    color: colors.textMuted,
  },
  menuDivider: {
    height: 1,
    backgroundColor: colors.divider,
    marginHorizontal: spacing.md,
    marginBottom: spacing.xs,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
  },
  menuItemDestructive: {},
  menuItemPressed: {
    backgroundColor: colors.card,
  },
  menuIcon: {
    fontSize: 18,
    width: 26,
    textAlign: 'center',
  },
  menuIconDestructive: {},
  menuItemText: {
    flex: 1,
    gap: 2,
  },
  menuLabel: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  menuLabelDestructive: {
    color: colors.error,
  },
  menuSublabel: {
    ...typography.caption,
    color: colors.textMuted,
  },
  bottomPad: {
    height: spacing.xl,
  },
});
