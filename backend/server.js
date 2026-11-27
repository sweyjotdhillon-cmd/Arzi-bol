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

const rawApiKey = (process.env.SARVAM_API_KEY || '').trim();
const HAS_SARVAM_KEY = Boolean(rawApiKey && rawApiKey !== 'your_key_here');

const DEMO_RESPONSE = {
  transcript:
    "The contractor didn't pay my wages for 10 days and slapped me when I asked for my money.",
  legal_petition:
    'FORMAL COMPLAINT\n\nSubject: Complaint regarding unpaid wages and physical assault.\n\nRespected Sir/Madam,\nI beg to state that my contractor withheld ₹3,000 in wages. Upon requesting payment yesterday, I was physically assaulted. I request immediate action under BNS Sections 115 (Voluntarily causing hurt) and 351 (Criminal Intimidation).',
  language: 'English',
};

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

async function transcribeWithSarvam(audioBuffer, originalName, mimeType) {
  const form = new FormData();
  form.append('file', audioBuffer, {
    filename: originalName || 'recording.webm',
    contentType: mimeType || 'audio/webm',
  });
  form.append('model', 'saarika:v2');
  form.append('language_code', 'unknown');

  const response = await axios.post(
    'https://api.sarvam.ai/speech-to-text',
    form,
    {
      headers: {
        ...form.getHeaders(),
        'api-subscription-key': rawApiKey,
      },
      timeout: 30000,
    }
  );

  return {
    transcript: response.data?.transcript || '',
    language: response.data?.language_code || 'English',
  };
}

async function draftPetitionWithSarvam(transcript, language) {
  const systemPrompt =
    'You are Arzi-Bol, an expert Indian civic and legal aid assistant. ' +
    'Given a citizen complaint transcript, extract the key facts (parties, dates, amounts, grievances) ' +
    'and draft a clear, formal legal petition / complaint addressed to the appropriate Indian civic or police authority. ' +
    'Cite relevant Indian legal provisions (such as Bharatiya Nyaya Sanhita (BNS), Payment of Wages Act, or civic grievance rules) where applicable. ' +
    'Respond with plain text only, formatted as a formal complaint starting with "FORMAL COMPLAINT".';

  const response = await axios.post(
    'https://api.sarvam.ai/v1/chat/completions',
    {
      model: 'sarvam-m',
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: `Language: ${language}\nCitizen Statement:\n${transcript}`,
        },
      ],
      temperature: 0.2,
    },
    {
      headers: {
        'Content-Type': 'application/json',
        'api-subscription-key': rawApiKey,
      },
      timeout: 30000,
    }
  );

  const legalPetition =
    response.data?.choices?.[0]?.message?.content?.trim() || '';
  if (!legalPetition) {
    throw new Error('Empty legal petition returned from Sarvam LLM.');
  }
  return legalPetition;
}

const handleHealth = (_req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'arzi-bol-backend',
    mode: HAS_SARVAM_KEY ? 'live' : 'local-demo',
  });
};

app.get('/health', handleHealth);
app.get('/api/health', handleHealth);

app.post('/api/process-audio', upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No audio file uploaded.' });
    }

    if (!HAS_SARVAM_KEY) {
      await delay(2000);
      return res.status(200).json(DEMO_RESPONSE);
    }

    const { transcript, language } = await transcribeWithSarvam(
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype
    );

    if (!transcript.trim()) {
      return res
        .status(422)
        .json({ error: 'Could not detect speech in the uploaded audio.' });
    }

    const legal_petition = await draftPetitionWithSarvam(transcript, language);

    return res.status(200).json({
      transcript,
      legal_petition,
      language,
    });
  } catch (err) {
    console.error('Error in /api/process-audio:', err?.message || err);
    return res
      .status(500)
      .json({ error: 'Failed to process audio. Please try again.' });
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

    if (!HAS_SARVAM_KEY) {
      await delay(2000);
      return res.status(200).json(DEMO_RESPONSE);
    }

    const legal_petition = await draftPetitionWithSarvam(text, language);

    return res.status(200).json({
      transcript: text,
      legal_petition,
      language,
    });
  } catch (err) {
    console.error('Error in /api/process-text:', err?.message || err);
    return res
      .status(500)
      .json({ error: 'Failed to process text. Please try again.' });
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
  const modeLabel = HAS_SARVAM_KEY
    ? 'Live Sarvam AI Mode'
    : 'Local Demo Mode (no SARVAM_API_KEY)';
  console.log(`Arzi-Bol backend listening on port ${PORT} [${modeLabel}]`);
});
