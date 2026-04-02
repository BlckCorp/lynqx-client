# 🌙 Lynqx Server

Socket.IO сервер для Lynqx чат-приложения.

## Установка

```bash
npm install
```

## Запуск

### Development режим (с авто-перезагрузкой)
```bash
npm run dev
```

### Production режим
```bash
npm start
```

## Конфигурация

Переменные окружения:
- `PORT` - порт сервера (по умолчанию: 3000)
- `HOST` - хост сервера (по умолчанию: 0.0.0.0)

Пример:
```bash
PORT=3000 HOST=localhost npm start
```

## API События

### Клиент → Сервер
- `register` - регистрация пользователя
- `createRoom` - создание комнаты
- `joinRoom` - вход в комнату
- `chatMessage` - отправка сообщения
- `getRoomList` - получение списка комнат

### Сервер → Клиент
- `registered` - успешная регистрация
- `roomList` - список комнат
- `roomJoined` - вход в комнату
- `chatMessage` - новое сообщение
- `messageHistory` - история сообщений
- `roomUserList` - список пользователей в комнате
- `userJoinedRoom` - пользователь вошёл в комнату
- `error` - ошибка
