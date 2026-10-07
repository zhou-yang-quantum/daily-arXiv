# Cloud scheduling request

Open a chat with the published `daily-arXiv` cloud environment selected, then send the following request. These instructions prepare a schedule; this repository file does not activate one.

> Create a standalone recurring cloud task named “Daily arXiv selection” for `zhou-yang-quantum/daily-arXiv` in this published cloud environment. Run Monday–Friday at 02:00 in `America/New_York`, following daylight saving time, starting at the next scheduled occurrence. Run entirely in the cloud, without my computer. First check for an existing replacement task and update it if present; do not create a duplicate or change my original ChatGPT research task yet. Read the complete current `prompts/cloud-daily-selection.md` from the latest `main` checkout and use its contents as the saved task instructions, with access to this repository and the environment's private `ARXIV_GITHUB_TOKEN`. Preserve the 10–20 selection rule with ten as the default, new-paper-only eligibility, all explanatory sections, no priority verdicts, fresh-batch skip rule, duplicate protection, and Python publisher. Return only the short publication status and website link after each successful run. Confirm the saved task's schedule, timezone, cloud environment, and next run. If this environment cannot create a cloud schedule, report that instead of creating a local task or claiming it is scheduled.

After creation, inspect the saved task in Scheduled and verify the cloud environment and timing. Review the first cloud research-and-publication run and its GitHub Pages deployment before disabling the original task.

For an interface with advanced recurrence controls, the intended rule is:

```text
RRULE:FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR;BYHOUR=2;BYMINUTE=0;BYSECOND=0
```

Timezone: `America/New_York`. The timezone must be saved alongside the recurrence; the rule alone does not specify it.
