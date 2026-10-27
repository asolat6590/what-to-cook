import { useEffect, useRef, useState } from 'react';

const SUGGESTIONS = [
  'яйца',
  'сыр',
  'курица',
  'картофель',
  'лук',
  'помидоры',
  'рис',
  'макароны',
  'хлеб',
  'молоко',
];

const EQUIPMENT = [
  'Плита',
  'Духовка',
  'Микроволновка',
  'Сковорода',
  'Кастрюля',
  'Блендер',
  'Мультиварка',
  'Аэрогриль',
  'Миксер',
  'Тостер',
];

function formatTime(minutes) {
  const value = Number(minutes) || 0;
  if (value < 60) return `${value} мин`;
  const hours = Math.floor(value / 60);
  const rest = value % 60;
  return rest ? `${hours} ч ${rest} мин` : `${hours} ч`;
}

function Logo() {
  return (
    <svg className="logo" viewBox="0 0 46 46" aria-hidden="true">
      <rect width="46" height="46" rx="14" fill="currentColor" />
      <path d="M12 20h22c0 7.2-4.5 12-11 12S12 27.2 12 20z" stroke="#f6f0e6" strokeWidth="1.8" />
      <path
        d="M16 20c.6-4 3-6 7-6s6.4 2 7 6"
        stroke="#e7b15a"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

async function readJson(response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || 'Не получилось связаться с сервером.');
  }
  return data;
}

