import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from 'expo-speech-recognition';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '../context/AppContext';
import RecordButton from '../components/RecordButton';
import TypewriterText from '../components/TypewriterText';
import CustomModal, { ModalButton } from '../components/CustomModal';
import { colors, radius, spacing, typography } from '../theme';


export default function HomeScreen() {
  const {
    settings,
    updateSettings,
    recordingState,
    sessionDuration,
    liveTranscript,
    streamingSummary,
    isSummaryStreaming,
    summaryError,
    onTranscriptChunk,
    triggerSummary,
    startSession,
    stopSession,
    saveCurrentSession,
    discardSession,
  } = useApp();

  const isRecording = recordingState === 'recording';
  const isSummarizing = recordingState === 'summarizing';
  const isIdle = recordingState === 'idle';

  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [modal, setModal] = useState<{ visible: boolean; title: string; message?: string; buttons: ModalButton[] }>({
    visible: false, title: '', buttons: [],
  });
  const showModal = useCallback((title: string, message: string, buttons: ModalButton[]) => {
    setModal({ visible: true, title, message, buttons });
  }, []);
  const closeModal = useCallback(() => setModal((m) => ({ ...m, visible: false })), []);

  const transcriptScrollRef = useRef<ScrollView>(null);
  const summaryScrollRef = useRef<ScrollView>(null);
  const isRecordingRef = useRef(false);
  useEffect(() => { isRecordingRef.current = isRecording; }, [isRecording]);

  // ─── Speech recognition events ────────────────────────────────────────────

  useSpeechRecognitionEvent('start', () => {});

  useSpeechRecognitionEvent('end', () => {
    if (isRecordingRef.current) {
      setTimeout(() => {
        if (isRecordingRef.current) {
          ExpoSpeechRecognitionModule.start({
            lang: settings.recognitionLanguage,
            interimResults: true,
            continuous: true,
            androidAudioSource: settings.androidAudioSource,
            androidIntentOptions: { EXTRA_LANGUAGE_MODEL: 'free_form' } as never,
          });
        }
      }, 300);
    }
  });

  useSpeechRecognitionEvent('result', (event) => {
    const transcript = event.results[0]?.transcript ?? '';
    onTranscriptChunk(transcript, event.isFinal ?? false);
  });

  useSpeechRecognitionEvent('error', (event) => {
    if (isRecording) {
      const ignoredErrors = ['no-speech', 'aborted', 'not-allowed'];
      if (!ignoredErrors.includes(event.error ?? '')) {
        console.warn('Speech recognition error:', event.error, event.message);
      }
    }
  });

  // ─── Permissions ──────────────────────────────────────────────────────────

  useEffect(() => {
    ExpoSpeechRecognitionModule.getPermissionsAsync().then((status) => {
      setHasPermission(status.granted);
    });
  }, []);

  const requestPermissions = useCallback(async () => {
    const result = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    setHasPermission(result.granted);
    if (!result.granted) {
      showModal(
        'Нет доступа к микрофону',
        'Пожалуйста, разрешите доступ к микрофону и распознаванию речи в настройках устройства.',
        [{ label: 'OK', style: 'default', onPress: () => {} }],
      );
    }
    return result.granted;
  }, [showModal]);

  // ─── Auto-scroll ──────────────────────────────────────────────────────────

  useEffect(() => {
    if (liveTranscript && transcriptScrollRef.current) {
      transcriptScrollRef.current.scrollToEnd({ animated: true });
    }
  }, [liveTranscript]);

  useEffect(() => {
    if (streamingSummary && summaryScrollRef.current) {
      summaryScrollRef.current.scrollToEnd({ animated: true });
    }
  }, [streamingSummary]);

  // ─── Record button handler ─────────────────────────────────────────────────

  const handleRecordPress = useCallback(async () => {
    if (isSummarizing) return;

    if (isIdle) {
      let granted = hasPermission;
      if (!granted) {
        granted = await requestPermissions();
      }
      if (!granted) return;

      if (!settings.deepseekApiKey.trim()) {
        showModal(
          'API ключ не настроен',
          'Для AI-заметок введите ключ DeepSeek в разделе «Настройки».\n\nЗапись будет вестись, но анализ не выполнится.',
          [{ label: 'Понятно', style: 'default', onPress: () => {} }],
        );
      }

      startSession();
      ExpoSpeechRecognitionModule.start({
        lang: settings.recognitionLanguage,
        interimResults: true,
        continuous: true,
        androidAudioSource: settings.androidAudioSource,
        androidIntentOptions: { EXTRA_LANGUAGE_MODEL: 'free_form' } as never,
      });
    } else if (isRecording) {
      ExpoSpeechRecognitionModule.stop();
      stopSession();
      triggerSummary();
    }
  }, [
    isIdle,
    isRecording,
    isSummarizing,
    hasPermission,
    settings,
    requestPermissions,
    startSession,
    stopSession,
    triggerSummary,
  ]);

  // ─── Save / Discard ───────────────────────────────────────────────────────

  const handleSave = useCallback(async () => {
    if (isSummaryStreaming) {
      showModal('Подождите', 'AI ещё обрабатывает текст. Сохранение будет доступно через несколько секунд.', [
        { label: 'OK', style: 'default', onPress: () => {} },
      ]);
      return;
    }
    await saveCurrentSession();
  }, [isSummaryStreaming, saveCurrentSession, showModal]);

  const handleDiscard = useCallback(() => {
    showModal('Отменить запись?', 'Все данные этой сессии будут удалены.', [
      { label: 'Да, отменить', style: 'destructive', onPress: discardSession },
      { label: 'Нет', style: 'cancel', onPress: () => {} },
    ]);
  }, [discardSession, showModal]);

  // ─── Helpers ──────────────────────────────────────────────────────────────

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  };

  const langLabel = settings.recognitionLanguage.split('-')[0].toUpperCase();

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />
      <CustomModal
        visible={modal.visible}
        title={modal.title}
        message={modal.message}
        buttons={modal.buttons}
        onClose={closeModal}
      />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.logoMark}>
            <Text style={styles.logoText}>VN</Text>
          </View>
          <View>
            <Text style={styles.headerTitle}>VoiceNotes</Text>
            <Text style={styles.headerSubtitle}>транскрибация</Text>
          </View>
        </View>
        <View style={styles.headerBadge}>
          <View style={styles.langDot} />
          <Text style={styles.headerBadgeText}>{langLabel}</Text>
        </View>
      </View>

      {/* Main content */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Live transcript card */}
        {(isRecording || liveTranscript.length > 0) && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.liveIndicator}>
                {isRecording && <View style={styles.liveDot} />}
                <Text style={styles.cardLabel}>
                  {isRecording ? 'ЖИВАЯ ЗАПИСЬ' : 'РАСШИФРОВКА'}
                </Text>
              </View>
              {isRecording && (
                <View style={styles.timerChip}>
                  <Text style={styles.timer}>{formatTime(sessionDuration)}</Text>
                </View>
              )}
            </View>
            <View style={styles.cardDivider} />
            <ScrollView
              ref={transcriptScrollRef}
              style={styles.transcriptScroll}
              nestedScrollEnabled
            >
              <Text style={styles.transcriptText}>
                {liveTranscript || 'Говорите...'}
              </Text>
            </ScrollView>
          </View>
        )}

        {/* AI summary card */}
        {(streamingSummary.length > 0 || isSummaryStreaming || summaryError) && (
          <View style={[styles.card, styles.summaryCard]}>
            <View style={styles.cardHeader}>
              <View style={styles.aiLabelRow}>
                <View style={styles.aiDot} />
                <Text style={[styles.cardLabel, styles.cardLabelAi]}>AI ЗАМЕТКИ</Text>
              </View>
              <View style={styles.cardHeaderRight}>
                {isSummaryStreaming ? (
                  <View style={styles.streamingBadge}>
                    <Text style={styles.streamingText}>● обработка</Text>
                  </View>
                ) : (
                  liveTranscript.length > 0 && !isRecording && (
                    <Pressable
                      style={styles.retryBtn}
                      onPress={triggerSummary}
                      android_ripple={{ color: colors.primaryGlow, borderless: true }}
                    >
                      <Text style={styles.retryBtnText}>↻ Повторить</Text>
                    </Pressable>
                  )
                )}
              </View>
            </View>
            <View style={styles.cardDivider} />

            {summaryError ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>⚠ {summaryError}</Text>
                {liveTranscript.length > 0 && (
                  <Pressable style={styles.retryAfterError} onPress={triggerSummary}>
                    <Text style={styles.retryBtnText}>↻ Попробовать снова</Text>
                  </Pressable>
                )}
              </View>
            ) : (
              <ScrollView
                ref={summaryScrollRef}
                style={styles.summaryScroll}
                nestedScrollEnabled
              >
                <TypewriterText
                  text={streamingSummary}
                  isStreaming={isSummaryStreaming}
                  style={styles.summaryTextStyle}
                  showCursor={isSummaryStreaming || isSummarizing}
                />
              </ScrollView>
            )}
          </View>
        )}

        {/* Idle placeholder */}
        {isIdle && liveTranscript.length === 0 && streamingSummary.length === 0 && (
          <View style={styles.placeholder}>
            <View style={styles.placeholderIcon}>
              <Text style={styles.placeholderIconText}>◎</Text>
            </View>
            <Text style={styles.placeholderTitle}>Готов к записи</Text>
            <Text style={styles.placeholderText}>
              Нажмите кнопку ниже, чтобы начать.{'\n'}
              AI автоматически создаст структурированные заметки.
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Bottom controls */}
      <View style={styles.bottomBar}>
        {(isSummarizing && !isSummaryStreaming) || (isSummarizing && streamingSummary.length > 0) ? (
          <View style={styles.sessionActions}>
            <Pressable style={styles.discardBtn} onPress={handleDiscard}>
              <Text style={styles.discardBtnText}>Отменить</Text>
            </Pressable>
            <Pressable
              style={[styles.saveBtn, isSummaryStreaming && styles.saveBtnDisabled]}
              onPress={handleSave}
            >
              <Text style={styles.saveBtnText}>
                {isSummaryStreaming ? 'Обрабатывается...' : '↓ Сохранить заметку'}
              </Text>
            </Pressable>
          </View>
        ) : (
          <RecordButton
            isRecording={isRecording}
            isSummarizing={isSummarizing && isSummaryStreaming}
            onPress={handleRecordPress}
            disabled={isSummarizing && isSummaryStreaming}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  logoMark: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    backgroundColor: colors.primaryGlow,
    borderWidth: 1,
    borderColor: 'rgba(0, 229, 160, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: 1,
  },
  headerTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    fontSize: 16,
  },
  headerSubtitle: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 1,
  },
  headerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.card,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  langDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary,
  },
  headerBadgeText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '700',
    fontSize: 11,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
    gap: spacing.md,
    paddingBottom: spacing.xl,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  summaryCard: {
    borderColor: 'rgba(0, 229, 160, 0.25)',
    borderWidth: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardLabel: {
    ...typography.caption,
    color: colors.textMuted,
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  cardLabelAi: {
    color: colors.primary,
  },
  aiLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  aiDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary,
  },
  cardDivider: {
    height: 1,
    backgroundColor: colors.divider,
    marginHorizontal: -spacing.md,
    marginVertical: 2,
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.recording,
  },
  timerChip: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: colors.border,
  },
  timer: {
    ...typography.mono,
    color: colors.textMuted,
    fontSize: 12,
  },
  transcriptScroll: {
    maxHeight: 160,
  },
  transcriptText: {
    ...typography.body,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  summaryScroll: {
    maxHeight: 260,
  },
  summaryTextStyle: {
    fontSize: 14,
    lineHeight: 23,
    color: colors.textPrimary,
  },
  cardHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  streamingBadge: {
    backgroundColor: colors.primaryGlow,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: 'rgba(0, 229, 160, 0.2)',
  },
  streamingText: {
    ...typography.caption,
    color: colors.primary,
    fontSize: 10,
  },
  retryBtn: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  retryBtnText: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '600',
  },
  retryAfterError: {
    marginTop: spacing.xs,
    paddingVertical: 6,
    alignItems: 'center',
  },
  errorBox: {
    backgroundColor: colors.errorBg,
    borderRadius: radius.sm,
    padding: spacing.sm,
  },
  errorText: {
    ...typography.bodySmall,
    color: colors.error,
  },
  placeholder: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
    gap: spacing.md,
  },
  placeholderIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderIconText: {
    fontSize: 28,
    color: colors.textMuted,
    opacity: 0.5,
  },
  placeholderTitle: {
    ...typography.h3,
    color: colors.textSecondary,
  },
  placeholderText: {
    ...typography.bodySmall,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
  bottomBar: {
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xl,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  sessionActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    width: '100%',
  },
  discardBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: radius.lg,
    alignItems: 'center',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  discardBtnText: {
    ...typography.body,
    color: colors.textMuted,
    fontWeight: '600',
  },
  saveBtn: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: radius.lg,
    alignItems: 'center',
    backgroundColor: colors.primary,
  },
  saveBtnDisabled: {
    backgroundColor: colors.primaryDark,
    opacity: 0.6,
  },
  saveBtnText: {
    ...typography.body,
    color: colors.background,
    fontWeight: '700',
  },
});
