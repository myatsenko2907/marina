# Скилы для маркетинговых креативов

Установлены по списку «Скилы для маркетинговых креативов» (20.10.2026). Claude Code подгружает их автоматически в любой сессии этого репозитория.

## Источники

| Скилы | Репозиторий |
|---|---|
| hyperframes, hyperframes-core/-cli/-creative/-animation/-audio/-keyframes/-registry/-studio, general-video, motion-graphics, media-use | github.com/heygen-com/hyperframes |
| remotion-best-practices | github.com/remotion-dev/skills |
| video-use | github.com/browser-use/video-use |
| ad-creative, image, video, copywriting, social, marketing-plan, marketing-council, marketing-psychology, marketing-ideas, copy-editing, ads, ab-testing | github.com/coreyhaines31/marketingskills |
| baoyu-comic | github.com/JimLiu/baoyu-skills |
| humanizer | github.com/blader/humanizer |
| ppt-master | github.com/hugohe3/ppt-master |

## Не установлены (нет публичного источника)

- Novoads: music-mix, micro-series, analyze-video, caption-video, broll-overlay, change-voice, image-to-motion, clone-video-ad, pixar-ad, claymation-ad, clone-image-ad, nano-banana-image-ad, chatgpt-image-ad, meta-ad-builder, generate-youtube-thumbnail
- Creatify: video-ad-generator, static-ad-concept-generator
- shkoly-ua: banner-design, brand, design-system
- humanizer-ua, humanizer-ru, spy-competitor-ads, react-pdf

Чтобы добавить их, скопируйте папки скилов (с `SKILL.md`) из `claud/.claude/vendor/` и `~/.claude/skills/` в эту папку.

## Правила поверх скилов

- Видеоряд — только Vivix (W1/A1). У Novoads берём аналитику, клон-логику и шаги монтажа, их модели не используем.
- Картинки — только Grok. fal.ai не используем.
- Озвучка уроков — Gemini 3.1 Charon; остальное — eleven_v4, всегда со словарём ударений.
