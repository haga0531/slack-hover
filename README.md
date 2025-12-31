# Slack Thread Multilingual Summarizer (STM)

Summarize Slack threads in your preferred language with AI.

## Features

- Hover over any Slack message to see a summarize icon
- Click to get an AI-generated summary of the thread
- Multi-language support (Japanese, English, Chinese, Korean, etc.)
- Structured summaries with:
  - Overview
  - Decisions made
  - TODOs and action items
  - Blockers and unresolved issues
  - Technical notes

## Architecture

```
slack-hover/
├── backend/          # Node.js + Slack Bolt backend
├── extension/        # Chrome extension (Manifest V3)
└── infrastructure/   # Terraform IaC
```

## Tech Stack

- **Backend**: TypeScript, Node.js, Slack Bolt
- **Hosting**: Google Cloud Run
- **LLM**: Vertex AI (Gemini)
- **Data Store**: Firestore
- **Browser Extension**: Chrome Extension (Manifest V3)
- **Infrastructure**: Terraform

## Getting Started

### Prerequisites

- Node.js 20+
- Google Cloud Project with:
  - Cloud Run
  - Vertex AI
  - Firestore
  - Secret Manager
- Slack App (create at api.slack.com)

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Copy environment variables:
   ```bash
   cp .env.example .env
   ```

4. Configure your `.env` file with:
   - Slack credentials (Client ID, Client Secret, Signing Secret)
   - GCP Project ID

5. Run in development mode:
   ```bash
   npm run dev
   ```

### Chrome Extension Setup

1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select the `extension/` directory
5. Configure the API endpoint in extension options

### Slack App Configuration

1. Create a new Slack app at https://api.slack.com/apps
2. Add the following OAuth scopes:
   - `commands`
   - `chat:write`
   - `channels:history`
   - `groups:history`
   - `users:read`
3. Create a Slash Command: `/summarize`
4. Set the Request URL to your Cloud Run URL
5. Install the app to your workspace

## Deployment

### CI/CD (GitHub Actions)

Pushing to `main` branch automatically:
1. Runs tests (backend + extension)
2. Deploys to Cloud Run (if backend/ changed)

### Manual Deployment

```bash
cd backend
gcloud run deploy stm-backend \
  --source . \
  --region asia-northeast1 \
  --allow-unauthenticated
```

### Chrome Web Store

1. Create a ZIP of the extension directory
2. Upload to Chrome Web Store Developer Dashboard

## Infrastructure (Terraform)

GCP infrastructure is managed with Terraform.

### Setup

```bash
cd infrastructure
terraform init
```

### Preview Changes

```bash
terraform plan
```

### Apply Changes

```bash
terraform apply
```

### Managed Resources

- GCP APIs (Cloud Run, Firestore, Vertex AI, etc.)
- Firestore Database
- Cloud Run Service
- IAM Policies

## License

MIT
