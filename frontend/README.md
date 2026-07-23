# VitaLink Web

Frontend React + Vite + TailwindCSS.

## Setup

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

Abre em `http://localhost:5173`.

A página de login consome `POST /api/v1/auth/login` e persiste token/menus no `localStorage`.
