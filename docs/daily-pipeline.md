# Automatic daily delivery

## Prepared cloud route and current status

The prepared cloud task researches and publishes through the small Python publisher. Recurring execution requires a scheduler that can actually use the published environment and its credential:

`arXiv → cloud task → incoming/YYYY-MM-DD.md → GitHub Actions → website`

The task needs a cloud checkout with Python and GitHub contents-write access to `zhou-yang-quantum/daily-arXiv`. It does not need your computer's checkout, SSH key, Docker, or a model API key. The publishing script uses GitHub's REST API; it makes no model calls.

## Verified connection limit

During setup, the ChatGPT GitHub connection could read this repository but returned HTTP 403 `Resource not accessible by integration` for both file creation and issue creation. The authenticated user's `push` flag did not establish the integration's write scope. No issue was created. Reconnecting alone is not assumed to fix this restriction.

Use the credential-based cloud publisher unless write access in the intended task has actually been verified. The current conversation has no tool for creating the cloud environment or editing the scheduled task; those are one-time account setup steps, not daily copy/paste work.

The Python publisher was successfully tested using the existing local GitHub CLI login, without printing or saving its credential. It delivered `incoming/2026-10-06.md` in commit `2946b0ec548261db86a051673d297c6665c68db5`; [the deployment succeeded](https://github.com/zhou-yang-quantum/daily-arXiv/actions/runs/37569877958).

The user subsequently reported successful cloud credential, repository read, temporary write/read/delete, arXiv, and web-search checks. A full cloud research-and-publication run remains untested. The scheduling attempt then reported that the cloud conversation has no available scheduling tool: no schedule or next run was saved. Environment readiness does not establish scheduling support.

## One-time setup

1. Create/select a Codex Cloud environment for `zhou-yang-quantum/daily-arXiv`. Use [the setup prompt](cloud-setup-prompt.md) to keep it focused. It needs Python 3.10+ and access to `arxiv.org`, `export.arxiv.org`, and `api.github.com`, plus any research/search services used by the task. The publishing step needs no npm install or website build. Cloud environments run while your computer is asleep: https://learn.chatgpt.com/docs/environments/cloud-environments.
2. Configure `ARXIV_GITHUB_TOKEN` as a private cloud credential. If the environment's existing authorized GitHub identity cannot supply a usable API credential, create a fine-grained GitHub token scoped to **this repository only**, with **Contents: read and write**, and store it in the cloud environment's personal vault/network-secret settings. GitHub's token setup guide: https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens. Do not paste the token into chat, commit it, or copy your laptop's SSH private key to the cloud. A network secret must allow `api.github.com`; use a direct environment secret only if the cloud service requires it.
3. Start a fresh task in that environment. Run `python tools/publish_digest.py --check-date 2026-10-06` to test the API connection without returning the digest text. A read check does not prove write access; confirm the first genuine new digest can be published before relying on the schedule.
4. First verify that the account's Scheduled task editor supports binding a recurring task to this published cloud environment, repository, and private credential. The cloud conversation itself could not save the schedule, and the documentation does not confirm this binding. See [scheduling status and the prepared request](cloud-schedule.md). If supported, use the full prompt in `prompts/cloud-daily-selection.md`. Requested start: **Monday–Friday at 02:00 America/New_York**, equivalent to 01:00 America/Chicago. Use the named timezone to handle daylight saving time. Research and deployment duration must be measured in a cloud trial; the start time does not guarantee a particular completion time. The prompt file itself does not create a schedule.
5. Confirm the first scheduled replacement run delivers a digest and triggers a successful `Publish daily-arXiv` workflow. A queued workflow or manual cloud run does not establish unattended scheduling. Then disable the old research task to avoid producing the same selection twice. This project does not change your existing task or schedule.

Scheduled web tasks can use the tools available to their chat: https://learn.chatgpt.com/docs/automations. Local Work tasks need your computer awake; cloud Work without local resources does not: https://learn.chatgpt.com/docs/get-started-with-work. Do not assume a classic Chat task can call the publisher or read another private chat's results automatically.

A model API collector running in GitHub Actions is another route, with separately billed model usage; it is not configured here. Do not treat it as authorized merely because the requested subscription-based cloud schedule could not be created. The supplied cloud prompt can run research and publishing in a manual cloud task; a supported scheduler is still needed to replace the existing daily research task automatically. This repository does not retrieve the original task's private chat output.

## Timing and fresh batches

arXiv normally announces papers at **20:00 Eastern, Sunday–Thursday**; there are no regular Friday or Saturday evening announcements. The corresponding next-morning reading cadence is Monday–Friday. See the [official announcement schedule](https://info.arxiv.org/help/availability.html#announcement-schedule). The 14:00 Eastern submission deadline is separate from the announcement time. Holiday or ad hoc deferrals are possible.

The cloud task should check the date on the announcement listing and skip research and publication when there is no fresh batch for that morning. It must not repeat the last available batch under a new digest date. The digest title and filename still use the morning's America/Chicago date; the overview identifies the batch actually reviewed. No Saturday or Sunday run is recommended, which avoids unnecessary research usage.

The 02:00 start is a delivery preference, not a token-saving mechanism. Official OpenAI [usage guidance](https://learn.chatgpt.com/docs/pricing) describes model, context, reasoning, tool use, retrieval, and caching as usage factors; it does not document an overnight discount or a reliably fastest scheduling hour. No recurring cloud task has been activated from this local session, which has no general cloud-task scheduling tool or accessible browser.

## Token usage

The existing October 6 raw digest contains 22,554 characters and measures 5,434 tokens with the `o200k_base` tokenizer. This is an estimate of the text payload, not the complete model run or a guaranteed tokenizer match for every model.

Generating it again as a full chat response after writing the cloud file would duplicate roughly that much visible output. The supplied prompt writes the full digest once, lets Python upload the bytes, and responds with a short link. The script returns only status, date, count, and commit metadata.

The selection defaults to ten papers and may expand to twenty when warranted. Extra summaries add model output, so the prompt requires a clear reason to include additional papers rather than filling the maximum every day. Ranking and the daily overview replace redundant priority verdicts.

Research context, reasoning, tool instructions, and tool results add usage. On Plus, cloud Work/Codex usage can consume more allowance than a plain Chat task; there is no fixed token-to-Plus-quota conversion. Compare the usage dashboard before and after a representative run. Do not infer subscription allowance consumption from API dollar prices. Official usage guidance: https://learn.chatgpt.com/docs/pricing.

The Python parser, static build, Docker preview, and Pages deployment consume zero AI tokens. No model calls or API charges are configured in the publishing workflow.

## Delivery behavior

- New Markdown files in `incoming/` are validated and included at build time. No generated JSON commit or second agent run is needed.
- Counts outside 10–20, invalid dates, incomplete rankings, missing explanation sections, duplicate IDs, and unsafe arXiv links fail the build. The last successful deployment stays online.
- Existing dates are protected. Matching redelivery is idempotent; existing reviewed JSON topic tags are preserved. Conflicting content fails instead of silently replacing a published explanation.
- The daily task checks just its own date and makes one write. It does not fetch the entire archive into model context or modify website code.
- This repository has no independent daily research schedule. The cloud task triggers deployment by creating a digest file.
