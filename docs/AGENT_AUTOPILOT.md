# Agent autopilot — standing instructions

These apply to every Cash Flow CFO agent session unless you override them in chat.

## 1. Always move on

After completing a PR or roadmap item:

- Do **not** stop and ask “want me to continue?”
- Implement the **next PR** in the design DAG (or next P3 item if no design doc)
- Run tests + build before commit
- Commit and push to `main` with `PR-N:` or `P3-N:` prefix

Stop only when:

- Truly blocked after multiple retries
- A design open question (§12) requires a product decision that changes behavior
- Tokens/context exhausted (leave a devlog + “next PR” note)

## 2. Daily write-up at 07:00 UTC+8

At the end of a substantial session (or when asked), write a **full** progress report to:

```
docs/devlog/YYYY-MM-DD-0700-hkt.md
```

Use the **HKT calendar date** for the scheduled drop (see [`docs/devlog/README.md`](devlog/README.md)).

The write-up must include: summary, commits, architecture, test count, user how-to, and next PRs.

## 3. Scope discipline

- One PR per commit message when possible
- No drive-by refactors
- Deterministic engine before AI
- i18n: en + zh-TW + ja for user-facing strings

## 4. Current DAG (Goal Reach Planner)

| Done | PR | Next |
|------|-----|------|
| ✅ | PR-1 Engine + tests | — |
| ✅ | PR-2 Planner UI | — |
| ✅ | PR-3 Conflicts + weekly focus | — |
| ✅ | PR-4 Simulator bridge | — |
| ✅ | PR-5 Planner fields on Goal | — |
| ⏳ | **PR-6** Print/CSV plan section | **← next** |
| | PR-6 Print/CSV plan section | |
| | PR-7 i18n polish | |
| | PR-8–10 AI coach | |