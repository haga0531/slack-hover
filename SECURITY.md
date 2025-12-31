# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.x.x   | :white_check_mark: |

## Reporting a Vulnerability

If you discover a security vulnerability, please report it by creating a
**private security advisory** on GitHub:

1. Go to the [Security tab](https://github.com/haga0531/slack-hover/security)
2. Click "Report a vulnerability"
3. Provide details about the vulnerability

**Please do NOT report security vulnerabilities through public GitHub issues.**

## What to Include

When reporting a vulnerability, please include:

- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

## Response Timeline

- **Initial Response**: Within 48 hours
- **Status Update**: Within 7 days
- **Resolution**: Depends on severity and complexity

## Security Measures

This project implements the following security measures:

- **Workspace Isolation**: All data is strictly isolated by Slack workspace ID
- **No Raw Message Storage**: Only AI-generated summaries are cached
- **Slack API Validation**: Every request is validated through Slack's API
- **HTTPS Only**: All communications are encrypted
- **Auto-Expiry**: Cached data expires automatically

## Responsible Disclosure

We kindly ask you to:

- Give us reasonable time to fix the issue before public disclosure
- Make a good faith effort to avoid privacy violations and data destruction
- Not access or modify other users' data without permission

Thank you for helping keep this project secure!
