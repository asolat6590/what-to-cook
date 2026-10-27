import { createRecipe, publicError, readBody } from '../server/handlers.js';

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Метод не поддерживается' });
  }

  try {
    res.json(await createRecipe(readBody(req)));
  } catch (err) {
    console.error(err);
    res.status(err.publicMessage ? 400 : 500).json({
      error: err.publicMessage || publicError(err),
    });
  }
}
