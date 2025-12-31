# Contributing to Slack Thread Multilingual Summarizer

Thank you for considering contributing to this project!

## How to Contribute

### Reporting Bugs

1. Check if the bug has already been reported in [Issues](https://github.com/haga0531/slack-hover/issues)
2. If not, create a new issue using the bug report template
3. Include:
   - Clear description of the problem
   - Steps to reproduce
   - Expected vs actual behavior
   - Browser/environment information

### Suggesting Features

1. Check existing issues and discussions for similar ideas
2. Create a new issue using the feature request template
3. Describe the use case and expected behavior

### Pull Requests

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Run tests and linting
5. Commit your changes (see commit guidelines below)
6. Push to your fork
7. Open a Pull Request

## Development Setup

### Backend

```bash
cd backend
npm install
cp .env.example .env
# Configure your .env file
npm run dev
```

### Extension

1. Go to `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked" and select the `extension/` directory

## Code Style

This project uses [Biome](https://biomejs.dev/) for linting and formatting.

```bash
# Check code style
npm run lint

# Auto-fix issues
npm run lint:fix
```

## Testing

### Backend Tests

```bash
cd backend
npm test
```

### Extension Tests

```bash
cd extension
npm test
```

## Commit Message Guidelines

Use clear, descriptive commit messages:

- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `style:` - Code style changes (formatting, etc.)
- `refactor:` - Code refactoring
- `test:` - Adding or updating tests
- `chore:` - Maintenance tasks

Example: `feat: add Spanish language support`

## Code of Conduct

Please read and follow our [Code of Conduct](CODE_OF_CONDUCT.md).

## Questions?

Feel free to open an issue for any questions about contributing.
