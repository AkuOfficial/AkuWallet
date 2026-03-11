# AkuWallet - Personal Finance Manager

A modern, full-stack personal finance management application with AI-powered insights, built with Next.js and Python FastAPI.

## Features

- 💰 **Transaction Management**: Track income and expenses with categories and tags
- 🎯 **Financial Goals**: Set and monitor progress towards your financial goals
- 📊 **Analytics Dashboard**: Visualize your spending patterns and financial health
- 🤖 **AI-Powered Categorization**: Automatic transaction category suggestions using OpenAI
- 📥 **Import/Export**: Bulk import transactions from CSV or JSON files
- 🔄 **Recurring Transactions**: Set up automatic recurring income or expenses
- 🏷️ **Custom Tags & Categories**: Organize transactions your way
- 🌙 **Dark Theme**: Beautiful dark mode interface by default
- 🔐 **Secure Authentication**: Powered by Supabase Auth

## Tech Stack

### Frontend
- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS with custom design system
- **UI Components**: Radix UI primitives
- **State Management**: React Hooks
- **Authentication**: Supabase Auth
- **Charts**: Recharts

### Backend
- **Framework**: FastAPI (Python)
- **Language**: Python 3.12+
- **Database**: Supabase (PostgreSQL)
- **AI Integration**: OpenAI GPT-4
- **API Documentation**: Auto-generated with FastAPI

## Project Structure

```
AkuWallet/
├── app/                      # Next.js app directory
│   ├── auth/                # Authentication pages
│   ├── dashboard/           # Main application pages
│   ├── actions.ts           # Server actions
│   └── layout.tsx           # Root layout with theme
├── backend/                 # Python FastAPI backend
│   ├── main.py             # API endpoints
│   └── pyproject.toml      # Python dependencies
├── components/              # React components
│   ├── ui/                 # Reusable UI components
│   ├── add-goal-dialog.tsx
│   ├── edit-goal-dialog.tsx
│   ├── goals-list.tsx
│   ├── manage-categories-dialog.tsx
│   ├── manage-tags-dialog.tsx
│   └── import-transactions.tsx
├── lib/                     # Utility libraries
│   ├── api.ts              # API client functions
│   ├── types.ts            # TypeScript type definitions
│   └── supabase/           # Supabase client setup
├── scripts/                 # Database migration scripts
│   ├── 001_create_wallet_tables.sql
│   └── 002_seed_default_categories.sql
└── public/                  # Static assets

```

## Getting Started

### Prerequisites

- Node.js 18+ and pnpm
- Python 3.12+
- Supabase account
- OpenAI API key (optional, for AI features)

### Environment Variables

Create a `.env.local` file in the root directory:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Backend (for Python)
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_service_key
OPENAI_API_KEY=your_openai_api_key
```

### Database Setup

1. Create a new Supabase project
2. Run the SQL scripts in the `scripts/` directory in order:
   ```sql
   -- Run in Supabase SQL Editor
   -- 001_create_wallet_tables.sql
   -- 002_seed_default_categories.sql
   ```

### Frontend Setup

```bash
# Install dependencies
pnpm install

# Run development server
pnpm dev
```

The frontend will be available at `http://localhost:3000`

### Backend Setup

```bash
# Navigate to backend directory
cd backend

# Install dependencies
pip install -e .

# Run FastAPI server
fastapi dev main.py
```

The API will be available at `http://localhost:8000`
API documentation: `http://localhost:8000/docs`

## API Endpoints

### Transactions
- `GET /transactions` - List transactions with filters
- `POST /transactions` - Create new transaction
- `PUT /transactions/{id}` - Update transaction
- `DELETE /transactions/{id}` - Delete transaction

### Categories
- `GET /categories` - List all categories
- `POST /categories` - Create custom category
- `DELETE /categories/{id}` - Delete custom category

### Tags
- `GET /tags` - List all tags
- `POST /tags` - Create new tag
- `DELETE /tags/{id}` - Delete tag

### Goals
- `GET /goals` - List all goals
- `POST /goals` - Create new goal
- `PUT /goals/{id}` - Update goal
- `DELETE /goals/{id}` - Delete goal

### Import/Export
- `POST /import` - Bulk import transactions

### Analytics
- `GET /stats` - Get financial statistics

### AI Features
- `POST /suggest-category` - AI-powered category suggestion

## Import File Formats

### CSV Format
```csv
type,amount,date,description,category,tags
expense,50.00,2024-01-15,Groceries,Food,shopping;weekly
income,2000.00,2024-01-01,Salary,Income,
```

### JSON Format
```json
[
  {
    "type": "expense",
    "amount": 50.00,
    "date": "2024-01-15",
    "description": "Groceries",
    "category": "Food",
    "tags": ["shopping", "weekly"]
  }
]
```

## Deployment

### Frontend (Vercel)
```bash
# Deploy to Vercel
vercel deploy --prod
```

### Backend (Any Python hosting)
- Railway
- Render
- AWS Lambda
- Google Cloud Run

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is open source and available under the MIT License.

## Support

For issues and questions, please open an issue on GitHub.
