# OpenRouter Fusion — Self-Hostable Replica

A lightweight, self-hostable replica of [OpenRouter Fusion](https://openrouter.ai/labs/fusion).

Run multiple AI models side-by-side, stream responses in parallel, and synthesize a single fused answer — all from your browser, powered by your own OpenRouter API key.

---

## Features

- **Multi-model parallel chat** — select 2–4 models and send to all at once
- **Real-time streaming** — watch each model respond word-by-word
- **Fusion synthesis** — auto-synthesize the best answer from all responses
- **Side-by-side comparison** — see each model's response in its own card
- **Conversation history** — multi-turn chat, saved to localStorage
- **Model presets** — Quality, Budget, or Custom model selection
- **System prompt** — customize the system prompt per fusion run
- **Dark / light mode** — toggle with one click, persists across sessions
- **Settings** — enter your OpenRouter API key once, stored locally in your browser

---

## Quickstart

```bash
git clone https://github.com/x3asarc/openrouter-fusion.git
cd openrouter-fusion
npm install
npm run dev
```

Then open [http://localhost:4321](http://localhost:4321) in your browser.

**First time:** click the ⚙️ Settings icon and enter your [OpenRouter API key](https://openrouter.ai/keys).

---

## Stack

| Layer | Tech |
|---|---|
| Framework | [Astro](https://astro.build) (static output) |
| Styling | [Tailwind CSS v3](https://tailwindcss.com) |
| Logic | Vanilla TypeScript (no React/Vue/Svelte) |
| API | [OpenRouter](https://openrouter.ai/docs) — chat completions with streaming |
| Storage | `localStorage` only — zero backend |

---

## How Fusion Works

1. You pick 2–4 models (or use a Quality/Budget preset)
2. Your message is sent to all models simultaneously via streaming
3. Each model's response streams in its own card in real time
4. Once all streams complete, a synthesis request is fired to the "fusion model"
5. The fusion model reads all responses and writes a single, optimized answer
6. The fused answer streams into the **Fused Answer** panel

---

## Build for production

```bash
npm run build
# output in ./dist/ — serve with any static host
```

---

## Privacy

Your API key is stored only in your browser's `localStorage`. It is never sent to any server other than `openrouter.ai` directly from your browser.

---

## License

MIT
