import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import multer from 'multer';
import axios from 'axios';
import FormData from 'form-data';

const app = express();
const PORT = Number(process.env.PORT) || 3001;
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || 'http://localhost:8080';
const DEFAULT_GEMINI_MODEL = 'gemini-3.8-flash';
const SAFE_MODEL_REGEX = /^[a-zA-Z0-9._-]+$/;

const envSarvamKey = (process.env.SARVAM_API_KEY || '').trim();
const envGeminiKey = (process.env.GEMINI_API_KEY || '').trim();

function isValidKey(value) {
  return (
    typeof value === 'string' &&
    value.trim().length > 0 &&
    value.trim() !== 'your_key_here'
  );
}

const HAS_ENV_SARVAM_KEY = isValidKey(envSarvamKey);

const DEMO_RESPONSE = {
  transcript:
    "The contractor didn't pay my wages for 10 days and slapped me when I asked for my money.",
  legal_petition:
    'FORMAL COMPLAINT\n\nSubject: Complaint regarding unpaid wages and physical assault.\n\nRespected Sir/Madam,\nI beg to state that my contractor withheld ₹3,000 in wages. Upon requesting payment yesterday, I was physically assaulted. I request immediate action under BNS Sections 115 (Voluntarily causing hurt) and 351 (Criminal Intimidation).',
  language: 'English',
};

const LEGAL_SYSTEM_PROMPT = `You are a Senior Advocate practicing in the Supreme Court of India. Your task is to convert a raw, emotional, translated transcript (originating from Hindi/Punjabi) into a highly formal, chronological legal complaint/FIR request.

EXTRACTION RULES:
- Identify the victim, accused, dates, times, and location. Adjust gender pronouns based on context.
- Strip away emotional rambling; retain strict chronological facts.

LEGAL MAPPING RULES (APPLY APPLICABLE LAWS):
- Primary: Use the Bharatiya Nyaya Sanhita (BNS, 2023) exclusively instead of the old IPC.
  - Theft/Snatching: BNS Sec 303/304
  - Cheating/Fraud: BNS Sec 318
  - Physical Assault/Hurt: BNS Sec 115
  - Criminal Intimidation: BNS Sec 351
  - Crimes against Women (Outraging modesty, sexual harassment, rape): BNS Sec 74, 75, 63, 64
  - Mob Violence/Organized Crime: BNS Sec 103, 111
- Secondary Acts (if applicable):
  - Cybercrime: Information Technology (IT) Act, 2000 (e.g., Sec 66C, 66E, 67).
  - Domestic Violence: PWDVA, 2005.
  - Child Offences: POCSO Act, 2012.
  - Caste Atrocities: SC/ST (Prevention of Atrocities) Act, 1989.

OUTPUT FORMAT:
Return a cleanly formatted Markdown string following this exact Indian legal structure:
**To:** The Station House Officer (SHO) / District Magistrate [Choose appropriate authority]
**Subject:** Pratham Suchna Report (FIR) regarding [One line summary]
**Respected Sir/Madam,**
[Paragraph 1: Applicant details and incident summary]
[Paragraph 2: Chronological sequence of events in formal language]
**Applicable Legal Sections:**
[Bullet points of the BNS/Special Act sections attracted, with a 1-sentence justification for each]
**Prayer:**
I therefore humbly request you to register an FIR under the aforementioned sections and initiate strict legal action against the accused.
**Date:** [Leave blank] | **Signature:** [Leave blank]

Do not include any JSON wrapping, just the raw Markdown text.`;

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB max audio upload
  },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype && file.mimetype.startsWith('audio/')) {
      cb(null, true);
    } else {
      cb(new Error('Only audio files are supported.'));
    }
  },
});

app.use(helmet());
app.use(
  cors({
    origin: ALLOWED_ORIGIN,
    methods: ['GET', 'POST', 'OPTIONS'],
  })
);
app.use(express.json({ limit: '1mb' }));

