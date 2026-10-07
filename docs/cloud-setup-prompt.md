# One-time cloud environment setup prompt

Set up a private Codex Cloud environment for `zhou-yang-quantum/daily-arXiv` to run a daily paper-research and publishing task entirely in the cloud, with my computer asleep.

Use Python 3.12 and the repository checkout. The daily publisher is `tools/publish_digest.py`; the scheduled prompt is `prompts/cloud-daily-selection.md`. Do not install website dependencies or start preview servers as part of the daily publishing environment. GitHub Actions handles all website builds and deployment.

Allow the research task to retrieve public arXiv sources and use web search. The publisher needs HTTPS access to `api.github.com`; research needs `arxiv.org` and `export.arxiv.org` plus the available search service's destinations.

Configure a private credential named `ARXIV_GITHUB_TOKEN` with write access to the contents of `zhou-yang-quantum/daily-arXiv` only. Ask me to provide it through the environment's private credential settings, not through chat. Use the existing authorized cloud GitHub identity if it can securely supply a usable credential; otherwise I will provide a repository-scoped fine-grained token. Do not display it, store it in source files, or copy a local SSH private key.

Run `python -m unittest discover -s tests` and `python tools/publish_digest.py --check-date 2026-10-06`. The latter should return `exists` without returning the digest content. This verifies reads, not writes. Report separately whether a genuinely new digest has been delivered successfully from a fresh cloud task; do not claim unattended publishing is verified on the basis of a read check alone.

Prepare and publish the environment through the normal setup interface. I will select the published environment for the recurring task. Keep my existing ChatGPT daily task active until its replacement completes a successful cloud publishing trial. When scheduling is requested, use Monday–Friday at 07:00 America/New_York (06:00 America/Chicago), following daylight saving time and aiming for a digest around 08:00 Eastern. Use `prompts/cloud-daily-selection.md`, including its fresh-batch check and holiday/deferral skip rule. Do not create duplicate schedules.
