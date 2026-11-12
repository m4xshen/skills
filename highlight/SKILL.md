---
name: highlight
description: Point out UI elements in the user's own Chrome tab with `playwright-cli highlight`, attached through the Playwright extension, so the user sees exactly which button, field, or region is meant on the live page.
disable-model-invocation: true
---

Show the user which part of the UI you mean by drawing a highlight on it in their own Chrome tab. The highlight is an overlay that shows the element's box and a small label with the target string. Never log in, and never change the app's data.

Run every command from the repo root and always pass the same session, `-s=hl`. playwright-cli writes snapshot logs to `.playwright-cli/` there; leave them, and don't commit them.

## 1. Attach

```bash
playwright-cli -s=hl attach --extension=chrome
```

This attaches to the tab the extension has connected. If attaching fails, stop and report the exact error. Don't fall back to `open`, since a fresh browser isn't the user's page.

## 2. Find the element

```bash
playwright-cli -s=hl find "Save"        # matching nodes with context and refs
playwright-cli -s=hl snapshot           # whole page tree, when find isn't enough
```

Both give refs like `e12`. A target is either a ref or a unique CSS / Playwright selector.

- The label on the page shows the target string, so prefer a readable selector when one is unique: `button:has-text("Save")`, `[data-testid=floor-plan]`, `#settings`. Use a ref when no selector is both unique and readable. Its label reads `aria-ref=e12`.
- Refs come from the latest snapshot. Take a new one after the page changes.
- If the element isn't on the page or isn't visible yet, reveal it before giving up. Open the menu, tab, panel, or dialog it lives in; scroll it into view; or `goto` the page it's on. Use `click`, `hover`, `press`, `goto`, and `eval "el => el.scrollIntoView({block: 'center'})" e12`. Take a new snapshot after each step, and stop once the element shows.
- Don't take any step that saves, submits, deletes, sends, or confirms something to get there. Use Cancel / Escape to back out of anything you opened along the way that isn't needed for the highlight.
- Give up only after a reasonable try. Then tell the user what you tried and where you think the element is.

## 3. Highlight

```bash
playwright-cli -s=hl highlight 'button:has-text("Save")' --style="outline: 2px dotted red"
```

- Always pass that same red `--style`.
- Each call adds a highlight; earlier ones stay. To point at several things, highlight each one.
- Before a new, unrelated highlight, clear the old ones so the page shows only what you're talking about now.
- `"x" does not match any elements` means the target is wrong. Run `find` again and don't guess.
- Highlights disappear when the page reloads or navigates. If the user reloads, highlight again.

## 4. Tell the user

Say in one line what each highlight marks and why, e.g. "Highlighted the Save button: it's disabled until the name field has a value." If you had to reveal it, say how ("opened the Settings tab"). Only take a screenshot if the user asks for one.

## 5. Clear

Leave highlights up while the user looks. When they're done, or before moving to something else:

```bash
playwright-cli -s=hl highlight --hide              # all highlights
playwright-cli -s=hl highlight e12 --hide          # just one
playwright-cli -s=hl detach
```

Never `close`: that would close the user's tab.
