import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import cors from 'cors';
import { createImage, createRecipe, publicError } from './handlers.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const app = express();
const PORT = process.env.PORT || 3002;

app.use(cors());
app.use(express.json({ limit: '32kb' }));

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, hasKey: Boolean(process.env.GEMINI_API_KEY?.trim()) });
});

app.post('/api/recipe', async (req, res) => {
  try {
    res.json(await createRecipe(req.body));
  } catch (err) {
    console.error(err);
    res.status(err.publicMessage ? 400 : 500).json({
      error: err.publicMessage || publicError(err),
    });
  }
});

app.post('/api/image', async (req, res) => {
  try {
    res.json(await createImage(req.body));
  } catch (err) {
    console.error(err);
    const incomplete = /incomplete|invalid/i.test(String(err.message || ''));
    res.status(incomplete ? 400 : 500).json({
      error: incomplete ? 'Не хватает данных рецепта для изображения.' : publicError(err),
    });
  }
});

app.listen(PORT, () => {
  console.log(`API server http://localhost:${PORT}`);
  if (!process.env.GEMINI_API_KEY?.trim()) {
    console.warn('Warning: GEMINI_API_KEY is missing. Add it to .env in the project root.');
  }
});
