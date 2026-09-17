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
- `GET /api/intros` List Intro documents
- `POST /api/intros` Create an Intro document
- `GET /api/schema/types` List supported MongoDB bson types for schema creation
- `GET /api/schema/collections` List all collection names in the active database
- `GET /api/schema/collections/:collectionName` Describe selected collection schema
- `POST /api/schema/collections` Create a collection with JSON schema validation
- `PATCH /api/schema/collections/:collectionName` Update an existing collection schema, including renames, deletes, additions, and bson type changes
- `GET /api/portfolio` Aggregated profile + skills + projects for efficient frontend loading

## Production Notes

- In production, set `CORS_ORIGINS` explicitly.
- If `MONGO_URI` is missing, API serves fallback sample content to keep frontend usable.
