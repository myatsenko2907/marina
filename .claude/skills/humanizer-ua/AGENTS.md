# Guide for agents

This file explains how to change humanizer-ua without breaking its package, its prompt, or its licence.

## What this repo contains

humanizer-ua is an agent skill written in Markdown, plus a deterministic linter that enforces the rules a model cannot be trusted to enforce on itself. `SKILL.md` is the prompt agents read. There is no build step.

Keep the skill portable. Do not write instructions that tie it to one agent or one tool.

The working language is Ukrainian. `SKILL.md` and `references/patterns.md` are written in Ukrainian because the skill performs better when its rules are in the language it edits. This repo's English files are `README.md`, `AGENTS.md`, `LICENSE`, and code comments.

## Key files

- `SKILL.md` is the prompt and the source of truth. It holds the metadata, the three-phase process, the hard bans, and the pattern map.
- `references/patterns.md` holds the 70 numbered patterns with their before and after examples. `SKILL.md` points at it rather than repeating it.
- `scripts/lint.py` enforces the hard bans deterministically. Rules live in three classes: ARTIFACT, ERROR, WARN.
- `scripts/validate-package.py` checks the package: versions, numbering, evals, fixtures, and the attribution in `LICENSE`.
- `evals/evals.json` is the behaviour suite. `evals/fixtures/` holds the two files the linter is tested against end to end.
- `.claude-plugin/plugin.json` and `.claude-plugin/marketplace.json` make the repo installable as a plugin and as a marketplace.

## Rules for changes

**Patterns.** Patterns are numbered without gaps. Adding, removing, or renumbering one means updating `references/patterns.md`, the pattern map in `SKILL.md`, the README table, and every cross-reference. `validate-package.py` fails the build if these drift apart.

**Linter rules.** Every rule must carry `must_match` and `must_not_match` fixtures, and `must_not_match` must contain a tempting near-miss, not a trivially different string. A rule that cannot prove itself does not ship. An ERROR-class false positive blocks correct text and is the worst defect this repo can have; when a rule cannot be made safe, move it to WARN and say why in its rationale.

**Anti-fabrication.** The rule against inventing facts outranks every style rule. No change may make it easier for the model to add a fact, name, number, date, quote, or citation that is absent from the source. When a pattern's fix needs a detail the source does not have, the fix is to cut the claim or ask the writer, never to supply one.

**False positives.** The skill has a section on what not to flag. Any new rule must be checked against it. Correct Ukrainian that a competent writer would produce must survive the skill untouched.

**Version.** Keep the same version in `SKILL.md` under `metadata.version`, in the first README version entry, and in `.claude-plugin/plugin.json`.

**Attribution.** `LICENSE` names two upstream MIT projects. Those lines are load-bearing, not decoration: removing them breaches both licences, and `validate-package.py` will fail.

## Checks before publishing

```bash
python3 scripts/lint.py --self-test
python3 scripts/validate-package.py
```

Do not run `lint.py` against `SKILL.md` or `references/patterns.md`. Those files quote bad writing on purpose, and the linter is built to flag exactly that. Lint finished text only.

## Writing style

Use Plain Language in prompts, documentation, code comments, and validation messages.

- Lead with the main point.
- Use common words and active voice.
- Keep sentences and paragraphs short.
- Use one term for the same item.
- Use `must` for requirements.
- Use headings, lists, and tables when they help the reader.
- Remove repeated or unnecessary words.
- Keep exact identifiers, commands, paths, quotations, watched phrases, and behaviour-bearing examples.
- Keep the full technical meaning.
