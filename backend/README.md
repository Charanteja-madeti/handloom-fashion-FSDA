# backend

## Deploy backend to Vercel

This backend is now configured for Vercel using `backend/vercel.json`.

### Steps

1. In Vercel, create a new project from this repository.
2. Set the project Root Directory to `backend`.
3. Add these Environment Variables in Vercel:
	- `NODE_ENV=production`
	- `DB_HOST`
	- `DB_PORT`
	- `DB_USER`
	- `DB_PASSWORD`
	- `DB_NAME`
	- `JWT_SECRET`
	- `JWT_REFRESH_SECRET`
	- `ALLOWED_ORIGINS` (comma-separated frontend domains)
4. Deploy.

### Health check

- `GET /` returns `Backend is running!`

### Frontend env value

Set frontend env variable to your Vercel backend URL:

`VITE_API_BASE_URL=https://your-backend-project.vercel.app/api`

