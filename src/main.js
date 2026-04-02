// 🌙 Lynqx Client
import { io } from 'socket.io-client';

// 🔧 URL сервера - можно переопределить через переменную окружения
const SOCKET_URL = window.__TAURI__?.env?.get('SOCKET_URL') || 
                   import.meta.env?.VITE_SOCKET_URL || 
                   'http://localhost:3000';

let socket = null;
let currentRoom = null;

// Элементы UI
let loginScreen, mainApp, usernameInput, messageInput, messagesDiv, roomListDiv, userListDiv, currentRoomName;

// ============================================
// 🔥 Инициализация DOM элементов
// ============================================
function initDOM() {
    loginScreen = document.getElementById('loginScreen');
    mainApp = document.getElementById('mainApp');
    usernameInput = document.getElementById('usernameInput');
    messageInput = document.getElementById('messageInput');
    messagesDiv = document.getElementById('messages');
    roomListDiv = document.getElementById('roomList');
    userListDiv = document.getElementById('userList');
    currentRoomName = document.getElementById('currentRoomName');
}

// ============================================
// 🔥 Делаем функции доступными из HTML
// ============================================

window.register = function () {
    const username = usernameInput.value.trim();
    if (!username) return alert('Введите никнейм!');

    socket = io(SOCKET_URL);
    setupSocketListeners();
    socket.emit('register', { username });
};

window.sendMessage = function () {
    const text = messageInput.value.trim();
    if (!text || !currentRoom) return;

    socket.emit('chatMessage', { roomId: currentRoom, text });
    messageInput.value = '';
};

window.handleKeyPress = function (event) {
    if (event.key === 'Enter') window.sendMessage();
};

window.joinRoom = function (roomId, roomName) {
    currentRoom = roomId;
    currentRoomName.textContent = roomName;
    socket.emit('joinRoom', { roomId });
    messagesDiv.innerHTML = '';
};

window.showCreateRoom = function () {
    const name = prompt('Название комнаты:');
    if (!name) return;

    const type = confirm('Приватная комната? (OK = приватная, Cancel = публичная)') ? 'private' : 'public';
    const password = type === 'private' ? prompt('Пароль:') : null;

    socket.emit('createRoom', { name, type, password });
};

// ============================================
// 🔌 Настройка слушателей сокета
// ============================================

function setupSocketListeners() {
    socket.on('registered', () => {
        loginScreen.style.display = 'none';
        mainApp.style.display = 'grid';
        socket.emit('getRoomList');
    });

    socket.on('connect', () => {
        console.log('✅ Подключено к серверу');
    });

    socket.on('disconnect', () => {
        console.log('❌ Отключено от сервера');
        alert('Потеряно соединение с сервером');
    });

    socket.on('error', (data) => {
        alert(data.message);
    });

    socket.on('roomList', (rooms) => {
        roomListDiv.innerHTML = rooms.map(room => `
      <div class="room-item" onclick="joinRoom('${room.id}', '${room.name}')">
        ${room.type === 'private' ? '🔒' : '🌐'} ${room.name}
      </div>
    `).join('');
    });

    socket.on('roomJoined', (data) => {
        console.log('🚪 Вошёл в комнату:', data.room.name);
    });

    socket.on('roomUserList', (users) => {
        userListDiv.innerHTML = users.map(user => `
      <div class="user-item">
        <div class="user-avatar">${user.username[0].toUpperCase()}</div>
        <div>
          <div>${user.username}</div>
          <div class="user-status ${user.status === 'offline' ? 'offline' : ''}"></div>
        </div>
      </div>
    `).join('');
    });

    socket.on('chatMessage', (message) => {
        if (message.roomId !== currentRoom) return;

        const div = document.createElement('div');
        div.className = 'message';
        div.innerHTML = `
      <div class="message-username">${message.user.username}</div>
      <div class="message-text">${message.text}</div>
    `;
        messagesDiv.appendChild(div);
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
    });

    socket.on('messageHistory', (messages) => {
        messagesDiv.innerHTML = messages.map(msg => `
      <div class="message">
        <div class="message-username">${msg.user.username}</div>
        <div class="message-text">${msg.text}</div>
      </div>
    `).join('');
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
    });

    socket.on('userJoinedRoom', (data) => {
        console.log('👤 Пользователь вошёл:', data.user.username);
    });
}

// ============================================
// 🚀 Инициализация
// ============================================

// Ждём загрузки DOM перед инициализацией
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        initDOM();
        console.log('🌙 Lynqx Client готов к подключению');
    });
} else {
    initDOM();
    console.log('🌙 Lynqx Client готов к подключению');
}