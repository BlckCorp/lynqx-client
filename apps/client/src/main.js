// 🌙 Lynqx Client - Синхронизировано с сервером
import { io } from 'socket.io-client';

// 🔧 URL сервера
const SOCKET_URL = 'http://localhost:3000';

let socket = null;
let currentRoom = null;
let currentUser = null;

// Элементы UI
let loginScreen, mainApp, usernameInput, messageInput, messagesDiv, roomListDiv, currentRoomName;

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
    currentRoomName = document.getElementById('currentRoomName');
}

// ============================================
// 🔥 Функции для HTML
// ============================================

window.register = function () {
    const username = usernameInput.value.trim();
    if (!username) return alert('Введите никнейм!');

    socket = io(SOCKET_URL);
    setupSocketListeners();
    
    // Отправляем регистрацию с callback
    socket.emit('register', { username }, (response) => {
        console.log('📩 Ответ на регистрацию:', response);
        if (response && response.success) {
            currentUser = { id: response.userId, username: response.username };
            console.log('✅ Успешная регистрация:', response.username);
            loginScreen.style.display = 'none';
            mainApp.style.display = 'grid';
            // Запрашиваем список комнат
            socket.emit('getRoomList');
        } else {
            const errorMsg = response?.error || 'Неизвестная ошибка';
            console.error('❌ Ошибка регистрации:', errorMsg);
            alert('Ошибка: ' + errorMsg);
        }
    });
};

window.sendMessage = function () {
    const text = messageInput.value.trim();
    if (!text || !currentRoom || !currentUser) return;

    socket.emit('sendMessage', { roomName: currentRoom, content: text }, (response) => {
        if (response && !response.success) {
            console.error('❌ Ошибка отправки:', response.error);
        }
    });
    messageInput.value = '';
};

window.handleKeyPress = function (event) {
    if (event.key === 'Enter') window.sendMessage();
};

window.joinRoom = function (roomName) {
    if (!currentUser) return alert('Сначала войдите в систему!');
    
    currentRoom = roomName;
    currentRoomName.textContent = roomName;
    messagesDiv.innerHTML = '<div style="color:#888;">Загрузка истории...</div>';
    
    // Создаем/присоединяемся к комнате
    socket.emit('createRoom', { roomName }, (response) => {
        console.log('📩 Ответ на создание комнаты:', response);
        if (response && response.success) {
            console.log('🏠 Комната:', roomName);
            messagesDiv.innerHTML = '';
            
            // Загружаем историю сообщений
            if (response.messages && response.messages.length > 0) {
                response.messages.forEach(msg => {
                    const div = document.createElement('div');
                    div.className = 'message';
                    div.innerHTML = `
                        <div class="message-username">${msg.username}</div>
                        <div class="message-text">${msg.content}</div>
                    `;
                    messagesDiv.appendChild(div);
                });
                messagesDiv.scrollTop = messagesDiv.scrollHeight;
            }
            
            // Обновляем список комнат
            socket.emit('getRoomList');
        } else {
            const errorMsg = response?.error || 'Ошибка входа в комнату';
            console.error('❌ Ошибка:', errorMsg);
            messagesDiv.innerHTML = `<div style="color:red;">${errorMsg}</div>`;
        }
    });
};

window.showCreateRoom = function () {
    if (!currentUser) return alert('Сначала войдите в систему!');
    
    const name = prompt('Название комнаты:');
    if (!name) return;
    
    window.joinRoom(name);
};

// ============================================
// 🔌 Слушатели событий сокета
// ============================================

function setupSocketListeners() {
    socket.on('connect', () => {
        console.log('✅ Подключено к серверу');
    });

    socket.on('disconnect', () => {
        console.log('❌ Отключено от сервера');
        alert('Потеряно соединение!');
    });

    socket.on('error', (err) => {
        console.error('❌ Ошибка:', err);
    });

    // Список комнат
    socket.on('roomList', (rooms) => {
        console.log('📋 Список комнат:', rooms);
        if (!rooms || rooms.length === 0) {
            roomListDiv.innerHTML = '<div style="padding:10px;color:#888;">Нет комнат. Создайте первую!</div>';
            return;
        }
        
        roomListDiv.innerHTML = rooms.map(room => `
            <div class="room-item" onclick="joinRoom('${room.name}')">
                🌐 ${room.name}
            </div>
        `).join('');
    });

    // Новое сообщение в комнате
    socket.on('receiveMessage', (data) => {
        console.log('📨 Сообщение:', data);
        // Показываем только если мы в этой комнате или комната не указана (глобальное)
        const div = document.createElement('div');
        div.className = 'message';
        div.innerHTML = `
            <div class="message-username">${data.username}</div>
            <div class="message-text">${data.content}</div>
        `;
        messagesDiv.appendChild(div);
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
    });

    // Пользователь вошел в комнату
    socket.on('userJoined', (data) => {
        console.log('🚪 Вошёл:', data.username);
    });
}

// ============================================
// 🚀 Старт
// ============================================

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        initDOM();
        console.log('🌙 Lynqx Client готов');
    });
} else {
    initDOM();
    console.log('🌙 Lynqx Client готов');
}
