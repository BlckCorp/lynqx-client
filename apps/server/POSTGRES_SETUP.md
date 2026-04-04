# 🐘 PostgreSQL для Lynqx

## Установка PostgreSQL

### Windows
1. Скачайте установщик с [postgresql.org](https://www.postgresql.org/download/windows/)
2. Запустите установщик, выберите версию 14+
3. Установите пароль для пользователя `postgres` (запомните его!)
4. Порт оставьте по умолчанию: `5432`

### macOS
```bash
brew install postgresql
brew services start postgresql
```

### Linux (Ubuntu/Debian)
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
```

## Настройка базы данных

1. Откройте командную строку PostgreSQL (pgAdmin или psql):
   ```bash
   psql -U postgres
   ```

2. Создайте базу данных:
   ```sql
   CREATE DATABASE lynqx;
   ```

3. Проверьте подключение:
   ```sql
   \c lynqx
   ```

## Настройка переменных окружения

Откройте файл `.env` в папке `apps/server/` и укажите ваши данные:

```env
DB_USER=postgres
DB_HOST=localhost
DB_NAME=lynqx
DB_PASSWORD=ваш_пароль
DB_PORT=5432
```

## Проверка работы

После настройки запустите сервер:
```bash
cd apps/server
npm run dev
```

Вы должны увидеть сообщения:
- ✅ Подключение к PostgreSQL успешно
- 📊 Таблица users готова
- 📊 Таблица rooms готова
- 📊 Таблица messages готова
- 📊 Таблица room_users готова

## Полезные команды

### Просмотр таблиц
```sql
\dt
```

### Просмотр данных
```sql
SELECT * FROM users;
SELECT * FROM rooms;
SELECT * FROM messages;
```

### Очистка базы (если нужно начать заново)
```sql
DROP TABLE IF EXISTS room_users, messages, rooms, users CASCADE;
```

## Решение проблем

### Ошибка "password authentication failed"
- Проверьте пароль в файле `.env`
- Убедитесь, что пользователь `postgres` существует

### Ошибка "database does not exist"
- Создайте базу данных: `CREATE DATABASE lynqx;`

### Ошибка подключения к порту
- Убедитесь, что PostgreSQL запущен
- Проверьте порт в `.env` (по умолчанию 5432)
