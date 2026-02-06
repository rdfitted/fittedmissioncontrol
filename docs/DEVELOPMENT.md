# Mission Control - Local Development Guide

## Overview
Mission Control (aka "The Squad Dashboard") is a Next.js app for managing the AI agent squad's tasks, activity, and coordination.

## Prerequisites
- Node.js v20+ 
- npm (comes with Node)

## Quick Start

```bash
# Navigate to project
cd mission-control

# Install dependencies
npm install

# Start dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
mission-control/
├── src/
│   ├── app/              # Next.js App Router pages & API routes
│   │   ├── api/          # REST API endpoints
│   │   │   ├── tasks/    # Task CRUD + chat
│   │   │   ├── todos/    # Ryan's personal todos
│   │   │   ├── agents/   # Agent status
│   │   │   ├── alerts/   # Alert system
│   │   │   └── ...
│   │   ├── page.tsx      # Main dashboard
│   │   └── layout.tsx    # Root layout
│   ├── components/       # React components
│   │   ├── ui/           # shadcn/ui primitives
│   │   └── *.tsx         # Feature components
│   ├── hooks/            # Custom React hooks
│   │   ├── use-tasks.ts  # Task state management
│   │   ├── use-agents.ts # Agent polling
│   │   └── ...
│   ├── lib/              # Core utilities
│   │   ├── tasks.ts      # Task file I/O & validation
│   │   ├── coordination.ts # File conflict detection
│   │   └── api-types.ts  # Shared type definitions
│   └── types/            # TypeScript interfaces
├── docs/                 # Documentation (you are here)
└── public/               # Static assets
```

## Data Storage

Tasks are stored as JSON files in the parent directory:

```
../squad/tasks/
├── json/         # Active task files (*.json)
├── archived/     # Completed/archived tasks
└── todos.json    # Ryan's personal todo list
```

**Important:** Mission Control reads/writes to `../squad/tasks/`, not within its own directory.

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server with hot reload |
| `npm run build` | Create production build |
| `npm run start` | Run production build |
| `npm run lint` | Run ESLint |

## Key Technologies

- **Next.js 16** - React framework with App Router
- **React 19** - UI library
- **@dnd-kit** - Drag-and-drop for Kanban board
- **Tailwind CSS 4** - Styling
- **radix-ui** - Accessible UI primitives
- **react-markdown** - Render markdown in task descriptions

## API Endpoints

### Tasks
- `GET /api/tasks` - List all tasks (with optional filters)
- `POST /api/tasks` - Create new task
- `GET /api/tasks/[id]` - Get single task
- `PATCH /api/tasks/[id]` - Update task
- `DELETE /api/tasks/[id]` - Archive task
- `POST /api/tasks/[id]/chat` - Add chat message
- `POST /api/tasks/[id]/subtask` - Add/toggle subtask

### Todos
- `GET /api/todos` - List Ryan's todos
- `POST /api/todos` - Add todo
- `PATCH /api/todos/[id]` - Toggle todo
- `DELETE /api/todos/[id]` - Delete todo

### Agents
- `GET /api/agents` - Get agent status from Clawdbot gateway

### Alerts
- `GET /api/alerts` - List alerts
- `POST /api/alerts` - Create alert
- `POST /api/alerts/notify` - Send notification

## Environment Variables

None required for local development. The app auto-detects the Clawdbot gateway on the default port.

## Troubleshooting

### "Cannot find module" errors
```bash
rm -rf node_modules
npm install
```

### Tasks not showing
Check that `../squad/tasks/json/` exists and contains `.json` files.

### Port already in use
```bash
npm run dev -- -p 3001  # Use different port
```

## Contributing

See [TASK-SCHEMA.md](./TASK-SCHEMA.md) for task file format.
See [HEARTBEAT-PICKUP.md](./HEARTBEAT-PICKUP.md) for how agents pick up tasks.
