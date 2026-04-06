# CHNUgram

A real-time messenger for Chernivtsi National University. Registration is restricted to @chnu.edu.ua email addresses.

## Stack

**Backend** — ASP.NET Core 8, MediatR (CQRS), Entity Framework Core, PostgreSQL, Redis, SignalR

**Frontend** — React 18, TypeScript, Vite, TailwindCSS, Zustand

## Features

- Private and group chats
- Real-time messaging via SignalR
- File and image attachments
- Message reactions (one per user), replies, forwarding, editing, deletion
- Read receipts and typing indicators
- Online status
- JWT authentication with refresh tokens
- Email verification
- User profile customization
- Light and dark themes

## Structure

```
backend/   ASP.NET Core API
frontend/  React SPA
nginx/     Reverse proxy config
database/  SQL init scripts
```
