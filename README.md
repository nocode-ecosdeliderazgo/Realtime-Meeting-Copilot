# Realtime Meeting Copilot

AI-powered meeting assistant with real-time transcription and action item generation using OpenAI Realtime API, Linear, and Coda integrations.

## Features

- **Real-time transcription** using OpenAI Realtime API
- **AI-powered action item detection** from conversation
- **Linear integration** to create issues automatically
- **Coda integration** to save action items in tables
- **Session persistence** with local JSON storage
- **Responsive web interface** with live updates

## Tech Stack

- **Frontend**: Next.js 14 + TypeScript + Tailwind CSS
- **Backend**: Next.js API routes + WebSocket proxy
- **AI**: OpenAI Realtime API (gpt-4o-realtime-preview)
- **Integrations**: Linear GraphQL API, Coda REST API
- **Audio**: Web Audio API + MediaRecorder
- **Validation**: Zod schemas
- **Testing**: Vitest + Playwright

## Quick Start

### Prerequisites

- Node.js 20+
- pnpm 8+
- OpenAI API key with Realtime API access
- Linear API key (optional)
- Coda API token (optional)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd realtime-meeting-copilot
   ```

2. **Install dependencies**
   ```bash
   make install
   # or manually: pnpm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   ```
   
   Edit `.env.local` and configure:
   ```env
   # Required
   OPENAI_API_KEY=sk-your-openai-api-key-here
   
   # Optional - Linear integration
   LINEAR_API_KEY=lin_api_your-key-here
   LINEAR_TEAM_ID=your-team-id
   LINEAR_DEFAULT_ASSIGNEE_ID=your-assignee-id
   
   # Optional - Coda integration
   CODA_API_TOKEN=your-coda-token-here
   CODA_DOC_ID=your-document-id
   CODA_TABLE_ID=your-table-id
   ```

4. **Start development server**
   ```bash
   make dev
   # or manually: pnpm dev
   ```

