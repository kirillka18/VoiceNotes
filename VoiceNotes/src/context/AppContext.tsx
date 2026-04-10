import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  AppSettings,
  Note,
  createNote,
  deleteNote as deleteNoteFromStorage,
  clearAllNotes,
  loadNotes,
  loadSettings,
  saveNote,
  saveSettings,
} from '../services/storageService';
import { streamSummary } from '../services/deepseekService';

// ─── Types ────────────────────────────────────────────────────────────────────

export type RecordingState = 'idle' | 'recording' | 'summarizing';

interface AppContextValue {
  // Settings
  settings: AppSettings;
  updateSettings: (partial: Partial<AppSettings>) => Promise<void>;

  // Notes
  notes: Note[];
  deleteNote: (id: string) => Promise<void>;
  deleteAllNotes: () => Promise<void>;
  refreshNotes: () => Promise<void>;

  // Recording session
  recordingState: RecordingState;
  sessionDuration: number; // seconds
  liveTranscript: string;
  streamingSummary: string;
  isSummaryStreaming: boolean;
  summaryError: string | null;

  // Actions
  onTranscriptChunk: (text: string, isFinal: boolean) => void;
  triggerSummary: () => void;
  startSession: () => void;
  stopSession: () => void;
  saveCurrentSession: () => Promise<Note | null>;
  discardSession: () => void;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const AppContext = createContext<AppContextValue | null>(null);

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>({
    deepseekApiKey: '',
    recognitionLanguage: 'ru-RU',
    autoSummarizeAfterWords: 60,
    summaryLanguage: 'ru-RU',
    keepTranscriptInNote: true,
    androidAudioSource: 1,
  });
  const [notes, setNotes] = useState<Note[]>([]);

  // Recording state
  const [recordingState, setRecordingState] = useState<RecordingState>('idle');
  const [sessionDuration, setSessionDuration] = useState(0);
  const [liveTranscript, setLiveTranscript] = useState('');
  const [streamingSummary, setStreamingSummary] = useState('');
  const [isSummaryStreaming, setIsSummaryStreaming] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  // Refs for accumulation and avoiding stale closures
  const finalTranscriptRef = useRef('');
  const wordsSinceLastSummaryRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const summaryAbortRef = useRef(false);
  const sessionStartRef = useRef<number>(0);
  // Use ref for isSummaryStreaming to avoid stale closure in callbacks
  const isSummaryStreamingRef = useRef(false);
  // XHR abort function for current streaming request
  const xhrAbortRef = useRef<(() => void) | null>(null);
  // Queue: if summary is requested while one is running, run again when done
  const pendingSummaryRef = useRef(false);
  // Always-fresh settings for use inside XHR callbacks (avoids stale closure)
  const settingsRef = useRef(settings);

