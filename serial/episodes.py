"""Сценарій міні-серіалу «Марина + AI»: 4 серії по 20 с (два кліпи по 10 с).

Кліп "ref" будується з фото героїні як референсу; кліп "chain" стартує
з останнього кадру попереднього кліпу, щоб сцена йшла без склейки.
"""

HEROINE = (
    "Image 1 defines the woman's face and hair only (wavy blonde shoulder-length hair, "
    "warm smile); ignore the beach and swimsuit from the photo. She is Maryna, a stylish "
    "young marketer: {outfit}, neat natural makeup, soft styled waves. "
)
STYLE = (
    " Cinematic vertical video, realistic, shallow depth of field, natural lip sync. "
    "No on-screen text, no subtitles, no logos."
)

EPISODES = [
    {
        "n": 1, "title": "Дедлайн",
        "teaser": "Що вона побачила на екрані? Серія 2 →",
        "clips": [
            {"mode": "ref", "outfit": "tailored oversized beige blazer, white silk top, gold minimal jewelry",
             "prompt": "Night, modern Kyiv apartment, laptop glow on her face, city lights in the window. "
                       "One continuous shot, slow push-in. First she reads a message on her phone and her face "
                       "freezes. Then she looks into the camera and says in Ukrainian: "
                       "\"Завтра о дев'ятій — запуск кампанії. А в мене нічого немає.\""},
            {"mode": "chain",
             "prompt": "One continuous shot. She puts the phone down, takes a breath, turns to the laptop with a "
                       "determined half-smile and says in Ukrainian: \"На першому занятті в IT STEP ми налаштували "
                       "мого AI-асистента. Перевіримо.\" She types fast. Finally the laptop screen flashes bright, "
                       "lighting her face, her eyes widen and she whispers: \"Стоп... це за дві хвилини?\""},
        ],
    },
    {
        "n": 2, "title": "9:00",
        "teaser": "Яку задачу дасть бос? Серія 3 →",
        "clips": [
            {"mode": "ref", "outfit": "elegant black turtleneck, high-waisted camel trousers, gold hoop earrings",
             "prompt": "Morning, glass meeting room in a modern Kyiv office. One continuous two-shot, no cuts: Maryna "
                       "stands next to a big screen with colorful charts and ad creatives, and across the table a "
                       "stern manager in his forties in a navy suit sits with arms crossed; both stay in frame the "
                       "whole time and there are no other people. Maryna says in Ukrainian: \"Контент-план на "
                       "місяць, двадцять креативів і три гіпотези для A/B-тесту.\" Then the manager raises his "
                       "eyebrows and says in Ukrainian: \"За одну ніч? Хто це робив?\""},
            {"mode": "ref",
             "prompt": "Same glass meeting room, over-the-shoulder shot from behind the manager in a navy suit, "
                       "focus on Maryna standing by the screen, one continuous shot, no other women. "
                       "Maryna smiles calmly and says in Ukrainian: \"Я. І мій AI-асистент.\" "
                       "Then the manager slowly leans forward, a slight smirk, and says in Ukrainian: "
                       "\"Тоді для тебе є справжня задача. І вона тобі не сподобається.\" "
                       "Finally the camera pushes in on Maryna's face as her smile fades."},
        ],
    },
    {
        "n": 3, "title": "Злив бюджету",
        "teaser": "Хто їй дзвонить? Фінал — серія 4 →",
        "clips": [
            {"mode": "ref", "outfit": "cream knit cardigan over a white shirt, delicate gold necklace, wireless earbuds",
             "prompt": "Evening, cozy stylish home office with warm lamps. Maryna sits at a laptop, on the laptop a "
                       "live online lesson with a teacher showing a sales funnel diagram. She looks into the camera "
                       "and says in Ukrainian: \"Реклама їсть бюджет, а продажів нуль. Сьогодні на курсі — "
                       "аналітика воронки.\" Then she turns to the laptop and starts typing."},
            {"mode": "chain",
             "prompt": "One continuous shot. On the laptop a funnel chart appears, one stage turns bright red. Maryna "
                       "leans in, points at the screen and exclaims in Ukrainian: \"Ось де ми втрачаємо сімдесят "
                       "відсотків клієнтів!\" Then her phone on the desk starts ringing loudly. She looks at it "
                       "surprised, picks it up and says quietly in Ukrainian: \"Алло?\""},
        ],
    },
    {
        "n": 4, "title": "Офер",
        "teaser": None,
        "clips": [
            {"mode": "ref", "outfit": "chic long camel coat over a black dress, sunglasses pushed up in her hair, gold watch",
             "prompt": "Sunny autumn day, she walks confidently down a beautiful old Kyiv street (Podil), holding "
                       "her phone to her ear, tracking shot. She says in Ukrainian: \"Так, автоматизація працює: "
                       "чат-бот відповідає клієнтам, навіть коли я сплю.\" Then she stops, listens, and breaks into "
                       "a wide smile: \"Посада AI-маркетолога? Я подумаю.\""},
            {"mode": "chain",
             "prompt": "She lowers the phone, laughs softly, then looks straight into the camera with a warm, "
                       "confident smile and says in Ukrainian: \"Чотири місяці тому я боялася, що ШІ мене замінить. "
                       "А тепер я ним керую.\" Finally she winks and walks on as golden leaves fall."},
        ],
    },
]
