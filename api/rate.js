export default async function handler(req, res) {
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');

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

  const sender = typeof req.query.sender === 'string' ? req.query.sender.trim() : '';
  const target = typeof req.query.target === 'string' ? req.query.target.trim().replace(/\s+/g, ' ') : '';

  if (!target) {
    return send('Что оцениваем? Напиши: !оценить стримера');
  }

  try {
    // 1. Получаем базовый URL (ваш текущий домен Vercel)
    const protocol = req.headers['x-forwarded-proto'] || 'http';
    const host = req.headers.host;
    const LOCAL_FILE_URL = `${protocol}://${host}/rating.txt`;

    // 2. Делаем запрос к своему же статическому файлу
    const response = await fetch(LOCAL_FILE_URL);

    if (!response.ok) {
      throw new Error(`Не удалось загрузить rating.txt, статус: ${response.status}`);
    }

    const text = await response.text();

    const phrases = text
      .split(/\r?\n/)
      .map(line => line.trim())
      .filter(Boolean);

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

    for (let score = 1; score <= 10; score++) {
      if (!groups.has(score)) {
        throw new Error(`В rating.txt нет фраз для ${score}/10`);
      }
    }

    const score = Math.floor(Math.random() * 10) + 1;
    const candidates = groups.get(score);
    const template = candidates[Math.floor(Math.random() * candidates.length)];

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