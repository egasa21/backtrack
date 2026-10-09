# Backtrack

A personal backend engineering roadmap. Ten modules take you from plain Java to an Authentication Service project, a networking/payment-reconciliation lab, and practical JVM investigation. Curriculum is source-controlled JSON; personal progress stays in your browser.

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

The full curriculum also includes `material`: a plain-text `explanation`, a `workedExample` with `scenario` and ordered `steps`, `commonMistakes`, `guidedExercise`, `independentExercise`, and `recallQuestions`. `acceptanceCriteria` states observable completion checks; `resources` contains official documentation links as `{ title, url }`. Modules include `outcomes`, `studyGuidance`, and `completionCriteria`. The app renders these fields directly without HTML, Markdown processing, or new dependencies. Existing simpler JSON definitions still render through the original examples fallback.

The updated track has 172 topics, 47 exercises, and 11 challenges across ten modules. It introduces testing in Java Core, transfers domain reasoning to inventory, teaches executable SQL and JDBC before generated persistence, separates authentication from authorization, and finishes with operational failure drills and a local runbook. Tree traversal remains foundational; implementing a balanced tree is optional depth. All topics still count toward progress.

Existing module, item, and task IDs are preserved. Notes, statuses, attempts, AI assistance, and checked tasks remain associated with the same content. Added topics can lower a module's percentage and leave new prerequisites incomplete; no progress is reset or silently marked complete. Previously completed exercises and challenges remain completed, so revisit their expanded criteria manually when useful.

Copy a module file, use globally unique lowercase kebab-case IDs, set its order, and update its content and dependencies. Files are discovered automatically at build time; no registry or application changes are needed. Rebuild to generate routes. Keep existing IDs stable to preserve progress. Progress for removed IDs remains in exports but does not count toward the current roadmap. Avoid dependency cycles.

Recommendations first continue an active learning/practicing topic, then choose the first not-started topic with completed prerequisites. Review includes manually marked topics and completed topics whose explanation check is No. Module prerequisites are met when all their topics are completed. Progress percentage counts completed topics; exercises and challenges are tracked separately.

## Project structure

```text
app/          Next.js App Router pages and responsive styles
components/   Dashboard, roadmap, detail editors, backup controls, context
data/         Roadmap and ten standalone module JSON files
lib/          Build-time curriculum loader, progress rules, localStorage
types/        Curriculum and progress types
tests/        Native Node tests for import validation, focus, curriculum
```

No streaks, cloud sync, AI integration, spaced repetition, or external state library in V1. The PostgreSQL and Spring references are learning content, not app infrastructure.

## Networking and resource-management extension

Module 9 adapts the supplied **Backend Networking & Resource Management** self-study guide after Production Thinking. Its eight topics cover Units 0–7; sixteen labs cover request mapping, DNS/routing, TCP framing and captures, TLS/PKIX, HTTP timing/reuse, JDBC and HTTP saturation, short transactions, bounded executors, durable scheduling, failure injection, and the twenty-question self-assessment. Unit 8 is the Mini Payment Status Reconciler capstone, including all ten original acceptance checks and six oral-review scenarios.

The module page links to the complete original guide at `public/materials/backend-networking-self-study.md`, including shell commands, the suggested lab layout, reference shelf, and manual 0–4 mastery rubric. Record scores, evidence paths, and revisit dates in existing notes; no new progress schema is needed. The guide suggests eight weeks at four to six hours per week.

Labs use only local or authorized targets and a local fake payment provider. TLS verification remains enabled; packet capture excludes production traffic and credentials. Database and Spring dependencies belong to the learning labs, not to this web app. Per-payment due timestamps, bounded workers, idempotent effects, short claims, and stale-worker protection are explicit capstone requirements.

## JVM internals and tuning extension

Module 10 adds 21 topics, eight practical labs, and a JVM investigation capstone. It covers class loading and bytecode, heap versus stack and reference semantics, object layout and reachability, retained leaks, collectors and safepoints, JIT and escape analysis, the Java memory model, thread budgets, native memory, and JVM failure classification. The final lessons connect CPU locality and benchmark pitfalls to measured tuning.

Labs use plain Java, bytecode inspection, GC logs, thread dumps, JFR, and Native Memory Tracking. Experiments run in bounded local processes with synthetic data. The capstone requires a root-cause correction, a complete process-memory budget, and one controlled runtime-setting comparison with explicit rollback criteria. Java 25 official documentation is linked throughout; implementation-specific claims and command behavior must be checked against the JDK actually used. No runtime dependency or progress-schema change is introduced.
