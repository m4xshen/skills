---
name: weekly-report
description: Build the user's weekly work report from Linear — their to-do, in-progress, in-review, and finished issues for the week — as a ready-to-post markdown list. Use whenever the user asks for their weekly report, weekly update, "what did I do this week", a status update to post, or a summary of their Linear work for a week (including "last week's report").
---

# Weekly report

Produce a markdown list of the user's Linear issues for one week, split into
**To do**, **In progress**, **In review** and **Done**, in the exact format
they post.

## The week

Default: Tuesday 00:00 Asia/Taipei up to now. If the user asks for "last week",
use the previous Tuesday 00:00 to this Tuesday 00:00 (Taipei). Get the boundary
from the shell rather than doing date math in your head:

```bash
TZ=Asia/Taipei date -v-tuesday +%Y-%m-%dT00:00:00%z   # this week's Tuesday (macOS date)
```

Convert to UTC for comparing against Linear timestamps (Taipei is UTC+8, so
Tuesday 00:00 Taipei is Monday 16:00 UTC).

## What counts as which

The user's teams (FRO and MOB) share this flow:

| Section     | Linear states                                                                  |
| ----------- | ------------------------------------------------------------------------------ |
| To do       | `Todo`                                                                         |
| In progress | `In Progress`                                                                  |
| In review   | `Dev Review` (the PR is in code review)                                        |
| Done        | `Staging`, `Ready for Firebase`, `Staging Review`, `Ready for Release`, `Done` |

Linear marks `Staging` and `Ready for Firebase` as "started", but to the user an
issue there is finished — the development work is done and it is waiting on QA
or release. So don't use Linear's `statusType` to decide; use the state names
above.

- **To do**, **In progress**, **In review** — the issue is in that state now,
  in any cycle. These describe where things stand, not what changed this week.
- **Done** — the issue entered a Done-section state during the week, coming
  from `In Progress` or `Dev Review` (check `stateHistory`), and is still in
  one now. Moving between Done-section states (Staging → Staging Review) is
  not new work, so an issue that reached Staging before the week started
  doesn't count even if it moved on this week.
- An issue that first reached a Done-section state before the week, bounced
  back to `In Progress` or `Dev Review`, and returned to a Done-section state
  this week is left out. Only an issue's first arrival at a Done-section
  state counts. If it is still in `In Progress` or `Dev Review` now, it goes
  in that section as usual.
- Leave out Backlog, Triage, Canceled and Duplicate.

If a team has a state not listed here, decide from its name which section it
fits, and mention the call you made.

## Gathering issues

No team filter anywhere — the user works in both FRO and MOB. Page through
every `list_issues` call while `hasNextPage` is true. Ask for fields `id`,
`title`, `status`, `url`. Run the independent calls in parallel.

1. `list_issues` with `assignee: "me"` and `state` set to each of `Todo`,
   `In Progress` and `Dev Review` — one call per state. These fill the first
   three sections directly.
2. `list_issues` with `assignee: "me"` and `updatedAt: <week start>`. Any
   issue whose status changed this week shows up here.
3. For each issue from step 2 that is now in a Done-section state, call
   `get_issue` with fields `stateHistory` to find when it left `In Progress`
   or `Dev Review` for a Done-section state.

## Output format

Match this exactly — it is what the user pastes:

```markdown
* **To do**
  * [FRO-700: \[BackOffice\] Example todo issue](https://linear.app/letsgoup-tw/issue/FRO-700/backoffice-example-todo-issue)
* **In progress**
  * [FRO-624: \[BackOffice\] General Export / Import UI across lists](https://linear.app/letsgoup-tw/issue/FRO-624/backoffice-general-export-import-ui-across-lists)
* **In review**
  * [MOB-610: \[Android\] Example issue in code review](https://linear.app/letsgoup-tw/issue/MOB-610/android-example-issue-in-code-review)
* **Done**
  * [MOB-604: \[Android\] Remove legacy color aliases from theme](https://linear.app/letsgoup-tw/issue/MOB-604/android-remove-legacy-color-aliases-from-theme)
  * [FRO-627: \[BackOffice\] Bulk edit: pinned columns don't match the row's hover and selected colors](https://linear.app/letsgoup-tw/issue/FRO-627/backoffice-bulk-edit-pinned-columns-dont-match-the-rows-hover-and)
```

- Sections in this order: To do, In progress, In review, Done. Omit a section
  that has no issues.
- `*` bullets, two-space indent for issues.
- Link text is `<ID>: <title>`, with `[` and `]` in the title escaped as `\[`
  and `\]` so the link doesn't break. Keep the title exactly as in Linear,
  including Chinese text.
- Link to the issue's `url` from Linear; don't build it yourself.
- Within Done, order issues by when they reached Done, oldest first. Order the
  other sections by issue ID.

Show the report inside a ```markdown code block so the raw markdown is
copyable, and also copy it to the clipboard with `pbcopy` (pass it via a
quoted heredoc so backslashes survive). After the block, add one line per
judgment call worth checking (for example, an issue that bounced back from
Staging). If there were none, say nothing more.
