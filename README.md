# Pathway

A personal project tracker that lives entirely in your browser. No accounts, no sync, no server — everything is stored locally as plain Markdown files using the Origin Private File System (OPFS).

Pathway is built around one idea: **your work should have structure without bureaucracy**. Each tab handles a distinct layer of how you think about and do work.

---

## Tabs

### Today
A daily planning flow that resets each morning (configurable reset time, default 4am). At the start of each day you pick which projects to pull from, select specific tasks, and optionally carry over anything unfinished from yesterday. The result is a focused task list for the day with a weighted progress bar. Tasks have T·I·C metadata (Time × Importance × Complexity) that determines how much weight each task carries toward completion.

### Projects
The core of Pathway. Each project is a Markdown file with tasks organised into sections. Tasks use a `[ T | I | C ]` metadata format where each value is 1–5, and progress is calculated by weight rather than raw count — a quick low-importance task doesn't move the bar the same as a hard critical one.

When all tasks in a project are done, you're prompted to either add more work, set it **dormant** for a period, or mark it done permanently.

The **Generate** button opens a brainstorm panel: write your thoughts in plain language and the AI generates a clean, ordered task list with appropriate T/I/C values based on your notes and the existing project context.

### Goals
Long-horizon tracking via milestones. Goals sit above projects — they represent outcomes, not task lists. Each milestone can be linked to a project and given a deadline.

### Trackers
Lightweight habit and metric tracking. Useful for things that don't fit neatly into tasks — streaks, recurring checks, ongoing measurements.

### Dormant
Projects you've set aside intentionally. A dormant project has a wake date; when that date passes it quietly returns to your Projects list the next morning. Permanently completed projects also live here. You can reactivate any dormant project early from this screen.

---

## Task Format

Tasks are stored as readable Markdown:

```
- [ ] `[ T | I | C ]` Task description
```

- **T** — Time (1 = <15 min, 5 = half day+)
- **I** — Importance (1 = nice to have, 5 = critical)
- **C** — Complexity (1 = trivial, 5 = hard/uncertain)

Progress is weighted: `weight = T × I × C`. This means a `[1|1|1]` task and a `[5|5|5]` task don't count equally toward completion.

---

## AI Features

Pathway uses OpenRouter (or a direct Google AI Studio key) for AI features. Set your key in Settings.

- **Brainstorm** — Write a messy braindump; the AI reads it alongside your existing tasks and generates an ordered, broken-down task list.
- **Goal Milestones** — AI can suggest milestones to break down a high-level goal.

---

## Storage

All data is stored in the browser's OPFS as `.md` files. Nothing leaves your device unless you use AI features. You can read, edit, or back up your files directly — they're plain Markdown.

---

## Stack

React · TypeScript · Tailwind CSS · Vite · Capacitor (Android/iOS)
