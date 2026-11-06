# Scripted walkthrough (hds#1148)

The walkthrough video on the case study page is recorded by a script, not by a
person. Re-record it after a change the video shows (the case study, a docs
page, the release path):

```sh
pnpm docs:build           # the static site in docs-site/out
pnpm walkthrough:record   # writes docs-site/public/walkthrough/
```

Output, served by the docs site at `/walkthrough/`:

| File              | What it is                                            |
| ----------------- | ----------------------------------------------------- |
| `walkthrough.mp4` | H.264, 1440×900, no sound, about 80 s; must be < 8 MB |
| `poster.jpg`      | The first frame the page shows before play            |
| `walkthrough.vtt` | The captions, timed from the recording                |

## Files

- `chapters.mjs` — the approved script (six captions) and pure helpers: the
  WebVTT builder, the terminal-panel HTML, path redaction. Tested in
  `scripts/__tests__/walkthrough.test.mjs`.
- `evidence.mjs` — runs and reads everything the terminal panels show, at
  record time: the token, its generated CSS, the Figma snapshot entry,
  `check:figma-drift`, the spacing gate failing then passing on a throwaway
  file in the OS temp folder, a pending changeset and `check:figma-release`.
  Local paths are redacted. Nothing is typed in by hand.
- `serve.mjs` — a small static server for `docs-site/out`, plus in-memory
  routes for the panels so they load the site's CSS and fonts.
- `record.mjs` — drives Chromium with Playwright `recordVideo`, then ffmpeg.

## Rules the script keeps

- Waits are on page state: load, selectors, scroll end, and each panel's
  `data-done`. The only timed waits are `hold()`, the viewer's reading time.
- No secrets and no private data: panels show repo files and gate output only,
  and no private repository names.
- The video never autoplays on the page (`components/walkthrough-video.tsx`).

## Needs

- `ffmpeg` on the PATH.
- Playwright's Chromium and its ffmpeg build. When the installed browsers do
  not match the Playwright version (a cloud container, for example), Chromium
  is found by `scripts/lib/browser-host.mjs` (`PLAYWRIGHT_CHROMIUM_PATH` pins
  one). For the video encoder, point `PLAYWRIGHT_BROWSERS_PATH` at a folder
  holding `ffmpeg-<revision>/ffmpeg-linux` (a link to the system ffmpeg works;
  the error names the revision it wants) and set `PLAYWRIGHT_CHROMIUM_PATH`.
