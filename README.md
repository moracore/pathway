# Pathway

A daily task app built around a physics-driven reward system. Complete tasks, watch them become planets, and let gravity do the rest.

Built with React, TypeScript, Vite, and Capacitor for Android.

Live: [moracore.github.io/pathway](https://moracore.github.io/pathway)

---

## Pages

### Tasks

The main workspace. Create tasks, assign them a size from 1 to 5, and complete them throughout the day. When a task is completed it spawns as a planet into the canvas below, joining others in a live physics simulation. Completed tasks are permanently logged; unfinished ones are cleared at the daily reset. The canvas can be minimized if you want it out of the way.

### Projects

Organize work into named, color-coded projects. Each project has its own task list that sits separately from the daily task view. Tasks can be promoted to the main list when you are ready to work on them, and automatically return to their project at the daily reset if left unfinished.

### Calendar

A week-by-week view of everything you have completed. Each day shows the planets produced that day, letting you see at a glance how much was done and how big the tasks were. You can also schedule future tasks from here — they import automatically into the task list when their date arrives.

### Groups

Keyword-based groupings that color-code tasks and their planets. Define a group with a name, a color, and a list of keywords, and any task whose text matches will inherit that color across the task list and the physics canvas. You can also manually assign a task to a group to override the keyword matching.

### Trackers

Habit and streak tracking. Each tracker monitors a behavior by keyword — when a matching task is completed, the tracker marks that day. Trackers show a calendar of checked-off dates and calculate your current streak, with configurable gap tolerance if you want to allow occasional missed days. Anti-trackers work in reverse, tracking streaks of days where something did not happen.

---

## Physics

Completed tasks become planets. Their mass is determined by task size — size 1 through 5 maps to mass 2 through 32 — so larger tasks produce more gravitationally significant planets.

Planets from the same time period attract one another using a standard gravitational model. They repel when overlapping and apply friction at the point of contact, settling into loose clusters over time. When three or more planets are in close proximity, a tangential force kicks in after a short delay, pushing them into orbital motion around each other rather than letting them pile up. The result is a slow, evolving system of spinning clusters that grows as you work through the day.

The canvas wraps at the edges so planets never disappear, and a camera smoothly pans to keep the action in frame. Planets glow and leave fading trails when moving.

All physics parameters are tunable: gravitational strength, maximum speed, damping, collision forces, spin timing and magnitude, planet sizing, and glow radius.

---

## Settings

**Appearance** — Switch between dark and light themes. Choose an accent color from five presets or a custom picker.

**Daily Reset Time** — Set the hour (between midnight and 6 AM) at which unfinished tasks are cleared and project tasks return to their projects. This also determines where the calendar day boundary falls.

**Navigation** — Toggle tabs on or off and reorder them. The Tasks tab is always present.

**Recurring Tasks** — Define tasks that inject themselves into your daily list on a schedule. Three frequency modes are available: every day, every N days, or specific days of the week. Each recurring task has a start date, an optional stop date, and a default size.
