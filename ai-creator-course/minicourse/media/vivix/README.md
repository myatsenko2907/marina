# Vivix — видеоматериалы для мини-курса «AI Creator: Старт»

Сгенерировано 2026-11-14 через API Vivix (`https://api.vivix.ai`, документация: https://docs.vivix.ai).

## Файлы

| Файл | Что это | Длительность |
| - | - | - |
| `01-serum.mp4` | Янтарный флакон сыворотки на мокром травертине у бассейна, капля, медленный наезд | 6,5 с |
| `02-candle.mp4` | Свеча на деревянном подоконнике, тонкий дым, утренний свет, статичная камера | 6,5 с |
| `03-headphones.mp4` | Беспроводные наушники на графитовом подиуме, орбита, студийный свет | 6,5 с |
| `04-coffee.mp4` | Чашка кофе на террасе у моря, золотой час, пар, медленный наезд | 6,5 с |
| `05-perfume.mp4` | Флакон духов выходит из тени, луч света с пылью | 6,5 с |
| `06-sneakers.mp4` | Кроссовок на пастельном фоне, лёгкий поворот, мягкая тень | 6,5 с |
| `07-mentor-avatar.mp4` | Тестовый говорящий аватар ведущей (lip-sync, украинская речь) | 6,7 с |
| `07-mentor-first-frame.jpg` | Первый кадр, на основе которого сделан аватар | — |
| `*.jpg` | Обложки 360 px по ширине (кадр на 3-й секунде) | — |

Все ролики 9:16, 720×1280, H.264 (CRF 26, preset slow, yuv420p, `+faststart`), AAC 96 кбит/с — у W1-роликов есть сгенерированный звуковой фон. Размер каждого 0,4–0,8 МБ.

Замечания по качеству:
- `03-headphones` — орбита получилась примерно на 90–120°, а не на полные 180°. Логотипов нет, но форма наушников заметно напоминает известную модель — для рекламы реального продукта лучше подать свой кадр в `first_frame_image`.
- `07` — ведущая выглядит скорее на 35–40, чем «молодой». Если нужно моложе — перегенерировать кадр и уточнить возраст в промпте.

## Модель и параметры

**Ролики 01–06 — `vivix-w1`** (World Video Generation, text-to-video), `POST /v1/videos/jobs`:

```json
{ "model": "vivix-w1", "seed": 20261114,
  "jobs": [{ "prompt": "...", "aspect_ratio": "9:16", "duration": 6 }] }
```

Отдельного API для генерации картинок у Vivix нет, поэтому схему «сначала кадр, потом оживить» напрямую сделать нельзя. Image-to-video поддерживается: можно загрузить своё фото (`POST /v1/files/images`) и передать его URL как `first_frame_image` (кадр будет первым кадром ролика) или `ref_images` (товар сохраняется, сцена новая). Это ровно сценарий урока 2: фото из урока 1 → `first_frame_image` → ролик. Здесь ролики сделаны из текста. Ответ API приходит в 720×1264, при сжатии кадр масштабирован и обрезан до 720×1280.

**Ролик 07 — `vivix-a1`** (Avatar Video Generation), `POST /v1/videos/generations`:
1. W1-генерация портрета ведущей (промпт `07-mentor-frame` ниже) → из неё вырезан кадр 672×1280 (рекомендуемый размер для A1 9:16);
2. кадр загружен через `POST /v1/files/images`;
3. A1 с озвучкой на сервере (TTS):

```json
{ "model": "vivix-a1",
  "prompt": "A friendly mentor looks into the camera, speaks warmly with natural small head movements and a light smile, static camera, neutral light background.",
  "first_frame_image": "<url из /v1/files/images>",
  "dialogue": "Привіт! Я ваша наставниця курсу AI Creator. Сьогодні оживимо фото товару в рекламний ролик.",
  "voice_id": "cgSgspJ2msm6clMCkdW9",
  "tts_config": { "tts_provider": "elevenlabs", "tts_model_id": "eleven_v3", "speed": 1, "vol": 1 },
  "resolution": "720p", "video_ratio": "9:16" }
```

Голос — встроенный ElevenLabs «Jessica» из документации Vivix. Клонированные голоса, которые уже есть в воркспейсе, не использовались. A1 отдаёт HLS (`.m3u8`): сегменты скачаны и склеены в mp4. Генерация заняла ~9 с.

### Как подать свой аудиофайл (озвучку ведущей)

1. Загрузить аудио (mp3/wav/m4a/ogg/webm, до 10 МБ):
   ```bash
   curl -X POST https://api.vivix.ai/v1/files/audios -H "Authorization: Bearer $VIVIX_API_KEY" -F "file=@voice.mp3;type=audio/mpeg"
   ```
2. Отправить генерацию с полем `audio` вместо `dialogue`/`voice_id`/`tts_config` (длина ролика = длина аудио):
   ```json
   { "model": "vivix-a1", "prompt": "...", "first_frame_image": "<url кадра>",
     "audio": "<data.url из шага 1>", "resolution": "720p", "video_ratio": "9:16" }
   ```
   Аудио можно передать и в Base64 полем `audio_data`. Для длинных роликов есть `segments` (до 20 кусков: `a2v` — своё аудио, `ta2v` — TTS, без аудио — пауза-«слушание»).
3. Опрос: `GET /v1/videos/generations/{video_id}` → `playback_url` (HLS) → `ffmpeg -allowed_extensions ALL -i index.m3u8 -c copy out.mp4`.
4. Свой голос для TTS: `POST /v1/voices/...` (Upload Audio → Clone Voice) → полученный `voice_id` передать в `voice_id`.

## Расход

Всего 8 генераций: 7 × W1 по 6 с (6 роликов и портрет ведущей) + 1 × A1 (6,7 с).

| Что | Тариф (из документации, ноябрь 2026) | Итого |
| - | - | - |
| W1, 7 × 6 с = 42 с | $0.0050/с ≈ 1,7 кредита/с (1 кредит = $0.003) | ≈ $0.21 ≈ 70 W-кредитов |
| Загрузка кадра для A1 | — (сбор за референсы есть только у W1) | 0 |
| A1, 6,7 с | в публичной документации цены A1 нет; списывается с отдельного баланса A-кредитов | смотреть в platform.vivix.ai → Billing |

Endpoint баланса в API не описан, поэтому точная сумма списания — только в кабинете. Одна W1-генерация 6 с стоит ≈ $0.03, это недорого.

Лимит: одновременно в работе максимум ~5 задач на воркспейс (ошибка `30006 Workspace concurrency limit reached`), W1 6 с генерируется ~1 мин.

## Промпты (W1)

### 01-serum

`job_id`: `job_9bcff58062f8a9a84474e7c303a73eb6`

```text
Premium product commercial, one continuous shot. An unbranded amber glass serum bottle with a dropper cap stands on wet travertine stone at the edge of a turquoise swimming pool, sunlit water reflections dancing on the stone. A single clear drop falls from above and lands on the bottle shoulder, sliding down the glass. Slow smooth dolly-in toward the bottle. Soft natural daylight, shallow depth of field, photorealistic, clean minimal luxury aesthetic. No people, no text, no logos, no labels.
```

### 02-candle

`job_id`: `job_a558ec9911d828094c6648887c23dcf5`

```text
Product commercial, one continuous shot, locked-off static camera on a tripod. A lit candle in a plain matte ceramic vessel stands on a wooden windowsill, warm soft morning sunlight streams through the window, a thin wisp of smoke rises and curls slowly from the flame, tiny dust particles float in the light. Calm cozy atmosphere, photorealistic, shallow depth of field. No people, no text, no logos, no labels.
```

### 03-headphones

`job_id`: `job_86425ca006dca58f4c8aee58cd459298`

```text
Tech product commercial, one continuous shot. A pair of sleek matte wireless over-ear headphones rests on a dark graphite cylindrical podium in a studio. The camera performs a smooth 180-degree orbit around the headphones. Professional studio lighting with soft rim light and subtle reflections, dark gradient background, photorealistic, crisp detail. No people, no text, no logos, no brand marks.
```

### 04-coffee

`job_id`: `job_5feccf255c120bcfda99dc2d35dcd877`

```text
Lifestyle product commercial, one continuous shot. A white ceramic cup of black coffee on a saucer sits on a small table on a seaside terrace at golden hour, the calm sea and warm sunset in the soft-focus background, gentle steam rises from the coffee. Slow smooth dolly-in toward the cup. Warm golden light, photorealistic, cinematic shallow depth of field. No people, no text, no logos.
```

### 05-perfume

`job_id`: `job_96a4adcec04977032a60f9c8006d3634`

```text
Luxury perfume commercial, one continuous shot. A faceted glass perfume bottle without any label slowly emerges from deep shadow as a narrow beam of light sweeps across it, dust particles glowing in the light beam, the glass refracting golden highlights. Dramatic low-key lighting, black background, slow subtle push-in, photorealistic, high contrast. No people, no text, no logos.
```

### 06-sneakers

`job_id`: `job_b05edac154e1fb0bb0916cac68b7ce4d`

```text
Product commercial, one continuous shot. A single clean white minimalist sneaker with no logos sits on a soft pastel peach background, the sneaker slowly rotates a little on a turntable, soft diffused studio light casting a gentle soft shadow beneath it. Clean minimal e-commerce aesthetic, photorealistic, sharp detail. No people, no text, no logos, no brand marks.
```

### 07-mentor-frame

`job_id`: `job_50a54b4cfb7ef98e3c41bc821c5bd29a`

```text
One continuous shot, static camera, vertical framing, medium close-up portrait. A friendly young woman in her late twenties, a mentor and online course host, with shoulder-length brown hair, wearing a simple light beige blouse, looks directly into the camera with a warm calm smile and stands still, neutral soft light-gray studio background, soft even front lighting, photorealistic, natural skin texture. No text, no logos.
```


## Полные уроки с аватаром (Ліна, своё аудио)

| Файл | Длительность | Размер |
| - | - | - |
| `lesson-1-avatar.mp4` | 358,6 с (mp3: 358,608 с) | 38 МБ |
| `lesson-2-avatar.mp4` | 319,2 с (mp3: 319,152 с) | 34 МБ |
| `lesson-N-avatar.jpg` | обложки 360 px | — |

- **Исходник:** озвучка v2 `ai-creator-course/minicourse/media/audio/lesson-{1,2}.mp3` с ветки `claude/dreamy-cannon-glzjto` (коммит 64c9e32).
- **Генерация:** `vivix-a1`, по **одной генерации на урок, без нарезки**: A1 принял mp3 на 6 минут целиком полем `audio`. `first_frame_image` — `v2/host-frame.jpg` (та же ведущая), `resolution` 720p, `video_ratio` 9:16. Prompt: «A young woman, a friendly course mentor, talks to the camera in a lively and natural way, warm facial expressions, light natural hand gestures, small head movements, static camera, the same creative studio background.»
  - `job_96d0cffa0710c3bee061fa515b059eb3`: урок 1, 359,0 с видео, сгенерирован за 5,3 мин.
  - `job_2ea0a8b655cd9dcdb426a2e2ec98e204`: урок 2, 319,7 с видео, за 4,6 мин.
- **Сборка:** HLS склеен в mp4. Кросс-корреляция звука A1 с исходным mp3 показала сдвиг 0,02 с в начале и 0,003–0,007 с дальше, то есть видео начинается синхронно с аудио. В конце было ~0,8 с лишнего хвоста — обрезан по длине mp3. Звук — исходный mp3 (AAC 128k). Видео: 720×1280, H.264 CRF 28, faststart.
- **Проверка липсинка:** крупные планы лица на 30, 160 и 300 с в каждом уроке, по 4 кадра с шагом 0,12 с. Артикуляция меняется в такт речи, лицо и фон стабильны до конца урока, ведущая не «уплывает».

### Расход A1 на уроки

2 генерации, **678,7 с A1** (359,0 + 319,7). Цена A1 не опубликована, списание видно в platform.vivix.ai → Billing.

Итого A1 за всё время: 32 с (тесты v1/v2) + 678,7 с = **≈ 710,7 с (11,8 мин), 5 генераций**.
