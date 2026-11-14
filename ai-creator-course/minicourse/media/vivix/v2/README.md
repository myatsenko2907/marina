# Vivix v2 — тест говорящей ведущей «Ліна»

Сгенерировано 2026-11-14. Делали только тест аватара (решение пользователя: «только аватар»). Цепочку урока «до → сцены → оживление» не запускали, полные уроки аватаром не генерировали.

## Файлы

| Файл | Что это |
| - | - |
| `host-test.mp4` | Говорящая ведущая, 20,1 с, 720×1280, H.264 CRF 26 + AAC 128k, faststart, 2,7 МБ |
| `host-test.jpg` | Обложка 360 px |
| `host-frame.jpg` | Первый кадр для A1, 672×1280 (рекомендуемый размер A1 для 9:16) |
| `tts-compare-multilingual-v2.mp4` | Короткий тест той же ведущей на TTS `eleven_multilingual_v2` (5,4 с), для сравнения |

## Как сделано

1. **Портрет** — `vivix-w1`, text-to-video, 9:16, 5 с, seed 271127 (`job_666062f102a49e4f70c4704073c4dba3`). Из ролика взят кадр №60, масштабирован и обрезан до 672×1280, загружен через `POST /v1/files/images`.

   ```text
   One continuous shot, static camera, vertical framing, waist-up portrait. A young Ukrainian woman about 27 years old, a creative AI content creator and course mentor, with long light-brown wavy hair, natural makeup, wearing a soft cream knit sweater, looks directly into the camera with a warm genuine smile and stands still, hands relaxed. Behind her a modern creative studio slightly out of focus: warm pendant lamps with soft bokeh, a green monstera plant, a desk with a monitor. Soft natural daylight from a window, photorealistic, natural skin texture. No text, no logos.
   ```

2. **Аватар** — `vivix-a1`, `POST /v1/videos/generations` (`job_ce2fa9404854eb08e2d5a14c19fa779a`), генерация заняла ~21 с:

   ```json
   { "model": "vivix-a1",
     "prompt": "A young woman, a friendly course mentor, talks to the camera in a lively and natural way, expressive facial expressions, light natural hand gestures, small head movements, warm smile, static camera, creative studio background.",
     "first_frame_image": "<url host-frame>",
     "dialogue": "Привіт! Я Ліна, AI-креаторка і менторка курсу AI Creator. Подивись на це фото: звичайний флакон на аркуші паперу, знято на телефон. А ось що з нього зробила нейромережа за десять хвилин. Сьогодні ти навчишся так само. Бери будь-який товар зі столу — і поїхали!",
     "voice_id": "cgSgspJ2msm6clMCkdW9",
     "tts_config": { "tts_provider": "elevenlabs", "tts_model_id": "eleven_v3", "speed": 1, "vol": 1 },
     "resolution": "720p", "video_ratio": "9:16" }
   ```

   A1 отдаёт HLS: сегменты скачаны и склеены в mp4 без перекодирования, затем пережаты до 720×1280.

## Голос и модель TTS

- **voice_id `cgSgspJ2msm6clMCkdW9`** — ElevenLabs «Jessica» (женский, тёплый, молодой). Единственный встроенный молодой женский голос Vivix, подходящий для украинского: остальные встроенные женские голоса (Qwen) только китайский/английский. Клонированные голоса воркспейса не использовались.
- **Выбрана `eleven_v3`.** Сравнение проводили на распознавании речи (Whisper small, язык uk) — объективная замена прослушиванию:
  - `eleven_multilingual_v2` (короткий кусок): «AI-**кріаторка** і **ментерка** курсу AI Creator» — искажения.
  - `eleven_v3`, тест v1 (`../07-mentor-avatar.mp4`): распознано дословно.
  - `eleven_v3`, финальный ролик: смысл весь на месте, но слышен лёгкий акцент — Whisper слышит «криаторка», «ментерка», «AI-крієйтер», «найромережа».
- **Вывод:** Jessica — англоязычный голос, на украинском у неё лёгкий акцент. Для естественного звучания лучше клонировать живой украинский голос: Upload Audio → Clone Voice, полученный `voice_…` передать в `voice_id`. Или подать готовую озвучку полем `audio` (см. `../README.md`).
- Длительность получилась 20 с, а не ~30: столько занимает этот текст в обычном темпе. Для 30 с нужно добавить 1–2 фразы.

## Проверка

- Звук и видео совпадают: 482 кадра при 24 fps = 20,08 с, аудио 20,07 с.
- Lip-sync проверен на кадрах 40/200/330/450: рот двигается в такт речи, мимика и жесты руками естественные, лицо стабильное, фон не «плывёт».

## Расход

| Генерация | Длительность | Цена |
| - | - | - |
| `vivix-w1` портрет | 5 с | ≈ $0.025 (≈ 8 W-кредитов, $0.005/с) |
| `vivix-a1` тест TTS multilingual_v2 | 5,3 с | цена A1 не опубликована |
| `vivix-a1` финальный ролик | 20,0 с | цена A1 не опубликована |
| **Итого A1** | **25,3 с, 2 генерации** | списание видно только в platform.vivix.ai → Billing |

Endpoint баланса в API Vivix не описан, поэтому точной цифры списания и скриншота здесь нет. С учётом v1 всего потрачено 11 генераций: 8 W1 и 3 A1 (6,7 + 5,3 + 20,0 = 32 с A1).
