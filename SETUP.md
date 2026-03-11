# Development Setup Guide

This guide will help you set up the AkuWallet project for local development.

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** 18 or higher
- **pnpm** (recommended) or npm
- **Python** 3.12 or higher
- **Git**

## Step 1: Clone the Repository

```bash
git clone https://github.com/yourusername/AkuWallet.git
cd AkuWallet
```

## Step 2: Set Up Supabase

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Wait for the project to be fully initialized
3. Go to Project Settings > API to get your credentials:
   - Project URL
   - Anon/Public Key
   - Service Role Key (keep this secret!)

## Step 3: Run Database Migrations

1. In your Supabase project, go to the SQL Editor
2. Open and run `scripts/001_create_wallet_tables.sql`
3. Then run `scripts/002_seed_default_categories.sql`

These scripts will create all necessary tables and seed default categories.

## Step 4: Configure Environment Variables

Create a `.env.local` file in the root directory:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Backend Configuration (create a .env file in the backend directory)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-service-role-key

# Optional: AI Features
OPENAI_API_KEY=your-openai-api-key
```

Also create `backend/.env` with the backend variables.

## Step 5: Install Frontend Dependencies

```bash
# Install dependencies
pnpm install

# Start the development server
pnpm dev
```

The frontend will be available at `http://localhost:3000`

## Step 6: Install Backend Dependencies

```bash
# Navigate to backend directory
cd backend

# Install Python dependencies
pip install -e .

# Or use a virtual environment (recommended)
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -e .
```

## Step 7: Start the Backend Server

```bash
# Make sure you're in the backend directory
cd backend

# Start FastAPI development server
fastapi dev main.py
```

The API will be available at:
- API: `http://localhost:8000`
- API Docs: `http://localhost:8000/docs`
- Alternative Docs: `http://localhost:8000/redoc`

## Step 8: Configure API Proxy (Optional)

If you want the frontend to proxy API requests, update `next.config.mjs`:

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
- Clear `.next` folder: `rm -rf .next`

### Backend won't start
- Verify Python version: `python --version` (should be 3.12+)
- Check if port 8000 is available
- Verify environment variables are set correctly

### Database connection errors
- Verify Supabase credentials in `.env.local`
- Check if database migrations were run successfully
- Ensure your IP is allowed in Supabase (check project settings)

### AI features not working
- Verify `OPENAI_API_KEY` is set in backend `.env`
- Check OpenAI API quota and billing
- AI features are optional and the app works without them

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
├── app/                    # Next.js pages and layouts
├── components/             # React components
├── lib/                    # Utilities and API client
├── backend/                # Python FastAPI backend
├── scripts/                # Database migrations
├── public/                 # Static assets
└── styles/                 # Global styles
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