  // Keep settingsRef in sync so XHR callbacks always see fresh settings
  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  // When streaming finishes, check if a new summary was queued while it ran
  useEffect(() => {
    if (!isSummaryStreaming && pendingSummaryRef.current && !summaryAbortRef.current) {
      pendingSummaryRef.current = false;
      // Small delay to let UI settle, then re-summarise the full transcript so far
      const t = setTimeout(() => {
        if (finalTranscriptRef.current.trim() && !summaryAbortRef.current) {
          runSummary(finalTranscriptRef.current, settingsRef.current);
        }
      }, 300);
      return () => clearTimeout(t);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSummaryStreaming]);

  // Load initial data
  useEffect(() => {
    loadSettings().then(setSettings);
    loadNotes().then(setNotes);
  }, []);

  // ─── Settings ───────────────────────────────────────────────────────────────

  const updateSettings = useCallback(async (partial: Partial<AppSettings>) => {
    setSettings((prev) => {
      const updated = { ...prev, ...partial };
      saveSettings(updated);
      return updated;
    });
  }, []);

  // ─── Notes ──────────────────────────────────────────────────────────────────

  const refreshNotes = useCallback(async () => {
    const loaded = await loadNotes();
    setNotes(loaded);
  }, []);

  const deleteNote = useCallback(async (id: string) => {
    const updated = await deleteNoteFromStorage(id);
    setNotes(updated);
  }, []);

  const deleteAllNotes = useCallback(async () => {
    await clearAllNotes();
    setNotes([]);
  }, []);

  // ─── Recording session ──────────────────────────────────────────────────────

  const startSession = useCallback(() => {
    finalTranscriptRef.current = '';
    wordsSinceLastSummaryRef.current = 0;
    summaryAbortRef.current = false;
    pendingSummaryRef.current = false;
    sessionStartRef.current = Date.now();

    setRecordingState('recording');
    setSessionDuration(0);
    setLiveTranscript('');
    setStreamingSummary('');
    setIsSummaryStreaming(false);
    setSummaryError(null);

    timerRef.current = setInterval(() => {
      setSessionDuration((d) => d + 1);
    }, 1000);
  }, []);

  const stopSession = useCallback(() => {
    setRecordingState('summarizing');
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const discardSession = useCallback(() => {
    summaryAbortRef.current = true;
    isSummaryStreamingRef.current = false;
    pendingSummaryRef.current = false;
    if (xhrAbortRef.current) { xhrAbortRef.current(); xhrAbortRef.current = null; }
    setRecordingState('idle');
    setSessionDuration(0);
    setLiveTranscript('');
    setStreamingSummary('');
    setIsSummaryStreaming(false);
    setSummaryError(null);
    finalTranscriptRef.current = '';
    wordsSinceLastSummaryRef.current = 0;
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // Called by HomeScreen when recognition returns text
  const onTranscriptChunk = useCallback(
    (text: string, isFinal: boolean) => {
      if (!isFinal) {
        setLiveTranscript(finalTranscriptRef.current + ' ' + text);
        return;
      }

      // Commit final result
      const trimmed = text.trim();
      if (!trimmed) return;
      finalTranscriptRef.current = (finalTranscriptRef.current + ' ' + trimmed).trim();
      setLiveTranscript(finalTranscriptRef.current);

      // Count words added since last auto-summary
      const wordsAdded = trimmed.split(/\s+/).length;
      wordsSinceLastSummaryRef.current += wordsAdded;

      // Auto-trigger when threshold reached; queue if a summary is already running
      if (wordsSinceLastSummaryRef.current >= settingsRef.current.autoSummarizeAfterWords) {
        wordsSinceLastSummaryRef.current = 0;
        if (isSummaryStreamingRef.current) {
          pendingSummaryRef.current = true;
        } else {
          runSummary(finalTranscriptRef.current, settingsRef.current);
        }
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  // Manual or final trigger — queues if streaming is already active
  const triggerSummary = useCallback(() => {
    if (finalTranscriptRef.current.trim()) {
      wordsSinceLastSummaryRef.current = 0;
      if (isSummaryStreamingRef.current) {
        pendingSummaryRef.current = true;
      } else {
        runSummary(finalTranscriptRef.current, settingsRef.current);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function runSummary(transcript: string, currentSettings: AppSettings) {
    if (isSummaryStreamingRef.current) {
      // Queue: run again as soon as the current stream finishes
      pendingSummaryRef.current = true;
      return;
    }
    // Abort any previous request
    if (xhrAbortRef.current) { xhrAbortRef.current(); xhrAbortRef.current = null; }

    isSummaryStreamingRef.current = true;
    summaryAbortRef.current = false;
    setSummaryError(null);
    setIsSummaryStreaming(true);
    // Don't clear the old summary immediately — clear on first chunk for smooth UX

    let accum = '';
    let firstChunk = true;
    const abort = streamSummary({
      transcript,
      apiKey: currentSettings.deepseekApiKey,
      lang: currentSettings.summaryLanguage,
      onChunk: (chunk) => {
        if (summaryAbortRef.current) return;
        if (firstChunk) {
          firstChunk = false;
          setStreamingSummary(''); // clear old only when new content starts arriving
        }
        accum += chunk;
        setStreamingSummary(accum);
      },
      onDone: () => {
        isSummaryStreamingRef.current = false;
        xhrAbortRef.current = null;
        setIsSummaryStreaming(false);
        if (accum) setStreamingSummary(accum);
      },
      onError: (err) => {
        isSummaryStreamingRef.current = false;
        xhrAbortRef.current = null;
        setIsSummaryStreaming(false);
        setSummaryError(err);
      },
    });
    xhrAbortRef.current = abort;
  }

  const saveCurrentSession = useCallback(async (): Promise<Note | null> => {
    const transcript = finalTranscriptRef.current.trim();
    const summary = streamingSummary.trim();
    if (!transcript && !summary) return null;

    const duration = Math.floor((Date.now() - sessionStartRef.current) / 1000);
    const note = createNote({
      transcript: settings.keepTranscriptInNote ? transcript : '',
      summary: summary || transcript,
      language: settings.recognitionLanguage,
      duration,
    });

    await saveNote(note);
    setNotes((prev) => [note, ...prev.filter((n) => n.id !== note.id)]);

    // Reset session state
    discardSession();
    return note;
  }, [streamingSummary, settings, discardSession]);

  return (
    <AppContext.Provider
      value={{
        settings,
        updateSettings,
        notes,
        deleteNote,
        deleteAllNotes,
        refreshNotes,
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
      }}
    >
      {children}
    </AppContext.Provider>
  );
}
