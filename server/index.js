// 🌙 Lynqx Server
import { Server } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';

// ============================================
// 🔧 Конфигурация
// ============================================
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

// ============================================
// 💾 Хранилище данных (в памяти)
// ============================================
const users = new Map(); // userId -> { id, username, socketId, status }
const rooms = new Map(); // roomId -> { id, name, type, password, users: [] }
const messages = new Map(); // roomId -> [messages]

// ============================================
// 🚀 Создание HTTP сервера и Socket.IO
// ============================================
import { createServer } from 'http';

const httpServer = createServer();
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// ============================================
// 🔌 Обработчики событий
// ============================================
io.on('connection', (socket) => {
  console.log(`🔌 Подключился клиент: ${socket.id}`);

  // Регистрация пользователя
  socket.on('register', ({ username }) => {
    if (!username || username.trim().length === 0) {
      return socket.emit('error', { message: 'Некорректное имя пользователя' });
    }

    const userId = uuidv4();
    const user = {
      id: userId,
      username: username.trim(),
      socketId: socket.id,
      status: 'online'
    };

    users.set(userId, user);
    socket.userId = userId;

    console.log(`👤 Пользователь зарегистрирован: ${username} (${userId})`);
    socket.emit('registered', { userId, username });

    // Отправляем список комнат
    emitRoomList(socket);
  });

  // Создание комнаты
  socket.on('createRoom', ({ name, type = 'public', password = null }) => {
    const user = getUserBySocketId(socket.id);
    if (!user) return;

    const roomId = uuidv4();
    const room = {
      id: roomId,
      name: name.trim(),
      type,
      password,
      users: []
    };

    rooms.set(roomId, room);
    messages.set(roomId, []);

    console.log(`🏠 Комната создана: ${name} (${roomId})`);
    
    // Отправляем обновленный список всем
    io.emit('roomList', getRoomList());
  });

  // Вход в комнату
  socket.on('joinRoom', ({ roomId }) => {
    const user = getUserBySocketId(socket.id);
    if (!user) return;

    const room = rooms.get(roomId);
    if (!room) {
      return socket.emit('error', { message: 'Комната не найдена' });
    }

    // Проверка пароля для приватных комнат
    if (room.type === 'private' && room.password) {
      // В реальном приложении нужна более сложная логика
    }

    // Добавляем пользователя в комнату
    if (!room.users.includes(user.id)) {
      room.users.push(user.id);
    }

    socket.join(roomId);
    socket.currentRoom = roomId;

    console.log(`🚪 ${user.username} вошёл в комнату ${room.name}`);

    // Отправляем историю сообщений
    const roomMessages = messages.get(roomId) || [];
    socket.emit('messageHistory', roomMessages);

    // Отправляем список пользователей в комнате
    emitRoomUserList(roomId);

    // Уведомляем других пользователей
    socket.to(roomId).emit('userJoinedRoom', {
      roomId,
      user: { id: user.id, username: user.username }
    });
  });

  // Отправка сообщения
  socket.on('chatMessage', ({ roomId, text }) => {
    const user = getUserBySocketId(socket.id);
    if (!user || !text.trim()) return;

    const room = rooms.get(roomId);
    if (!room) return;

    const message = {
      id: uuidv4(),
      roomId,
      user: { id: user.id, username: user.username },
      text: text.trim(),
      timestamp: Date.now()
    };

    // Сохраняем сообщение
    const roomMessages = messages.get(roomId) || [];
    roomMessages.push(message);
    messages.set(roomId, roomMessages);

    // Отправляем сообщение всем в комнате
    io.to(roomId).emit('chatMessage', message);
  });

  // Получение списка комнат
  socket.on('getRoomList', () => {
    emitRoomList(socket);
  });

  // Отключение
  socket.on('disconnect', () => {
    const user = getUserBySocketId(socket.id);
    if (user) {
      console.log(`❌ Пользователь отключился: ${user.username}`);
      
      // Удаляем пользователя из всех комнат
      for (const [roomId, room] of rooms) {
        const index = room.users.indexOf(user.id);
        if (index > -1) {
          room.users.splice(index, 1);
          io.to(roomId).emit('userLeftRoom', {
            roomId,
            userId: user.id
          });
          emitRoomUserList(roomId);
        }
      }

      // Обновляем статус или удаляем
      user.status = 'offline';
      // Можно удалить пользователя или оставить для истории
    }
  });
});

// ============================================
// 🛠 Вспомогательные функции
// ============================================
function getUserBySocketId(socketId) {
  for (const user of users.values()) {
    if (user.socketId === socketId) {
      return user;
    }
  }
  return null;
}

function getRoomList() {
  return Array.from(rooms.values()).map(room => ({
    id: room.id,
    name: room.name,
    type: room.type,
    userCount: room.users.length
  }));
}

function emitRoomList(socket) {
  socket.emit('roomList', getRoomList());
}

function emitRoomUserList(roomId) {
  const room = rooms.get(roomId);
  if (!room) return;

  const userList = room.users
    .map(userId => users.get(userId))
    .filter(Boolean)
    .map(user => ({
      id: user.id,
      username: user.username,
      status: user.status
    }));

  io.to(roomId).emit('roomUserList', userList);
}

// ============================================
// 🚀 Запуск сервера
// ============================================
httpServer.listen(PORT, HOST, () => {
  console.log(`🌙 Lynqx Server запущен на http://${HOST}:${PORT}`);
  console.log(`📡 Ожидание подключений...`);
});
