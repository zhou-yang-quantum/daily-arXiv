# Automatic daily delivery

## Recommended route

Use one cloud ChatGPT Work scheduled task that researches and publishes the digest with the GitHub connector:

`arXiv → cloud task → incoming/YYYY-MM-DD.md → GitHub Actions → website`

The task needs GitHub file-write access to `zhou-yang-quantum/daily-arXiv`. It does not need a local checkout, your SSH key, an API key, Docker, or an awake computer. Scheduling and connector availability must be checked in the intended ChatGPT account/chat; access from another conversation does not prove access there.

## One-time setup

1. In ChatGPT on the web, use Work/cloud execution and enable the GitHub connection for this repository. Cloud Work is documented for scheduled research that runs while your computer is asleep: https://learn.chatgpt.com/docs/get-started-with-work.
2. Use the full prompt in `prompts/cloud-daily-selection.md`. It contains the research preferences, delivery path, exact format, retry rules, and usage limits. Match the time of the existing daily task, with timezone America/Chicago. The prompt itself does not create a schedule.
3. Test the GitHub file-writing action once in that cloud chat before enabling recurring delivery. The October 6 incoming file is reserved for the repository-side integration test; use its existence to verify read access, and test a genuinely new complete digest for a new date when appropriate.
4. Confirm the task actually runs in the cloud and that a successful write triggers a successful `Publish daily-arXiv` workflow. A queued workflow is not proof of publication.
5. Once the new scheduled task is confirmed working, disable the old research task to avoid producing the same selection twice. This project does not change your existing task or schedule.

Scheduled web tasks can use the connected tools available to their chat: https://learn.chatgpt.com/docs/automations. Do not assume a classic Chat task has the same write tools as Work. If the current chat exposes the GitHub write action and a trial succeeds, it can use this same delivery format without a separate publisher.

If cloud Work file writes are unavailable, a Codex Cloud task with authorized GitHub publishing is a fallback. It runs remotely but needs a configured cloud environment/repository access. Changes made in a cloud checkout still need to be committed and published. An API collector running in GitHub Actions is another fallback with separately billed model usage; it is not configured here.

## Token usage

The existing October 6 raw digest contains 22,554 characters and measures 5,434 tokens with the `o200k_base` tokenizer. This is an estimate of the text payload, not the complete model run or a guaranteed tokenizer match for every model.

Generating it again as a full chat response after emitting it in a GitHub tool call would duplicate roughly that much visible output. The supplied prompt writes the full digest once and responds with a short link.

Research context, reasoning, tool instructions, and tool results add usage. On Plus, cloud Work/Codex usage can consume more allowance than a plain Chat task; there is no fixed token-to-Plus-quota conversion. Compare the usage dashboard before and after a representative run. Do not infer subscription allowance consumption from API dollar prices. Official usage guidance: https://learn.chatgpt.com/docs/pricing.

The Python parser, static build, Docker preview, and Pages deployment consume zero AI tokens. No model calls or API charges are configured in the publishing workflow.

## Delivery behavior

- New Markdown files in `incoming/` are validated and included at build time. No generated JSON commit or second agent run is needed.
- Invalid dates, incomplete rankings, missing explanation sections, duplicate IDs, and unsafe arXiv links fail the build. The last successful deployment stays online.
- Existing dates are protected. Matching redelivery is idempotent; existing reviewed JSON topic tags are preserved. Conflicting content fails instead of silently replacing a published explanation.
- The daily task checks just its own date and makes one write. It does not fetch the entire archive or modify website code.
- This repository has no independent daily research schedule. The cloud task triggers deployment by creating a digest file.
