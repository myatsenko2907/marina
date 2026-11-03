"""Сценарий ролика «План лидобалов» (≈45 с, 9:16): проблема → что сделали → сколько экономит.

Сцены с героиней генерирует Vivix W1 (она сама произносит реплики по-русски).
Сцена 1 — без референса; из неё берётся кадр с лицом, который становится референсом
для остальных сцен, чтобы героиня была одна и та же.
"""

HEROINE = (
    "A woman in her early thirties, marketing director of a network of IT schools: "
    "shoulder-length dark-blonde hair, {outfit}. "
)
STYLE = (
    " Cinematic vertical video, realistic, shallow depth of field, natural lip sync, "
    "she speaks Russian clearly and at a natural pace. No on-screen text, no subtitles, no logos."
)
REF = "Image 1 defines the woman's face and hair. "

SCENES = [
    {"id": "s1_problem", "outfit": "grey knit sweater, glasses",
     "prompt": "Late evening, small office, two monitors full of spreadsheets with red cells, stacks of printouts, "
               "a cold cup of coffee. One continuous shot, slow push-in. She rubs her eyes, then looks into the "
               "camera, tired, and says in Russian: \"Сто шесть филиалов. CRM, Фейсбук, Гугл… "
               "Каждое утро — три часа в таблицах, чтобы понять, кто проваливает план.\""},
    {"id": "s2_solution", "outfit": "light beige blazer over a white top",
     "prompt": "Bright morning, modern open-space office, laptop on the desk. One continuous medium close-up. "
               "She turns to the camera with a confident smile and says in Russian: \"Тогда мы с Claude сделали "
               "сервис. Он сам собирает данные, считает лидобалы и показывает, какой филиал отстаёт.\""},
    {"id": "s3_tasks", "outfit": "light beige blazer over a white top",
     "prompt": "Same bright office. One continuous shot: she points at the laptop screen, then looks at the camera "
               "and says in Russian, energetic: \"А маркетолог филиала сразу видит задачи: где дорогой лид, "
               "где заявки не обработаны, где заканчивается бюджет.\""},
    {"id": "s4_result", "outfit": "light beige blazer over a white top",
     "prompt": "Morning, cozy corner of the office by the window, she holds a cup of coffee, relaxed. One continuous "
               "shot, slow pull-back. She smiles at the camera and says in Russian: \"Раньше — три часа в день. "
               "Теперь — пять минут в десять утра. Это больше шестидесяти часов в месяц.\""},
]
