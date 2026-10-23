# humanizer-ua

Rewrite AI-sounding Ukrainian so it reads like a person, without changing what it says.

Ukrainian gets its AI slop from two directions at once: the English patterns every model produces, and a second layer that arrives through Russian, because so much Ukrainian training data is translated. A skill ported from English sees only the first.

## What this adds

Three projects meet in this one. The pattern taxonomy comes from
[blader/humanizer](https://github.com/blader/humanizer), which derives it from Wikipedia's
[Signs of AI writing](https://en.wikipedia.org/wiki/Wikipedia:Signs_of_AI_writing). The engineering
around it - a three-phase process, a deterministic linter, a detect mode, an eval gate - follows
[smixs/humanizer-ru](https://github.com/smixs/humanizer-ru). The Ukrainian layer is original here.

Active participles in -учий and -ючий that Ukrainian barely has, calqued case government, the vocative, ґ, «ялинки» with „лапки“ nested inside them, and a russianism list that the skill fixes as errors while refusing to treat them as proof of AI - a russianism points at a Russian link in the chain, not at a modern model.

## Install

```bash
git clone https://github.com/omelyanchuk2593/humanizer-ua.git ~/.claude/skills/humanizer-ua
```

Or install it as a plugin, from a marketplace:

```bash
/plugin marketplace add omelyanchuk2593/humanizer-ua
/plugin install humanizer-ua
```

## Use

Ask for an edit in українська, or in English:

```
Відредагуй цей текст: ...
```

Ask for an audit instead, and the skill reports without touching a word:

```
Перевір, чи не схоже це на текст нейромережі: ...
```

Check finished text with the linter, which does not consult the model at all:

```bash
python3 scripts/lint.py draft.md
python3 scripts/lint.py --self-test
```

The linter exits 1 when it finds a hard ban or a chatbot artifact, so it works as a CI gate.

## What it will not do

It never invents a fact. When a repair needs a number, a name, or a date the source does not have,
it cuts the claim or asks you - it does not supply one. That rule outranks every style rule here.

It is built for edited prose: articles, documentation, marketing copy, reports. Poetry, fiction,
chat, and quoted historical text are out of scope, and so are legal and academic writing, where a
nominal style and the passive voice are the genre rather than a defect. Quoted material is exempt
everywhere: quoting a marker is not using one.



## Patterns

| # | Pattern |
| --- | --- |
| 1 | Роздування значущості та спадщини |
| 2 | Перелік гучних імен замість контексту |
| 3 | Поверхневий аналіз через дієприслівникові звороти |
| 4 | Рекламний тон |
| 5 | Розмиті джерела |
| 6 | Шаблонний розділ «виклики та перспективи» |
| 7 | Затерті AI-слова |
| 8 | Роздута зв'язка замість простого «це» |
| 9 | «Не просто X, а Y» та обрізані заперечення |
| 10 | Штучні тріади |
| 11 | Синонімічна карусель і однакові початки речень |
| 12 | Фальшиві діапазони «від X до Y» |
| 13 | Пасив і зникла дійова особа |
| 14 | Тире по-англійськи |
| 15 | Забагато жирного |
| 16 | Списки з жирними мікрозаголовками |
| 17 | Заголовки З Великої Літери Кожного Слова |
| 18 | Емодзі |
| 19 | Англійські лапки замість «ялинок» і різнобій в апострофах |
| 20 | Сліди чатбота в тексті |
| 21 | Дисклеймери про межу знань і здогадки замість фактів |
| 22 | Підлабузницький тон |
| 23 | Канцелярська вода |
| 24 | Нагромадження застережень |
| 25 | Загальні оптимістичні фінали |
| 26 | Калькові дефісні композити |
| 27 | Удавання глибокої істини |
| 28 | Анонс замість самої думки |
| 29 | Заголовок, переказаний першим реченням |
| 30 | Розповідь про попередню версію |
| 31 | Вимушені панчлайни й драматичні обрубки |
| 32 | Формульні афоризми |
| 33 | Удавана відвертість на початку |
| 34 | Відповідь на заперечення, яких ніхто не висував |
| 35 | Відкидання вигаданих альтернатив |
| 36 | Активні дієприкметники теперішнього часу на -учий/-ючий |
| 37 | Псевдопасивні дієприкметники на -уємий, -аємий і калькові -имий |
| 38 | Дієприслівниковий зворот із чужим суб'єктом |
| 39 | Порушене керування дієслів і прийменників |
| 40 | «Згідно» і «відповідно» з неправильним відмінком |
| 41 | Прийменник «по» замість українських відповідників |
| 42 | Прийменник «при» замість українських конструкцій |
| 43 | Лексичні русизми-двійники |
| 44 | Семантичні кальки-«хибні друзі» |
| 45 | Кальковані сполучники й конектори |
| 46 | «Даний» як вказівне слово |
| 47 | «Знаходитися» замість «розташований», «міститься», «перебувати» |
| 48 | «Дозволяє», «включає в себе», «забезпечує» як універсальні дієслова |
| 49 | «Давайте» з дієсловом у першій особі множини |
| 50 | Втрачене милозвучне чергування у/в, і/й/та, з/із/зі |
| 51 | Апостроф: пропущений і зайвий |
| 52 | Літера ґ: пропуск у питомих словах і гіперкорекція |
| 53 | Норми Правопису-2019, яких немає в тренувальних корпусах |
| 54 | Втрачений кличний відмінок у звертанні |
| 55 | Родовий відмінок однини II відміни: -а чи -у |
| 56 | Знахідний замість родового при запереченні |
| 57 | Невідмінювані власні назви й прізвища |
| 58 | Присвійний займенник замість зворотного «свій» |
| 59 | Надлишкові займенники за англійським зразком |
| 60 | Подвійний і аналітичний ступінь порівняння |
| 61 | Нарощення при кількісних числівниках |
| 62 | «У два рази» замість синтетичної форми «удвічі» |
| 63 | «Більше 100» замість «понад 100» |
| 64 | Англійське форматування чисел, дат і відсотків |
| 65 | Велика літера за англійським зразком |
| 66 | Пошанне «Ви» з великої літери в масовому тексті |
| 67 | Кома після «однак» і оксфордська кома |
| 68 | Чоловічий рід за замовчуванням і непослідовні фемінітиви |
| 69 | Передавання чужомовного [h] через х замість г |
| 70 | Псевдоукраїнські маркери й гіперкорекція |

The full catalogue, with before and after for each pattern, is in
[references/patterns.md](references/patterns.md).

## Versions

- **1.0.0** first release: 70 patterns, a linter with 48 rules and 446 fixtures,
  18 evals, and a corpus of 59 legitimate Ukrainian samples that the linter must leave alone.

## Credits

- [blader/humanizer](https://github.com/blader/humanizer) by Siqi Chen, MIT - the pattern taxonomy
- [smixs/humanizer-ru](https://github.com/smixs/humanizer-ru) by Serge Shima, MIT - the engineering architecture
- [Wikipedia: Signs of AI writing](https://en.wikipedia.org/wiki/Wikipedia:Signs_of_AI_writing), by WikiProject AI Cleanup

## License

MIT. See [LICENSE](LICENSE), which keeps both upstream copyright notices.
