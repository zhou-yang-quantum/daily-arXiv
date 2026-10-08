# daily-arXiv

A personal arXiv reading archive: usually ten ranked papers per day, expanding up to twenty when warranted, with a summary, background and motivation, and why each paper matters.

**Website:** https://zhou-yang-quantum.github.io/daily-arXiv/

The first entry is **arXiv-2026-10-06**, regenerated from its verified announcement batch using the current selection rules. It contains twelve ranked papers with source-grounded summaries, background, and relevance notes. The dated v1 source catalog is preserved in `sources/2026-10-06.json`.

## Reading experience

- Responsive desktop and mobile layouts, including small phone screens.
- An archive by date, exact dated item labels, and direct links to individual papers.
- Search across titles, authors, summaries, background, and relevance notes across every date.
- Topic filters and a suggested reading order.
- Reading and compact views, local equation rendering, and arXiv/PDF links.
- Saved papers and read status in this browser's local storage. They do not sync across devices; clearing browser data removes them.
- Keyboard navigation, accessible controls, and print-friendly notes.
- Copy a whole dated digest for ChatGPT Voice, or copy one paper, with TeX preserved.
- Play a continuous day recording or a single paper, with speed and 30-second seek controls.

Recordings use free offline speech synthesis and GitHub Release storage, with no
additional GPT generation or model API billing. Android media controls support
background playback and headphone actions where the browser and hardware expose
them. [Audio generation and playback details](audio/README.md).

## Preview with Docker

With Docker Desktop running, start the preview from the repository folder:

```sh
docker compose up --build -d --wait
```

Open http://localhost:8080. Docker installs the build dependencies, validates the archive, and serves the finished site. No local Node.js, Python, or model API key is needed. The port is bound to this computer only.

After editing the site or adding a digest, run the same command again to rebuild. To stop the preview:

```sh
docker compose down
```

If port 8080 is occupied, set `PREVIEW_PORT` to another available port before starting Compose (PowerShell example: `$env:PREVIEW_PORT = "8081"`).

## Develop locally

Requires Node.js 22+ and Python 3.10+.

```sh
npm ci
npm run build
npm run preview
```

Open http://127.0.0.1:4173. All paths also work under the GitHub Pages project path `/daily-arXiv/`.

The website is a static HTML/CSS/JavaScript application. Markdown and KaTeX are copied into the build, so readers do not depend on external font or rendering services. No model API key is needed to browse or build it.

## Add the next day's selection

For subscription-only automatic generation, see [the local schedule and startup
catch-up workflow](docs/local-pipeline.md). Its model is GPT-6.1 Sol at High effort;
the requested clock is 10:00 Monday–Friday in America/Chicago. The free source
collector archives announcement batches without AI calls, and local Codex
generates missing dates using the existing Plus login. Historical cloud setup
notes below document the earlier attempted route.

The repository now accepts a single Markdown delivery at `incoming/YYYY-MM-DD.md`. GitHub Actions automatically validates it, incorporates it into the archive, and publishes the site. No manual conversion or generated-JSON commit is needed.

The local replacement is active and successfully published October 7 (eleven papers after the date audit) and October 8 (twelve papers). Its startup watcher delivered October 8 and both Pages deployments succeeded. The Python publisher handles the GitHub upload without model calls.

The earlier cloud schedule ran without the repository or private token and was disabled; see [the historical scheduling result](docs/cloud-schedule.md) and [the comparison with LaserWong's pipeline](docs/reference-pipeline.md). The prepared cloud prompt and environment remain available for manual use. The old ChatGPT research schedule can now be disabled by the owner. This repository does not retrieve private ChatGPT conversations. To import a digest manually as an alternative:

1. Copy the task's daily answer into a UTF-8 Markdown file, such as `new-digest.md`.
2. Import and validate it:

   ```sh
   python tools/import_digest.py new-digest.md
   npm run build
   ```

3. Commit the new JSON entry in `content/digests/` and push to `main`. GitHub Actions publishes the updated archive.

The expected Markdown structure matches the current task's format:

```markdown
# arXiv-YYYY-MM-DD

Optional daily overview.

## arXiv-YYYY-MM-DD — Item 1

### Exact paper title
**Authors — arXiv:YYMM.NNNNN**

Summary paragraphs.

**Background.** Background and motivation.

**Why it matters for you:** Personalized relevance.
```

Repeat for items 1–N, with 10–20 papers and consecutive ranks. Use numerical ranking and a daily overview without priority verdicts. The importer rejects missing sections, mismatched dates, duplicate papers, incomplete rankings, and counts outside 10–20. Legacy entries with priority lines remain importable. An existing date is protected unless you explicitly pass `--replace`.

Structured JSON entries can also be added directly. Use the existing entry as the schema. `tools/build.py` validates dates, sections, rankings, and arXiv links before publication. Topic tags are an editorial aid; the Markdown importer assigns initial tags with keyword rules, which can be refined in the JSON.

Automatic local generation and publishing use the tested existing GitHub CLI login. No paid model API calls are configured.

## Preferences

`preferences.json` records the user's priorities, exclusions, and selection size. `prompts/daily-selection.md` contains the current research prompt. The website displays these criteria for reference; changing them alone does not rerank existing entries or modify the ChatGPT task.

## Publish

GitHub Pages uses the `workflow` publishing source. `.github/workflows/pages.yml` validates the archive, builds `dist/`, and deploys it on pushes to `main` or manual workflow runs. Only `dist/` is published.

The personal website repository is independent and can remain private.

## Verification

```sh
python -m unittest discover -s tests
npx playwright install chromium
npm run build
npx playwright test
```

Tests cover digest validation, search and topics, bookmarks and read status, multiple dates, direct item links, imported-content sanitization, equations, and mobile widths.

## Credits

Inspired by [LaserWong/LaserWong.github.io](https://github.com/LaserWong/LaserWong.github.io). The site implementation is original. Markdown is rendered with [Marked](https://github.com/markedjs/marked) and equations with [KaTeX](https://github.com/KaTeX/KaTeX); their licenses are included with the published vendor assets.
