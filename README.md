# Resume Backend API

Express + MongoDB API powering the resume frontend.

## Quick Start

1. Install dependencies.
2. Create a `.env` file from `.env.example`.
3. Run the server.

```bash
npm install
npm run dev
```

## Environment Variables

- `PORT` Server port. Default: `5000`
- `MONGO_URI` MongoDB connection string
- `CORS_ORIGINS` Comma-separated allowed origins. Example: `http://localhost:3000,https://yourdomain.com`

## Endpoints

- `GET /api/health` Health probe for hosting platforms
- `GET /api/profile` Profile payload
- `GET /api/projects` Project list
- `GET /api/skills` Skills list
- `GET /api/portfolio` Aggregated profile + skills + projects for efficient frontend loading

## Production Notes

- In production, set `CORS_ORIGINS` explicitly.
- If `MONGO_URI` is missing, API serves fallback sample content to keep frontend usable.
