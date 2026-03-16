# Likes Open API – MCP Server

MCP (Model Context Protocol) server that exposes the My Likes open API as tools for LLM clients (e.g. Cursor, other MCP consumers).

## Tools

| Tool | Description |
|------|-------------|
| `list_activities` | Activity list (30-day range; optional `user_id` for coach to query trainee; rate limit 1 req / 1 min) |
| `list_plans` | Calendar plans (from start date, 42 days) |
| `list_feedback` | Training feedback (start/end required, max 7 days). Optional `user_ids` (comma-separated) to get multiple trainees' feedback (only if you are coach of each). Each row includes `plan_title`, `plan_content`, `activity` (linked workout overview with system `score`), `coach_comment`. |
| `add_feedback_comment` | Coach adds a comment to a trainee's training feedback. Params: `content`, `feedback_id`. |
| `push_plans` | Push training plans to calendar (batch). Response includes `id` per result (use with delete). Optional `game_id` + `user_ids` for coach batch push to trainees. |
| `get_game` | Get a training camp (game) detail and members. Requires `game_id`; only if you are the camp's editor or coach. |
| `list_my_games` | List camps where you are editor or coach (paginated, default 10 per page, max 10). |
| `get_running_ability` | Running ability: by run force (0–99) get predicted times and pace zones (E/M/T/A/I/R); or by race times (time_5km, time_10km, time_hm, time_fm, time_3km, time_mile) get estimated run force. Time format: seconds or M:SS or H:MM:SS. |

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
- `GET /api/open/feedback` – feedback (start, end; max 7 days; optional user_ids comma-separated); response rows include `coach_comment`
- `POST /api/open/feedback/comment` – coach comment on a feedback (body: `content`, `feedback_id`; user_id/uid from session)
- `POST /api/open/plans/push` – push plans (body: `plans`, optional `game_id`, `user_ids`). Response `results[].id` is the plan id for delete.
- `DELETE /api/open/plan/:id` – delete a single plan (id from push response; only if created by current key user).
- `GET /api/open/game?game_id=` – camp detail and members (ownership required)
- `GET /api/open/games` – list my camps (page, limit)
- `GET /api/open/ability` – running ability: query by `runforce` (0–99) + optional `celsius`, or by race times (`time_5km`, `time_10km`, `time_hm`, `time_fm`, `time_3km`, `time_mile`). Returns run force, pace zones, predicted times or by-distance run force.
