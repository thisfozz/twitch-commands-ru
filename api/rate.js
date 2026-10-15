// api/rate.js

export default async function handler(req, res) {
  // 1. URL на твой raw-файл на GitHub
  const GITHUB_RAW_URL = 'https://raw.githubusercontent.com/thisfozz/twitch-commands-ru/main/ratings.txt';

  try {
    // 2. Скачиваем файл с GitHub
    const response = await fetch(GITHUB_RAW_URL);

    if (!response.ok) {
      throw new Error(`GitHub ответил статусом ${response.status}`);
    }

    const text = await response.text();

    // 3. Разбиваем текст на строки, убираем пустые строки
    const phrases = text
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);

    if (phrases.length === 0) {
      return res.status(200).send('Нет доступных фраз.');
    }

    // 4. Выбираем одну случайную фразу
    const randomPhrase = phrases[Math.floor(Math.random() * phrases.length)];

    // 5. Отправляем её обратно. StreamElements подставит своих переменных.
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.status(200).send(randomPhrase);

  } catch (error) {
    console.error('Ошибка:', error);
    res.status(200).send('Ошибка на сервере, попробуйте позже.');
  }
}