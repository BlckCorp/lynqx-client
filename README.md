# 🌙 Луна | Lynqx (Monorepo)

> Голосовой сервис для кооп-игр: Factorio, Captain of Industry, Terraria

## 🎯 Цель
Создать стабильный голосовой чат с серверами в РФ для игроков, которые ценят:
- Низкий пинг (<20 мс)
- Инструменты для кооперации (задачи, схемы, роли)
- Оплату картами РФ
- Отсутствие лишнего шума

## 📁 Структура проекта

```
lynqx/
├── apps/                    # Все приложения проекта
│   ├── client/             # Tauri клиент (Desktop приложение)
│   │   ├── src/           # Исходный код фронтенда
│   │   ├── src-tauri/     # Tauri бэкенд (Rust)
│   │   └── package.json   # Зависимости Node.js
│   └── server/            # Socket.IO сервер
│       ├── index.js       # Основная логика сервера
│       └── package.json   # Зависимости Node.js
├── package.json           # Корневой package.json с workspaces
└── README.md              # Этот файл
```

## 🚀 Быстрый старт

### Требования
- Node.js >= 18
- Rust >= 1.70 (только для клиента)
- Cargo (только для клиента)

### Установка всех зависимостей

```bash
# Установка всех зависимостей сразу (клиент + сервер)
npm install --workspaces
```

### Запуск в режиме разработки

#### Вариант 1: Запуск обоих приложений одновременно
```bash
npm run dev
```

#### Вариант 2: Раздельный запуск

**Терминал 1 - Сервер:**
```bash
npm run dev:server
# или
npm start --workspace=apps/server
```

**Терминал 2 - Клиент:**
```bash
npm run dev:client
# или
npm run dev --workspace=apps/client
```

### Сборка проекта

```bash
# Сборка всех приложений
npm run build

# Или по отдельности
npm run build:client    # Сборка клиента
npm run build:server    # Сборка сервера (если нужно)
```

## ⚙️ Настройка

### URL сервера

По умолчанию клиент подключается к `http://localhost:3000`. Для изменения:

1. Создайте файл `.env` в директории клиента (`apps/client/.env`):
   ```bash
   SOCKET_URL=https://your-server.com
   ```

Или используйте переменную окружения Tauri `SOCKET_URL`.

### Конфигурация сервера

Переменные окружения для сервера:
- `PORT` - порт сервера (по умолчанию: 3000)
- `HOST` - хост сервера (по умолчанию: 0.0.0.0)

Пример запуска сервера на конкретном порту:
```bash
PORT=8080 npm run start --workspace=apps/server
```

## 🛠 Технический стек

### Клиент
- **Frontend:** Vanilla JS, HTML5, CSS3
- **Desktop:** Tauri v2
- **Real-time:** Socket.IO Client
- **Linting:** ESLint v10

### Сервер
- **Runtime:** Node.js
- **Real-time:** Socket.IO
- **UUID:** uuid v10

## 🔌 API события

Клиент использует Socket.IO для общения с сервером:

### Отправляемые события (Client → Server):
- `register` - Регистрация пользователя
- `createRoom` - Создание комнаты
- `joinRoom` - Присоединение к комнате
- `chatMessage` - Отправка сообщения
- `getRoomList` - Получение списка комнат

### Получаемые события (Server → Client):
- `registered` - Успешная регистрация
- `roomList` - Список комнат
- `roomJoined` - Успешный вход в комнату
- `chatMessage` - Новое сообщение в чате
- `messageHistory` - История сообщений
- `roomUserList` - Список пользователей в комнате
- `userJoinedRoom` - Пользователь вошёл в комнату
- `error` - Ошибка

## 🗓 Дорожная карта
- [x] Базовый текстовый чат
- [x] Система комнат
- [x] Monorepo структура
- [x] Конфигурация URL сервера
- [ ] Голосовой чат (WebRTC/LiveKit)
- [ ] Интеграция с бэкендом в РФ
- [ ] Публичный релиз

## 📬 Контакты
- Автор: @BlckCorp
- Telegram: @LessGodblesss

