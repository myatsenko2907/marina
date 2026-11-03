# Ролик «План лидобалов» — озвучка ElevenLabs

`video/lead-planner-promo-44s-elevenlabs.mp4` — ролик из ветки `claude/determined-pascal-0tfy6m`
(1080×1920, 44 с), голос героини переозвучен через ElevenLabs Speech-to-Speech
(голос *Sarah*, модель `eleven_multilingual_sts_v2`). Видео не перекодировалось; тайминг речи
сохранён, поэтому губы и субтитры совпадают. Финальный аккорд (последние 3,8 с) оставлен как был.

```bash
scripts/revoice.sh lead-planner-promo-44s.mp4 out.mp4 40.192            # 40.192 с — речь, дальше карточка
scripts/revoice.sh in.mp4 out.mp4 40.192 <voice_id>                      # другой голос
```
