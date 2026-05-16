# Курсовой проект: Система управления IT-инфраструктурой

Полноценное fullstack CRUD-приложение с клиент-серверной архитектурой, ролями доступа, авторизацией, валидацией и тестированием.

## Стек
- Frontend: React + Vite
- Backend: Node.js + Express
- DB: PostgreSQL (`pg`)
- Auth: JWT + RBAC (`admin`, `engineer`, `viewer`)
- Validation: Zod
- Tests: Vitest + Supertest
- Containers: Docker / Docker Compose

## Структура проекта
```text
.
├── client/                 # React UI
├── server/                 # REST API + PostgreSQL
├── docker-compose.yml
└── README.md
```

## Быстрый запуск (локально)

### 1) Сервер
```bash
cd server
npm install
# локально должен быть запущен PostgreSQL
npm run dev
```

### 2) Клиент
```bash
cd client
npm install
npm run dev
```

- Client: `http://localhost:5173`
- API: `http://localhost:4000/api/health`

### Переменные окружения сервера
```env
PORT=4000
JWT_SECRET=change-me-for-production
DB_HOST=localhost
DB_PORT=5432
DB_NAME=infra_management
DB_USER=postgres
DB_PASSWORD=postgres
CORS_ORIGIN=http://localhost:8080
```

## Тестовые пользователи
- `admin / Admin123!`
- `engineer / Engineer123!`
- `viewer / Viewer123!`

## Проверка тестов
```bash
cd server
npm test
```

## Запуск в Docker
```bash
docker compose up --build
```

- Frontend: `http://localhost:8080`
- Backend: `http://localhost:4000`

