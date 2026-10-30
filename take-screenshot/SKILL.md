---
name: take-screenshot
description: Take clean app screenshots with the Playwright MCP at a true 1920x1080 — browser zoom reset to 100% and dev-only overlays (Next.js badge, React Query Devtools button) hidden. Use whenever the user asks for a screenshot of a web app, a page, or a UI state.
---

Take screenshots of a running web app with the Playwright MCP (`mcp__playwright__*`), so that the image shows the page exactly as a user at 1920×1080 sees it, with nothing dev-only on top.

## Before the first shot

1. **Size the window.** `browser_resize` to 1920 × 1080.
2. **Reset zoom to 100%.** The Playwright Chrome window can carry a page zoom (110% has happened), which makes the page lay out narrower than the image — a 1920×1080 PNG of a 1745×982 layout. Press `Meta+0` with `browser_press_key`, then check:

   ```js
   () => ({ w: innerWidth, h: innerHeight, dpr: devicePixelRatio })
   ```

   Expect `{ w: 1920, h: 1080, dpr: 1 }`. If not, press `Meta+0` again or resize again.
3. **Hide dev overlays** with `browser_evaluate`:

   ```js
   () => {
     const s = document.getElementById('shot-clean') ?? document.head.appendChild(Object.assign(document.createElement('style'), { id: 'shot-clean' }));
     s.textContent = 'nextjs-portal, .tsqd-open-btn-container, .tsqd-parent-container { display: none !important }';
     return true;
   }
   ```

   - `nextjs-portal` — the Next.js dev indicator ("N Insight" badge, bottom-left).
   - `.tsqd-*` — the React Query Devtools floating button, a round avatar-like logo bottom-right that covers footer buttons such as Save.

   The style lives until the page reloads; re-inject it after any navigation or reload.

## If something else is in the way

`document.elementsFromPoint` skips elements with `pointer-events: none` and does not look inside shadow roots, so it can miss an overlay. Find what covers a spot by walking every element, shadow roots included:

```js
() => {
  const x = 1700, y = 940, out = [];
  const walk = (root) => {
    for (const e of root.querySelectorAll('*')) {
      const r = e.getBoundingClientRect();
      if (r.left < x && r.right > x && r.top < y && r.bottom > y && r.width < 300)
        out.push(`${e.tagName}|${e.id}|${String(e.className).slice(0, 60)}`);
      if (e.shadowRoot) walk(e.shadowRoot);
    }
  };
  walk(document);
  return out;
}
```

Use CSS-pixel coordinates (image pixels ÷ `devicePixelRatio`), then add the offending selector to the `shot-clean` style.

## Taking the shots

- Save with `browser_take_screenshot`, `scale: "css"`, and a descriptive `filename` under `.playwright-mcp/` in the workspace — the MCP refuses paths outside the workspace roots, including the session scratchpad.
- For a series of UI states (e.g. each dialog a toolbar opens), number the files in order: `feature-1-state.png`, `feature-2-state.png`, …
- Open each dialog or state, shoot, then close it with Cancel / Escape. Never confirm or save a dialog just to get a shot — leave the app's data and draft untouched.
- `Read` every image after saving and check it before reporting: the intended state is visible, nothing covers it, and the layout is 1920 wide.

## Reporting

List the full absolute path of each file, and say what each one shows. Mention anything you hid or changed in the page to get the shot, and that you left the app's state as it was.
