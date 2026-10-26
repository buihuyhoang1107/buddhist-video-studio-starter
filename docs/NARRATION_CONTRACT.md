# Narration-first video contract

Lead/Core contract for sequential Content/AI and Video/UX changes.

Three timing approaches: fixed target duration (can truncate/pad), text-length estimate
(usable before speech exists), measured audio duration (accurate playback length).
Choose measured audio as the source of truth, with an explicitly labeled estimate beforehand.

- `GeneratedContent.story` contains the full continuous narration. Hook, lesson, and CTA
  remain metadata; the storyboard never repeats them around a user-supplied story.
- Preserve all text in order, including stories longer than ten sentences. New jobs default
  to content-based duration. Old target timing is honored only when durationMode=TARGET.
- Backgrounds: per-scene uploads, one shared still image, or one silent looping MP4/WebM.
  A shared background takes precedence over per-scene images; changing it preserves story/audio.
- Storyboard stores optional background metadata and narration audio metadata. Disk paths
  stay server-side. Views return URLs and duration/timing provenance.
- POST /api/jobs/:id/media accepts multipart `file`, `kind=background|audio`. Max background
  image 10 MiB; video/audio 100 MiB. Server validates/decode-checks input and names files.
- DELETE /api/jobs/:id/media?kind=background|audio removes the override, retaining other assets.
- Render accepts approved=true, optional voiceMode=LOCAL_TTS|USER_AUDIO|NONE. Legacy
  withoutVoice=true remains supported. USER_AUDIO requires an upload. Uploaded audio is
  never silently replaced. NONE explicitly exports silent video using text estimates.
- VieNeu voice provider calls a configurable local /v1/audio/speech endpoint, WAV response.
  Generate/cache per narration segment; normalize PCM, measure exact sample counts, join
  without inserted gaps/padding/fades, then mux a continuous AAC track. Model pauses remain.
- Uploaded whole-story audio sets exact total duration. Subtitle segment timing is estimated
  proportionally from text and is labeled as estimated, not forced alignment.
- Local TTS segment timing comes from each audio's measured sample count. Global subtitles
  are contiguous; the final background stops at the narration end, with no fixed target cutoff.
- Dharma review and explicit human script/visual review remain mandatory. Render errors
  retain storyboard, background, uploaded audio, and reusable TTS segments for retry.
- Existing scene-image workflow and legacy jobs remain supported. No database or paid API.

Validation includes long-story preservation, content-based estimates, continuous subtitle
boundaries, exact audio length, image/video looping, upload overrides, speech-provider cache,
and the existing per-scene regression suite. Real voice quality needs the local VieNeu model
running; tests can verify provider HTTP/audio behavior using a labeled test service.
