# Magic Coloring 3 – AI backend

This folder contains the Cloudflare Worker source code. **Committing it to GitHub does not deploy it to Cloudflare.**

## Deployment
1. In Cloudflare, open Worker `magic-coloring-ai`, select **Edit code**, replace the starter code with `worker.js` and deploy.
2. Under **Settings → Variables and Secrets**, create two encrypted secrets: `OPENAI_API_KEY` (OpenAI API key) and `PARENT_PASSPHRASE` (a strong unique parent passphrase). Never commit either value to GitHub.
3. Under **Storage & databases → KV**, create a namespace and bind it to the Worker as `LIMITS`. Without this binding, the Worker refuses generation.
4. Only after completing the above, connect the frontend in a separate release. Do not put the passphrase in public frontend code. Ask the parent to enter it at runtime.
5. Set a low API budget and monitor OpenAI usage. KV counters are not atomic; the 5/day cap is a soft cap, not a financial guarantee. Use a Durable Object for strict concurrency-safe limits.

Allowed browser origin: `https://mikkel-h-f.github.io`.
Health endpoint: `GET /health` (from an allowed browser origin).
Image generation: `POST /generate` with `x-parent-passphrase` and JSON keys `character`, `place`, `extra`.

**Important:** CORS alone is not authentication. The passphrase is required server-side. This is an initial family-use prototype, not a hardened public production service.
