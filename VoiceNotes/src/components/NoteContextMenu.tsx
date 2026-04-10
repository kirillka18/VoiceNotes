import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import { cacheDirectory, writeAsStringAsync, EncodingType } from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Note, formatDate, formatDuration } from '../services/storageService';
import { translateText } from '../services/deepseekService';
import { useApp } from '../context/AppContext';
import { LANGUAGES } from '../constants/languages';
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
  const insets = useSafeAreaInsets();
  const { settings, updateNote } = useApp();
  const translateY = useSharedValue(300);
  const overlayOpacity = useSharedValue(0);

  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);
  const [langPickerVisible, setLangPickerVisible] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [translateError, setTranslateError] = useState<string | null>(null);

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

      await writeAsStringAsync(fileUri, content, { encoding: EncodingType.UTF8 });

      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'text/plain',
          dialogTitle: 'Сохранить заметку',
        });
      } else {
        toast('Функция сохранения недоступна на этом устройстве');
      }
    } catch {
      toast('Ошибка при сохранении файла');
    }
  };

  const handleTranslatePress = () => {
    onClose();
    setTimeout(() => setLangPickerVisible(true), 250);
  };

  const handleSelectLanguage = (lang: typeof LANGUAGES[0]) => {
    setLangPickerVisible(false);
    if (!settings.deepseekApiKey.trim()) {
      setTranslateError('API ключ не настроен. Перейдите в Настройки.');
      return;
    }
    setTranslating(true);
    setTranslateError(null);

    const partsToTranslate: Array<{ key: 'summary' | 'transcript'; text: string }> = [
      { key: 'summary', text: note.summary },
      ...(note.transcript ? [{ key: 'transcript' as const, text: note.transcript }] : []),
    ];

    let translatedSummary = note.summary;
    let translatedTranscript = note.transcript;
    let completed = 0;
    let failed = false;

    const finish = () => {
      if (failed) return;
      completed += 1;
      if (completed < partsToTranslate.length) return;

      // Re-derive title from translated summary
      const firstLine = translatedSummary.split('\n').find((l) => l.trim()) ?? translatedSummary;
      const newTitle = firstLine.replace(/^[•\-*]\s*/, '').slice(0, 48).trim() || note.title;

      const updatedNote: Note = {
        ...note,
        title: newTitle,
        summary: translatedSummary,
        transcript: translatedTranscript,
        language: lang.code,
      };

      updateNote(updatedNote)
        .then(() => {
          setTranslating(false);
          toast(`Заметка переведена на ${lang.nativeName}`);
        })
        .catch(() => {
          setTranslating(false);
          setTranslateError('Ошибка сохранения перевода.');
        });
    };

    partsToTranslate.forEach(({ key, text }) => {
      translateText({
        text,
        targetLang: lang.code,
        targetLangName: lang.name,
        apiKey: settings.deepseekApiKey,
        onDone: (translated) => {
          if (key === 'summary') translatedSummary = translated;
          if (key === 'transcript') translatedTranscript = translated;
          finish();
        },
        onError: (err) => {
          if (!failed) {
            failed = true;
            setTranslating(false);
            setTranslateError(err);
          }
        },
      });
    });
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
      icon: '≡',
      label: 'Скопировать расшифровку',
      sublabel: 'Полный оригинальный текст',
      onPress: handleCopyTranscript,
    },
    {
      icon: '◈',
      label: 'Перевести заметку',
      sublabel: 'Перевести AI заметки и расшифровку',
      onPress: handleTranslatePress,
    },
    {
      icon: '↑',
      label: 'Сохранить в файл .txt',
      sublabel: 'Экспорт через «Поделиться»',
      onPress: handleSaveToFile,
    },
    {
      icon: '✕',
      label: 'Удалить заметку',
      onPress: handleDeletePress,
      destructive: true,
    },
  ];

  return (
    <>
      {/* ── Main bottom sheet ── */}
      <Modal visible={visible} transparent statusBarTranslucent animationType="none">
        <Pressable style={styles.overlay} onPress={onClose}>
          <Animated.View style={[StyleSheet.absoluteFill, styles.overlayBg, overlayStyle]} />
        </Pressable>

        <Animated.View style={[styles.sheet, sheetStyle]} pointerEvents="box-none">
          <View style={styles.handle} />

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

          <View style={[styles.bottomPad, { height: spacing.xl + insets.bottom }]} />
        </Animated.View>
      </Modal>

      {/* ── Language picker ── */}
      <Modal visible={langPickerVisible} transparent statusBarTranslucent animationType="fade">
        <Pressable style={styles.pickerOverlay} onPress={() => setLangPickerVisible(false)}>
          <Pressable onPress={() => {}} style={styles.pickerCard}>
            <View style={styles.pickerHeader}>
              <View style={styles.pickerAccent} />
              <Text style={styles.pickerTitle}>Перевести на язык</Text>
            </View>
            <View style={styles.pickerDivider} />
            <ScrollView style={styles.pickerScroll} showsVerticalScrollIndicator={false}>
              {LANGUAGES.map((lang) => (
                <Pressable
                  key={lang.code}
                  style={({ pressed }) => [
                    styles.langItem,
                    pressed && styles.langItemPressed,
                  ]}
                  onPress={() => handleSelectLanguage(lang)}
                  android_ripple={{ color: colors.primaryGlow }}
                >
                  <Text style={styles.langFlag}>{lang.flag}</Text>
                  <View style={styles.langItemText}>
                    <Text style={styles.langName}>{lang.name}</Text>
                    <Text style={styles.langNative}>{lang.nativeName}</Text>
                  </View>
                  {note.language === lang.code && (
                    <View style={styles.currentLangDot} />
                  )}
                </Pressable>
              ))}
            </ScrollView>
            <View style={styles.pickerDivider} />
            <Pressable
              style={styles.pickerCancelBtn}
              onPress={() => setLangPickerVisible(false)}
            >
              <Text style={styles.pickerCancelText}>Отмена</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ── Translating indicator ── */}
      <Modal visible={translating} transparent statusBarTranslucent animationType="fade">
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingCard}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Переводим заметку...</Text>
            <Text style={styles.loadingSubtext}>Это может занять несколько секунд</Text>
          </View>
        </View>
      </Modal>

      {/* ── Translate error ── */}
      <CustomModal
        visible={!!translateError}
        title="Ошибка перевода"
        message={translateError ?? ''}
        onClose={() => setTranslateError(null)}
        buttons={[{ label: 'OK', style: 'default', onPress: () => setTranslateError(null) }]}
      />

      {/* ── Delete confirmation ── */}
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
  noteInfoText: { flex: 1, gap: 2 },
  noteTitle: { ...typography.body, color: colors.textPrimary, fontWeight: '600' },
  noteMeta: { ...typography.caption, color: colors.textMuted },
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
  menuItemPressed: { backgroundColor: colors.card },
  menuIcon: {
    fontSize: 17,
    width: 26,
    textAlign: 'center',
    color: colors.textSecondary,
  },
  menuIconDestructive: { color: colors.error },
  menuItemText: { flex: 1, gap: 2 },
  menuLabel: { ...typography.body, color: colors.textPrimary, fontWeight: '500' },
  menuLabelDestructive: { color: colors.error },
  menuSublabel: { ...typography.caption, color: colors.textMuted },
  bottomPad: { height: spacing.xl },

  // ── Language picker ──
  pickerOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  pickerCard: {
    backgroundColor: colors.cardElevated,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.borderLight,
    maxHeight: '80%',
    overflow: 'hidden',
  },
  pickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    paddingBottom: spacing.sm,
  },
  pickerAccent: {
    width: 3,
    height: 18,
    borderRadius: 2,
    backgroundColor: colors.primary,
  },
  pickerTitle: { ...typography.h3, color: colors.textPrimary },
  pickerDivider: { height: 1, backgroundColor: colors.divider },
  pickerScroll: { flexGrow: 0 },
  langItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 13,
  },
  langItemPressed: { backgroundColor: colors.card },
  langFlag: { fontSize: 22 },
  langItemText: { flex: 1, gap: 1 },
  langName: { ...typography.body, color: colors.textPrimary, fontWeight: '500' },
  langNative: { ...typography.caption, color: colors.textMuted },
  currentLangDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  pickerCancelBtn: {
    paddingVertical: 15,
    alignItems: 'center',
  },
  pickerCancelText: {
    ...typography.body,
    color: colors.textMuted,
    fontWeight: '500',
  },

  // ── Loading ──
  loadingOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  loadingCard: {
    backgroundColor: colors.cardElevated,
    borderRadius: radius.xl,
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    width: '100%',
  },
  loadingText: { ...typography.h3, color: colors.textPrimary, textAlign: 'center' },
  loadingSubtext: { ...typography.bodySmall, color: colors.textMuted, textAlign: 'center' },
});
