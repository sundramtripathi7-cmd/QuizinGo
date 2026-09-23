# QuizInGo

Full-stack quiz platform for students and teachers.

## Stack

- **Frontend:** React + Vite + React Router
- **Backend:** Node.js + Express + MongoDB + JWT

## Setup

### 1. Backend

```bash
cd backend
npm install
npm run seed
npm run dev
```

API runs at `http://localhost:5000`.

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

App runs at `http://localhost:5173`.

## Demo accounts

| Role    | Email                   | Password    |
|---------|-------------------------|-------------|
| Student | student@quizingo.com    | student123  |
| Teacher | teacher@quizingo.com    | teacher123  |

## Features

- Register / login with student or teacher roles
- Student dashboard, quiz attempt, timer, results review
- Teacher dashboard and quiz creation
- JWT-protected API routes
