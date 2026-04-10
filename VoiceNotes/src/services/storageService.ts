import AsyncStorage from '@react-native-async-storage/async-storage';

export interface Note {
  id: string;
  title: string;
  transcript: string;
  summary: string;
  language: string;
  duration: number; // seconds
  wordCount: number;
  createdAt: string; // ISO string
}

export interface AppSettings {
  deepseekApiKey: string;
  recognitionLanguage: string;
  autoSummarizeAfterWords: number;
  summaryLanguage: string;
  keepTranscriptInNote: boolean;
  // Android audio source: 1=MIC, 6=VOICE_RECOGNITION, 7=VOICE_COMMUNICATION(headset)
  androidAudioSource: number;
}

const KEYS = {
  NOTES: '@voicenotes:notes',
  SETTINGS: '@voicenotes:settings',
} as const;

const DEFAULT_SETTINGS: AppSettings = {
  deepseekApiKey: '',
  recognitionLanguage: 'ru-RU',
  autoSummarizeAfterWords: 60,
  summaryLanguage: 'ru-RU',
  keepTranscriptInNote: true,
  androidAudioSource: 1, // MIC — захватывает всех говорящих в комнате
};

// ─── Notes ────────────────────────────────────────────────────────────────────

export async function loadNotes(): Promise<Note[]> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.NOTES);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function saveNote(note: Note): Promise<void> {
  const notes = await loadNotes();
  const updated = [note, ...notes.filter((n) => n.id !== note.id)];
  await AsyncStorage.setItem(KEYS.NOTES, JSON.stringify(updated));
}

export async function updateNote(updated: Note): Promise<Note[]> {
  const notes = await loadNotes();
  const result = notes.map((n) => (n.id === updated.id ? updated : n));
  await AsyncStorage.setItem(KEYS.NOTES, JSON.stringify(result));
  return result;
}

export async function deleteNote(id: string): Promise<Note[]> {
  const notes = await loadNotes();
  const updated = notes.filter((n) => n.id !== id);
  await AsyncStorage.setItem(KEYS.NOTES, JSON.stringify(updated));
  return updated;
}

export async function clearAllNotes(): Promise<void> {
  await AsyncStorage.setItem(KEYS.NOTES, JSON.stringify([]));
}

export function createNote(params: {
  transcript: string;
  summary: string;
  language: string;
  duration: number;
}): Note {
  const wordCount = params.transcript.trim().split(/\s+/).filter(Boolean).length;
  const firstLine = params.summary.split('\n').find((l) => l.trim()) ?? params.summary;
  const titleRaw = firstLine.replace(/^[•\-*]\s*/, '').slice(0, 48).trim();
  const title = titleRaw || `Запись от ${new Date().toLocaleDateString('ru-RU')}`;

  return {
    id: `note_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    title,
    transcript: params.transcript,
    summary: params.summary,
    language: params.language,
    duration: params.duration,
    wordCount,
    createdAt: new Date().toISOString(),
  };
}

// ─── Settings ─────────────────────────────────────────────────────────────────

export async function loadSettings(): Promise<AppSettings> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.SETTINGS);
    if (!raw) return { ...DEFAULT_SETTINGS };
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  await AsyncStorage.setItem(KEYS.SETTINGS, JSON.stringify(settings));
}

export async function updateSetting<K extends keyof AppSettings>(
  key: K,
  value: AppSettings[K],
): Promise<AppSettings> {
  const settings = await loadSettings();
  const updated = { ...settings, [key]: value };
  await saveSettings(updated);
  return updated;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m} мин ${s} сек` : `${s} сек`;
}

export function formatDate(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffDays === 0) {
    return `Сегодня, ${date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}`;
  } else if (diffDays === 1) {
    return `Вчера, ${date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}`;
  } else if (diffDays < 7) {
    return date.toLocaleDateString('ru-RU', { weekday: 'long', hour: '2-digit', minute: '2-digit' });
  }
  return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
}
