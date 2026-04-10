const DEEPSEEK_API_URL = 'https://api.deepseek.com/chat/completions';

export interface TranslateOptions {
  text: string;
  targetLang: string; // e.g. 'ru-RU', 'el-GR'
  targetLangName: string; // human-readable, e.g. 'Russian', 'Greek'
  apiKey: string;
  onDone: (translated: string) => void;
  onError: (error: string) => void;
}

/**
 * Translate arbitrary text to the target language via DeepSeek.
 * Uses streaming internally but delivers the full result via onDone.
 * Returns an abort function.
 */
export function translateText(options: TranslateOptions): () => void {
  const { text, targetLangName, apiKey, onDone, onError } = options;

  if (!apiKey.trim()) {
    onError('API ключ не настроен. Перейдите в Настройки.');
    return () => {};
  }

  const xhr = new XMLHttpRequest();
  let processedLength = 0;
  let finished = false;
  let accum = '';

  xhr.open('POST', DEEPSEEK_API_URL, true);
  xhr.setRequestHeader('Content-Type', 'application/json');
  xhr.setRequestHeader('Authorization', `Bearer ${apiKey}`);

  xhr.onprogress = () => {
    if (finished) return;
    const newText = xhr.responseText.slice(processedLength);
    processedLength = xhr.responseText.length;
    if (!newText) return;
    const lines = newText.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith('data: ')) continue;
      const data = trimmed.slice(6).trim();
      if (data === '[DONE]') {
        if (!finished) { finished = true; onDone(accum); }
        break;
      }
      try {
        const parsed = JSON.parse(data);
        const content: string | undefined = parsed?.choices?.[0]?.delta?.content;
        if (content) accum += content;
      } catch { /* skip */ }
    }
  };

  xhr.onload = () => {
    if (finished) return;
    if (xhr.status === 200) {
      onDone(accum);
      finished = true;
    } else if (xhr.status === 401) {
      onError('Неверный API ключ DeepSeek.');
    } else if (xhr.status === 402) {
      onError('Недостаточно средств на балансе DeepSeek.');
    } else if (xhr.status === 429) {
      onError('Превышен лимит запросов. Попробуйте позже.');
    } else {
      onError(`Ошибка API: ${xhr.status}`);
    }
  };

  xhr.onerror = () => onError('Нет подключения к интернету.');
  xhr.ontimeout = () => onError('Превышено время ожидания ответа.');
  xhr.timeout = 90000;

  xhr.send(
    JSON.stringify({
      model: 'deepseek-chat',
      messages: [
        {
          role: 'system',
          content:
            `You are a professional translator. Translate the following text to ${targetLangName}. ` +
            'Preserve the original formatting exactly: keep bullet points (•), line breaks, and structure. ' +
            'Output only the translated text — no explanations, no notes.',
        },
        { role: 'user', content: text },
      ],
      stream: true,
      max_tokens: 4000,
      temperature: 0.2,
    }),
  );

  return () => { finished = true; xhr.abort(); };
}

export interface StreamSummaryOptions {
  transcript: string;
  apiKey: string;
  lang?: string;
  onChunk: (chunk: string) => void;
  onDone: () => void;
  onError: (error: string) => void;
}

const LANG_NAMES: Record<string, string> = {
  'ru': 'Russian',
  'en': 'English',
  'de': 'German',
  'fr': 'French',
  'es': 'Spanish',
  'zh': 'Chinese',
  'uk': 'Ukrainian',
  'el': 'Greek',
};

function getLangNameForPrompt(lang: string): string {
  const prefix = lang.split('-')[0].toLowerCase();
  return LANG_NAMES[prefix] ?? 'the same language as the transcript';
}

function buildSystemPrompt(lang: string): string {
  const langName = getLangNameForPrompt(lang);
  return (
    `You are a smart assistant that converts speech transcripts into structured notes. ` +
    `Extract key ideas, decisions and facts as a concise bullet list using the • symbol. ` +
    `Use short sentences. Skip filler words. Be precise and clear. ` +
    `IMPORTANT: You MUST respond exclusively in ${langName}. Do not use any other language.`
  );
}

function buildUserPrompt(transcript: string, lang: string): string {
  const langName = getLangNameForPrompt(lang);
  return (
    `Create concise structured notes from this transcript. ` +
    `Respond in ${langName} only.\n\n${transcript}`
  );
}

function parseSSEChunk(
  raw: string,
  onChunk: (chunk: string) => void,
  onDone: () => void,
): boolean {
  let done = false;
  const lines = raw.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('data: ')) continue;
    const data = trimmed.slice(6).trim();
    if (data === '[DONE]') {
      done = true;
      onDone();
      break;
    }
    try {
      const parsed = JSON.parse(data);
      const content: string | undefined = parsed?.choices?.[0]?.delta?.content;
      if (content) onChunk(content);
    } catch {
      // Skip malformed SSE chunks
    }
  }
  return done;
}

/**
 * Stream a summary from DeepSeek using XMLHttpRequest.
 * fetch().body (ReadableStream) is unreliable on Android React Native —
 * XHR onprogress gives incremental responseText which works consistently.
 *
 * Returns an abort function.
 */
export function streamSummary(options: StreamSummaryOptions): () => void {
  const { transcript, apiKey, lang = 'ru-RU', onChunk, onDone, onError } = options;

  if (!apiKey.trim()) {
    onError('API ключ не настроен. Перейдите в Настройки.');
    return () => {};
  }
  if (!transcript.trim() || transcript.split(/\s+/).length < 5) {
    onError('Слишком мало текста для анализа.');
    return () => {};
  }

  const xhr = new XMLHttpRequest();
  let processedLength = 0;
  let finished = false;

  xhr.open('POST', DEEPSEEK_API_URL, true);
  xhr.setRequestHeader('Content-Type', 'application/json');
  xhr.setRequestHeader('Authorization', `Bearer ${apiKey}`);

  // Incremental streaming — fires as new chunks arrive
  xhr.onprogress = () => {
    if (finished) return;
    const newText = xhr.responseText.slice(processedLength);
    processedLength = xhr.responseText.length;
    if (!newText) return;
    parseSSEChunk(newText, onChunk, () => {
      // [DONE] received — finish here so onload doesn't need to call onDone
      if (!finished) {
        finished = true;
        onDone();
      }
    });
  };

  xhr.onload = () => {
    if (finished) return;

    if (xhr.status === 200) {
      // Process any remaining buffered data not yet seen by onprogress
      const remaining = xhr.responseText.slice(processedLength);
      if (remaining) parseSSEChunk(remaining, onChunk, () => {});
      onDone();
      finished = true;
    } else if (xhr.status === 401) {
      onError('Неверный API ключ DeepSeek.');
    } else if (xhr.status === 402) {
      onError('Недостаточно средств на балансе DeepSeek.');
    } else if (xhr.status === 429) {
      onError('Превышен лимит запросов. Попробуйте позже.');
    } else {
      onError(`Ошибка API: ${xhr.status}`);
    }
  };

  xhr.onerror = () => {
    onError('Нет подключения к интернету.');
  };

  xhr.ontimeout = () => {
    onError('Превышено время ожидания ответа.');
  };

  xhr.timeout = 60000;

  xhr.send(
    JSON.stringify({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: buildSystemPrompt(lang) },
        { role: 'user', content: buildUserPrompt(transcript, lang) },
      ],
      stream: true,
      max_tokens: 1200,
      temperature: 0.4,
    }),
  );

  return () => {
    finished = true;
    xhr.abort();
  };
}
