# Cloud scheduling status and requested configuration

The attempted request in a conversation using the published cloud environment returned: no available tool for creating a standalone cloud task with repository and private-token access. **No schedule or next run was saved.** The original ChatGPT research task remains unchanged. Repeating the same request in that conversation does not resolve the missing capability.

The environment passed access checks for research and publishing. This verifies the execution environment, not a scheduler. Official [scheduled-task documentation](https://learn.chatgpt.com/docs/automations) describes scheduled web tasks and connected tools, but does not establish that a task can be bound to this published Codex Cloud environment or inherit its private credential.

The user subsequently supplied screenshots of the manual Schedule a task dialog. It supports Instructions, Weekdays, 02:00 Eastern, an Eastern Time zone, Run on this computer, and Start each run in new chat, but has no environment selector. This establishes that a schedule can be created manually even when the agent has no scheduling tool. It does not establish which repository or credential the scheduled runtime receives.

## Verify manual scheduling

1. Open an ordinary cloud task with the published daily-arXiv environment selected, then open Schedule a task from that chat. Using this chat as the origin is a test of context retention, not a documented guarantee that the scheduler inherits the environment.
2. Paste the complete [one-time scheduled-context check](../prompts/cloud-schedule-check.md) into Instructions. Set Repeat task off and choose a near-future time. Keep Run on this computer off. Keep Start each run in new chat off for this first check, so the run returns to this chat as described by the scheduling documentation.
3. Save the task and inspect the actual scheduled run's report. Earlier manual environment access checks do not prove that this scheduled run has the same resources. Missing scripts, Python, or private-token access means the daily publisher cannot run in that scheduled context. Naming the environment in a prompt does not attach it or grant credential access.

## Daily instructions after a successful check

Use the complete [daily scheduled-run prompt](../prompts/scheduled-daily-run.md) in the manual Instructions field. It verifies required runtime resources before loading the research and delivery instructions from the checkout. Set Repeat task on, Repeat Weekdays, Time 02:00 Eastern, and Time zone Eastern Time (`America/New_York`). Keep Run on this computer off. For the initial daily trial, keep Start each run in new chat off; a fresh-chat schedule can be tested separately once environment access works, to avoid growing context over time. Do not create a duplicate recurring task if one already exists.

After a supported scheduler actually saves the task, inspect it in Scheduled and verify the cloud environment and timing. Review the first scheduled cloud research-and-publication run and its GitHub Pages deployment before disabling the original task. Do not rerun environment setup merely to address a missing scheduling tool.

For an interface with advanced recurrence controls, the intended rule is:

```text
RRULE:FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR;BYHOUR=2;BYMINUTE=0;BYSECOND=0
```

Timezone: `America/New_York`. The timezone must be saved alongside the recurrence; the rule alone does not specify it.