export default function App() {
  const [products, setProducts] = useState('');
  const [equipment, setEquipment] = useState(['Плита', 'Сковорода']);
  const [customGear, setCustomGear] = useState('');
  const [keyMissing, setKeyMissing] = useState(false);
  const [phase, setPhase] = useState('idle');
  const [error, setError] = useState('');
  const [imageError, setImageError] = useState('');
  const [recipe, setRecipe] = useState(null);
  const [imageUrl, setImageUrl] = useState('');
  const [imageKind, setImageKind] = useState('');
  const requestId = useRef(0);

  useEffect(() => {
    fetch('/api/health')
      .then((response) => response.json())
      .then((data) => setKeyMissing(data.ok && !data.hasKey))
      .catch(() => setKeyMissing(false));
  }, []);

  const gearOptions = [
    ...EQUIPMENT,
    ...equipment.filter((item) => !EQUIPMENT.includes(item)),
  ];

  function addProduct(name) {
    setProducts((current) => {
      const items = current
        .split(/[,;\n]/)
        .map((item) => item.trim().toLowerCase())
        .filter(Boolean);
      if (items.includes(name.toLowerCase())) return current;
      const trimmed = current.trim().replace(/,\s*$/, '');
      return trimmed ? `${trimmed}, ${name}` : name;
    });
  }

  function toggleEquipment(name) {
    setEquipment((current) =>
      current.includes(name) ? current.filter((item) => item !== name) : [...current, name]
    );
  }

  function addCustomEquipment(event) {
    event.preventDefault();
    const name = customGear.trim().slice(0, 40);
    if (!name) return;
    setEquipment((current) => (current.includes(name) ? current : [...current, name]));
    setCustomGear('');
  }

  async function loadImage(nextRecipe, id) {
    setPhase('image');
    setImageError('');
    try {
      const image = await readJson(
        await fetch('/api/image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(nextRecipe),
        })
      );
      if (id !== requestId.current) return;
      setImageUrl(`data:${image.mimeType};base64,${image.data}`);
      setImageKind(image.kind || 'photo');
      setPhase('done');
    } catch (err) {
      if (id !== requestId.current) return;
      setImageError(err.message);
      setPhase('done');
    }
  }

  async function onSubmit(event) {
    event.preventDefault();
    const id = ++requestId.current;
    setError('');
    setImageError('');
    setImageUrl('');
    setImageKind('');
    setRecipe(null);
    setPhase('recipe');

    try {
      const nextRecipe = await readJson(
        await fetch('/api/recipe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ products, equipment }),
        })
      );
      if (id !== requestId.current) return;
      setRecipe(nextRecipe);
      await loadImage(nextRecipe, id);
    } catch (err) {
      if (id !== requestId.current) return;
      setError(err.message);
      setPhase('error');
    }
  }

  const busy = phase === 'recipe' || phase === 'image';
  const statusText =
    phase === 'recipe'
      ? 'Подбираю блюдо по вашим продуктам…'
      : phase === 'image'
        ? 'Рецепт готов. Рисую, как блюдо выглядит…'
        : '';

  return (
    <div className="page">
      <header className="hero">
        <div className="brand">
          <Logo />
          <div>
            <p className="eyebrow">Домашняя кухня</p>
            <h1>Что приготовить?</h1>
          </div>
        </div>
        <p className="lede">
          Напишите, что есть в холодильнике, и отметьте технику. Gemini соберёт рецепт и
          покажет, как готовое блюдо может выглядеть.
        </p>
      </header>

      {keyMissing && (
        <p className="banner" role="status">
          В файле <code>.env</code> нет ключа <code>GEMINI_API_KEY</code>. Скопируйте его из{' '}
          <code>.env.example</code> и перезапустите сервер.
        </p>
      )}

      <main className="layout">
        <form className="panel" onSubmit={onSubmit}>
          <label className="field">
            <span>Продукты</span>
            <textarea
              value={products}
              onChange={(event) => setProducts(event.target.value)}
              placeholder="Например: яйца, помидоры, сыр, хлеб, масло"
              rows={5}
              maxLength={600}
              required
            />
          </label>

          <div className="suggestions" aria-label="Частые продукты">
            {SUGGESTIONS.map((item) => (
              <button key={item} type="button" className="ghost" onClick={() => addProduct(item)}>
                {item}
              </button>
            ))}
          </div>

          <fieldset>
            <legend>Кухонная техника</legend>
            <div className="chips">
              {gearOptions.map((item) => {
                const active = equipment.includes(item);
                return (
                  <button
                    key={item}
                    type="button"
                    className={active ? 'chip active' : 'chip'}
                    aria-pressed={active}
                    onClick={() => toggleEquipment(item)}
                  >
                    {item}
                  </button>
                );
              })}
            </div>
          </fieldset>

          <div className="custom-row">
            <input
              value={customGear}
              onChange={(event) => setCustomGear(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') addCustomEquipment(event);
              }}
              placeholder="Своя техника, например вок"
              maxLength={40}
              aria-label="Своя техника"
            />
            <button type="button" className="text-button" onClick={addCustomEquipment}>
              Добавить
            </button>
          </div>

          <button className="submit" type="submit" disabled={busy || products.trim().length < 2}>
            {busy ? 'Готовлю идею…' : recipe ? 'Другой вариант' : 'Придумать блюдо'}
          </button>
          <p className="hint">Соль, перец и немного масла можно не указывать — они и так найдутся.</p>
        </form>

        <section className="stage" aria-live="polite">
          {statusText && (
            <p className="status" role="status">
              {statusText}
            </p>
          )}

          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}

          {!recipe && !error && phase !== 'recipe' && (
            <div className="empty">
              <div className="plate" aria-hidden="true">
                <span />
              </div>
              <h2>Блюдо появится здесь</h2>
              <p>Опишите продукты слева. Рецепт, время, калории и фото соберутся на этой карточке.</p>
            </div>
          )}

          {(recipe || phase === 'recipe') && (
            <article className="card">
              <div className={`photo${imageUrl ? ' ready' : ''}${imageKind === 'illustration' ? ' illustration' : ''}`}>
                {imageUrl ? (
                  <img src={imageUrl} alt={recipe ? `Примерный вид блюда «${recipe.title}»` : ''} />
                ) : (
                  <div className="photo-placeholder">
                    <span>{phase === 'recipe' ? 'Сначала рецепт' : 'Собираю кадр блюда'}</span>
                  </div>
                )}
              </div>

              {recipe && (
                <div className="card-body">
                  <p className="kicker">Рецепт на сегодня</p>
                  <h2>{recipe.title}</h2>
                  {recipe.tagline && <p className="tagline">{recipe.tagline}</p>}
                  {imageKind === 'illustration' && (
                    <p className="photo-note">
                      Примерный вид блюда нарисовал Gemini. Фотомодель на этом ключе сейчас недоступна.
                    </p>
                  )}

                  <dl className="meta">
                    <div>
                      <dt>Время</dt>
                      <dd>{formatTime(recipe.timeMinutes)}</dd>
                    </div>
                    <div>
                      <dt>Калории</dt>
                      <dd>≈ {recipe.calories} ккал</dd>
                    </div>
                    <div>
                      <dt>Порции</dt>
                      <dd>{recipe.servings}</dd>
                    </div>
                  </dl>

                  {imageError && (
                    <div className="image-error">
                      <p>{imageError}</p>
                      <button type="button" onClick={() => loadImage(recipe, requestId.current)}>
                        Повторить фото
                      </button>
                    </div>
                  )}

                  <h3>Ингредиенты</h3>
                  <ul className="ingredients">
                    {recipe.ingredients.map((item) => (
                      <li key={`${item.name}-${item.amount}`}>
                        <span>{item.name}</span>
                        {item.amount && <em>{item.amount}</em>}
                      </li>
                    ))}
                  </ul>

                  <h3>Приготовление</h3>
                  <ol className="steps">
                    {recipe.steps.map((step) => (
                      <li key={step}>{step}</li>
                    ))}
                  </ol>
                </div>
              )}
            </article>
          )}
        </section>
      </main>

      <footer>Рецепт и фото создаёт Gemini. Калорийность ориентировочная, на одну порцию.</footer>
    </div>
  );
}
