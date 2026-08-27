# Telegram Rich Messages API

Как работает Bot API `sendRichMessage` и какие rich-элементы поддерживаются.

## Как это работает

1. Собираешь контент как **HTML** или **Markdown**.
2. Кладёшь его в `rich_message` (ровно одно поле: `html` **или** `markdown`).
3. Шлёшь `POST` на `https://api.telegram.org/bot<TOKEN>/sendRichMessage`.
4. Telegram сам парсит разметку в rich-блоки / entities — вручную `MessageEntity[]` собирать не нужно.

### Обязательные поля

| Поле | Описание |
|------|----------|
| `chat_id` | ID чата / `@username` канала |
| `rich_message` | `{ "html": "..." }` **или** `{ "markdown": "..." }` |

Оба формата сразу передавать нельзя.

### Опции `rich_message`

| Поле | Описание |
|------|----------|
| `is_rtl` | RTL-рендер |
| `skip_entity_detection` | отключить автодетект URL / email / @mention / #hashtag / cashtag / bot_command |

### Опции сообщения

`message_thread_id`, `disable_notification`, `protect_content`, `reply_parameters`, `reply_markup` (inline keyboard — опционально; для Rich предпочтительнее кнопки в HTML).

### Draft

`sendRichMessageDraft` — временный черновик только в private chat (~30 с). Нужны `chat_id`, `draft_id` (nonzero), `rich_message`. Несколько апдейтов с одним `draft_id` анимируют черновик. Финал — всегда `sendRichMessage`. Блок `<tg-thinking>` допустим только в draft.

## Curl

Подставь `<TOKEN>` и `chat_id`.

### Минимальный HTML

```bash
curl -X POST "https://api.telegram.org/bot<TOKEN>/sendRichMessage" \
  -H "Content-Type: application/json" \
  -d "{\"chat_id\":123456789,\"rich_message\":{\"html\":\"<h2>Отчет</h2><p>Все системы <b>в норме</b>.</p>\"}}"
```

### Минимальный Markdown

```bash
curl -X POST "https://api.telegram.org/bot<TOKEN>/sendRichMessage" \
  -H "Content-Type: application/json" \
  -d "{\"chat_id\":123456789,\"rich_message\":{\"markdown\":\"# Отчет\\n\\nВсе системы **в норме**.\"}}"
```

### Расширенный (thread + кнопки в HTML + skip_entity_detection)

```bash
curl -X POST "https://api.telegram.org/bot<TOKEN>/sendRichMessage" \
  -H "Content-Type: application/json" \
  -d "{
    \"chat_id\": \"@my_channel\",
    \"message_thread_id\": 42,
    \"disable_notification\": true,
    \"rich_message\": {
      \"html\": \"<h2>Сводка</h2><p>Статус: <tg-spoiler>ready</tg-spoiler></p><tg-button-row><tg-button type=\\\"url\\\" style=\\\"success\\\" url=\\\"https://example.com\\\">Открыть</tg-button></tg-button-row>\",
      \"skip_entity_detection\": true
    }
  }"
```

### Draft

```bash
curl -X POST "https://api.telegram.org/bot<TOKEN>/sendRichMessageDraft" \
  -H "Content-Type: application/json" \
  -d "{\"chat_id\":123456789,\"draft_id\":9001,\"rich_message\":{\"html\":\"<p><tg-thinking>Генерирую…</tg-thinking></p>\"}}"
```

## Лимиты

| Лимит | Значение |
|-------|----------|
| Текст | 32768 UTF-8 символов (включая alt custom emoji и исходник формул) |
| Блоки | ≤ 500 (включая вложенные: list items, table rows, quotes, details) |
| Вложенность | ≤ 16 уровней |
| Медиа | ≤ 50 (photo/video/audio суммарно) |
| Таблица | ≤ 20 колонок |

## Inline-элементы

| Элемент | HTML |
|---------|------|
| Bold | `<b>…</b>` |
| Italic | `<i>…</i>` |
| Underline | `<u>…</u>` |
| Strikethrough | `<s>…</s>` |
| Spoiler | `<tg-spoiler>…</tg-spoiler>` |
| Marked / highlight | `<mark>…</mark>` |
| Inline code | `<code>…</code>` |
| Subscript | `<sub>…</sub>` |
| Superscript | `<sup>…</sup>` |
| Ссылка | `<a href="https://…">…</a>` |
| Email | `<a href="mailto:…">…</a>` |
| Телефон | `<a href="tel:…">…</a>` |
| Custom emoji | `<tg-emoji emoji-id="ID">👍</tg-emoji>` |
| Дата/время | `<tg-time unix="1647531900" format="wDT">…</tg-time>` |
| Inline math (LaTeX) | `<tg-math>x^2 + y^2</tg-math>` |
| Якорь | `<a name="section"></a>` |
| Ссылка на якорь | `<a href="#section">…</a>` |
| Inline-кнопка | `<tg-button type="url" url="…">…</tg-button>` |

