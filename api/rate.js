const GITHUB_RAW_URL =
  'https://raw.githubusercontent.com/thisfozz/twitch-commands-ru/main/rating.txt';

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');

  // Ограничиваем ответ по байтам, чтобы бот не обрезал
  // русскую букву или эмодзи посередине.
  function send(message) {
    if (Buffer.byteLength(message, 'utf8') > 400) {
      let shortened = '';

      for (const character of message) {
        if (Buffer.byteLength(shortened + character, 'utf8') > 397) {
          break;
        }

        shortened += character;
      }

      message = shortened.trimEnd() + '…';
    }

    return res.status(200).send(message);
  }

  // Параметры уже декодированы — decodeURIComponent не нужен.
  const sender =
    typeof req.query.sender === 'string'
      ? req.query.sender.trim()
      : '';

  const target =
    typeof req.query.target === 'string'
      ? req.query.target.trim().replace(/\s+/g, ' ')
      : '';

  if (!target) {
    return send('Что оцениваем? Напиши: !оценить мой вкус в музыке');
  }

  try {
    const response = await fetch(GITHUB_RAW_URL, {
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) {
      throw new Error(`GitHub ответил статусом ${response.status}`);
    }

    const text = await response.text();

    const phrases = text
      .split(/\r?\n/)
      .map(line => line.trim())
      .filter(Boolean);

    // Собираем фразы в группы по оценкам.
    const groups = new Map();

    for (const phrase of phrases) {
      const match = phrase.match(/на\s+(10|[1-9])\/10\b/);

      if (!match) continue;

      const score = Number(match[1]);

      if (!groups.has(score)) {
        groups.set(score, []);
      }

      groups.get(score).push(phrase);
    }

    // Проверяем, что для каждой оценки есть хотя бы одна фраза.
    for (let score = 1; score <= 10; score++) {
      if (!groups.has(score)) {
        throw new Error(`В rating.txt нет фраз для ${score}/10`);
      }
    }

    const score = Math.floor(Math.random() * 10) + 1;
    const candidates = groups.get(score);
    const template =
      candidates[Math.floor(Math.random() * candidates.length)];

    // Подставляем только переменные исходного шаблона.
    const replacements = {
      '$(sender)': sender || 'Зритель',
      '$(1:)': target,
    };

    const result = template.replace(
      /\$\(sender\)|\$\(1:\)/g,
      token => replacements[token]
    );

    return send(result);
  } catch (error) {
    console.error('Ошибка команды !оценить:', error);

    return send('Не удалось получить оценку. Попробуйте чуть позже.');
  }
}