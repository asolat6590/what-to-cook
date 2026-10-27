import { buildRecipePrompt, generateDishImage, generateJson, normalizeRecipe } from './gemini.js';

export function publicError(err) {
  const msg = String(err?.message || '');
  if (err?.code === 'NO_KEY' || /is not set/i.test(msg)) {
    return 'Добавьте GEMINI_API_KEY в переменные окружения и перезапустите сервер.';
  }
  if (/API key|API_KEY|permission denied|unauthenticated|401|403/i.test(msg)) {
    return 'Ключ Gemini отклонён. Проверьте переменную GEMINI_API_KEY.';
  }
  if (/429|quota|rate/i.test(msg)) {
    return 'Слишком много запросов к Gemini. Подождите немного и попробуйте снова.';
  }
  if (/timeout|too long|UNAVAILABLE|503|overloaded|high demand/i.test(msg)) {
    return 'Gemini сейчас отвечает слишком долго. Попробуйте ещё раз.';
  }
  if (/incomplete|invalid/i.test(msg)) {
    return 'Модель вернула неполный рецепт. Попробуйте ещё раз.';
  }
  if (/no image/i.test(msg)) {
    return 'Рецепт готов, но изображение блюда получить не удалось.';
  }
  return 'Не получилось получить ответ от Gemini. Попробуйте ещё раз.';
}

export function readProducts(body) {
  const products = String(body?.products || '').replace(/\s+/g, ' ').trim().slice(0, 600);
  if (products.length < 2) {
    const error = new Error('Products are required');
    error.publicMessage = 'Напишите хотя бы один продукт.';
    throw error;
  }
  return products;
}

export function readEquipment(body) {
  const source = Array.isArray(body?.equipment) ? body.equipment : [];
  return [...new Set(source.map((item) => String(item || '').trim()).filter(Boolean))]
    .slice(0, 12)
    .map((item) => item.slice(0, 40));
}

export function readBody(req) {
  if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) {
    return req.body;
  }
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }
  return {};
}

export async function createRecipe(body) {
  const products = readProducts(body);
  const equipment = readEquipment(body);
  const raw = await generateJson(buildRecipePrompt({ products, equipment }));
  return normalizeRecipe(raw);
}

export async function createImage(body) {
  const recipe = normalizeRecipe(body);
  return generateDishImage(recipe);
}
