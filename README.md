# Likes Open API – MCP Server

MCP (Model Context Protocol) server that exposes the My Likes open API as tools for LLM clients (e.g. Cursor, other MCP consumers).

## Tools

| Tool | Description |
|------|-------------|
| `list_activities` | User activity list (30-day range; rate limit 1 req / 2 min) |
| `list_plans` | Calendar plans (from start date, 42 days) |
| `list_feedback` | Training feedback (start/end required, max 30 days) |
| `push_plans` | Push training plans to calendar (batch) |

## Setup

```bash
cd mcp-server
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
      "args": ["/path/to/likes_api/mcp-server/dist/index.js"],
      "env": {
        "BASE_URL": "https://my.likes.com.cn",
        "API_KEY": "YOUR_API_KEY"
      }
    }
  }
}
```

Use the absolute path to `mcp-server/dist/index.js`. Ensure `npm run build` has been run in `mcp-server` first.

## API reference

See the in-app docs (设置 → API 文档) or the open API routes:

- `GET /api/open/activity` – activity list
- `GET /api/open/plans` – plans list
- `GET /api/open/feedback` – feedback (start, end)
- `POST /api/open/plans/push` – push plans (JSON body `{ "plans": [...] }`)
