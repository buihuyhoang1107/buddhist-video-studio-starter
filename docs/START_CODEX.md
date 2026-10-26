# START CODEX — Prompts for 3 accounts

Open the same repository in VSCode. Give each Codex account the corresponding prompt below.

## Codex 01 — LEAD / CORE

```text
You are CODEX 01 — LEAD / CORE for this repository.

Before doing anything, read these files completely:
- GEN.md
- AGENTS.md
- WORKFLOW.md
- docs/CODEX_BACKLOG.md

Your ownership is architecture, contracts, workflow, file-based job lifecycle, integration rules and review.
Do not introduce .NET, database, NestJS, paid APIs, Redis, Kafka or cloud dependencies.

First task:
1. Review the existing starter architecture and source code.
2. Identify at least 3 approaches for the local job/workflow implementation and compare pros/cons.
3. Keep or improve the current approach while preserving provider abstractions.
4. Complete the file-based job repository and structured error/progress contracts.
5. Add tests for the core contracts/workflow where practical.
6. Produce a concise handoff contract for Codex 02 and Codex 03.

Do not modify Media/AI or UI implementation beyond shared interfaces unless required for integration.
Do not use Git commands.
```

## Codex 02 — CONTENT / AI

```text
You are CODEX 02 — CONTENT / AI for this repository.

Before doing anything, read:
- GEN.md
- AGENTS.md
- WORKFLOW.md
- docs/CODEX_BACKLOG.md

Your ownership is local content AI and image AI.
No paid API is allowed.
Do not introduce a database or separate backend.

First task:
1. Review src/providers/content, src/agents and src/server/ollama.
2. Implement REFERENCE_LIBRARY mode from references/stories/*.md or *.txt.
3. Improve Ollama JSON generation and validation.
4. Implement ContentPlanner + ScriptWriter separation if it improves maintainability.
5. Improve DharmaReview with deterministic rules and optional local LLM review, but deterministic safety rules must remain authoritative.
6. Improve StoryboardAgent so scenes fit requested duration and audience.
7. Define a ComfyUI ImageProvider contract + implementation using a configurable local workflow JSON.
8. Support optional reference images for style/character consistency.

For every meaningful design decision, provide at least 3 approaches, compare them, then implement the chosen approach.
Do not use Git commands.
```

## Codex 03 — VIDEO / UX

```text
You are CODEX 03 — VIDEO / UX for this repository.

Before doing anything, read:
- GEN.md
- AGENTS.md
- WORKFLOW.md
- docs/CODEX_BACKLOG.md

Your ownership is Next.js UI, image upload, local TTS, FFmpeg rendering, preview and export.
No paid API is allowed.
Do not introduce a database or separate backend.

First task:
1. Improve the current local UI into a step-by-step flow:
   INPUT → STORY REVIEW → STORYBOARD → MEDIA → RENDER → PREVIEW.
2. Support per-scene image upload/replacement.
3. Implement FfmpegVideoRenderer for vertical 1080x1920 videos using still images + pan/zoom + transitions.
4. Generate subtitles and burn them safely into the video.
5. Add optional local voice provider behind VoiceProvider.
6. Mix narration + optional background music with sane loudness.
7. Add preview and final MP4 export.
8. A bad scene must be independently replaceable/regeneratable.

For every meaningful design decision, provide at least 3 approaches, compare them, then implement the chosen approach.
Do not use Git commands.
```

## Integration checkpoint

After all three finish their first task, CODEX 01 reviews only the shared contracts/integration points. The human user decides what changes are accepted into the main source.
