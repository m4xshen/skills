---
name: weekly-recap
description: Builds the user's weekly recap of their Linear issues as a markdown list ready to post. Trigger on 'weekly recap', 'weekly report', 'weekly update', 'what did I do this week', 'last week's report', 'status update', 'summarize my Linear work'.
---

# Weekly recap

## The week

Default: Tuesday 00:00 Asia/Taipei up to now. If the user asks for "last week",
use the previous Tuesday 00:00 to this Tuesday 00:00 (Taipei). Get the boundary
from the shell:

```bash
TZ=Asia/Taipei date -v-tuesday +%Y-%m-%dT00:00:00%z   # this week's Tuesday (macOS date)
```

## What counts as which

The user's teams (FRO and MOB) share this flow:

| Section     | Linear states                                                                  |
| ----------- | ------------------------------------------------------------------------------ |
| To do       | `Todo`                                                                         |
| In progress | `In Progress`                                                                  |
| In review   | `Dev Review` (the PR is in code review)                                        |
| Done        | `Staging`, `Ready for Firebase`, `Staging Review`, `Ready for Release`, `Done` |

- **To do**, **In progress**, **In review** — the issue is in that state now,
  in any cycle. These describe where things stand, not what changed this week.
- **Done** — the issue entered a Done-section state for the first time during
  the week, coming from `In Progress` or `Dev Review` (check `stateHistory`),
  and is still in one now.

## Gathering issues

Ask for fields `id`, `title`, `status`, `url`.

1. `list_issues` with `assignee: "me"` and `state` set to each of `Todo`,
   `In Progress` and `Dev Review` — one call per state.
2. `list_issues` with `assignee: "me"` and `updatedAt: <week start>`. Any
   issue whose status changed this week shows up here.
3. For each issue from step 2 that is now in a Done-section state, call
   `get_issue` with fields `stateHistory` to find when it left `In Progress`
   or `Dev Review` for a Done-section state.

## Output format

Read [format.md](format.md) before writing the recap and match it exactly —
it is what the user pastes.

Show the report inside a ```markdown code block so the raw markdown is
copyable, and also copy it to the clipboard with `pbcopy`. After the block, add
one line per judgment call worth checking (for example, an issue that bounced
back from Staging). If there were none, say nothing more.

## Gotchas

- **Linear's `statusType` is wrong for this flow.** `Staging` and
  `Ready for Firebase` are "started" in Linear, but to the user the work is
  finished — it's only waiting on QA or release. Classify by state name using
  the table, never by `statusType`.
- **Moving between Done-section states is not new work.** An issue that
  reached `Staging` before the week and moved to `Staging Review` this week
  shows up in the `updatedAt` query but doesn't count. Same for issues that only
  got a comment or label edit — `updatedAt` bumps on any change, so step 2 is a
  candidate list, not the Done list.
- **Bounce-backs count only on first arrival.** An issue that reached a
  Done-section state before the week, went back to `In Progress` or
  `Dev Review`, and returned to Done this week is left out. If it's still in
  `In Progress` or `Dev Review` now, it goes in that section as usual.
- **The week starts in Taipei, Linear timestamps are UTC.** Tuesday 00:00
  Taipei is Monday 16:00 UTC, so something finished Monday evening UTC belongs
  to this week.
- **Don't filter by team.** The user works in both FRO and MOB; a team filter
  silently drops half the report.
- **`list_issues` paginates.** Keep paging while `hasNextPage` is true on every
  call, or issues go missing without any error.
- **Brackets in titles break the link.** Titles like `[BackOffice] …` must have
  `[` and `]` escaped as `\[` and `\]`.
- **Don't build the URL yourself.** Linear truncates the slug for long titles
  (see FRO-627 in `format.md`, which ends at `…hover-and`). Use
  the issue's `url` field.
- **The shell eats the backslashes on the way to `pbcopy`.** Pass the report
  through a quoted heredoc (`<<'EOF'`); otherwise the pasted brackets come out
  unescaped and the links break.
