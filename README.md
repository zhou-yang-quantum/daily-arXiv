# daily-arXiv

A personal arXiv reading archive: usually ten ranked papers per day, expanding up to twenty when warranted, with a summary, background and motivation, and why each paper matters.

**Website:** https://zhou-yang-quantum.github.io/daily-arXiv/

The first entry is **arXiv-2026-10-06**, imported from the latest selection in the supplied ChatGPT conversation. The ranking and explanations are preserved; internal ChatGPT citation markers and conversational follow-up offers are removed. This is an imported selection, not an independently regenerated review of the papers.

## Reading experience

- Responsive desktop and mobile layouts, including small phone screens.
- An archive by date, exact dated item labels, and direct links to individual papers.
- Search across titles, authors, summaries, background, and relevance notes across every date.
- Topic filters and a suggested reading order.
- Reading and compact views, local equation rendering, and arXiv/PDF links.
- Saved papers and read status in this browser's local storage. They do not sync across devices; clearing browser data removes them.
- Keyboard navigation, accessible controls, and print-friendly notes.

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

The cloud research and delivery prompt is in [prompts/cloud-daily-selection.md](prompts/cloud-daily-selection.md), with environment setup in [docs/daily-pipeline.md](docs/daily-pipeline.md). The Python publisher handles the GitHub upload without model calls. **The manual scheduled-context check ran in a cloud runtime without the repository or private token and was disabled. No working recurring publisher is active.** See [the scheduling result](docs/cloud-schedule.md) and [the comparison with LaserWong's GitHub Actions pipeline](docs/reference-pipeline.md). The current ChatGPT GitHub connector rejected write actions during testing; the separate prepared cloud credential passed user-reported manual write checks.

The existing ChatGPT task remains the selection source until the replacement cloud task is verified. This repository does not retrieve private ChatGPT conversations. To import a digest manually as an alternative:

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

For fully automatic collection, the intended scheduled task needs a tested write connection to this repository. No paid model API calls are configured in the site pipeline.

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
