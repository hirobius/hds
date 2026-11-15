# PR previews

Vercel preview builds are off (production only). This applies to all fleet repos.
Each pull request carries its own preview.

1. Run the production build locally (`pnpm build`) and serve the built app (`pnpm preview`, or the repo's screenshot tooling).
2. Attach screenshots of the affected routes only.
   - Size 390x844, light and dark.
   - Add a desktop shot if the route is used on desktop.
   - Six images at most, inline in the PR body or in a PR comment.
   - Adrian reviews on his phone: no zips, nothing that he must build.
3. For a backend or infra PR with no visual change, write "no visual change".
4. Never turn Vercel preview builds on again, and never add `[preview]`, to get screenshots.
