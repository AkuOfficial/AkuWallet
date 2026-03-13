# Development Setup Guide

This guide will help you set up the AkuWallet project for local development.

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** 25.8.0
- **pnpm** 10.32.1
- **Python** 3.14.3
- **uv** 0.10.9
- **Git**
- **mise**

## Step 1: Clone the Repository

```bash
git clone https://github.com/yourusername/AkuWallet.git
cd AkuWallet
```

## Step 2: Choose Database Mode

This project supports two backend database modes.

### Option 1: Supabase (Postgres)

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Wait for the project to be fully initialized
3. Go to Project Settings > API to get your credentials:
   - Project URL
   - Anon/Public Key
   - Service Role Key (keep this secret!)

### Option 2: Local Database (SQLite)

- No cloud account needed.
- The backend will create and migrate a local SQLite file automatically on startup.
- Optional: set `LOCAL_DB_PATH` (defaults to `backend/local.db`).

## Step 3: Run Database Migrations

### Option 1 (Supabase)

1. In your Supabase project, go to the SQL Editor
2. Open and run `frontend/scripts/001_create_wallet_tables.sql`
3. Then run `frontend/scripts/002_seed_default_categories.sql`

### Option 2 (SQLite)

- No manual migrations required. Tables + default categories are created on backend startup.

For Supabase, these scripts will create all necessary tables and seed default categories.

## Step 4: Configure Environment Variables

### Frontend env

Create a `frontend/.env.local` file:

```env
# Supabase Configuration (Frontend)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Optional: override backend API URL for the frontend proxy and server-side calls
# BACKEND_URL=http://localhost:8000

# Backend Configuration (create a .env file in the backend directory)
# Option 1: Supabase (Backend)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-service-role-key

# Option 2: SQLite (Backend)
# LOCAL_DB_PATH=backend/local.db

# Optional: AI Features (Backend)
# Get a free API key at https://aistudio.google.com/apikey
# GEMINI_API_KEY=your-gemini-api-key
# GEMINI_MODEL=gemini-2.0-flash  # optional, defaults to gemini-2.0-flash
```

### Backend env

Create `backend/.env` with the backend variables you need (SQLite needs none by default).

## Step 5: Install Frontend Dependencies

```bash
# From the repo root (recommended): installs workspace deps and runs the Next.js app in ./frontend
mise x pnpm -- pnpm install
mise x pnpm -- pnpm dev

# Or run directly from the frontend folder:
# cd frontend
# mise x pnpm -- pnpm install
# mise x pnpm -- pnpm dev
```

The frontend will be available at `http://localhost:3000`

## Step 6: Install Backend Dependencies

```bash
# Navigate to backend directory
cd backend

# Install Python dependencies
mise x uv -- uv sync 
```

## Step 7: Start the Backend Server

```bash
# Make sure you're in the backend directory
cd backend

# Start FastAPI development server
mise x uv -- uv run fastapi dev main.py
```

The API will be available at:
- API: `http://localhost:8000`
- API Docs: `http://localhost:8000/docs`
- Alternative Docs: `http://localhost:8000/redoc`

## Step 8: Configure API Proxy (Optional)

If you want the frontend to proxy API requests, update `frontend/next.config.mjs`:

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:8000/:path*',
      },
    ]
  },
}

export default nextConfig
```

## Verify Installation

1. Open `http://localhost:3000` in your browser
2. Create a new account or sign in
3. Try adding a transaction
4. Check if categories and tags work
5. Test the goals feature

## Common Issues

### Frontend won't start
- Make sure all dependencies are installed: `pnpm install`
- Check if port 3000 is available
- Clear Next build cache: delete `frontend/.next`

### Backend won't start
- Verify Python version: `python --version` (should be 3.12+)
- Check if port 8000 is available
- Verify environment variables are set correctly

### Database connection errors
- Verify Supabase credentials in `.env.local`
- Check if database migrations were run successfully
- Ensure your IP is allowed in Supabase (check project settings)

### AI features not working
- Verify `GEMINI_API_KEY` is set in `backend/.env`
- Get a free API key at [aistudio.google.com/apikey](https://aistudio.google.com/apikey)
- AI features are optional; the app works without them

## Development Workflow

### Frontend Development
```bash
# Run development server with hot reload
pnpm dev

# Build for production
pnpm build

# Run production build locally
pnpm start

# Lint code
pnpm lint
```

### Backend Development
```bash
# Run with auto-reload
fastapi dev main.py

# Run in production mode
fastapi run main.py

# Format code
black main.py

# Type checking
mypy main.py
```

## Project Structure Overview

```
AkuWallet/
├── backend/                # Python FastAPI backend
├── frontend/               # Next.js frontend (app, components, lib, public, styles, config)
└── scripts/                # (optional) project-level scripts/tools
```

## Next Steps

- Read the [README.md](./README.md) for feature documentation
- Check out the API documentation at `http://localhost:8000/docs`
- Explore the codebase and start contributing!

## Getting Help

If you encounter any issues:
1. Check the [Common Issues](#common-issues) section above
2. Search existing GitHub issues
3. Create a new issue with detailed information about your problem

Happy coding! 🚀
