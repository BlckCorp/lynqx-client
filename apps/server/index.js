import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import pkg from 'pg';
const { Pool } = pkg;

// Загрузка переменных окружения
dotenv.config();

// Настройка подключения к PostgreSQL
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'lynqx',
});

// Проверка подключения к БД при старте
pool.connect((err, client, release) => {
  if (err) {
    console.error('❌ Ошибка подключения к базе данных:', err.stack);
  } else {
    console.log('✅ База данных подключена успешно');
    release();
  }
});

// Создание HTTP сервера
const httpServer = createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Lynqx Server is running');
});

// Настройка Socket.IO
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  },
  allowEIO3: true
});

// Инициализация таблиц БД при старте
async function initDatabase() {
  const client = await pool.connect();
  try {
    await client.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');

    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        username VARCHAR(255) UNIQUE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS rooms (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name VARCHAR(255) UNIQUE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_by UUID REFERENCES users(id)
      );

      CREATE TABLE IF NOT EXISTS messages (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS room_users (
        room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (room_id, user_id)
      );
    `);
    console.log('🗄️ Таблицы базы данных проверены/созданы');
  } catch (err) {
    console.error('❌ Ошибка инициализации БД:', err);
  } finally {
    client.release();
  }
}

// Запуск инициализации
initDatabase();

io.on('connection', (socket) => {
  console.log(`🔌 Подключился клиент: ${socket.id}`);

  let currentUser = null;

  // Регистрация пользователя
  socket.on('register', async (data, callback) => {
    const safeCallback = (response) => {
      if (typeof callback === 'function') {
        callback(response);
      }
    };

    let username = '';
    if (typeof data === 'string') {
      username = data;
    } else if (data && typeof data === 'object' && data.username) {
      username = data.username;
    }

    if (!username) {
      return safeCallback({ success: false, error: 'Имя обязательно' });
    }

    try {
      const client = await pool.connect();
      
      const userResult = await client.query(
        'SELECT id FROM users WHERE username = $1',
        [username]
      );

      let userId;
      if (userResult.rows.length > 0) {
        userId = userResult.rows[0].id;
        console.log(`👤 Пользователь найден: ${username} (${userId})`);
      } else {
        const newUser = await client.query(
          'INSERT INTO users (username) VALUES ($1) RETURNING id',
          [username]
        );
        userId = newUser.rows[0].id;
        console.log(`👤 Пользователь зарегистрирован: ${username} (${userId})`);
      }

      currentUser = { id: userId, username };
      client.release();

      safeCallback({ success: true, userId, username });
    } catch (err) {
      console.error('❌ Ошибка регистрации:', err);
      safeCallback({ success: false, error: 'Ошибка сервера при регистрации' });
    }
  });

  // Создание/присоединение к комнате
  socket.on('createRoom', async (data, callback) => {
    const safeCallback = (response) => {
      if (typeof callback === 'function') {
        callback(response);
      }
    };

    if (!currentUser) {
      return safeCallback({ success: false, error: 'Сначала зарегистрируйтесь' });
    }

    let roomName = '';
    if (typeof data === 'string') {
      roomName = data;
    } else if (data && typeof data === 'object' && data.roomName) {
      roomName = data.roomName;
    }

    if (!roomName) {
      return safeCallback({ success: false, error: 'Название комнаты обязательно' });
    }

    try {
      const client = await pool.connect();

      const roomCheck = await client.query(
        'SELECT id FROM rooms WHERE name = $1',
        [roomName]
      );

      let roomId;
      if (roomCheck.rows.length > 0) {
        roomId = roomCheck.rows[0].id;
        console.log(`🏠 Комната найдена: ${roomName} (${roomId})`);
      } else {
        const newRoom = await client.query(
          'INSERT INTO rooms (name, created_by) VALUES ($1, $2) RETURNING id',
          [roomName, currentUser.id]
        );
        roomId = newRoom.rows[0].id;
        console.log(`🏠 Комната создана: ${roomName} (${roomId})`);
        
        await client.query(
          'INSERT INTO room_users (room_id, user_id) VALUES ($1, $2)',
          [roomId, currentUser.id]
        );
      }

      socket.join(roomName);
      
      await client.query(
        'INSERT INTO room_users (room_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [roomId, currentUser.id]
      );

      client.release();

      // Получаем историю сообщений
      const historyClient = await pool.connect();
      const msgResult = await historyClient.query(
        `SELECT m.content, u.username, m.created_at 
         FROM messages m 
         JOIN users u ON m.user_id = u.id 
         WHERE m.room_id = $1 
         ORDER BY m.created_at ASC`,
        [roomId]
      );
      historyClient.release();

      safeCallback({ 
        success: true, 
        roomId, 
        roomName, 
        messages: msgResult.rows 
      });

      socket.to(roomName).emit('userJoined', { username: currentUser.username, roomId });
      console.log(`🚪 ${currentUser.username} вошёл в комнату ${roomName}`);

    } catch (err) {
      console.error('❌ Ошибка создания комнаты:', err);
      safeCallback({ success: false, error: 'Ошибка сервера при создании комнаты' });
    }
  });

  // Отправка сообщения
  socket.on('sendMessage', async (data, callback) => {
    const safeCallback = (response) => {
      if (typeof callback === 'function') {
        callback(response);
      }
    };

    if (!currentUser) return;
    
    let roomName = '';
    let content = '';
    
    if (typeof data === 'object') {
      roomName = data.roomName || '';
      content = data.content || '';
    }

    if (!content || !roomName) return;

    try {
      const client = await pool.connect();
      
      const roomResult = await client.query(
        'SELECT id FROM rooms WHERE name = $1',
        [roomName]
      );

      if (roomResult.rows.length === 0) {
        client.release();
        return safeCallback({ success: false, error: 'Комната не найдена' });
      }

      const roomId = roomResult.rows[0].id;

      await client.query(
        'INSERT INTO messages (room_id, user_id, content) VALUES ($1, $2, $3)',
        [roomId, currentUser.id, content]
      );
      
      client.release();

      io.to(roomName).emit('receiveMessage', {
        username: currentUser.username,
        content,
        roomName
      });

      safeCallback({ success: true });
    } catch (err) {
      console.error('❌ Ошибка отправки сообщения:', err);
      safeCallback({ success: false, error: 'Ошибка сохранения сообщения' });
    }
  });

  // Получение списка комнат
  socket.on('getRoomList', async (callback) => {
    try {
      const client = await pool.connect();
      const result = await client.query(
        'SELECT id, name FROM rooms ORDER BY created_at DESC'
      );
      client.release();

      const rooms = result.rows.map(row => ({
        id: row.id,
        name: row.name
      }));

      socket.emit('roomList', rooms);
      if (typeof callback === 'function') callback({ success: true });
    } catch (err) {
      console.error('❌ Ошибка получения списка комнат:', err);
      socket.emit('roomList', []);
    }
  });

  // Отключение
  socket.on('disconnect', () => {
    console.log(`🔌 Клиент отключился: ${socket.id}`);
  });
});

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`🚀 Сервер запущен на порту ${PORT}`);
});
