# IT Academy STEP Cambodia — new website

Phone-first static website built from the brief *"STEP Cambodia: new website structure and copy"* (24 Sept 2026).

## Pages (`docs/`)

| Page | File |
|---|---|
| Homepage | `index.html` |
| Choose your path (comparison) | `choose-your-path.html` |
| Bachelor of Computer Science | `bachelor.html` |
| Bachelor majors | `bachelor-software-development.html`, `bachelor-computer-graphics-design.html`, `bachelor-digital-marketing-communication.html` |
| Associate Degree (3 majors, tabs + PDFs) | `associate-degree.html` |
| International Professional Diploma (4 majors + PDFs) | `professional-diploma.html` |
| Short Courses (catalogue with filters, Corporate Training) | `short-courses.html` |
| Admission: steps, tuition fees, schedule, FAQ, enquiry form | `admission.html` |
| About STEP: mission, accreditation, Sisters of Code, campuses | `about.html` |
| Contacts and location | `contacts.html` |

Enroll Now, News, Vacancies and Student stories link to the existing pages on cambodia.itstep.org, as the brief specifies.

Every page has a sticky contact bar with **Telegram**, **Messenger** and a call button, the top bar has the city selector and phone number, and on phones the **Apply** button stays visible next to the menu. EN/KM switches the interface (menu, buttons, contact bar).

## Editing

All content and settings are in `src/data.mjs` (contacts, curricula, courses, FAQ); page templates are in `src/build.mjs`.

```bash
npm run build   # regenerate docs/*.html (+ src/curricula.json)
npm run pdf     # regenerate curriculum PDFs in docs/files (pip install reportlab)
npm run serve   # preview at http://localhost:8080
npm run tts -- "Text" docs/audio/name.mp3 [voiceId]   # ElevenLabs voice-over → MP3
```

### ElevenLabs (text-to-speech)

Copy `.env.example` to `.env` and set `ELEVENLABS_API_KEY`. `.env` is git-ignored. The key is used only at build time (`src/elevenlabs.mjs`); generated MP3s go to `docs/` and can be embedded with `<audio src="audio/name.mp3" controls>`. Never put the key into page JS — the site is static and anyone could read it.

## Before launch — replace placeholders

- `CONFIG` in `src/data.mjs`: real phone, Telegram and Messenger links, email.
- `CONFIG.formEndpoint`: URL for enquiry-form submissions (CRM webhook / form service). Without it the form only shows the confirmation message.
- Campus addresses, opening hours and photos (`CAMPUSES` in `src/build.mjs`).
- Short-course catalogue (`COURSES`) is sample data — replace with the live course list.
- Curriculum for *Digital Business and AI* diploma (not in the brief).
- Khmer translation of the page body copy (only the interface is translated now).

## Hosting

`docs/` is a ready static site: enable GitHub Pages → *Deploy from branch* → folder `/docs`, or upload the folder to any hosting.

## Vivix video generation (`vivix/`)

Client for the [Vivix World Video Generation API](https://docs.vivix.ai/video-generation/world-video-generation) (model W1). Node 18+, no dependencies. Create an API key at <https://platform.vivix.ai/> and keep it in the `VIVIX_API_KEY` environment variable — never commit it or put it into `docs/` (the site is public).

```bash
export VIVIX_API_KEY=...
npm run video -- "Students code together in a bright classroom, camera slowly pans" --duration 8 --aspect 16:9
npm run video -- "The student from image 1 waves at the camera" --image photo.png --model vivix-w1-fast
```

Prints the URL of the finished MP4. Local files passed to `--image`, `--audio`, `--first`, `--last` are uploaded automatically. Models: `vivix-w1` (cheapest, 1 W credit/sec), `vivix-w1-fast` (3), `vivix-w1-ultrafast` (4).

From code:

```js
import { Vivix } from './vivix/client.mjs';
const vivix = new Vivix();                       // reads VIVIX_API_KEY
const job = await vivix.generateVideo({ prompt: '...', duration: 8, aspect_ratio: '9:16' });
console.log(job.video_url);
```

## Демо для презентации курса «ИИ с нуля до про»

Папка [`coffee-demo/`](coffee-demo/README.md) — интерактивное демо на английском «Kape Apo AI Studio» (кофейня в Давао): бизнес-план, анализ локации, финмодель, бренд, меню, видео Vivix, креативы, план запуска и чат-бот. Откройте `coffee-demo/index.html` в браузере.

Папка [`studio-live/`](studio-live/README.md) — версия 2: вписываете любой бизнес, и ИИ пишет полное решение в реальном времени (работает как опубликованная страница claude.ai).

Папка [`pharmacy-demo/`](pharmacy-demo/README.md) — вариант 3: аптека из Toril (Давао) открывает второе отделение — анализ локации, финмодель филиала, видео Vivix и чат-бот.

Папка [`tshirt-demo/`](tshirt-demo/README.md) — вариант 4: студия печати на футболках Tatak Prints в Давао.

Папка [`tuktuk-demo/`](tuktuk-demo/README.md) — вариант 5 (на русском): сервис туктуков в Киеве, в два раза дешевле такси.