function resolveGeminiModel(rawModel) {
  if (typeof rawModel !== 'string') return DEFAULT_GEMINI_MODEL;
  const trimmed = rawModel.trim();
  if (!trimmed || !SAFE_MODEL_REGEX.test(trimmed)) {
    return DEFAULT_GEMINI_MODEL;
  }
  return trimmed;
}

function sanitizeUpstreamMessage(rawMessage) {
  if (typeof rawMessage !== 'string') return '';
  return rawMessage
    .replace(/https?:\/\/\S+/gi, '')
    .replace(/key=[^&\s]+/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function formatUpstreamError(err, serviceName) {
  const status = err?.response?.status;
  const upstreamMsg = sanitizeUpstreamMessage(
    err?.response?.data?.error?.message || err?.response?.data?.message || ''
  );

  if (status === 401 || status === 403) {
    return {
      status: 401,
      message: `Invalid ${serviceName} API key. Please open Settings and verify your key.`,
    };
  }

  if (status === 429) {
    return {
      status: 429,
      message: `${serviceName} rate limit reached. Please wait a moment and try again.`,
    };
  }

  if (status === 404) {
    return {
      status: 400,
      message: `${serviceName} model or endpoint was not found. Please check your model selection in Settings.`,
    };
  }

  if (err?.code === 'ECONNABORTED' || err?.code === 'ETIMEDOUT') {
    return {
      status: 504,
      message: `${serviceName} request timed out. Please try again.`,
    };
  }

  if (upstreamMsg && upstreamMsg.length <= 200 && !/[{}[\]]/.test(upstreamMsg)) {
    return {
      status: status && status >= 400 && status < 500 ? status : 502,
      message: `${serviceName} error: ${upstreamMsg}`,
    };
  }

  return {
    status: 502,
    message: `Unable to reach ${serviceName}. Please try again shortly.`,
  };
}

async function transcribeWithSarvam(audioBuffer, originalName, mimeType, sarvamKey) {
  const form = new FormData();
  form.append('file', audioBuffer, {
    filename: originalName || 'recording.webm',
    contentType: mimeType || 'audio/webm',
  });
  form.append('model', 'saaras:v4');
  form.append('mode', 'transcribe');

  try {
    const response = await axios.post(
      'https://api.sarvam.ai/speech-to-text',
      form,
      {
        headers: {
          ...form.getHeaders(),
          'api-subscription-key': sarvamKey,
        },
        timeout: 30000,
      }
    );

    return {
      transcript: response.data?.transcript || '',
      language: response.data?.language_code || 'English',
    };
  } catch (err) {
    const formatted = formatUpstreamError(err, 'Sarvam AI');
    const wrapped = new Error(formatted.message);
    wrapped.statusCode = formatted.status;
    throw wrapped;
  }
}

async function draftPetitionWithGemini(transcript, language, geminiKey, geminiModel) {
  const modelName = resolveGeminiModel(geminiModel);
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
    modelName
  )}:generateContent?key=${encodeURIComponent(geminiKey)}`;

  try {
    const response = await axios.post(
      endpoint,
      {
        systemInstruction: {
          parts: [{ text: LEGAL_SYSTEM_PROMPT }],
        },
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: `Detected Language: ${language}\nCitizen Statement:\n${transcript}`,
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.2,
        },
      },
      {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 30000,
      }
    );

    const parts = response.data?.candidates?.[0]?.content?.parts;
    const legalPetition = Array.isArray(parts)
      ? parts
          .map((part) => (typeof part?.text === 'string' ? part.text : ''))
          .join('')
          .trim()
      : '';

    if (!legalPetition) {
      const err = new Error('Gemini returned an empty legal petition. Please try again.');
      err.statusCode = 502;
      throw err;
    }

    return legalPetition;
  } catch (err) {
    if (err?.statusCode) {
      throw err;
    }
    const formatted = formatUpstreamError(err, 'Gemini');
    const wrapped = new Error(formatted.message);
    wrapped.statusCode = formatted.status;
    throw wrapped;
  }
}

const handleHealth = (_req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'arzi-bol-backend',
    mode: HAS_ENV_SARVAM_KEY ? 'live' : 'local-demo',
  });
};

app.get('/health', handleHealth);
app.get('/api/health', handleHealth);

app.post('/api/process-audio', upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No audio file uploaded.' });
    }

    const requestSarvamKey =
      typeof req.body?.sarvamKey === 'string' ? req.body.sarvamKey.trim() : '';
    const sarvamKey = isValidKey(requestSarvamKey)
      ? requestSarvamKey
      : envSarvamKey;

    const requestGeminiKey =
      typeof req.body?.geminiKey === 'string' ? req.body.geminiKey.trim() : '';
    const geminiKey = isValidKey(requestGeminiKey)
      ? requestGeminiKey
      : envGeminiKey;

    const geminiModel = resolveGeminiModel(req.body?.geminiModel);

    // Keyless fallback: if SARVAM_API_KEY is absent, bypass all Axios calls and return demo JSON after 2s
    if (!isValidKey(sarvamKey)) {
      await delay(2000);
      return res.status(200).json(DEMO_RESPONSE);
    }

    if (!isValidKey(geminiKey)) {
      return res.status(400).json({
        error: 'Gemini API key is required. Please configure it in Settings.',
      });
    }

    const { transcript, language } = await transcribeWithSarvam(
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype,
      sarvamKey
    );

    if (!transcript.trim()) {
      return res
        .status(422)
        .json({ error: 'Could not detect speech in the uploaded audio.' });
    }

    const legal_petition = await draftPetitionWithGemini(
      transcript,
      language,
      geminiKey,
      geminiModel
    );

    return res.status(200).json({
      transcript,
      legal_petition,
      language,
    });
  } catch (err) {
    const statusCode = err?.statusCode || 500;
    const message =
      err?.statusCode && err?.message
        ? err.message
        : 'Failed to process audio. Please try again.';
    console.error('Error in /api/process-audio:', message);
    return res.status(statusCode).json({ error: message });
  }
});

app.post('/api/process-text', async (req, res) => {
  try {
    const text = typeof req.body?.text === 'string' ? req.body.text.trim() : '';
    const language =
      typeof req.body?.language === 'string' && req.body.language.trim()
        ? req.body.language.trim()
        : 'English';

    if (!text) {
      return res.status(400).json({ error: 'Text input is required.' });
    }

    const requestGeminiKey =
      typeof req.body?.geminiKey === 'string' ? req.body.geminiKey.trim() : '';
    const geminiKey = isValidKey(requestGeminiKey)
      ? requestGeminiKey
      : envGeminiKey;
    const geminiModel = resolveGeminiModel(req.body?.geminiModel);

    if (!HAS_ENV_SARVAM_KEY || !isValidKey(geminiKey)) {
      await delay(2000);
      return res.status(200).json(DEMO_RESPONSE);
    }

    const legal_petition = await draftPetitionWithGemini(
      text,
      language,
      geminiKey,
      geminiModel
    );

    return res.status(200).json({
      transcript: text,
      legal_petition,
      language,
    });
  } catch (err) {
    const statusCode = err?.statusCode || 500;
    const message =
      err?.statusCode && err?.message
        ? err.message
        : 'Failed to process text. Please try again.';
    console.error('Error in /api/process-text:', message);
    return res.status(statusCode).json({ error: message });
  }
});

app.use((err, _req, res, _next) => {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ error: 'Invalid or oversized audio upload.' });
  }
  if (err?.message === 'Only audio files are supported.') {
    return res.status(400).json({ error: err.message });
  }
  console.error('Unhandled server error:', err?.message || err);
  return res.status(500).json({ error: 'Something went wrong.' });
});

app.listen(PORT, '0.0.0.0', () => {
  const modeLabel = HAS_ENV_SARVAM_KEY
    ? 'Live Sarvam + Gemini Mode'
    : 'Local Demo Mode (no SARVAM_API_KEY)';
  console.log(`Arzi-Bol backend listening on port ${PORT} [${modeLabel}]`);
});
