# Енотик — сцены для урока 3 «Міні-мультик за 30 секунд»

Сгенерировано 2026-11-14 в Vivix `vivix-w1`. Это цепочка урока: паспорт героя → сцены с тем же героем через `ref_images`.

## Файлы

| Файл | Что это |
| - | - |
| `raccoon-hero.jpg` / `raccoon-hero.mp4` | Паспорт героя (кадр из 5-секундного ролика), jpg 1080 по высоте |

| `raccoon-s1.mp4` + `raccoon-s1-mid.jpg` | горище, єнот знаходить коробку, очі загоряються ідеєю (6,5 с, кадр с 3-й секунды) |
| `raccoon-s2.mp4` + `raccoon-s2-mid.jpg` | фарбує коробку, клеїть зірки, друшляк-шолом (6,5 с, кадр с 3-й секунды) |
| `raccoon-s3.mp4` + `raccoon-s3-mid.jpg` | сидить у коробці-ракеті, тисне червону кнопку, коробка трясеться (6,5 с, кадр с 3-й секунды) |
| `raccoon-s4.mp4` + `raccoon-s4-mid.jpg` | коробка-ракета летить серед зірок і планет (6,5 с, кадр с 3-й секунды) |
| `raccoon-s5.mp4` + `raccoon-s5-mid.jpg` | вечір, ракета в кутку, єнот усміхається й біжить вечеряти (6,5 с, кадр с 3-й секунды) |

Видео: 720×1280, H.264 CRF 26, AAC 96k (звук W1 сохранён), faststart, 0,4–0,9 МБ. Кадры: 1080 px по длинной стороне.

## Консистентность героя

Во всех пяти сценах тот же енот: жёлтый вязаный свитер, маска, полосатый хвост, та же морда. Перегенерации не понадобились. В s3–s4 на енота надет друшляк-шлем, свитер частично закрыт коробкой — так задумано сюжетом.

Замечание: «рисунок ракеты» в s5 есть, текста и букв в кадре нет.

## Как сделано

1. Паспорт героя — text-to-video, 9:16, 5 с, seed 31337 (`job_259b367e5e9263518dcf562a21aec7f7`). Последний кадр (№115) загружен через `POST /v1/files/images`.
2. Каждая сцена — `POST /v1/videos/jobs` c `ref_images: [{url: <кадр героя>}]`, 9:16, 6 с, seed 31337. В начале каждого промпта стоит якорь «Image 1 defines the character… keep his look exactly».

## Промпты

### Паспорт героя

```text
One continuous shot, static camera, vertical framing. Character turnaround-style hero shot: a cute small raccoon character standing upright on its hind legs, full body visible from head to toes, with big shiny expressive eyes, a classic black eye mask, soft grey fur, a fluffy striped ringed tail, wearing a cozy bright yellow knitted sweater. The raccoon smiles and gives a small friendly wave, then stands still. Stylized 3D animation, original character design in a modern animated feature look, soft studio lighting, plain light cream background, clean and colorful. No text, no letters, no logos.
```

### s1 (`job_94e6c74a6ab242e293fd2e331aafeacf`)

```text
Image 1 defines the character: the same cute raccoon with big shiny eyes, black eye mask, fluffy striped tail and bright yellow knitted sweater; keep his look exactly. One continuous shot. In a cozy wooden attic, a warm beam of sunlight shines through a small round window with floating dust. The raccoon discovers a big cardboard box, walks up to it, touches it, and his eyes light up with an idea, a big excited smile. Gentle slow push-in. Stylized 3D animation, modern animated feature look, warm soft light. No text, no letters, no logos.
```

### s2 (`job_902fc5b1f07d82f56c64a098a09a2be4`)

```text
Image 1 defines the character: the same cute raccoon with big shiny eyes, black eye mask, fluffy striped tail and bright yellow knitted sweater; keep his look exactly. One continuous shot. In a cozy wooden attic, the raccoon happily paints the big cardboard box with a brush in bright colors, sticks paper stars on it, then puts a metal kitchen colander on his head like a helmet and grins. Playful cheerful mood, static camera. Stylized 3D animation, modern animated feature look, warm soft light. No text, no letters, no logos.
```

### s3 (`job_f785c98375ec4ee812e3f2fe8c8c7882`)

```text
Image 1 defines the character: the same cute raccoon with big shiny eyes, black eye mask, fluffy striped tail and bright yellow knitted sweater, wearing a kitchen colander as a helmet; keep his look exactly. One continuous shot. The raccoon sits inside a painted cardboard box rocket decorated with paper stars in a cozy attic, he presses a big red button, the box starts shaking and rumbling, he laughs with joy. Medium shot, static camera with slight shake. Stylized 3D animation, modern animated feature look. No text, no letters, no logos.
```

### s4 (`job_a598bd710afbdc87cb7ab7562f0ffbe7`)

```text
Image 1 defines the character: the same cute raccoon with big shiny eyes, black eye mask, fluffy striped tail and bright yellow knitted sweater, wearing a kitchen colander as a helmet; keep his look exactly. One continuous shot. A painted cardboard box rocket with paper stars flies through outer space among twinkling stars and colorful cartoon planets, the raccoon leans out of the box looking around in delight, eyes wide with wonder. Smooth camera following the rocket. Stylized 3D animation, modern animated feature look, magical colorful lighting. No text, no letters, no logos.
```

### s5 (`job_06b61c7445573d12041c41b80c4cef6b`)

```text
Image 1 defines the character: the same cute raccoon with big shiny eyes, black eye mask, fluffy striped tail and bright yellow knitted sweater; keep his look exactly. One continuous shot. Evening in the cozy wooden attic, warm lamp light, the painted cardboard box rocket with paper stars and a hand-drawn rocket picture stands in the corner. The raccoon looks at it and smiles happily, then turns and runs out of the attic toward the stairs as if called for dinner. Static camera. Stylized 3D animation, modern animated feature look, warm evening light. No text, no letters, no words, no logos.
```

## Расход

6 генераций `vivix-w1`: 5 с + 5 × 6 с = 35 с × $0.005 = $0.175, плюс сбор за референс-картинку $0.015 × 5 = $0.075. **Итого ≈ $0.25 (≈ 83 W-кредита).** Перегенераций не было.
