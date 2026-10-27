import { createImage, publicError, readBody } from '../server/handlers.js';

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Метод не поддерживается' });
  }

  try {
    res.json(await createImage(readBody(req)));
  } catch (err) {
    console.error(err);
    const incomplete = /incomplete|invalid/i.test(String(err.message || ''));
    res.status(incomplete ? 400 : 500).json({
      error: incomplete ? 'Не хватает данных рецепта для изображения.' : publicError(err),
    });
  }
}
