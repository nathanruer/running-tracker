# Running Tracker

A full-stack running training tracker built with Next.js, Prisma, and React Query, featuring Strava integration and an AI-powered coaching assistant.

![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)
![Prisma](https://img.shields.io/badge/Prisma-5-2D3748?logo=prisma)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791?logo=postgresql)

## Features

### Session Management
- **Track your runs**: Log sessions with distance, duration, pace, heart rate, and perceived exertion (RPE)
- **Session types**: Support for different training types (Easy run, Intervals, Long run, etc.)
- **Planned sessions**: Plan future workouts with target metrics
- **Interval structure**: Document your interval workouts in detail

### Data Import/Export
- **Strava Sync**: Connect your Strava account and import activities directly
- **CSV Import**: Bulk import sessions from CSV files
- **Export options**: Export your data to CSV, JSON, or Excel formats

### AI Coach - "Bob"
- **Personalized coaching**: Chat with an AI assistant powered by Groq (Llama models)
- **Training recommendations**: Get session suggestions based on your history and goals
- **Conversation history**: Your coaching conversations are saved for continuity

### User Profile
- **Personal metrics**: Track age, weight, max heart rate, VMA
- **Training goals**: Set and track your running objectives
- **Statistics dashboard**: View your training progress over time

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | Next.js 16, React 19, TypeScript |
| **Styling** | Tailwind CSS, Radix UI, shadcn/ui |
| **State Management** | TanStack React Query |
| **Backend** | Next.js API Routes |
| **Database** | PostgreSQL with Prisma ORM |
| **Authentication** | JWT with HTTP-only cookies |
| **AI** | Groq API (Llama 3) |
| **External APIs** | Strava OAuth2 |
| **Testing** | Vitest, Testing Library, Playwright |

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database
- Strava API credentials (optional, for sync)
- Groq API key (optional, for AI coach)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/nathanruer/running-tracker.git
   cd running-tracker
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` with your configuration:
   ```env
   # Database
   DATABASE_URL="postgresql://user:password@localhost:5432/running_tracker"
   
   # JWT Secret (generate a secure random string)
   JWT_SECRET="your_jwt_secret_here"
   
   # Strava OAuth (optional)
   STRAVA_CLIENT_ID="your_strava_client_id"
   STRAVA_CLIENT_SECRET="your_strava_client_secret"
   NEXT_PUBLIC_STRAVA_REDIRECT_URI="http://localhost:3000/api/auth/strava/callback"
   
   # Groq API for AI Coach (free tier available)
   GROQ_API_KEY="your_groq_api_key_here"
   ```

4. **Set up the database**
   ```bash
   npx prisma migrate dev
   ```

5. **Start the development server**
   ```bash
   npm run dev
   ```

6. **Open your browser**
   
   Navigate to [http://localhost:3000](http://localhost:3000)

## Testing

```bash
# Run unit tests
npm test

# Run unit tests in watch mode
npm test -- --watch

# Run end-to-end tests
npm run test:e2e

# Run all tests
npm run test:all
```

## Project Structure

```
running-tracker/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/                # API Routes
│   │   ├── dashboard/          # Dashboard page
│   │   ├── profile/            # User profile page
│   │   └── (protected)/        # Protected routes
│   │       └── chat/           # AI Coach chat
│   ├── components/             # React components
│   │   ├── dashboard/          # Dashboard-specific components
│   │   ├── profile/            # Profile components
│   │   ├── chat/               # Chat components
│   │   └── ui/                 # shadcn/ui components
│   ├── hooks/                  # Custom React hooks
│   └── lib/                    # Utilities and services
│       ├── services/           # API clients
│       ├── validation/         # Zod schemas
│       └── types/              # TypeScript types
├── prisma/
│   ├── schema.prisma           # Database schema
│   └── migrations/             # Database migrations
├── tests/
│   ├── components/             # Component tests
│   ├── lib/                    # Utility tests
│   └── e2e/                    # End-to-end tests
└── public/                     # Static assets
```

## API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Create a new account |
| POST | `/api/auth/login` | Login |
| POST | `/api/auth/logout` | Logout |
| GET | `/api/auth/me` | Get current user |

### Sessions
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/sessions` | Get all sessions |
| POST | `/api/sessions` | Create a session |
| PUT | `/api/sessions/:id` | Update a session |
| DELETE | `/api/sessions/:id` | Delete a session |
| POST | `/api/sessions/bulk` | Bulk import sessions |

### Strava
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/auth/strava/authorize` | Initiate Strava OAuth |
| GET | `/api/auth/strava/callback` | OAuth callback |
| GET | `/api/strava/activities` | Get Strava activities |

### AI Chat
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/chat/conversations` | Get conversations |
| POST | `/api/chat` | Send a message |