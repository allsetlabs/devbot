# DevBot Intro Video

A Remotion project for producing marketing/intro videos for DevBot and its plugins. Videos are composed as React components and rendered to MP4 via the Remotion CLI.

This is a standalone side project — not part of the running DevBot stack. It's used occasionally when a fresh intro clip or plugin marketing video is needed, then the MP4 is dropped into the app or shared externally.

## Structure

```
src/
├── Root.tsx                  # Remotion composition registry
├── DevBotIntro.tsx           # Main DevBot intro video composition
├── BabyLogsMarketing.tsx     # Plugin marketing clip
├── LawnCareMarketing.tsx     # Plugin marketing clip
├── EcsToEks.tsx              # One-off explainer composition
├── HelloWorld.tsx            # Template / scratch composition
├── scenes/                   # Reusable scene components
├── components/               # Shared visual elements
├── lib/                      # Easing, timing, color helpers
└── index.ts

out/                          # Rendered MP4 outputs (gitignored in practice)
```

## Working with Remotion

- **Preview** — `npm run dev` opens Remotion Studio for live scrubbing.
- **Render** — `npm run render` renders `DevBotIntro` to `out/devbot-intro.mp4`. Adjust the composition name in `package.json` for other clips.
- **Compositions register in `Root.tsx`** — add new videos there so they show up in the studio + CLI.
- **Fonts come from `@remotion/google-fonts`** — load them inside components, not globally.
