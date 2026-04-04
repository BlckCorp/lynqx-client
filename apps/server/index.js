// 🌙 Lynqx Server
import { Server } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';
import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';

// Загружаем переменные окружения
dotenv.config();

// ============================================
// 🔧 Конфигурация
// ============================================
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

// ============================================
// 💾 Подключение к PostgreSQL
// ============================================
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'lynqx',
  password: process.env.DB_PASSWORD || 'postgres',
  port: process.env.DB_PORT || 5432,
});

// Проверяем подключение
pool.connect((err, client, release) => {
  if (err) {
    console.error('❌ Ошибка подключения к PostgreSQL:', err.stack);
  } else {
    console.log('✅ Подключение к PostgreSQL успешно');
    release();
  }
});

// ============================================
// 🗄 Инициализация таблиц базы данных
// ============================================
async function initDatabase() {
  try {
    // Таблица пользователей
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(255) PRIMARY KEY,
        username VARCHAR(255) NOT NULL,
        socket_id VARCHAR(255),
        status VARCHAR(50) DEFAULT 'offline',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('📊 Таблица users готова');

    // Таблица комнат
    await pool.query(`
      CREATE TABLE IF NOT EXISTS rooms (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        type VARCHAR(50) DEFAULT 'public',
        password VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('📊 Таблица rooms готова');

    // Таблица сообщений
    await pool.query(`
      CREATE TABLE IF NOT EXISTS messages (
        id VARCHAR(255) PRIMARY KEY,
        room_id VARCHAR(255) REFERENCES rooms(id) ON DELETE CASCADE,
        user_id VARCHAR(255) REFERENCES users(id) ON DELETE SET NULL,
        username VARCHAR(255),
        text TEXT NOT NULL,
        timestamp BIGINT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('📊 Таблица messages готова');

    // Таблица пользователей в комнатах (связь многие-ко-многим)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS room_users (
        room_id VARCHAR(255) REFERENCES rooms(id) ON DELETE CASCADE,
        user_id VARCHAR(255) REFERENCES users(id) ON DELETE CASCADE,
        joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (room_id, user_id)
      )
    `);
    console.log('📊 Таблица room_users готова');

  } catch (err) {
    console.error('❌ Ошибка инициализации базы данных:', err.stack);
  }
}

// Запускаем инициализацию
initDatabase();

// ============================================
// 💾 Хранилище данных (в памяти для активных сессий)
// ============================================
const users = new Map(); // userId -> { id, username, socketId, status }
const rooms = new Map(); // roomId -> { id, name, type, password, users: [] }
// Сообщения теперь загружаются из БД

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
  socket.on('createRoom', async ({ name, type = 'public', password = null }) => {
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

    // Сохраняем комнату в БД
    try {
      await pool.query(
        'INSERT INTO rooms (id, name, type, password) VALUES ($1, $2, $3, $4)',
        [roomId, name.trim(), type, password]
      );
      console.log(`💾 Комната сохранена в БД: ${name}`);
    } catch (err) {
      console.error('❌ Ошибка сохранения комнаты:', err.message);
    }

    rooms.set(roomId, room);

    console.log(`🏠 Комната создана: ${name} (${roomId})`);
    
    // Отправляем обновленный список всем
    io.emit('roomList', getRoomList());
  });

  // Вход в комнату
  socket.on('joinRoom', async ({ roomId }) => {
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
      
      // Сохраняем связь пользователь-комната в БД
      try {
        await pool.query(
          'INSERT INTO room_users (room_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
          [roomId, user.id]
        );
      } catch (err) {
        console.error('❌ Ошибка сохранения пользователя в комнате:', err.message);
      }
    }

    socket.join(roomId);
    socket.currentRoom = roomId;

    console.log(`🚪 ${user.username} вошёл в комнату ${room.name}`);

    // Загружаем историю сообщений из БД
    try {
      const result = await pool.query(
        'SELECT id, room_id, user_id, username, text, timestamp FROM messages WHERE room_id = $1 ORDER BY timestamp ASC',
        [roomId]
      );
      const roomMessages = result.rows.map(row => ({
        id: row.id,
        roomId: row.room_id,
        user: { id: row.user_id, username: row.username },
        text: row.text,
        timestamp: row.timestamp
      }));
      socket.emit('messageHistory', roomMessages);
    } catch (err) {
      console.error('❌ Ошибка загрузки истории сообщений:', err.message);
      socket.emit('messageHistory', []);
    }

    // Отправляем список пользователей в комнате
    emitRoomUserList(roomId);

    // Уведомляем других пользователей
    socket.to(roomId).emit('userJoinedRoom', {
      roomId,
      user: { id: user.id, username: user.username }
    });
  });

  // Отправка сообщения
  socket.on('chatMessage', async ({ roomId, text }) => {
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

    // Сохраняем сообщение в БД
    try {
      await pool.query(
        'INSERT INTO messages (id, room_id, user_id, username, text, timestamp) VALUES ($1, $2, $3, $4, $5, $6)',
        [message.id, roomId, user.id, user.username, text.trim(), message.timestamp]
      );
    } catch (err) {
      console.error('❌ Ошибка сохранения сообщения:', err.message);
    }

    // Отправляем сообщение всем в комнате
    io.to(roomId).emit('chatMessage', message);
  });

  // Получение списка комнат
  socket.on('getRoomList', () => {
    emitRoomList(socket);
  });

  // Отключение
  socket.on('disconnect', async () => {
    const user = getUserBySocketId(socket.id);
    if (user) {
      console.log(`❌ Пользователь отключился: ${user.username}`);
      
      // Обновляем статус пользователя в БД
      try {
        await pool.query(
          'UPDATE users SET status = $1, socket_id = NULL WHERE id = $2',
          ['offline', user.id]
        );
      } catch (err) {
        console.error('❌ Ошибка обновления статуса пользователя:', err.message);
      }

      // Удаляем пользователя из всех комнат (в памяти)
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

      user.status = 'offline';
      // Не удаляем пользователя из Map, чтобы сохранить историю
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

async function getRoomListFromDB() {
  try {
    const result = await pool.query(`
      SELECT r.id, r.name, r.type, COUNT(ru.user_id) as "userCount"
      FROM rooms r
      LEFT JOIN room_users ru ON r.id = ru.room_id
      GROUP BY r.id, r.name, r.type
      ORDER BY r.created_at DESC
    `);
    return result.rows.map(row => ({
      id: row.id,
      name: row.name,
      type: row.type,
      userCount: parseInt(row.userCount)
    }));
  } catch (err) {
    console.error('❌ Ошибка получения списка комнат:', err.message);
    return [];
  }
}

function getRoomList() {
  // Для активных комнат используем память, для остальных - БД
  return Array.from(rooms.values()).map(room => ({
    id: room.id,
    name: room.name,
    type: room.type,
    userCount: room.users.length
  }));
}

async function emitRoomList(socket) {
  const roomList = await getRoomListFromDB();
  socket.emit('roomList', roomList);
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
