# Digest recordings

`index.json` is generated locally or by GitHub Actions and is not committed.
Recordings are immutable GitHub Release assets, keeping the repository and Pages
deployment small. Each date has one continuous MP3 and a separate MP3 per paper.
The release identity includes the source text, speech preparation, and voice.
Unchanged recordings are reused; corrected digests cannot use old recordings.

New recordings use free CPU synthesis with [Kokoro ONNX](https://github.com/thewh1teagle/kokoro-onnx),
the `af_heart` American-English voice, and checksum-pinned model/voice assets.
The runtime is MIT and the [model is Apache-2.0](https://huggingface.co/hexgrad/Kokoro-82M);
the model card records training-data credits. Voice attribution is retained in
each release. The roughly 354 MB of model assets stay in an ignored local cache
or GitHub Actions cache, not in Git history or the published website.

The same subscribed Codex research run returns a compact equation-to-English
pronunciation list. It adds some output tokens but no second model call or paid
speech API. The controller publishes the digest and
`audio/scripts/YYYY-MM-DD.json` together in one protected Git commit. Validation
requires every distinct item equation exactly once. Code creates the spoken
version from the original title, authors, ID, summary, background, and relevance:
only math notation and acronym pronunciation change. Redundant inline v1 source
links are omitted from rendering and speech; the footer arXiv link remains.
`speech.txt` in each new release contains the actual English narration.

The generator checks the source and pronunciation hashes. A changed equation
reading cannot silently use an old recording. Missing or stale pronunciation
metadata stops new audio rather than falling back to symbol-by-symbol reading.
October 6–8 have matching pronunciation companions for the improved narration.
New daily deliveries use the same version, with a title-to-authors pause and
the tested letter-A pronunciation inside equations. The October 9 recording
keeps its existing narration version until an explicit refresh is requested.

Native audio playback and Media Session handlers provide play/pause, seeking,
position, speed, and lock-screen metadata. Headphone previous/next track actions
seek backward/forward 30 seconds. Hardware gestures and displayed lock-screen
controls depend on the Android browser and headphones. Use Chrome or another
browser with background media support; open/download the MP3 for an Android audio
player if a browser or embedded app restricts background playback.

The whole-day recording is the item PCM recordings concatenated in rank order,
starting with Item 1 and without a daily overview or closing notes. A sleeping
page does not have to run JavaScript between papers. There are 1.5 seconds of real
silence between summary, background, and relevance, a 0.75-second pause between
title and authors, a 0.5-second pause before summary, and an item-end pause.
Per-item recordings stop naturally at the item end.
Kokoro is a speech model, not a physics solver: correctness comes from the
checked English script, and unusual names can still need pronunciation corrections.
Audio failures leave reading/copy available and do not block text publication.

For a local refresh of an already published audio index:

```powershell
python -c "import urllib.request; urllib.request.urlretrieve('https://zhou-yang-quantum.github.io/daily-arXiv/data/audio/index.json', 'audio/index.json')"
docker compose up --build -d --wait
```

For offline rendering, install Node build dependencies, Python speech dependencies,
FFmpeg and eSpeak NG, then run `python tools/generate_audio.py --local-only --date YYYY-MM-DD`.
Alternatively, build `docker build -f audio/Dockerfile -t daily-arxiv-speech .` and
mount the repository at `/app` when running the image with `--local-only --date YYYY-MM-DD`.
Publishing uses the existing GitHub CLI login or the workflow's scoped token.
