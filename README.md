# daily-arXiv

A personal arXiv reading archive: ten ranked papers per day, with a summary, background and motivation, and why each paper matters.

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

The existing ChatGPT scheduled task remains the selection source. **This repository does not yet generate daily selections or automatically retrieve future ChatGPT messages.** Its GitHub Actions workflow builds and publishes the archive whenever content is pushed.

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
**Priority: high**

Summary paragraphs.

**Background.** Background and motivation.

**Why it matters for you:** Personalized relevance.
```

Repeat for items 1–10. The importer rejects missing sections, mismatched dates, duplicate papers, and incomplete rankings. An existing date is protected unless you explicitly pass `--replace`.

Structured JSON entries can also be added directly. Use the existing entry as the schema. `tools/build.py` validates dates, sections, rankings, and arXiv links before publication. Topic tags are an editorial aid; the Markdown importer assigns initial tags with keyword rules, which can be refined in the JSON.

For fully automatic collection, the existing scheduled task would need a tested write connection to this repository, or a separate scheduled collector/model pipeline. No such integration or paid API calls are configured in this version.

## Preferences

`preferences.json` records the user's priorities and exclusions. `prompts/daily-selection.md` preserves the supplied scheduled-task prompt. The website displays these criteria for reference; changing them alone does not rerank existing entries or modify the ChatGPT task.

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
