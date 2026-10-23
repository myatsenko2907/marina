#!/usr/bin/env python3
"""Check this skill package without external dependencies.

Run before publishing:

    python3 scripts/lint.py --self-test
    python3 scripts/validate-package.py

The checks are ordered from cheapest to most specific. Every failure exits
non-zero with one sentence saying what to fix.
"""
from __future__ import annotations

import importlib.util
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PROBLEMS: list[str] = []


def problem(message: str) -> None:
    PROBLEMS.append(message)


def read(relative: str) -> str:
    path = ROOT / relative
    if not path.exists():
        problem("Missing required file: %s" % relative)
        return ""
    return path.read_text(encoding="utf-8")


SKILL = read("SKILL.md")
README = read("README.md")
AGENTS = read("AGENTS.md")
LICENSE = read("LICENSE")
PATTERNS = read("references/patterns.md")

try:
    PLUGIN = json.loads(read(".claude-plugin/plugin.json") or "{}")
except json.JSONDecodeError as exc:
    PLUGIN = {}
    problem(".claude-plugin/plugin.json is not valid JSON: %s" % exc)

try:
    MARKETPLACE = json.loads(read(".claude-plugin/marketplace.json") or "{}")
except json.JSONDecodeError as exc:
    MARKETPLACE = {}
    problem(".claude-plugin/marketplace.json is not valid JSON: %s" % exc)


# --- skill metadata ---------------------------------------------------------

metadata_match = re.match(r"\A---\r?\n(.*?)\r?\n---\r?\n", SKILL, re.DOTALL)
metadata = metadata_match.group(1) if metadata_match else ""
if not metadata_match:
    problem("SKILL.md must begin with YAML metadata delimited by ---")

skill_name = ""
name_match = re.search(r"(?m)^name:\s*(\S+)\s*$", metadata)
if name_match:
    skill_name = name_match.group(1)
else:
    problem("Add a name field to the SKILL.md metadata")

if not re.search(r"(?m)^description:", metadata):
    problem("Add a description field to the SKILL.md metadata; agents use it to decide when to load the skill")

for unsupported in ("compatibility:", "allowed-tools:"):
    if re.search(r"(?m)^%s" % re.escape(unsupported), metadata):
        problem("Remove the unsupported YAML field %s from SKILL.md" % unsupported[:-1])

skill_version = ""
version_match = re.search(r'(?m)^\s+version:\s*["\']([^"\']+)["\']\s*$', metadata)
if version_match:
    skill_version = version_match.group(1)
else:
    problem("Add metadata.version to SKILL.md")

readme_version = ""
readme_version_match = re.search(r"(?m)^- \*\*([0-9]+\.[0-9]+\.[0-9]+)\*\*", README)
if readme_version_match:
    readme_version = readme_version_match.group(1)
else:
    problem("Add a version entry to README.md in the form - **1.0.0** ...")

versions = {v for v in (skill_version, readme_version, str(PLUGIN.get("version", ""))) if v}
if len(versions) > 1:
    problem("Use one package version everywhere; found %s" % sorted(versions))

if skill_name and PLUGIN.get("name") and PLUGIN["name"] != skill_name:
    problem("plugin.json name %r must match the SKILL.md name %r" % (PLUGIN["name"], skill_name))


# --- package shape ----------------------------------------------------------

skill_files = {path.relative_to(ROOT) for path in ROOT.rglob("SKILL.md")}
if skill_files != {Path("SKILL.md")}:
    problem("Keep exactly one SKILL.md, at the repo root; found %s" % sorted(map(str, skill_files)))
if (ROOT / "SKILL.md").is_symlink():
    problem("SKILL.md must be a regular file, not a symlink")
if PLUGIN.get("skills") != ["./"]:
    problem('Set "skills": ["./"] in plugin.json so the loader finds the root SKILL.md')

marketplace_plugins = MARKETPLACE.get("plugins") or []
if not any(p.get("source") == "./" for p in marketplace_plugins):
    problem('marketplace.json must list a plugin with "source": "./"')

if SKILL and len(SKILL.splitlines()) > 500:
    problem("Keep SKILL.md at 500 lines or fewer; it is %d" % len(SKILL.splitlines()))

