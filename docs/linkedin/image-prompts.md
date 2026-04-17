# Image Prompts for dev-logs LinkedIn Article

Copy-paste these into Google Banana Pro, Imagen, Midjourney, DALL-E, Ideogram, or any text-to-image model. All prompts are optimized for **LinkedIn 1200×630** cover/article images.

---

## 🎯 Prompt 1 — Hero / Cover Image

Best for the **article cover** and the LinkedIn share post.

```
A sleek dark-mode technology banner, 1200x630 aspect ratio, for an open-source developer tool called "dev-logs". The composition: on the left side, bold clean sans-serif headline "Bug tracking that stays with your app" in white with subtle cyan and violet gradient. Below the headline, a smaller terminal prompt in monospaced font showing: $ npx @hemangjoshi37a/dev-logs, styled inside a dark rounded card with a thin cyan glowing border. On the right side, a floating glowing purple-to-cyan bug icon badge (round, metallic, 3D) surrounded by four small floating UI chips labeled "Screenshots", "Element Picker", "Annotations", "File Uploads" — each chip is a dark glassmorphism pill with thin cyan border, slightly tilted at different angles. Background: deep navy and black radial gradient with a faint subtle tech grid pattern, soft purple and cyan nebula glows in the corners. Clean enterprise aesthetic, reminiscent of Linear, Vercel, or Arc Browser marketing visuals. Minimal, premium, futuristic. No people, no logos.
```

**Negative prompt** (if supported): `cluttered, cartoonish, stock-photo, bright background, white background, multiple logos, watermarks, text artifacts, crowded, low-quality, 3D render of people, generic startup illustration`

---

## 🎯 Prompt 2 — Feature Grid Illustration

Good for the "What's inside" section or a standalone infographic.

```
A 3x2 grid of dark glassmorphism feature cards on a deep navy background with soft purple and cyan nebula glows. Each card is a dark rounded rectangle with a colored icon badge in the top-left and a short title + tagline. The six cards from left to right, top to bottom: (1) purple bug icon "Floating Bug Button — draggable overlay, Ctrl+D toggle", (2) cyan camera icon "Auto Screenshots — clean captures with annotations", (3) amber warning icon "Console Logs — last 100 errors auto-attached", (4) pink crosshair icon "Element Metadata — DOM selectors, classes, dimensions", (5) green paperclip icon "File Attachments — drag & drop anything", (6) indigo robot icon "AI-Ready Output — structured JSON for Claude, GPT". At the top center a small uppercase label reads "WHY DEV-LOGS" in cyan, above a white headline "Everything you need. Zero setup." At the bottom center a monospaced terminal line: $ npx @hemangjoshi37a/dev-logs. Dark mode, premium software marketing aesthetic, flat but with subtle depth, 1200x630.
```

**Negative prompt**: `photorealistic hands, stock imagery, bright backgrounds, cluttered, illegible text, low contrast, amateur design`

---

## 🎯 Prompt 3 — Before / After Comparison

Good for a "problem vs solution" graphic.

```
A split comparison banner 1200x630, dark navy background. Left half in a red-tinted dark card labeled "BEFORE — TRADITIONAL BUG TRACKER" showing a numbered list of 6 frustrating steps: "Notice the bug, Switch to Jira, Describe from memory, Switch back take screenshot, Re-open console, Attach manually", with a small red badge at the bottom reading "~5 minutes · Context lost". Right half in a green-tinted dark card labeled "AFTER — DEV-LOGS" showing 6 easy steps: "Press Ctrl+D, Describe in plain text, Screenshot auto-captured, Console errors attached, Element metadata captured, Click Submit", with a small green badge at the bottom reading "~15 seconds · Full context". Between the two cards, a subtle vertical divider with a small circular cyan-to-purple gradient badge containing an arrow pointing right. Top center headline in white with cyan highlight: "Traditional bug tracking vs. dev-logs". Premium dark-mode infographic, clean sans-serif typography, rounded corners, soft glowing accents, no people, no stock imagery.
```

**Negative prompt**: `bright, light mode, hand-drawn, childish, photorealistic hands typing, messy icons, illegible text, generic`

---

## 🎯 Prompt 4 — Lifestyle / In-Context Shot

Good for a secondary article image showing how it feels in use.

```
A close-up realistic render of a modern laptop screen showing a dark-themed web application in the background, with a floating glassmorphism panel overlaid in the bottom-right corner. The panel has a header reading "Dev Logs" with a small purple bug icon, two tabs "Submit" and "Requests", and a compact form with fields for description, priority buttons (Low/Medium/High/Critical), and category buttons (Bug/Enhance/Feature/UI/UX). A small purple gradient circular bug button floats near the bottom-right corner of the screen. Soft cyan-to-violet glow around the panel. The laptop is on a clean minimalist desk in a dark room with ambient purple/blue lighting from a large monitor. Shallow depth of field, cinematic moody tech photography style. No visible person, no text on other screens, no brand logos.
```

**Negative prompt**: `bright daylight, cluttered desk, multiple monitors, people, hands, stock photo feel, low-res, artifacts`

---

## 🎯 Prompt 5 — Minimalist Icon-Only Square (for Instagram / Twitter)

Good for a 1:1 square crop.

```
A minimalist square 1080x1080 icon-style image on deep black background with a large centered metallic bug icon in purple-to-cyan gradient, glowing soft and sitting inside a thin concentric cyan ring. Subtle radial light from center. Below the bug, in small clean white monospaced text: npx @hemangjoshi37a/dev-logs. Very minimal, premium, like an Apple or Vercel product icon. No other elements.
```

---

## 🖌️ Style guidelines that work across all prompts

- **Colors**: Deep navy (#0f172a, #020617), cyan (#22d3ee, #06b6d4), violet (#a855f7, #7c3aed), white (#e2e8f0), warning amber (#f59e0b), success green (#22c55e)
- **Aesthetic**: Dark mode, glassmorphism, soft glows, thin borders, rounded corners
- **Typography feel**: Clean sans-serif (Inter/SF Pro vibe), monospace for code (JetBrains Mono / SF Mono vibe)
- **Reference visuals**: Linear.app marketing, Vercel marketing, Arc Browser, Raycast, Anthropic, Stripe dev docs
- **Ratio**: LinkedIn article = 1200×630. LinkedIn post = 1200×627 or 1080×1080. Twitter/X = 1200×675. Instagram = 1080×1080.

---

## 🚀 Quick copy-paste for Google Banana Pro / Gemini

Banana Pro handles long, descriptive prompts well. Use Prompt 1 exactly as written for the hero. For variations, just append:

- `, variant with the bug badge centered and larger`
- `, variant without the floating chips, minimalist`
- `, variant with screenshots of the actual UI shown on tilted device mockups`

---

## 🧪 Fine-tuning tips

If the generated image includes mis-rendered text (common with most image models):
1. Generate a **blank / abstract** version first (remove all specific text)
2. Overlay the text yourself in Figma / Canva / Photopea
3. Keeps typography crisp and spellings correct

If you want a specific **bug icon style**, add: `in the style of Lucide React icons, clean geometric line art, rounded endcaps`

If the output feels too busy, add: `minimal, lots of negative space, single focal point`
