# Local daily generation and catch-up

This is the subscription-only route: **GPT-6.1 Sol, High effort**, using the local
Codex CLI's existing ChatGPT login. Model API keys are removed from the model's
environment, ChatGPT authentication is enforced, and there is no paid-API or
automatic model fallback. GitHub upload is ordinary Python using the existing
GitHub CLI login; its credential stays outside the model process. Included usage
limits still apply; errors leave dates queued with a cooldown rather than buying
credits or switching providers.

## Schedule and startup

The saved local app schedule is **Daily arXiv — local generation and catch-up**,
at **10:00 Monday–Friday in America/Chicago** (Austin time, including daylight
saving changes). It invokes the deterministic controller, which launches a fresh
model context for each missing day. The schedule is active. The October 7 and
October 8 trials deployed successfully; October 7 has eleven papers after the
first-announcement audit, and October 8 has twelve. The startup watcher performed
the October 8 run.

A current-user Windows task, **Daily-arXiv startup catch-up**, starts a hidden
watcher at Windows login. The watcher checks once per minute while the Codex app
is running. A five-minute Windows trigger restarts it if it was interrupted;
an already-running watcher is left alone. It uses no model when the queue is empty. Opening Codex after the
scheduled time causes due days to be processed within about a minute. Overnight
and multi-day absences are recovered from the persistent date queue; weekends are
not digest days. Before 10:00, only older missing weekdays are due. Kernel locks
prevent daily and startup triggers from generating the same day simultaneously.

Attach the saved app task to this repository as a **local project**, so its
workspace includes the project's `.cache/local-pipeline` directory. An absolute
path in a projectless task's prompt does not add filesystem write access. A task
running from the home folder can read this checkout yet fail to open `run.lock`.

The watcher can be installed or started with:

```powershell
powershell.exe -NoProfile -File tools/install-local-watcher.ps1 -StartNow
```

It does not launch Codex or wake the computer. The computer and app must be
running for generation. A shutdown releases the lock; completed dates and saved
drafts remain on disk. The next run resumes unfinished work.

## Recovering dated papers

The free **Archive arXiv announcements** GitHub Actions workflow saves immutable
`sources/YYYY-MM-DD.json` snapshots even while the computer is off. It archives
dated announcement listings and v1 metadata without any model calls. A paper must
appear as a new submission in its primary category on the target date. This also
excludes old papers newly cross-listed into another category. Two weekday
capture opportunities, at 02:17 and 08:17 Eastern, reduce dependence on one
scheduled attempt. Each run also recovers available recent gaps. Existing
snapshots remain unchanged, so later paper revisions do not alter historical
research inputs.

The local queue begins October 7, 2026, following the imported October 6 digest.
It compares all due weekdays against existing content and its verified publishing
ledger, including gaps between newer published days. It checks GitHub before
research to avoid redelivery. Missing source evidence is reported rather than
replaced by today's papers. Closed empty announcement days can be recorded as
no-batch after complete listings verify there was no batch. A delayed current
batch remains queued.

## Model changes

Edit the saved task in the app's Scheduled view to change its model or effort.
The startup worker reads that task's saved model settings too; both paths use the
same choice on their next run. The current chat's Extra High setting does not
change the daily task's High setting. A model change does not regenerate published
digests. If a selected model becomes unavailable, the task reports an error and
keeps the queue instead of switching silently. Select a supported replacement
when ready.

Pausing this saved task also pauses automatic startup processing. Manual `run`
commands remain available for an explicitly requested test or repair.

`local-pipeline.json` supplies the initial model, clock, category, and retry
defaults. Machine paths and the saved schedule ID are kept only in ignored
`.cache/local-pipeline/runtime.json`.

## Inspect and repair

```powershell
python tools/local_pipeline.py plan
python tools/local_pipeline.py status
python tools/local_pipeline.py run
python tools/local_pipeline.py retry YYYY-MM-DD
```

`plan` and `status` do not call a model. `run` processes due dates oldest first.
`retry` explicitly reopens an unsuccessful day while retaining the previous
result; it refuses to replace completed dates. An insufficient selection or
invalid scientific metadata becomes needs-review, preventing repeated generation
of the same unsupported result. Logs, inputs, drafts, and state live in the ignored
`.cache/local-pipeline/` directory. Publication validates the date, 10–20 unique
consecutive ranks, explanation sections, exact v1 titles, and IDs belonging to the
verified batch, plus complete equation pronunciations, before writing the
protected Markdown and English-math companion together in one GitHub commit. GitHub Pages
then deploys through the existing workflow.

Clearing browser data does not affect this queue. Removing the local cache
removes its ledger and logs; published dates are still checked against GitHub, but
review/cooldown information would be lost. The replacement has successfully
published and deployed; the owner can now disable the old ChatGPT research
schedule. Its cancellation is separate from this local schedule.
