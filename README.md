# ⚖️ Arzi-Bol: Voice-to-Legal Engine

> Giving a voice to the voiceless through serverless, multi-LLM civic technology.

Arzi-Bol is an enterprise-grade, voice-first web application designed for India's unorganised sector. It allows citizens facing civic or workplace injustices to speak their grievances in regional dialects. The engine transcribes the audio, maps the legal facts to the new Bharatiya Nyaya Sanhita (BNS, 2023), and instantly generates a formal Pratham Suchna Report (FIR) ready for police submission.

## 🚀 Key Features

- **Voice-First Audio Capture:** Client-side Web Audio API seamlessly converts microphone input to `audio/wav` formats, bypassing browser-specific WebM incompatibilities.
- **Multi-LLM Agnosticism:** Completely provider-agnostic. Bring Your Own Key (BYOK) support for Gemini, OpenAI, Anthropic (Claude), and OpenRouter.
- **Zero-Retention Edge Architecture:** Deployed on Cloudflare Workers. Audio buffers and API keys exist strictly in RAM for the duration of the fetch request. No data is ever written to disk.
- **Deep Legal Mapping:** The core system prompt acts as a Senior Advocate, mapping raw emotional transcripts strictly to BNS 2023, IPC 1860, and specialized acts (IT Act, POCSO, PWDVA).
- **Anti-Prompt Injection:** Hardened against malicious audio inputs attempting to hijack the LLM's system instructions.

## 🧠 End-to-End Workflow

1. **Speak:** User accepts the liability waiver and speaks a grievance in Hindi, Punjabi, Urdu, or English.
2. **Process:** React encodes a `.wav` file and POSTs it securely to the Cloudflare Edge Worker.
3. **Transcribe:** The worker hits Sarvam AI (`saaras:v4`) to handle the code-mixed Indian dialect transcription.
4. **Draft:** The Cloudflare router formats the exact payload required for the user's chosen LLM (Gemini, Claude, or OpenAI) and passes the transcript through the Master Legal Prompt.
5. **Output:** A formally structured, legally sound Markdown FIR is returned to the user's screen.

## 🛠️ Technical Stack

- **Frontend:** React, Tailwind CSS, Vite, Web Audio API
- **Backend:** Cloudflare Workers / Pages Functions (Serverless Edge)
- **Speech-to-Text:** Sarvam AI
- **Intelligence:** Google Gemini, OpenAI, Anthropic, OpenRouter

## 🔒 Security Audit Passed

- [x] **No hardcoded secrets:** Keys remain in browser `localStorage`.
- [x] **No disk writes:** `request.formData()` stream processing directly on the Edge.
- [x] **Strict CORS:** Traffic restricted to authenticated UI origins.
- [x] **Error Masking:** API failures return generic `500`s; no raw stack traces or API keys are leaked to the client.

## 💻 Local Development (Docker)

The application includes a `docker-compose.yml` configured to use Cloudflare's `wrangler` emulator, ensuring a 1:1 parity between local testing and the live edge deployment.
