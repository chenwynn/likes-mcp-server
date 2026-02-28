# Likes Open API – MCP Server

MCP (Model Context Protocol) server that exposes the My Likes open API as tools for LLM clients (e.g. Cursor, other MCP consumers).

## Tools

| Tool | Description |
|------|-------------|
| `list_activities` | Activity list (30-day range; optional `user_id` for coach to query trainee; rate limit 1 req / 1 min) |
| `list_plans` | Calendar plans (from start date, 42 days) |
| `list_feedback` | Training feedback (start/end required, max 30 days). Optional `user_id` to get a trainee's feedback (only if you are their coach). Each row has `coach_comment`: whether you as coach have commented. |
| `add_feedback_comment` | Coach adds a comment to a trainee's training feedback. Params: `user_id`, `content`, `feedback_id`, `uid` (all required). |
| `push_plans` | Push training plans to calendar (batch). Optional `game_id` + `user_ids` for coach batch push to trainees. |
| `get_game` | Get a training camp (game) detail and members. Requires `game_id`; only if you are the camp's editor or coach. |
| `list_my_games` | List camps where you are editor or coach (paginated, default 10 per page, max 10). |

## Setup

```bash
cd likes-mcp-server
npm install
npm run build
```

## Configuration

Environment variables:

- **`BASE_URL`** – API base (e.g. `https://my.likes.com.cn`). Default: `https://my.likes.com.cn`
- **`API_KEY`** – Your open API key (X-API-Key). Required for all tools.

## Run

```bash
# After build
npm start

# Or with env
BASE_URL=https://my.likes.com.cn API_KEY=your-key node dist/index.js
```

Development (no build):

```bash
BASE_URL=https://my.likes.com.cn API_KEY=your-key npm run dev
```

## Cursor integration

Add the server to Cursor MCP (e.g. **Settings → MCP** or `.cursor/mcp.json`):

```json
{
  "mcpServers": {
    "likes-open-api": {
      "command": "node",
      "args": ["/Library/WebServer/Documents/likes-mcp-server/dist/index.js"],
      "env": {
        "BASE_URL": "https://my.likes.com.cn",
        "API_KEY": "YOUR_API_KEY"
      }
    }
  }
}
```

Use the absolute path to `likes-mcp-server/dist/index.js`. Ensure `npm run build` has been run first.

## API reference

See the in-app docs (设置 → API 文档) or the open API routes:

- `GET /api/open/activity` – activity list (optional `user_id` for coach)
- `GET /api/open/plans` – plans list
- `GET /api/open/feedback` – feedback (start, end); response rows include `coach_comment`
- `POST /api/open/feedback/comment` – coach comment on a feedback (body: `user_id`, `content`, `feedback_id`, `uid`)
- `POST /api/open/plans/push` – push plans (body: `plans`, optional `game_id`, `user_ids`)
- `GET /api/open/game?game_id=` – camp detail and members (ownership required)
- `GET /api/open/games` – list my camps (page, limit)
