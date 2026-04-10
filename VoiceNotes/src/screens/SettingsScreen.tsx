import React, { useEffect, useState } from 'react';
import {
  Linking,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '../context/AppContext';
import CustomModal from '../components/CustomModal';
import { colors, radius, spacing, typography } from '../theme';

// ─── Данные ──────────────────────────────────────────────────────────────────

const WORD_THRESHOLDS = [
  { value: 30,  label: '~30 слов (~15 сек)' },
  { value: 60,  label: '~60 слов (~30 сек)' },
  { value: 100, label: '~100 слов (~1 мин)' },
  { value: 200, label: '~200 слов (~2 мин)' },
  { value: 999, label: 'Только вручную' },
];

const LANGUAGES = [
  { code: 'ru-RU', flag: '🇷🇺', name: 'Русский' },
  { code: 'en-US', flag: '🇺🇸', name: 'English (US)' },
  { code: 'en-GB', flag: '🇬🇧', name: 'English (UK)' },
  { code: 'de-DE', flag: '🇩🇪', name: 'Deutsch' },
  { code: 'fr-FR', flag: '🇫🇷', name: 'Français' },
  { code: 'es-ES', flag: '🇪🇸', name: 'Español' },
  { code: 'zh-CN', flag: '🇨🇳', name: '中文 (普通话)' },
  { code: 'uk-UA', flag: '🇺🇦', name: 'Українська' },
];

const MIC_SOURCES = [
  {
    value: 6,
    label: 'Распознавание речи',
    desc: 'Рекомендуется. Оптимизирован для голоса, подавляет фоновый шум.',
    icon: '🎙',
  },
  {
    value: 7,
    label: 'Гарнитура / Наушники',
    desc: 'Используй когда подключены наушники с микрофоном (USB-C, 3.5 мм, Bluetooth).',
    icon: '🎧',
  },
  {
    value: 1,
    label: 'Встроенный микрофон',
    desc: 'Сырой сигнал без обработки. Подходит для тихих помещений.',
    icon: '📱',
  },
];

// ─── Компонент ────────────────────────────────────────────────────────────────

export default function SettingsScreen() {
  const { settings, updateSettings, notes, deleteAllNotes } = useApp();

  const [apiKeyVisible, setApiKeyVisible] = useState(false);
  const [apiKeyDraft, setApiKeyDraft] = useState(settings.deepseekApiKey);
  const [apiKeySaved, setApiKeySaved] = useState(true);
  const [clearModalVisible, setClearModalVisible] = useState(false);

  useEffect(() => {
    if (settings.deepseekApiKey && !apiKeyDraft) {
      setApiKeyDraft(settings.deepseekApiKey);
      setApiKeySaved(true);
    }
  }, [settings.deepseekApiKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleApiKeyChange = (text: string) => {
    setApiKeyDraft(text);
    setApiKeySaved(false);
  };

  const handleSaveApiKey = () => {
    updateSettings({ deepseekApiKey: apiKeyDraft.trim() });
    setApiKeySaved(true);
  };

  const handleClearNotes = () => setClearModalVisible(true);

  const currentMic = MIC_SOURCES.find((m) => m.value === settings.androidAudioSource) ?? MIC_SOURCES[0];
  const currentLang = LANGUAGES.find((l) => l.code === settings.recognitionLanguage) ?? LANGUAGES[0];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />
      <CustomModal
        visible={clearModalVisible}
        title="Удалить все заметки?"
        message={`Будет удалено ${notes.length} заметок. Это действие необратимо.`}
        onClose={() => setClearModalVisible(false)}
        buttons={[
          { label: 'Удалить всё', style: 'destructive', onPress: () => { setClearModalVisible(false); deleteAllNotes(); } },
          { label: 'Отмена', style: 'cancel', onPress: () => setClearModalVisible(false) },
        ]}
      />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>Настройки</Text>
        <Text style={styles.headerSubtitle}>Конфигурация приложения</Text>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>

        {/* ─── DeepSeek API ─────────────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>DEEPSEEK API</Text>
          <View style={styles.card}>
            <Text style={styles.fieldLabel}>API ключ</Text>
            <Text style={styles.fieldHint}>
              Получите ключ на{' '}
              <Text style={styles.link} onPress={() => Linking.openURL('https://platform.deepseek.com/api_keys')}>
                platform.deepseek.com
              </Text>
              {' '}— регистрация бесплатная.
            </Text>
            <View style={styles.apiKeyRow}>
              <TextInput
                style={styles.apiKeyInput}
                value={apiKeyVisible ? apiKeyDraft : apiKeyDraft ? '•'.repeat(Math.min(apiKeyDraft.length, 32)) : ''}
                onChangeText={handleApiKeyChange}
                onFocus={() => setApiKeyVisible(true)}
                onBlur={() => setApiKeyVisible(false)}
                placeholder="sk-xxxxxxxxxxxxxxxx"
                placeholderTextColor={colors.textDisabled}
                autoCapitalize="none"
                autoCorrect={false}
                secureTextEntry={!apiKeyVisible}
              />
              <Pressable style={styles.eyeBtn} onPress={() => setApiKeyVisible((v) => !v)}>
                <Text style={styles.eyeIcon}>{apiKeyVisible ? '🙈' : '👁'}</Text>
              </Pressable>
            </View>
            {!apiKeySaved && (
              <Pressable style={styles.saveBtn} onPress={handleSaveApiKey}>
                <Text style={styles.saveBtnText}>Сохранить</Text>
              </Pressable>
            )}
            {apiKeySaved && settings.deepseekApiKey.length > 0 && (
              <View style={styles.savedBadge}>
                <Text style={styles.savedText}>✓ Ключ сохранён</Text>
              </View>
            )}
          </View>
        </View>

        {/* ─── Язык распознавания ───────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>ЯЗЫК ЗАПИСИ</Text>
          <View style={styles.card}>
            <Text style={styles.fieldLabel}>Язык распознавания речи</Text>
            <Text style={styles.fieldHint}>
              На каком языке вы будете говорить во время записи. Это влияет на точность транскрибации и язык AI-заметок.
            </Text>

            {/* Текущий выбор */}
            <View style={styles.currentValue}>
              <Text style={styles.currentValueText}>
                {currentLang.flag}  {currentLang.name}
              </Text>
            </View>

            <View style={styles.optionGrid}>
              {LANGUAGES.map((lang) => {
                const active = lang.code === settings.recognitionLanguage;
                return (
                  <Pressable
                    key={lang.code}
                    style={[styles.langOption, active && styles.optionActive]}
                    onPress={() => updateSettings({ recognitionLanguage: lang.code, summaryLanguage: lang.code })}
                  >
                    <Text style={styles.langOptionFlag}>{lang.flag}</Text>
                    <Text style={[styles.langOptionName, active && styles.optionTextActive]}>
                      {lang.name}
                    </Text>
                    {active && <Text style={styles.checkmark}>✓</Text>}
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>

        {/* ─── Микрофон ─────────────────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>МИКРОФОН</Text>
          <View style={styles.card}>
            <Text style={styles.fieldLabel}>Источник звука</Text>
            <Text style={styles.fieldHint}>
              Выбери тип микрофона. Когда подключены наушники с микрофоном — выбери «Гарнитура».
              Android автоматически направит звук на нужное устройство.
            </Text>

            {/* Текущий выбор */}
            <View style={styles.currentValue}>
              <Text style={styles.currentValueText}>
                {currentMic.icon}  {currentMic.label}
              </Text>
            </View>

            <View style={styles.micGrid}>
              {MIC_SOURCES.map((mic) => {
                const active = mic.value === settings.androidAudioSource;
                return (
                  <Pressable
                    key={mic.value}
                    style={[styles.micOption, active && styles.optionActive]}
                    onPress={() => updateSettings({ androidAudioSource: mic.value })}
                  >
                    <View style={styles.micOptionHeader}>
                      <Text style={styles.micIcon}>{mic.icon}</Text>
                      <Text style={[styles.micLabel, active && styles.optionTextActive]}>
                        {mic.label}
                      </Text>
                      {active && <Text style={styles.checkmark}>✓</Text>}
                    </View>
                    <Text style={styles.micDesc}>{mic.desc}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>

        {/* ─── Автоанализ ───────────────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>АВТОАНАЛИЗ</Text>
          <View style={styles.card}>
            <Text style={styles.fieldLabel}>Отправлять в AI через каждые</Text>
            <Text style={styles.fieldHint}>
              После накопления указанного числа слов приложение автоматически отправит расшифровку в DeepSeek и покажет заметки. Можно также нажать «↻ Повторить» вручную в любой момент.
            </Text>
            <View style={styles.thresholdGrid}>
              {WORD_THRESHOLDS.map((t) => {
                const active = settings.autoSummarizeAfterWords === t.value;
                return (
                  <Pressable
                    key={t.value}
                    style={[styles.thresholdOption, active && styles.optionActive]}
                    onPress={() => updateSettings({ autoSummarizeAfterWords: t.value })}
                  >
                    <Text style={[styles.thresholdText, active && styles.optionTextActive]}>
                      {t.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>

        {/* ─── Заметки ──────────────────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>ЗАМЕТКИ</Text>
          <View style={styles.card}>
            <View style={styles.toggleRow}>
              <View style={styles.toggleInfo}>
                <Text style={styles.fieldLabel}>Сохранять полную расшифровку</Text>
                <Text style={styles.fieldHint}>
                  Вместе с AI-заметками будет сохранён весь оригинальный текст
                </Text>
              </View>
              <Switch
                value={settings.keepTranscriptInNote}
                onValueChange={(v) => updateSettings({ keepTranscriptInNote: v })}
                trackColor={{ false: colors.border, true: colors.primaryDark }}
                thumbColor={settings.keepTranscriptInNote ? colors.primary : colors.textMuted}
              />
            </View>

            <View style={styles.divider} />

            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Сохранено заметок</Text>
              <Text style={styles.statValue}>{notes.length}</Text>
            </View>

            {notes.length > 0 && (
              <Pressable style={styles.dangerBtn} onPress={handleClearNotes}>
                <Text style={styles.dangerBtnText}>🗑  Удалить все заметки</Text>
              </Pressable>
            )}
          </View>
        </View>

        {/* ─── О приложении ─────────────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>О ПРИЛОЖЕНИИ</Text>
          <View style={styles.card}>
            <View style={styles.aboutRow}>
              <Text style={styles.aboutLabel}>Автор</Text>
              <Text style={styles.aboutValue}>Пронин К. Н.</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.aboutRow}>
              <Text style={styles.aboutLabel}>Тип</Text>
              <Text style={styles.aboutValue}>Личная разработка</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.aboutRow}>
              <Text style={styles.aboutLabel}>Версия</Text>
              <Text style={styles.aboutValue}>1.0.0</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.aboutRow}>
              <Text style={styles.aboutLabel}>Транскрибация</Text>
              <Text style={styles.aboutValue}>Android SpeechRecognizer</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.aboutRow}>
              <Text style={styles.aboutLabel}>AI модель</Text>
              <Text style={styles.aboutValue}>DeepSeek Chat</Text>
            </View>
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            API ключ хранится только на устройстве.{'\n'}
            Голос обрабатывается локально Android SpeechRecognizer — не передаётся в сторонние сервисы.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Стили ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  headerTitle: { ...typography.h2, color: colors.textPrimary },
  headerSubtitle: { ...typography.caption, color: colors.textMuted, marginTop: 2 },

  scroll: { flex: 1 },
  scrollContent: { padding: spacing.md, gap: spacing.md, paddingBottom: spacing.xxl },

  section: { gap: spacing.xs },
  sectionLabel: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '700',
    letterSpacing: 1.5,
    paddingHorizontal: spacing.xs,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },

  fieldLabel: { ...typography.body, color: colors.textPrimary, fontWeight: '600' },
  fieldHint: { ...typography.bodySmall, color: colors.textMuted, lineHeight: 18 },
  link: { color: colors.primary, textDecorationLine: 'underline' },

  // API Key
  apiKeyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundSecondary,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    paddingHorizontal: spacing.sm,
  },
  apiKeyInput: {
    flex: 1, ...typography.mono,
    color: colors.textPrimary,
    paddingVertical: 12,
    fontSize: 13,
  },
  eyeBtn: { padding: 6 },
  eyeIcon: { fontSize: 16 },
  saveBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: 10,
    alignItems: 'center',
  },
  saveBtnText: { ...typography.body, color: '#FFFFFF', fontWeight: '700' },
  savedBadge: {
    backgroundColor: colors.successBg,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    alignSelf: 'flex-start',
  },
  savedText: { ...typography.caption, color: colors.success, fontWeight: '600' },

  // Current value chip
  currentValue: {
    backgroundColor: colors.primaryGlow,
    borderRadius: radius.md,
    paddingVertical: 8,
    paddingHorizontal: spacing.sm,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: colors.primaryDark,
  },
  currentValueText: { ...typography.body, color: colors.accent, fontWeight: '600', fontSize: 14 },

  // Languages
  optionGrid: { gap: spacing.xs },
  langOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: 10,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.backgroundSecondary,
  },
  langOptionFlag: { fontSize: 18 },
  langOptionName: { ...typography.body, color: colors.textMuted, flex: 1, fontSize: 14 },

  // Mic sources
  micGrid: { gap: spacing.xs },
  micOption: {
    padding: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.backgroundSecondary,
    gap: 4,
  },
  micOptionHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  micIcon: { fontSize: 18 },
  micLabel: { ...typography.body, color: colors.textMuted, flex: 1, fontWeight: '500', fontSize: 14 },
  micDesc: { ...typography.bodySmall, color: colors.textDisabled, lineHeight: 17, paddingLeft: 28 },

  // Active state shared
  optionActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryGlow,
  },
  optionTextActive: { color: colors.primary, fontWeight: '700' },
  checkmark: { color: colors.primary, fontSize: 14, fontWeight: '700' },

  // Thresholds
  thresholdGrid: { gap: spacing.xs },
  thresholdOption: {
    paddingVertical: 10,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.backgroundSecondary,
  },
  thresholdText: { ...typography.body, color: colors.textMuted, fontSize: 13 },

  // Toggle
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  toggleInfo: { flex: 1, gap: 4 },
  divider: { height: 1, backgroundColor: colors.divider },

  // Stats
  statRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statLabel: { ...typography.body, color: colors.textSecondary },
  statValue: { ...typography.h3, color: colors.primary },

  dangerBtn: {
    paddingVertical: 10,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.error,
    backgroundColor: colors.errorBg,
    alignItems: 'center',
  },
  dangerBtnText: { ...typography.body, color: colors.error, fontWeight: '600', fontSize: 13 },

  // About
  aboutRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  aboutLabel: { ...typography.body, color: colors.textMuted, fontSize: 13 },
  aboutValue: { ...typography.bodySmall, color: colors.textSecondary, fontWeight: '500' },

  footer: { alignItems: 'center', paddingVertical: spacing.sm },
  footerText: {
    ...typography.caption,
    color: colors.textDisabled,
    textAlign: 'center',
    lineHeight: 17,
  },
});
