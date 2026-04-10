# VoiceNotes 🎙

Мобильное Android-приложение для автоматической транскрибации речи с AI-суммаризацией через DeepSeek.

---

## Что тебе нужно для сборки

| Что | Зачем |
|-----|-------|
| Этот проект (уже есть) | Исходный код |
| Android Studio | Компилятор + SDK для Android |
| JDK 17 (идёт в комплекте с Android Studio) | Java-инструменты для Gradle |
| Android-телефон с USB | Запуск приложения |
| DeepSeek API ключ | AI-суммаризация |

---

## Шаг 1 — Установи Android Studio

1. Скачай с [developer.android.com/studio](https://developer.android.com/studio)
2. Установи как обычное macOS-приложение (.dmg)
3. При первом запуске: **Standard Installation** → Next → Finish
   - Он сам скачает Android SDK, эмулятор, все нужные инструменты (~3 GB)

---

## Шаг 2 — Настрой переменные окружения

Открой Терминал и выполни:

```bash
# Проверь, существует ли .zshrc
cat ~/.zshrc | grep ANDROID
```

Если ничего нет — добавь в конец `~/.zshrc`:

```bash
export ANDROID_HOME=$HOME/Library/Android/sdk
export PATH=$PATH:$ANDROID_HOME/emulator
export PATH=$PATH:$ANDROID_HOME/platform-tools
```

Потом примени:
```bash
source ~/.zshrc
```

Проверка что всё ок:
```bash
adb --version   # должно показать версию ADB
```

---

## Шаг 3 — Подготовь телефон

1. **Настройки → Об устройстве** → нажми на **«Номер сборки»** 7 раз → появится «Режим разработчика»
2. **Настройки → Параметры разработчика** → включи **«Отладка по USB»**
3. Подключи телефон к Mac кабелем USB
4. На телефоне появится диалог «Разрешить отладку?» → нажми **Разрешить всегда**

Проверь, что Mac видит телефон:
```bash
adb devices
```
Должно показать примерно: `ABC12345  device`

---

## Шаг 4 — Сборка и установка

```bash
cd /Users/kirillpronin/funStuff/VoiceNotes

# Первый раз — установит все зависимости и запустит сборку
npx expo run:android
```

**Первая сборка займёт 5–15 минут** (Gradle скачивает зависимости). Последующие — 30–60 секунд.

После сборки приложение автоматически установится и откроется на твоём телефоне.

---

## Шаг 5 — Настройка в приложении

1. Открой вкладку **Настройки** (иконка ⚙️)
2. Вставь API ключ DeepSeek
   - Получить ключ: [platform.deepseek.com/api_keys](https://platform.deepseek.com/api_keys)
   - Регистрация бесплатная, ключ создаётся за 1 минуту
3. Нажми **Сохранить**
4. Выбери язык в правом верхнем углу главного экрана (🌐 RU по умолчанию)

---

## Как пользоваться

1. Главная вкладка → большая кнопка микрофона
2. Разреши доступ к микрофону (один раз)
3. Говори — живая транскрибация появляется сразу
4. Через ~60 слов AI начнёт стримить заметки (можно настроить порог)
5. Останови → нажми **«Сохранить заметку»**
6. Сохранённые заметки → вкладка **Заметки** (📝)

---

## Если что-то пошло не так

### `adb: command not found`
```bash
# Добавь в ~/.zshrc и перезапусти терминал:
export PATH=$PATH:$HOME/Library/Android/sdk/platform-tools
```

### `SDK location not found`
В Android Studio: **File → Project Structure → SDK Location** — скопируй путь.
Вставь в `~/.zshrc`:
```bash
export ANDROID_HOME=/путь/который/ты/скопировал
```

### `No devices/emulators found`
- Проверь `adb devices` — телефон должен быть в списке
- Убедись что USB-отладка включена
- Попробуй другой USB-кабель или другой порт

### Телефон без Google Play Services (Xiaomi, Huawei без GMS)
Распознавание речи на Android использует Google Speech API. На устройствах без Google Play Services вместо него будет использоваться встроенный движок (если есть). Лучше всего работает на Pixel, Samsung, Sony, OnePlus.

---

## Быстрая альтернатива — облачная сборка через EAS

Если не хочешь ставить Android Studio:

```bash
npm install -g eas-cli
eas login            # создай аккаунт на expo.dev (бесплатно)
eas build --platform android --profile preview
```

EAS соберёт APK в облаке (~5–10 мин) и пришлёт ссылку для скачивания. Скачай APK → перекинь на телефон → установи (нужно разрешить установку из неизвестных источников).

---

## Структура проекта

```
src/
├── context/AppContext.tsx      — глобальное состояние
├── services/
│   ├── deepseekService.ts      — стриминг DeepSeek API (SSE)
│   └── storageService.ts       — AsyncStorage
├── screens/
│   ├── HomeScreen.tsx          — запись + живая транскрибация
│   ├── NotesScreen.tsx         — список заметок с поиском
│   └── SettingsScreen.tsx      — настройки
├── components/
│   ├── RecordButton.tsx        — анимированная кнопка
│   ├── TypewriterText.tsx      — эффект печатания
│   └── NoteCard.tsx            — карточка заметки
├── navigation/TabNavigator.tsx — нижние вкладки
└── theme/index.ts              — цвета, отступы, шрифты
```
