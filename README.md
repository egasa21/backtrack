# Backtrack

A personal backend engineering roadmap. Eight modules take you from plain Java to an Authentication Service project. Curriculum is source-controlled JSON; personal progress stays in your browser.

## Run locally

Requires Node.js 22.18+ and npm.

```sh
npm ci
npm run dev
```

Open http://localhost:3000. Use the roadmap to open modules, concepts, exercises, and challenges. Notes autosave. Completion is explicit: checking tasks does not automatically mark a topic completed. Explanation checks and AI assistance remain separate from status.

```sh
npm test
npm run typecheck
npm run build
```

`npm run build` produces a fully static site in `out/`. Preview it with `python3 -m http.server 3000 --directory out` (do not use `npm start` for the static export). Deploy `out/` to a static host such as GitHub Pages, Netlify, or Cloudflare Pages. Use `npm ci` as the install command and `npm run build` as the build command where supported.

For GitHub Pages under a repository subpath, set `basePath: "/your-repository"` in `next.config.ts` before building, and add an empty `out/.nojekyll` to the published output. Use HTTPS on your host. No API, database, authentication, or server runtime is required after building.

## Back up your progress

Open **Progress & backup** to export `my-learning-progress.json`. It contains all personal progress, with a version and export timestamp. Imports are validated, then require confirmation before replacement. Reset also requires confirmation.

Progress uses the `backtrack-progress-v1` localStorage key. It belongs to a browser profile and origin (including protocol and port). Clearing site data or closing a private browsing session can remove it. Export before changing browser or deployment URL. Other tabs on the same origin receive saved updates; simultaneous edits use the last saved snapshot. Storage failures appear in the app; export unsaved progress before closing it. If existing storage is unreadable, autosave pauses to protect the original until an explicit import or reset.

## Edit or extend the curriculum

`data/roadmap.json` defines the title, learning process, and rules. Each `data/modules/*.json` file defines a module with:

- `id`, `order`, `title`, `goal`, `dependencies`
- `topics`, `exercises`, `challenges`

Each item has `id`, `title`, `description`, `learningGoals`, `concepts`, `examples`, `tasks`, and `dependencies`. Exercises and challenges additionally have `requirements`, `constraints`, and `deliverables`. Each task has a stable `id` and `title`.

Copy a module file, use globally unique lowercase kebab-case IDs, set its order, and update its content and dependencies. Files are discovered automatically at build time; no registry or application changes are needed. Rebuild to generate routes. Keep existing IDs stable to preserve progress. Progress for removed IDs remains in exports but does not count toward the current roadmap. Avoid dependency cycles.

Recommendations first continue an active learning/practicing topic, then choose the first not-started topic with completed prerequisites. Review includes manually marked topics and completed topics whose explanation check is No. Module prerequisites are met when all their topics are completed. Progress percentage counts completed topics; exercises and challenges are tracked separately.

## Project structure

```text
app/          Next.js App Router pages and responsive styles
components/   Dashboard, roadmap, detail editors, backup controls, context
data/         Roadmap and eight standalone module JSON files
lib/          Build-time curriculum loader, progress rules, localStorage
types/        Curriculum and progress types
tests/        Native Node tests for import validation, focus, curriculum
```

No streaks, cloud sync, AI integration, spaced repetition, or external state library in V1. The PostgreSQL and Spring references are learning content, not app infrastructure.
