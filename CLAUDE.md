# CLAUDE.md

This file provides guidance for Claude Code when working with this repository.

## Project Overview

Slack Thread Multilingual Summarizer (STM) - A Chrome extension + backend service that summarizes Slack threads in the user's preferred language using AI.

**Supported Languages**: English, Japanese, Chinese, Korean, Spanish, French, German

## Project Structure

```
slack-hover/
├── backend/          # TypeScript + Express + Slack Bolt backend
│   └── src/
│       ├── app.ts           # Entry point
│       ├── config/          # Configuration
│       ├── listeners/       # Slack event listeners
│       ├── middleware/      # Express middleware
│       ├── repositories/    # Data access (Firestore)
│       ├── routes/          # API routes
│       ├── services/        # Business logic (Gemini, Slack)
│       └── types/           # TypeScript types
├── extension/        # Chrome Extension (Manifest V3)
│   └── src/
│       ├── content/         # Content scripts (hover UI)
│       ├── background/      # Service worker
│       └── options/         # Options page
└── infrastructure/   # Terraform IaC for GCP
```

## Tech Stack

- **Backend**: TypeScript, Node.js 20+, Express, Slack Bolt, Pino (logging)
- **AI**: Google Cloud Vertex AI (Gemini 2.5 Flash)
- **Database**: Firestore
- **Hosting**: Google Cloud Run
- **Extension**: Chrome Extension Manifest V3
- **Linter/Formatter**: Biome
- **Testing**: Vitest

## Common Commands

### Backend

```bash
cd backend
npm install          # Install dependencies
npm run dev          # Start development server with hot reload
npm run build        # Build TypeScript
npm run start        # Run production build
npm test             # Run tests
npm run lint         # Check code style
npm run lint:fix     # Auto-fix code style issues
```

### Extension

```bash
cd extension
npm install          # Install dependencies
npm test             # Run tests
```

### Deployment

```bash
# Deploy to Cloud Run
cd backend
gcloud run deploy stm-backend --source . --region asia-northeast1 --allow-unauthenticated
```

## Coding Conventions

- Use Biome for linting and formatting
- Commit message format: `feat:`, `fix:`, `docs:`, `style:`, `refactor:`, `test:`, `chore:`
- TypeScript strict mode enabled
- Prefer async/await over callbacks
- Use Pino for logging (structured JSON logs)

## Environment Variables

Backend requires:
- `SLACK_CLIENT_ID` - Slack OAuth client ID
- `SLACK_CLIENT_SECRET` - Slack OAuth client secret
- `SLACK_SIGNING_SECRET` - Slack signing secret
- `GCP_PROJECT_ID` - Google Cloud project ID
- `STATE_SECRET` - OAuth state encryption secret

## Key Files

- `backend/src/services/gemini.service.ts` - AI summarization logic
- `backend/src/services/slack.service.ts` - Slack API interactions
- `backend/src/routes/summary.ts` - Summary API endpoint
- `extension/src/content/hover-ui.js` - Chrome extension UI logic
