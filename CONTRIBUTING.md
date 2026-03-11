# Contributing to AkuWallet

Thank you for your interest in contributing to AkuWallet! This document provides guidelines and instructions for contributing to the project.

## Code of Conduct

- Be respectful and inclusive
- Welcome newcomers and help them get started
- Focus on constructive feedback
- Respect different viewpoints and experiences

## How to Contribute

### Reporting Bugs

If you find a bug, please create an issue with:
- A clear, descriptive title
- Steps to reproduce the issue
- Expected behavior vs actual behavior
- Screenshots if applicable
- Your environment (OS, browser, Node version, etc.)

### Suggesting Features

Feature suggestions are welcome! Please create an issue with:
- A clear description of the feature
- Why this feature would be useful
- Any implementation ideas you have
- Examples from other applications (if applicable)

### Pull Requests

1. **Fork the repository**
   ```bash
   git clone https://github.com/yourusername/AkuWallet.git
   cd AkuWallet
   ```

2. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

3. **Make your changes**
   - Follow the existing code style
   - Write clear commit messages
   - Add tests if applicable
   - Update documentation as needed

4. **Test your changes**
   ```bash
   # Frontend
   pnpm dev
   
   # Backend
   cd backend
   fastapi dev main.py
   ```

5. **Commit your changes**
   ```bash
   git add .
   git commit -m "feat: add your feature description"
   ```

6. **Push to your fork**
   ```bash
   git push origin feature/your-feature-name
   ```

7. **Create a Pull Request**
   - Go to the original repository
   - Click "New Pull Request"
   - Select your branch
   - Fill in the PR template
   - Wait for review

## Development Guidelines

### Frontend (Next.js/React)

- Use TypeScript for all new code
- Follow React best practices and hooks patterns
- Use the existing UI components from `components/ui/`
- Ensure components are responsive
- Add proper error handling and loading states
- Use the API client from `lib/api.ts`

### Backend (Python/FastAPI)

- Follow PEP 8 style guide
- Use type hints for all functions
- Add docstrings for complex functions
- Handle errors gracefully
- Use async/await for database operations
- Add proper authentication checks

### Code Style

#### TypeScript/JavaScript
```typescript
// Use descriptive variable names
const userTransactions = await getTransactions()

// Use async/await instead of .then()
const data = await fetchData()

// Add proper types
interface UserData {
  id: string
  name: string
}

// Use optional chaining
const userName = user?.profile?.name
```

#### Python
```python
# Use type hints
async def get_user(user_id: str) -> User:
    return await db.get_user(user_id)

# Use descriptive names
user_transactions = await get_transactions(user_id)

# Add docstrings for complex functions
def calculate_statistics(transactions: list[Transaction]) -> Stats:
    """
    Calculate financial statistics from transactions.
    
    Args:
        transactions: List of transaction objects
        
    Returns:
        Stats object with calculated values
    """
    pass
```

### Commit Messages

Follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `style:` - Code style changes (formatting, etc.)
- `refactor:` - Code refactoring
- `test:` - Adding or updating tests
- `chore:` - Maintenance tasks

Examples:
```
feat: add export transactions to PDF
fix: resolve category filter not working
docs: update API documentation
refactor: simplify transaction list component
```

### Testing

Before submitting a PR:

1. **Test the frontend**
   - Check all pages load correctly
   - Test forms and dialogs
   - Verify responsive design
   - Test in different browsers

2. **Test the backend**
   - Verify API endpoints work
   - Check authentication
   - Test error handling
   - Verify database operations

3. **Test integration**
   - Ensure frontend and backend work together
   - Test the complete user flow
   - Check for console errors

## Project Structure

```
AkuWallet/
├── app/                    # Next.js pages
│   ├── auth/              # Authentication pages
│   ├── dashboard/         # Main app pages
│   └── actions.ts         # Server actions
├── components/            # React components
│   ├── ui/               # Reusable UI components
│   └── [features]        # Feature-specific components
├── lib/                   # Utilities
│   ├── api.ts            # API client
│   └── types.ts          # TypeScript types
├── backend/               # Python backend
│   └── main.py           # FastAPI application
└── scripts/               # Database scripts
```

## Adding New Features

### Frontend Feature

1. Create component in `components/`
2. Add types to `lib/types.ts` if needed
3. Add API calls to `lib/api.ts` if needed
4. Create page in `app/dashboard/` if needed
5. Update documentation

### Backend Feature

1. Add endpoint to `backend/main.py`
2. Add Pydantic models if needed
3. Add database operations
4. Test the endpoint
5. Update API documentation

## Questions?

If you have questions:
- Check existing issues and discussions
- Read the documentation (README.md, SETUP.md)
- Create a new issue with the "question" label

## License

By contributing, you agree that your contributions will be licensed under the same license as the project (MIT License).

Thank you for contributing to AkuWallet! 🎉
