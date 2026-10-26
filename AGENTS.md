# AGENTS.md

This project is developed by three Codex workstreams. Do not let multiple workstreams edit the same ownership area unless the Lead defines a contract first.

## Global rules

1. Read `GEN.md` and `WORKFLOW.md` before changing architecture.
2. Do not introduce paid APIs as a required dependency.
3. Keep every external/local AI integration behind a provider interface.
4. Do not add a database unless the user explicitly changes the requirement.
5. Do not add NestJS unless a requirement in `GEN.md` makes it necessary.
6. Prefer small, testable modules.
7. Every new feature proposal must include at least 3 approaches, compare tradeoffs, then choose one.
8. Preserve manual overrides: user story, user image, user audio.
9. Keep Dharma review mandatory for generated/adapted content.
10. Never regenerate an entire project if a single scene can be regenerated.

## CODEX 01 — LEAD / CORE

Owns:
- contracts
- workflow engine
- temporary job lifecycle
- filesystem abstraction
- architecture docs
- integration review
- error/retry contracts

Must not own UI details, ComfyUI internals or FFmpeg filters unless defining shared contracts.

## CODEX 02 — CONTENT / AI

Owns:
- Ollama provider
- ContentPlanner agent
- ScriptWriter agent
- DharmaReview agent
- Storyboard agent
- reference story loading
- ComfyUI image provider
- prompt generation and consistency strategies

## CODEX 03 — VIDEO / UX

Owns:
- Next.js screens
- story editor
- storyboard editor
- asset upload
- FFmpeg renderer
- subtitle generation
- local TTS integration
- progress UI
- preview and export
- VideoQA agent

## Handoff contract

Flow:

```text
Lead defines contract
→ owner implements
→ unit tests
→ integration test
→ Lead review
→ human review
```

Do not silently change shared interfaces.
