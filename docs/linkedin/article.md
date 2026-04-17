# I got tired of switching tabs to file a bug report. So I built dev-logs.

Every developer knows the ritual.

You spot a glitch in the app you're building. A button that won't click. A dropdown that flickers. A number that shows up wrong on a Tuesday but not on a Wednesday.

You stop what you're doing.

You alt-tab to Jira, or Linear, or GitHub Issues. You click "New Issue." You stare at the blank description field and try to remember what just happened — which page, which button, which order of clicks. You alt-tab back, take a screenshot, crop it, upload it. You remember there was a console error, so you alt-tab again, open DevTools, copy the stack trace. You write "Reproduce by…" and then realize you can't remember the exact path that caused it.

Five minutes later you've filed a ticket that's already lost half of the context you had when you first noticed the bug.

It's 2026. We can do better than this.

---

## What dev-logs is

**dev-logs** is an open-source floating overlay that lives inside your web app during development. It captures everything — screenshots, console errors, element metadata, viewport info, user agent, and any files you want to attach — and turns it into a structured bug report that an AI can act on immediately.

One command to start it:

```bash
npx @hemangjoshi37a/dev-logs
```

One line to inject it into any web app you're building:

```html
<script src="http://localhost:4445/overlay.js"></script>
```

That's the whole setup. No database. No signup. No SaaS.

---

## Why I built it

I kept running into the same friction loop. I'd be deep inside an app — Claude Code open, a complex UI loaded, my mental model of the bug fresh — and then I'd have to leave the app to file the bug. Every time I context-switched, I lost something: the exact DOM path I was looking at, the console error that scrolled away, the specific viewport size that triggered the issue.

The problem isn't that bug trackers are bad. Jira, Linear, GitHub Issues — they're fine at what they do. The problem is that they live *outside* the place where bugs actually happen. And the more you have to describe a bug from memory, the worse the bug report gets.

I wanted a tool that:

- Lives **inside** the app during development
- Captures context **automatically**, not from memory
- Produces output that an AI can consume **as-is** to start working on the fix
- Can be **stripped from production** with a one-line removal
- Has **zero infrastructure** — just runs locally

dev-logs is what I ended up with.

---

## What's inside

A purple bug button floats in the corner of your app. Press it or hit `Ctrl+D`.

A panel slides in — draggable, resizable, stays out of your way. Two tabs: **Submit** and **Requests**.

**Submit** gives you:
- A plain-text description field
- Priority (Low / Medium / High / Critical) and Category (Bug / Enhancement / Feature / UI-UX)
- A screenshot button (clean captures — the overlay hides itself during capture)
- An "Advanced" mode with element picker, area snipping, and freehand annotation
- Drag-and-drop file attachments for logs, images, or anything else
- Auto-captured context: current URL, viewport size, console errors from the last 100 entries, user agent, timestamp

**Requests** gives you:
- A searchable, filterable list of every submitted item
- Per-request detail view with status lifecycle, checklists, markdown comments, reference links, completion percentage, testing notes, and stakeholder feedback

The output is structured JSON. When you hand a request to Claude, GPT, or Copilot, there's no ambiguity left — the AI has the screenshot, the error, the selector, the description, and every piece of metadata needed to start fixing.

---

## The screenshot problem (and how it's solved)

Every bug-capture tool I tried had the same issue: when it took a screenshot, it captured its own UI too. The "Capturing..." spinner. The toolbar. The floating button. You'd end up with a screenshot of the reporter, not the bug.

dev-logs hides the entire overlay — the panel, the bug button, the toolbar, any annotations in progress — then waits for the browser to repaint, captures, and restores. The screenshot is always clean. Pixel-for-pixel the host app, nothing else.

It's a small thing. But it's the kind of thing that tells you whether a tool was built by someone who actually uses it.

---

## How to get started

If you just want to run it locally right now:

```bash
npx @hemangjoshi37a/dev-logs
```

Open `http://localhost:4445`. The panel is waiting.

If you want to inject it into your own app while you're developing:

```html
<!-- Add to your app's HTML, only in dev -->
<script>
  if (location.hostname === 'localhost') {
    const s = document.createElement('script');
    s.src = 'http://localhost:4445/overlay.js';
    document.head.appendChild(s);
  }
</script>
```

Install globally if you'd rather not type `npx` every time:

```bash
npm install -g @hemangjoshi37a/dev-logs
dev-logs
```

All your data stays in a `.dev-logs/` folder in your current working directory. No cloud. No telemetry. Nothing to sign up for.

---

## What's next

This is v1. It works. It's shipping. It's open-source under MIT.

A few things I want to add:
- A Vite plugin so injection is one config line instead of a script tag
- Native MCP integration so AI agents can read/write directly
- Webhook support for teams that want to mirror submissions into their existing tracker
- Shared team mode with a lightweight sync server for small groups

If any of that sounds interesting, or if you just want to kick the tires, the repo is here:

**https://github.com/hemangjoshi37a/dev-logs**

NPM:

**https://www.npmjs.com/package/@hemangjoshi37a/dev-logs**

Stars, issues, and PRs all welcome.

---

## A closing thought

Most productivity tools promise to save you time. dev-logs doesn't really save time in any measurable way — a bug report still takes a minute to write. What it does is **preserve context**, which is a different and more important thing. Context is fragile. It leaks out of your head the moment you alt-tab. If you can capture it at the exact moment it exists, you have everything you need. If you can't, you're guessing.

The best developer tools are the ones that let you stay where you are.

---

*Hemang Joshi — Founder, [hjLabs.in](https://hjlabs.in). Industrial automation, AI/ML, IoT, and open-source developer tools. Serving 15+ countries with a 4.9⭐ Google rating.*

*Connect: [LinkedIn](https://www.linkedin.com/in/hemang-joshi-046746aa) · [GitHub](https://github.com/hemangjoshi37a) · [Website](https://hjlabs.in)*
