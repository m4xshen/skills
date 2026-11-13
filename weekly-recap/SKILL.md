---
name: weekly-recap
description: Builds the user's weekly recap of their Linear issues as a markdown list ready to post. Trigger on 'weekly recap', 'weekly report', 'weekly update', 'what did I do this week', 'last week's report', 'status update', 'summarize my Linear work'.
---

# Weekly recap

## The week

Default: Tuesday 00:00 Asia/Taipei up to now. If the user asks for "last week",
use the previous Tuesday 00:00 to this Tuesday 00:00 (Taipei).

## What counts as which

The user's teams (FRO and MOB) share this flow:

| Section     | Linear states                                                                  |
| ----------- | ------------------------------------------------------------------------------ |
| To do       | `Todo`                                                                         |
| In progress | `In Progress`                                                                  |
| In review   | `Dev Review`                                                                   |
| Done        | `Staging`, `Ready for Firebase`, `Staging Review`, `Ready for Release`, `Done` |

- **To do**, **In progress**, **In review** — the issue is in that state now,
  in any cycle. These describe where things stand, not what changed this week.
- **Done** — the issue entered a Done-section state for the first time during
  the week, coming from `In Progress` or `Dev Review`, and is still in one now.
  `updatedAt` since the week start narrows the candidates; confirm each with
  `stateHistory`.

## Output format

Read [format.md](format.md) before writing the recap and match it exactly —
it is what the user pastes.

Show the report inside a ```markdown code block and also copy it to the
clipboard with `pbcopy`. After the block, add one line per judgment call worth
checking (for example, an issue that bounced back from Staging). If there were
none, say nothing more.