if AGENTS and "## Writing style" not in AGENTS:
    problem("Keep a '## Writing style' section in AGENTS.md")


# --- attribution guard ------------------------------------------------------
# This package is a derivative of two MIT projects. Losing these lines during a
# refactor would breach both licences, so CI holds them in place.

REQUIRED_ATTRIBUTION = (
    "Copyright (c) 2025 Siqi Chen",
    "https://github.com/blader/humanizer",
    "Copyright (c) 2026 Serge Shima",
    "https://github.com/smixs/humanizer-ru",
)
for line in REQUIRED_ATTRIBUTION:
    if line not in LICENSE:
        problem("LICENSE must keep the upstream attribution line: %s" % line)


# --- pattern numbering ------------------------------------------------------

pattern_numbers = [int(n) for n in re.findall(r"(?m)^### ([0-9]+)\. ", PATTERNS)]
if not pattern_numbers:
    problem("references/patterns.md must number its patterns as '### N. Title'")
else:
    expected = list(range(1, len(pattern_numbers) + 1))
    if pattern_numbers != expected:
        problem("Number the patterns in references/patterns.md from 1 through %d without gaps; found %s"
                % (len(pattern_numbers), pattern_numbers))

    readme_numbers = sorted({int(n) for n in re.findall(r"(?m)^\| ([0-9]+) \|", README)})
    if readme_numbers != expected:
        problem("The README table must list patterns 1 through %d; found %s"
                % (len(pattern_numbers), readme_numbers))


# --- evals ------------------------------------------------------------------

evals_path = ROOT / "evals" / "evals.json"
evals: list[dict] = []
if not evals_path.exists():
    problem("Missing evals/evals.json")
else:
    try:
        payload = json.loads(evals_path.read_text(encoding="utf-8"))
        evals = payload.get("evals", [])
    except json.JSONDecodeError as exc:
        problem("evals/evals.json is not valid JSON: %s" % exc)

    seen_ids = set()
    for index, case in enumerate(evals):
        for field in ("id", "name", "category", "prompt", "expectations"):
            if not case.get(field):
                problem("Eval %d is missing the %s field" % (index, field))
        case_id = case.get("id")
        if case_id in seen_ids:
            problem("Duplicate eval id: %s" % case_id)
        seen_ids.add(case_id)
        if not isinstance(case.get("expectations"), list) or not case.get("expectations"):
            problem("Eval %s must list at least one expectation" % case_id)


# --- linter fixtures --------------------------------------------------------
# End to end: the linter must pass clean text and stop dirty text. A linter that
# never fires, or fires on everything, passes its own self-test and still fails
# the user.

lint_path = ROOT / "scripts" / "lint.py"
if not lint_path.exists():
    problem("Missing scripts/lint.py")
else:
    spec = importlib.util.spec_from_file_location("skill_lint", lint_path)
    lint_module = importlib.util.module_from_spec(spec)
    assert spec and spec.loader
    spec.loader.exec_module(lint_module)

    for fixture, expect_clean in (("clean.md", True), ("dirty.md", False)):
        fixture_path = ROOT / "evals" / "fixtures" / fixture
        if not fixture_path.exists():
            problem("Missing evals/fixtures/%s" % fixture)
            continue
        findings = lint_module.lint(fixture_path.read_text(encoding="utf-8"))
        blocking = [f for f in findings if f["severity"] in ("ERROR", "ARTIFACT")]
        if expect_clean and blocking:
            problem("evals/fixtures/clean.md must pass the linter, but %d rule(s) fired: %s"
                    % (len(blocking), ", ".join(sorted({f["code"] for f in blocking}))))
        if not expect_clean and not blocking:
            problem("evals/fixtures/dirty.md must trip at least one ERROR or ARTIFACT rule")


# --- report -----------------------------------------------------------------

if PROBLEMS:
    print("Package check failed with %d problem(s):" % len(PROBLEMS))
    for item in PROBLEMS:
        print("  - " + item)
    raise SystemExit(1)

print("%s v%s is valid: %d patterns, %d evals" % (
    skill_name or "package", skill_version or "?", len(pattern_numbers), len(evals)))
