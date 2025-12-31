# Slack Thread Multilingual Summarizer (STM)

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![CI](https://github.com/haga0531/slack-hover/actions/workflows/test.yml/badge.svg)](https://github.com/haga0531/slack-hover/actions/workflows/test.yml)
[![Node.js](https://img.shields.io/badge/Node.js-20%2B-green.svg)](https://nodejs.org/)

Summarize Slack threads in your preferred language with AI.

## Features

- Hover over any Slack message to see a summarize icon
- Click to get an AI-generated summary (3-5 sentences)
- Single message translation support
- Multi-language support: English, Japanese, Chinese, Korean, Spanish, French, German
- Privacy-focused: No one knows when you request a summary (unlike Slack's translation stamps)
- Workspace-shared cache for faster responses

## Usage

1. Hover over any Slack message to see the summarize icon
2. Click the icon to get an AI-generated summary in your preferred language

### Japanese Summary

![Japanese Summary](extension/icons/jp.png)

### English Summary

![English Summary](extension/icons/english.png)

## Security & Privacy

- **Workspace Isolation**: All cached data is strictly isolated by Slack workspace ID
- **No Raw Message Storage**: Only AI-generated summaries are cached, not original Slack messages
- **Anonymous Usage**: No tracking of who requests summaries
- **Slack API Validation**: Every request is validated through Slack's API
- **HTTPS Only**: All communications are encrypted
- **Auto-Expiry**: Server cache expires after 90 days, local cache after 30 days

## Architecture

```
slack-hover/
├── backend/          # TypeScript + Express backend
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

## Self-Hosting Guide

This is a self-hosted application. Each user needs to set up their own backend and Slack App.

### Prerequisites

- Node.js 20+
- Google Cloud account with billing enabled
- Slack workspace admin access

### Step 1: Create a Slack App

1. Go to https://api.slack.com/apps and click **Create New App**
2. Choose **From scratch**, enter a name (e.g., "Thread Summarizer"), and select your workspace
3. Go to **OAuth & Permissions** and add these Bot Token Scopes:
   - `commands`
   - `chat:write`
   - `channels:history`
   - `groups:history`
   - `users:read`
4. Go to **Basic Information** and note down:
   - **Client ID**
   - **Client Secret**
   - **Signing Secret**
5. Go to **Slash Commands** and create a new command:
   - Command: `/summarize`
   - Request URL: `https://YOUR_CLOUD_RUN_URL/slack/events` (update after deployment)
   - Description: "Summarize this thread"

### Step 2: Set Up Google Cloud

```bash
# Create a new project
gcloud projects create YOUR_PROJECT_ID
gcloud config set project YOUR_PROJECT_ID

# Enable required APIs
gcloud services enable run.googleapis.com
gcloud services enable aiplatform.googleapis.com
gcloud services enable firestore.googleapis.com
gcloud services enable secretmanager.googleapis.com

# Create Firestore database
gcloud firestore databases create --location=asia-northeast1

# Store Slack secrets
echo -n "YOUR_CLIENT_ID" | gcloud secrets create slack-client-id --data-file=-
echo -n "YOUR_CLIENT_SECRET" | gcloud secrets create slack-client-secret --data-file=-
echo -n "YOUR_SIGNING_SECRET" | gcloud secrets create slack-signing-secret --data-file=-
echo -n "YOUR_STATE_SECRET" | gcloud secrets create slack-state-secret --data-file=-
```

### Step 3: Deploy Backend

```bash
cd backend
npm install

# Deploy to Cloud Run
gcloud run deploy stm-backend \
  --source . \
  --region asia-northeast1 \
  --allow-unauthenticated \
  --set-secrets=SLACK_CLIENT_ID=slack-client-id:latest,SLACK_CLIENT_SECRET=slack-client-secret:latest,SLACK_SIGNING_SECRET=slack-signing-secret:latest,SLACK_STATE_SECRET=slack-state-secret:latest \
  --set-env-vars=GCP_PROJECT_ID=YOUR_PROJECT_ID,NODE_ENV=production
```

After deployment, note your Cloud Run URL (e.g., `https://stm-backend-xxxxx-an.a.run.app`).

### Step 4: Update Slack App URLs

Go back to your Slack App settings:

1. **OAuth & Permissions** → Add Redirect URL:
   ```
   https://YOUR_CLOUD_RUN_URL/slack/oauth_redirect
   ```

2. **Slash Commands** → Update Request URL:
   ```
   https://YOUR_CLOUD_RUN_URL/slack/events
   ```

3. **Install App** → Install to your workspace

### Step 5: Set Up Chrome Extension

1. Clone this repository
2. Open Chrome and go to `chrome://extensions/`
3. Enable **Developer mode**
4. Click **Load unpacked** and select the `extension/` directory
5. Click the extension icon → **Options**
6. Enter your Cloud Run URL as the API Endpoint
7. Select your preferred language

### Step 6: Invite the Bot

In any Slack channel where you want to use the summarizer:
```
/invite @YourBotName
```

Now hover over any message to see the summarize icon!

---

## Local Development

### Backend

```bash
cd backend
cp .env.example .env
# Edit .env with your credentials
npm install
npm run dev
```

### Extension

1. Load the `extension/` directory in Chrome (Developer mode)
2. Update the API endpoint in options to `http://localhost:8080`

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
