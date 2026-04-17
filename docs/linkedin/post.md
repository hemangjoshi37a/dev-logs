Just shipped dev-logs — an open-source bug tracker that lives inside your web app. 🐛

No more alt-tabbing to Jira. No more "describing the bug from memory." No more manually cropping screenshots and copying console errors.

One command:
    npx @hemangjoshi37a/dev-logs

One line to inject into any app:
    <script src="http://localhost:4445/overlay.js"></script>

A floating, draggable bug button appears in the corner. Press Ctrl+D. The panel slides in. Describe the bug in plain text, hit submit. Done in 15 seconds.

What it auto-captures:
• Clean page screenshots (overlay hides itself during capture)
• Last 100 console errors & warnings
• Element metadata — tag, classes, CSS selector, dimensions
• Viewport size, user agent, timestamp, URL
• Any files you drag in

Advanced mode gives you element picker, area snipping, freehand annotation, and a full ticket system with checklists, comments, and status tracking.

Output is structured JSON. AI tools (Claude, GPT, Copilot) can consume it as-is and start fixing the bug immediately. No back-and-forth, no ambiguity.

Zero setup. Zero config. Zero cloud. MIT licensed. Open source.

Written the long version here: [link to article]

GitHub: https://github.com/hemangjoshi37a/dev-logs
NPM: https://www.npmjs.com/package/@hemangjoshi37a/dev-logs

Would love feedback from anyone building web apps with AI-assisted coding. ⭐ a star if you find it useful.

#OpenSource #DeveloperTools #WebDevelopment #AI #JavaScript #TypeScript #React #BugTracking #DevEx #Productivity
