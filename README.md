# Likes Open API – MCP Server

MCP (Model Context Protocol) server that exposes the My Likes open API as tools for LLM clients (e.g. Cursor, other MCP consumers).

## What's New (v1.3.0)

- **Platform admin keys**: if the API key owner belongs to the admin group (`qw_auth_group` id 1/2), read tools can query **any** `user_id` with a date range up to **366 days** (`list_activities` is also exempt from the 1 req/min limit). Write tools (push plans, comments, camps) keep normal coach permissions.
- Added `get_metrics` tool (`GET /api/open/metrics`): current params, daily fitness/fatigue/performance curve, run force & threshold pace change logs, weight logs, PBs
- `list_plans`: new `user_id` (admin only) and `end` params
- `list_feedback`: new `page` / `page_size` params

## v1.2.4


- Added `get_period_report_json` tool for `GET /api/reporter/generatejson-sync`
- Added explicit permission notes for self/coached-trainee and `game_id` membership checks
- Updated package description to include period report capability

## Tools

| Tool | Description |
|------|-------------|
| `list_activities` | Activity list (31-day range, 366 for admin; optional `user_id` for coach/admin; rate limit 1 req / 1 min, admin exempt) |
| `get_health` | Health data for secondary analysis (daily `hrv` + sleep-related daily summary `sleep`). Supports optional `user_id` (single user) or `user_ids` (comma-separated batch trainees). Querying others requires coach permission for each target. Max range 31 days. |
| `get_metrics` | Training parameter changes in a date range: `current` params, `performance` (CTL/ATL/TSB daily), `param_changes` (run_force / t_pace logs), `weights`, `pbs`. Optional `user_id` (coach/admin). Max 31 days, 366 for admin. |
| `list_plans` | Calendar plans (from `start`, 42 days, or to `end`; 366 days max for admin). Optional `user_id` (admin only). |
| `list_feedback` | Training feedback (start/end required, max 7 days). Optional `user_ids` (comma-separated) to get multiple trainees' feedback (only if you are coach of each). Each row includes `plan_title`, `plan_content`, `activity` (linked workout overview with system `score`), `coach_comment`. |
| `add_feedback_comment` | Coach adds a comment to a trainee's training feedback. Params: `content`, `feedback_id`. |
| `push_plans` | Push training plans to calendar (batch). Response includes `id` per result (use with delete). Optional `game_id` + `user_ids` for coach batch push to trainees. |
| `get_game` | Get a training camp (game) detail and members. Requires `game_id`; only if you are the camp's editor or coach. |
| `list_my_games` | List camps where you are editor or coach (paginated, default 10 per page, max 10). |
| `get_running_ability` | Running ability: by run force (0–99) get predicted times and pace zones (E/M/T/A/I/R); or by race times (time_5km, time_10km, time_hm, time_fm, time_3km, time_mile) get estimated run force. Time format: seconds or M:SS or H:MM:SS. |
| `get_period_report_json` | Generate period report JSON (`/api/reporter/generatejson-sync`). Requires `user_id`; supports `range_unit`, `start_time`, `end_time`, `game_id`. Permission: self or coached trainee; when `game_id` is passed, caller must be editor/coach of camp and target user must be a camp member. |

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
- `GET /api/open/health` – health data (`hrv` + sleep-related summary), optional `user_id` (single) or `user_ids` (comma-separated batch), max 31 days; querying others requires coach permission for each target
- `GET /api/open/plans` – plans list
- `GET /api/open/feedback` – feedback (start, end; max 7 days; optional user_ids comma-separated); response rows include `coach_comment`
- `POST /api/open/feedback/comment` – coach comment on a feedback (body: `content`, `feedback_id`; user_id/uid from session)
- `POST /api/open/plans/push` – push plans (body: `plans`, optional `game_id`, `user_ids`). Response `results[].id` is the plan id for delete.
- `DELETE /api/open/plan/:id` – delete a single plan (id from push response; only if created by current key user).
- `GET /api/open/game?game_id=` – camp detail and members (ownership required)
- `GET /api/open/games` – list my camps (page, limit)
- `GET /api/open/ability` – running ability: query by `runforce` (0–99) + optional `celsius`, or by race times (`time_5km`, `time_10km`, `time_hm`, `time_fm`, `time_3km`, `time_mile`). Returns run force, pace zones, predicted times or by-distance run force.
- `GET /api/reporter/generatejson-sync` – period report JSON generation (requires `X-API-Key`, `user_id`; optional `range_unit`, `start_time`, `end_time`, `game_id`; includes coach/member permission checks).