5. **Open the app**
   Navigate to [http://localhost:3000](http://localhost:3000)

## Usage

### Basic Meeting Flow

1. **Start Recording**: Click the microphone button to begin capturing audio
2. **Live Transcription**: See real-time transcription in the left panel
3. **Action Items**: AI-detected action items appear in the right panel
4. **Create Tasks**: Select action items and create them in Linear or Coda
5. **Save Session**: Stop recording and save the session summary

### Audio Requirements

- **HTTPS required** for microphone access (use `https://localhost:3000` in production)
- **Supported formats**: WebM with Opus codec (preferred), fallback to other formats
- **Optimal settings**: 16kHz sample rate, mono channel

### Integration Setup

#### Linear Setup

1. Get your Linear API key from [Linear Settings](https://linear.app/settings/api)
2. Find your team ID using the Linear API or GraphQL playground
3. Optional: Set a default assignee ID

```bash
# Test Linear connection
curl -X GET http://localhost:3000/api/tasks/linear \
  -H "Content-Type: application/json"
```

#### Coda Setup

1. Get your Coda API token from [Coda Account Settings](https://coda.io/account)
2. Create a table with these recommended columns:
   - **Título** (required)
   - **Descripción**
   - **OwnerEmail**
   - **Fecha Límite**
   - **Estado**
   - **Prioridad**
   - **Creado**
   - **Sesión**

3. Get the document ID and table ID from the Coda URL

```bash
# Test Coda connection
curl -X GET http://localhost:3000/api/tasks/coda \
  -H "Content-Type: application/json"
```

## Development

### Available Scripts

```bash
# Development
make dev          # Start development server
make build        # Build for production
make start        # Start production server

# Testing
make test         # Run unit tests
make test-ui      # Run tests with UI
make e2e          # Run end-to-end tests

# Code Quality
make lint         # Lint code
make format       # Format code
make type-check   # Type checking

# Utilities
make clean        # Clean build artifacts
make install      # Install dependencies
```

### Project Structure

```
apps/web/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/               # API endpoints
│   │   │   ├── realtime/      # WebSocket proxy
│   │   │   ├── tasks/         # Linear & Coda integration
│   │   │   └── sessions/      # Session persistence
│   │   ├── globals.css        # Global styles
│   │   ├── layout.tsx         # Root layout
│   │   └── page.tsx           # Main application
│   ├── components/            # React components
│   │   ├── MicButton.tsx      # Audio recording
│   │   ├── LiveTranscript.tsx # Real-time transcription
│   │   ├── ActionItemsPanel.tsx # Action items management
│   │   └── SessionSummary.tsx # Session summary
│   └── lib/                   # Utilities & clients
│       ├── schemas.ts         # Zod validation schemas
│       ├── openai-realtime.ts # OpenAI client
│       ├── linear.ts          # Linear GraphQL client
│       └── coda.ts            # Coda REST client
├── tests/                     # Test files
data/                          # Session storage (gitignored)
```

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `OPENAI_API_KEY` | Yes | OpenAI API key with Realtime access |
| `OPENAI_REALTIME_MODEL` | No | Model name (default: gpt-4o-realtime-preview) |
| `LINEAR_API_KEY` | No | Linear API key for issue creation |
| `LINEAR_TEAM_ID` | No | Linear team ID for new issues |
| `LINEAR_DEFAULT_ASSIGNEE_ID` | No | Default assignee for Linear issues |
| `CODA_API_TOKEN` | No | Coda API token |
| `CODA_DOC_ID` | No | Coda document ID |
| `CODA_TABLE_ID` | No | Coda table ID for action items |
| `APP_BASE_URL` | No | Base URL (default: http://localhost:3000) |
| `JWT_SECRET` | No | JWT secret for WebSocket auth |

## API Reference

### Endpoints

#### `POST /api/tasks/linear`
Create Linear issues from action items.

**Request:**
```json
{
  "items": [
    {
      "title": "Follow up with client",
      "description": "Discuss project timeline",
      "ownerEmail": "user@example.com",
      "dueDate": "2025-10-25",
      "priority": "high"
    }
  ],
  "sessionId": "session-123"
}
```

#### `POST /api/tasks/coda`
Create Coda table rows from action items.

#### `POST /api/sessions`
Save a meeting session.

**Request:**
```json
{
  "title": "Weekly standup",
  "summary": "• Discussed project progress\n• Identified blockers",
  "actionItems": [...],
  "transcript": [...]
}
```

#### `GET /api/sessions`
List saved sessions with pagination.

**Query params:**
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 10)
- `sessionId`: Get specific session

### WebSocket Events

#### Client → Server
- `session_start`: Start new session
- `audio_chunk`: Binary audio data
- `session_end`: End session

#### Server → Client
- `transcript_partial`: Partial transcription
- `transcript_final`: Final transcription
- `action_items`: Detected action items
- `summary`: Session summary
- `error`: Error message

## Architecture

### Audio Processing Flow

1. **Capture**: MediaRecorder captures audio in WebM/Opus format
2. **Streaming**: Audio chunks sent via WebSocket to backend
3. **Proxy**: Backend forwards audio to OpenAI Realtime API
4. **Processing**: OpenAI processes audio and returns events
5. **UI Updates**: Frontend receives and displays transcription/insights

### Data Models

#### ActionItem
```typescript
{
  title: string;
  description?: string;
  ownerEmail?: string;
  dueDate?: string; // YYYY-MM-DD
  priority?: "low" | "medium" | "high";
  status: "pending" | "created" | "failed";
  source?: string;
  timestampSec?: number;
}
```

#### Session
```typescript
{
  id: string;
  title: string;
  summary: string;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  actionItems: ActionItem[];
  transcript?: TranscriptSegment[];
}
```

## Security Considerations

- **API Keys**: Never expose API keys in frontend code
- **CORS**: Configure appropriate CORS headers for production
- **Rate Limiting**: Implement rate limiting for API endpoints
- **Input Validation**: All inputs validated with Zod schemas
- **File Storage**: Session files stored locally (consider database for production)

## Deployment

### Vercel (Recommended)

1. **Deploy to Vercel**
   ```bash
   vercel deploy
   ```

2. **Configure environment variables** in Vercel dashboard

3. **Set up custom domain** with HTTPS for microphone access

### Docker

```bash
# Build image
docker build -t realtime-meeting-copilot .

# Run container
docker run -p 3000:3000 --env-file .env realtime-meeting-copilot
```

### Self-hosted

1. **Build the application**
   ```bash
   make build
   ```

2. **Start production server**
   ```bash
   make start
   ```

3. **Configure reverse proxy** (nginx/Apache) with HTTPS

## Troubleshooting

### Common Issues

**Microphone not working**
- Ensure HTTPS is enabled
- Check browser permissions for microphone access
- Verify Web Audio API support

**WebSocket connection fails**
- Check OPENAI_API_KEY is valid
- Verify Realtime API access in OpenAI account
- Check network/firewall settings

**Linear/Coda integration errors**
- Verify API keys and permissions
- Check team/table IDs are correct
- Review API endpoint responses

### Debug Mode

Enable debug logging:
```bash
DEBUG=* pnpm dev
```

### Performance Tips

- Use `audio/webm;codecs=opus` for best compression
- Adjust `MediaRecorder.start(chunkSize)` for latency vs. quality
- Monitor WebSocket connection health
- Implement reconnection logic for production

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make changes with tests
4. Run quality checks: `make lint && make test`
5. Submit a pull request

## License

MIT License - see LICENSE file for details.

## Support

- **Issues**: [GitHub Issues](https://github.com/your-repo/issues)
- **Discussions**: [GitHub Discussions](https://github.com/your-repo/discussions)
- **Documentation**: This README and inline code comments

---

**Built with ❤️ using OpenAI Realtime API**