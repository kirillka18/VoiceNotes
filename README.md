# 🎙 VoiceNotes

**Record. Transcribe. Summarize.**

A mobile Android app that turns your speech into structured AI-powered notes in real time — powered by on-device speech recognition and the DeepSeek language model.

---

## What it does

VoiceNotes listens to you, transcribes everything live on your device, then instantly sends the transcript to DeepSeek AI which extracts key ideas, decisions and facts into a clean bullet-point note — all while you're still talking.

```
[Tap record] → [Speak] → [Live transcript] → [AI summary streams in] → [Save note]
```

---

## Features

- **Live transcription** — on-device speech-to-text via Google Speech API, zero latency
- **Streaming AI notes** — DeepSeek `deepseek-chat` response streams token by token, typewriter-style
- **Multi-language** — Russian and English recognition + AI prompts auto-switch by language
- **Note library** — full-text search, copy, share and delete saved notes
- **Offline-first storage** — all notes are stored locally via AsyncStorage
- **Dark UI** — deep dark theme, optimised for OLED screens
- **No backend** — everything runs client-side, you own your data

---

## Tech stack

| Layer | Technology |
|---|---|
| Framework | React Native + Expo SDK 54 |
| Language | TypeScript |
| Navigation | React Navigation v7 (bottom tabs) |
| Speech recognition | `expo-speech-recognition` (Google Speech API) |
| AI summarisation | DeepSeek Chat API (SSE streaming via XHR) |
| Local storage | `@react-native-async-storage/async-storage` |
| Animations | React Native Reanimated 4 |

---

## How it works

```
┌─────────────────────────────────────────────┐
│                  HomeScreen                 │
│                                             │
│  [🔴 Record]  ──►  expo-speech-recognition  │
│                         │                  │
│                    interim results          │
│                         │                  │
│                   liveTranscript            │
│                         │                  │
│              [Stop] ──► DeepSeek API        │
│                         │  (SSE stream)     │
│                    streamingSummary         │
│                         │                  │
│               [💾 Save note] ──► Storage    │
└─────────────────────────────────────────────┘
```

1. `expo-speech-recognition` runs on the device using Google's Speech API — no audio is sent anywhere
2. When you stop recording, the full transcript is sent to DeepSeek's `/chat/completions` endpoint with `stream: true`
3. The app reads Server-Sent Events via `XMLHttpRequest.onprogress` (more reliable than `fetch` ReadableStream on Android)
4. The AI response renders character by character with a typewriter animation
5. On save, both the raw transcript and the AI summary are persisted to AsyncStorage

---

## Requirements

| Tool | Purpose |
|---|---|
| Node.js ≥ 18 | Package management |
| Android Studio | Android SDK + build tools |
| JDK 17 | Gradle build system (bundled with Android Studio) |
| Android device with USB debugging | Running the app |
| [DeepSeek API key](https://platform.deepseek.com/api_keys) | AI note generation |

---

## Getting started

### 1. Clone and install

```bash
git clone https://github.com/kirillka18/VoiceNotes.git
cd VoiceNotes/VoiceNotes
npm install
```

### 2. Set up Android environment

Add to your `~/.zshrc` (or `~/.bashrc`):

```bash
export ANDROID_HOME=$HOME/Library/Android/sdk
export PATH=$PATH:$ANDROID_HOME/emulator
export PATH=$PATH:$ANDROID_HOME/platform-tools
```

```bash
source ~/.zshrc
adb --version   # should print ADB version
```

### 3. Enable USB debugging on your phone

1. **Settings → About phone** → tap **Build number** 7 times
2. **Settings → Developer options** → enable **USB debugging**
3. Connect phone via USB and tap **Allow** on the dialog

Verify:
```bash
adb devices   # should show something like: ABC12345  device
```

### 4. Build and run

```bash
npx expo run:android
```

First build takes 5–15 min (Gradle downloads dependencies). Subsequent builds: ~30–60 sec.

### 5. Configure the app

1. Open **Settings** tab (⚙️)
2. Paste your DeepSeek API key
   > Get one at [platform.deepseek.com/api_keys](https://platform.deepseek.com/api_keys) — free account, takes ~1 min
3. Tap **Save**
4. Select recognition language in the top-right corner of the Home screen

---

## Alternative: cloud build (no Android Studio needed)

```bash
npm install -g eas-cli
eas login
eas build --platform android --profile preview
```

EAS builds the APK in the cloud (~5–10 min) and gives you a download link. Transfer the APK to your phone and install (enable *Install from unknown sources* if prompted).

---

## Project structure

```
VoiceNotes/
├── App.tsx                          — root component, navigation setup
├── app.json                         — Expo config (permissions, icons)
├── src/
│   ├── context/
│   │   └── AppContext.tsx           — global state (recording, transcript, notes)
│   ├── services/
│   │   ├── deepseekService.ts       — DeepSeek SSE streaming
│   │   └── storageService.ts        — AsyncStorage read/write
│   ├── screens/
│   │   ├── HomeScreen.tsx           — recording + live transcription
│   │   ├── NotesScreen.tsx          — saved notes with search
│   │   └── SettingsScreen.tsx       — API key + language settings
│   ├── components/
│   │   ├── RecordButton.tsx         — animated record/stop button
│   │   ├── TypewriterText.tsx       — streaming text animation
│   │   ├── NoteCard.tsx             — note list item
│   │   ├── NoteContextMenu.tsx      — long-press actions menu
│   │   └── CustomModal.tsx          — reusable modal dialog
│   ├── navigation/
│   │   └── TabNavigator.tsx         — bottom tab navigation
│   └── theme/
│       └── index.ts                 — colors, spacing, typography
└── assets/                          — icons and splash screen
```

---

## Troubleshooting

**`adb: command not found`**
```bash
export PATH=$PATH:$HOME/Library/Android/sdk/platform-tools
```

**`SDK location not found`**
In Android Studio: *File → Project Structure → SDK Location* — copy the path and set `ANDROID_HOME`.

**`No devices/emulators found`**
- Run `adb devices` — your phone must appear in the list
- Check that USB debugging is enabled
- Try a different cable or USB port

**Phone without Google Play Services (some Xiaomi / Huawei)**
Speech recognition relies on Google Speech API. On GMS-less devices the fallback is the built-in engine (if present). Works best on Pixel, Samsung, Sony, OnePlus.

---

## License

MIT
