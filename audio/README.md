# Digest recordings

`index.json` is generated locally or by GitHub Actions and is not committed.
Recordings are immutable GitHub Release assets, keeping the repository and Pages
deployment small. Each date has one continuous MP3 and a separate MP3 per paper.
The release identity includes the source text, speech preparation, and voice.
Unchanged recordings are reused; corrected digests cannot use old recordings.

Speech is generated on a standard public GitHub Actions CPU runner using
[Piper 1.4.2](https://github.com/OHF-Voice/piper1-gpl) and the checksum-pinned
[LJSpeech medium voice](https://huggingface.co/rhasspy/piper-voices/blob/main/en/en_US/ljspeech/medium/MODEL_CARD),
whose training dataset is public domain. Math uses KaTeX MathML and
[Speech Rule Engine](https://github.com/Speech-Rule-Engine/speech-rule-engine).
No model API, purchased credits, or additional GPT generation is involved.
The Piper program is GPL-3.0; Speech Rule Engine is Apache-2.0. No model binary or
Piper code is redistributed by the website. Voice attribution is retained in
each release.

Native audio playback and Media Session handlers provide play/pause, seeking,
position, speed, and lock-screen metadata. Headphone previous/next track actions
seek backward/forward 30 seconds. Hardware gestures and displayed lock-screen
controls depend on the Android browser and headphones. Use Chrome or another
browser with background media support; open/download the MP3 for an Android audio
player if a browser or embedded app restricts background playback.

The whole-day recording is one file, so a sleeping page does not have to run
JavaScript between papers. Per-item recordings stop naturally at the item end.
Mathematical notation is pronounced using fixed rules rather than rewritten by
an LLM; inspect unusual formulas in the written digest if pronunciation is unclear.
Audio failures leave reading/copy available and do not block text publication.

For a local refresh of an already published audio index:

```powershell
python -c "import urllib.request; urllib.request.urlretrieve('https://zhou-yang-quantum.github.io/daily-arXiv/data/audio/index.json', 'audio/index.json')"
docker compose up --build -d --wait
```

For offline rendering, install Node build dependencies, Python speech dependencies
and FFmpeg, then run `python tools/generate_audio.py --local-only --date YYYY-MM-DD`.
Publishing uses the existing GitHub CLI login or the workflow's scoped token.
