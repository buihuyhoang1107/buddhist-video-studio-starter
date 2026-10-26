# GEN.md — Local AI Buddhist Video Studio

## Mission

Build a local-first application that creates gentle Buddhist educational videos for CHILD, SENIOR and GENERAL audiences without requiring paid external APIs.

Primary flow:

```text
Topic / Story
→ Content preparation
→ Dharma review
→ Storyboard
→ Images
→ Voice
→ Subtitle
→ FFmpeg render
→ Preview
→ Export MP4
```

## Non-negotiable architecture rules

1. No .NET in this project.
2. No database in V1.
3. No separate NestJS backend in V1.
4. Next.js provides the UI and light local server/runtime.
5. Use native/local tools through provider interfaces.
6. Do not hard-code one AI model into the workflow.
7. Temporary job state may be stored in `temp/<jobId>/` and deleted after success.
8. Final videos go to `output/`.
9. Human review must remain possible before final export/publishing.
10. One bad scene should be regeneratable without regenerating the whole video.

## Input modes

### Content
- `AI_GENERATE`
- `USER_STORY`
- `REFERENCE_LIBRARY`

### Images
- `AI_GENERATE`
- `USER_UPLOAD`
- `MIXED`

### Voice
- `LOCAL_TTS`
- `USER_AUDIO`
- `NONE`

### Media
- `IMAGE_VIDEO` — V1 default
- `LOCAL_GENERATIVE_VIDEO` — future/optional

## Audience rules

### CHILD
- Prefer 30–60 seconds.
- One clear lesson per video.
- Use short, simple Vietnamese sentences.
- Prefer stories, characters and everyday situations.
- Avoid frightening hell imagery, gore, threats, coercion and superstition.
- Never manipulate a child with fear of karma or punishment.

### SENIOR
- Prefer 45–120 seconds.
- Calm narration, slower pacing and larger subtitles.
- Prefer gratitude, compassion, family, letting go, mindfulness and peace.
- Do not present spiritual material as a replacement for medical care.
- Avoid financial solicitation and fear-based claims.

## Dharma/source rules

Never attribute a sentence to the Buddha unless the source is verified.

Every script should classify source status as one of:
- `VERIFIED`
- `INTERPRETATION`
- `STORY`
- `UNKNOWN`

`UNKNOWN` must not auto-pass review.

The Dharma review checks at minimum:
- false Buddha quote
- fear/threat
- coercion
- superstition
- supernatural certainty
- medical claims
- financial solicitation
- child suitability
- senior suitability
- tone and language

## Technology

```text
Next.js + React + TypeScript + MUI
Node runtime inside Next.js
FFmpeg
Ollama (optional)
ComfyUI (optional)
Local TTS provider (optional)
Local filesystem
```

## V1 rendering strategy

Do not require generative video. Build the video from:

```text
still images
+ pan/zoom
+ crossfade
+ subtitles
+ narration
+ optional background music
→ FFmpeg
→ 1080x1920 MP4
```

## Extension rule

Every new feature should fit into one of:
- AGENT
- PROVIDER
- WORKFLOW
- RENDERER
- UI
- EXPORTER

Do not place feature-specific logic directly in the core workflow.

## When NestJS becomes justified

Only introduce a separate NestJS service when one or more of these become real requirements:
- persistent project history
- authentication
- multiple users
- remote access
- public/internal REST API used by other apps
- scheduled publishing
- persistent queue
- database-backed analytics
- cloud deployment

Until then, keep the application as one local Next.js project.
