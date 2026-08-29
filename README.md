# Сапёр (Telegram-бот)

Telegram-бот «Сапёр». Репозиторий: https://github.com/JILEH9/sapper

Бот работает без базы: состояние игры живёт в сообщении. PostgreSQL опционален — если `DATABASE_URL` не задан, ничего не сохраняется.

## Требования на сервере

- Docker и Docker Compose v2 (`docker compose`)

```bash
docker --version
docker compose version
```

## Установка на сервер

### 1. Клонировать репозиторий

```bash
git clone https://github.com/JILEH9/sapper.git
cd sapper
```

### 2. Создать `.env`

```bash
cp .env.example .env
nano .env
```

Заполни переменные:

```env
BOT_TOKEN=123456:AA...токен_от_BotFather
TELEGRAM_API_URL=https://api.telegram.org
```

| Переменная | Описание |
|---|---|
| `BOT_TOKEN` | Токен бота от [@BotFather](https://t.me/BotFather) |
| `TELEGRAM_API_URL` | Базовый URL Bot API (`https://api.telegram.org` или свой прокси) |

Файл `.env` в git не коммитится.

### Postgres (опционально, скрыто по умолчанию)

По умолчанию `DATABASE_URL` в `.env.example` закомментирован. Без него бот работает, users/updates не пишутся.

Чтобы включить запись, раскомментируй в `.env`:

```env
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DBNAME
```

Пример:

```env
DATABASE_URL=postgresql://postgres:secret@192.168.1.10:5432/saper
```

- Базу создай заранее: `CREATE DATABASE saper;`
- С сервера бота должен открываться порт Postgres (часто `5432`)
- Таблицы `users` и `updates` создаются при старте

### 3. Запуск

```bash
docker compose up -d --build
```

Статус:

```bash
docker compose ps
```

Логи бота:

```bash
tail -f logs/bot.log
```

Остановка:

```bash
docker compose down
```

## Обновление

```bash
cd sapper
git pull
docker compose up -d --build
```

## Локальный запуск без Docker

Нужны Node.js ≥ 18 и заполненный `.env`.

```bash
git clone https://github.com/JILEH9/sapper.git
cd sapper
cp .env.example .env
# заполни .env
npm ci
npm start
```
