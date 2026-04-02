# 🌙 Луна | Lynqx (Client)

> Голосовой сервис для кооп-игр: Factorio, Captain of Industry, Terraria

## 🎯 Цель
Создать стабильный голосовой чат с серверами в РФ для игроков, которые ценят:
- Низкий пинг (<20 мс)
- Инструменты для кооперации (задачи, схемы, роли)
- Оплату картами РФ
- Отсутствие лишнего шума

## 🚀 Быстрый старт

### Требования
- Node.js >= 18
- Rust >= 1.70
- Cargo

### Установка зависимостей

```bash
npm install
```

### Запуск в режиме разработки

```bash
npm run dev
```

### Сборка приложения

```bash
npm run build
```

### Линтинг кода

```bash
npm run lint
```

## ⚙️ Настройка

### URL сервера

По умолчанию клиент подключается к `http://localhost:3000`. Для изменения:

1. Создайте файл `.env` в корне проекта:
   ```bash
   cp .env.example .env
   ```

2. Измените значение `VITE_SOCKET_URL`:
   ```
   VITE_SOCKET_URL=https://your-server.com
   ```

Или используйте переменную окружения Tauri `SOCKET_URL`.

## 🛠 Технический стек
- **Frontend:** Vanilla JS, HTML5, CSS3
- **Desktop:** Tauri v2
- **Real-time:** Socket.IO
- **Linting:** ESLint v10

## 📁 Структура проекта

```
lynqx-client/
├── src/                  # Исходный код фронтенда
│   ├── main.js          # Основная логика клиента
│   └── styles.css       # Стили (базовые Tauri)
├── src-tauri/           # Tauri бэкенд (Rust)
│   ├── src/             # Rust код
│   └── tauri.conf.json  # Конфигурация Tauri
├── index.html           # HTML интерфейс
├── package.json         # Зависимости Node.js
└── eslint.config.js     # Конфигурация ESLint
```

## 🔌 API события

Клиент использует Socket.IO для общения с сервером:

### Отправляемые события:
- `register` - Регистрация пользователя
- `sendMessage` - Отправка сообщения
- `joinRoom` - Присоединение к комнате
- `createRoom` - Создание комнаты
- `getRoomList` - Получение списка комнат

### Получаемые события:
- `registered` - Успешная регистрация
- `chatMessage` - Новое сообщение в чате
- `roomList` - Список комнат
- `roomJoined` - Успешный вход в комнату
- `roomUserList` - Список пользователей в комнате
- `messageHistory` - История сообщений
- `userJoinedRoom` - Пользователь вошёл в комнату

## 🗓 Дорожная карта
- [x] Базовый текстовый чат
- [x] Система комнат
- [x] Конфигурация URL сервера
- [ ] Голосовой чат (WebRTC/LiveKit)
- [ ] Интеграция с бэкендом в РФ
- [ ] Публичный релиз

## 📬 Контакты
- Автор: @BlckCorp
- Telegram: @LessGodblesss

