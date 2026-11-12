---
name: take-screenshot
description: Take clean app screenshots with playwright-cli attached to the user's own Chrome through the Playwright extension, so the logged-in session is reused, at a true 1920x1080 with dev-only overlays (Next.js badge, React Query Devtools button) hidden. Use whenever the user asks for a screenshot of a web app, a page, or a UI state.
---

Take screenshots of a running web app with `playwright-cli` attached to the user's Chrome, so that the image shows the page exactly as a user at 1920×1080 sees it, with nothing dev-only on top. The user's Chrome is already logged in, so never try to log in.

Run every command from the repo root: sessions are looked up relative to the working folder. Always pass the same session, `-s=shot`. playwright-cli writes snapshot and console logs to `.playwright-cli/` there; leave them, and don't commit them.

## 1. Attach

```bash
playwright-cli -s=shot attach --extension=chrome
```

It attaches to the tab the extension has connected. If attaching fails, stop and report the exact error; don't fall back to `open`, since a fresh browser lands on the login page.

## 2. Size, navigate, clean, wait — one call

```bash
playwright-cli -s=shot resize 1920 1080
playwright-cli -s=shot run-code "async page => {
  await page.goto('URL');
  await page.waitForLoadState('networkidle');
  await page.addStyleTag({ content: 'nextjs-portal, .tsqd-open-btn-container, .tsqd-parent-container { display: none !important }' });
  await page.waitForSelector('READY_SELECTOR', { state: 'visible' });
  await page.waitForTimeout(500);
  return await page.evaluate(() => ({ url: location.href, w: innerWidth, h: innerHeight, dpr: devicePixelRatio, scale: visualViewport.scale }));
}"
```

- Replace `URL` and `READY_SELECTOR`, an element that exists only once the content is drawn. Don't wait for `canvas` unless the page really has a `<canvas>`. The floor plan, for example, is DOM and SVG: use `[data-testid=canvas-surface]`. Without a good selector, drop that line and rely on `networkidle`.
- `resize` prints no confirmation; the returned object is the check. Expect `{ w: 1920, h: 1080, dpr: 1, scale: 1 }`. `resize` sets the Playwright viewport, so dpr is 1 even on a Retina display.
- `nextjs-portal` is the Next.js dev badge (bottom-left). `.tsqd-*` is the React Query Devtools button (bottom-right). The style lives until the page navigates or reloads; re-inject it after either.
- If the URL is already open in the tab, still use `goto` so the state is fresh. The returned `url` may differ when the app redirects (e.g. adds `?areaId=…`); that's fine unless it redirected to `/login`, which means the tab isn't logged in — stop and tell the user.

## 3. Shoot and check

```bash
playwright-cli -s=shot screenshot --filename=/abs/path/name.png
sips -g pixelWidth -g pixelHeight /abs/path/name.png
```

Save to the session scratchpad unless the user names a place. An absolute path works anywhere; the CLI echoes it back relative to the repo root. Expect 1920×1080. `Read` the image and check that the intended state is visible and nothing covers it.

For a series of UI states, number the files (`feature-1-state.png`, …). Open each dialog or state, shoot, then close it with Cancel / Escape. Never confirm or save a dialog just to get a shot.

## 4. Clean up — always, even after a failure

This is the user's real browser tab, so leave it as you found it:

```bash
playwright-cli -s=shot run-code "async page => { await page.reload(); }"
playwright-cli -s=shot detach
```

Reload drops the injected style. Detach ends the viewport override. Never `close`: that would close the user's tab.

## Reporting

List the full absolute path of each file and its verified size, and say what each one shows. Mention what you hid or changed in the page and that you reloaded and detached afterwards. Console errors the CLI reports are the app's, not the screenshot's; mention them only if they show on the page.