Автодетект (если не `skip_entity_detection`): URL, email, @mention, #hashtag, $cashtag, /bot_command.

## Блоки

| Блок | HTML |
|------|------|
| Заголовок | `<h1>` … `<h6>` |
| Абзац | `<p>…</p>` |
| Подвал | `<footer>…</footer>` |
| Разделитель | `<hr/>` |
| Список | `<ul>` / `<ol>` + `<li>`; checklist: `<li><input type="checkbox" checked?>…</li>` |
| Таблица | `<table bordered? striped?>…</table>` |
| Фото | `<figure><img src="…" spoiler?/>…</figure>` или `<img>` |
| Видео | `<figure><video src="…" spoiler?></video>…</figure>` |
| Аудио / голосовое | `<figure><audio src="…"></audio>…</figure>` |
| Документ | `<tg-document src="…">…</tg-document>` |
| Коллаж | `<tg-collage><img/><video/>…</tg-collage>` |
| Слайдшоу | `<tg-slideshow><img/><video/>…</tg-slideshow>` |
| Цитата | `<blockquote collapsed?>…<cite>…</cite></blockquote>` |
| Выносная цитата | `<aside>…<cite>…</cite></aside>` |
| Details | `<details open?><summary>…</summary>…</details>` |
| Код | `<pre>` / `<pre><code class="language-…">…</code></pre>` |
| Math block | `<tg-math-block>E = mc^2</tg-math-block>` |
| Карта | `<tg-map lat="41.9" long="12.5" zoom="14"/>` |
| Ряд кнопок | `<tg-button-row align="left\|center\|right">…</tg-button-row>` |
| Thinking (только draft) | `<tg-thinking>…</tg-thinking>` |

Подписи медиа: `<figcaption>…<cite>credit</cite></figcaption>`.

## Кнопки

В Rich предпочтительнее кнопки **в теле HTML**, а не `reply_markup`.

- Inline: несколько `<tg-button>` внутри `<p>`
- Block: `<tg-button-row>` — 1–8 кнопок, optional `align`

### Types

| `type` | Ключевые атрибуты |
|--------|-------------------|
| `url` | `url` |
| `callback_data` | `data` (не `callback_data`!) |
| `web_app` | `url` |
| `login_url` | `url`, `forward-text`, `request-write-access` |
| `switch_inline_query` | `query` |
| `switch_inline_query_current_chat` | `query` |
| `switch_inline_query_chosen_chat` | `query`, `allow-*-chats` |
| `copy_text` | `text` (clipboard, 1–256) |
| `disabled` | — |

### Styles

`danger` | `success` | `primary` | `link` (атрибут `style="…"`)

### Пример

```html
<p>
  <tg-button type="url" style="success" url="https://t.me">url</tg-button>
  <tg-button type="callback_data" style="link" data="cb">callback</tg-button>
</p>
<tg-button-row align="center">
  <tg-button type="web_app" url="https://telegram.org">Mini App</tg-button>
  <tg-button type="copy_text" text="payload">Copy</tg-button>
  <tg-button type="disabled">Disabled</tg-button>
</tg-button-row>
```

`reply_markup.inline_keyboard` всё ещё можно передать рядом с `rich_message` — классический fallback.

## Пример HTML-фрагмента

```html
<h2>Релиз</h2>
<p>Статус: <b>ok</b>, детали <tg-spoiler>скрыты</tg-spoiler>.</p>
<ul>
  <li>Шаг 1</li>
  <li><input type="checkbox" checked>Шаг 2</li>
</ul>
<details open>
  <summary>Почему</summary>
  <p>Пик нагрузки.</p>
</details>
<tg-math-block>E = mc^2</tg-math-block>
<figure>
  <img src="https://example.com/photo.jpg"/>
  <figcaption>Скрин<cite>Ops</cite></figcaption>
</figure>
<tg-button-row>
  <tg-button type="url" url="https://example.com">Открыть</tg-button>
</tg-button-row>
```

## См. также

Полный справочник тегов и Bot API shapes: [docs/telegram-rich-message-sending.md](docs/telegram-rich-message-sending.md)
