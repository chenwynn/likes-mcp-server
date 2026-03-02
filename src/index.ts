#!/usr/bin/env node
/**
 * MCP server for My Likes open API.
 * Exposes: list_activities, list_plans, list_feedback, push_plans, get_game, list_my_games.
 *
 * Env: BASE_URL (e.g. https://my.likes.com.cn), API_KEY (X-API-Key).
 * Run: npm start  or  node dist/index.js
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

const BASE_URL = process.env.BASE_URL?.replace(/\/$/, "") || "https://my.likes.com.cn";
const API_KEY = process.env.API_KEY || "";

function apiPath(path: string): string {
  return `${BASE_URL}/api/open${path}`;
}

async function openFetch(
  path: string,
  options: { method?: string; body?: string; searchParams?: Record<string, string> } = {}
): Promise<{ ok: boolean; status: number; body: string }> {
  const url = new URL(apiPath(path));
  if (options.searchParams) {
    Object.entries(options.searchParams).forEach(([k, v]) => url.searchParams.set(k, v));
  }
  const headers: Record<string, string> = {
    "X-API-Key": API_KEY,
    "Accept": "application/json",
  };
  if (options.body) headers["Content-Type"] = "application/json";
  const res = await fetch(url.toString(), {
    method: options.method || "GET",
    headers,
    body: options.body,
  });
  const body = await res.text();
  return { ok: res.ok, status: res.status, body };
}

function textResult(text: string, isError = false): { content: Array<{ type: "text"; text: string }>; isError?: boolean } {
  return {
    content: [{ type: "text" as const, text }],
    ...(isError && { isError: true }),
  };
}

const server = new Server(
  {
    name: "likes-open-mcp-server",
    version: "1.1.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "list_activities",
      description: "Get activity list (running/fitness records). By default returns current API key user's data. Optional user_id: when provided and you are that user's coach (editor/coach of a camp they joined), returns that user's activities. Date range max 30 days; rate limit 1 request per minute per API key.",
      inputSchema: {
        type: "object",
        properties: {
          user_id: { type: "integer", description: "Optional. User ID to query; only allowed if current user is that user's coach (camp editor/coach). Omit to query own data." },
          start_date: { type: "string", description: "Start date YYYY-MM-DD" },
          end_date: { type: "string", description: "End date YYYY-MM-DD (max 30 days from start)" },
          page: { type: "integer", description: "Page number, default 1" },
          limit: { type: "integer", description: "Page size, default 20, max 2000" },
          order_by: { type: "string", description: "e.g. sign_date, run_km, run_time, tss" },
          order: { type: "string", enum: ["asc", "desc"], description: "Default desc" },
        },
      },
    },
    {
      name: "get_activity_detail",
      description: "Get raw JSON detail for one activity by id (from list_activities). Uses data_source_path; supports overview (record field set to null) or full detailed (including GPS). Same permission as activity list: own or coach of that user.",
      inputSchema: {
        type: "object",
        properties: {
          id: { type: "integer", description: "Activity ID (signlog id), required; from list_activities rows." },
          mode: { type: "string", enum: ["overview", "detailed"], description: "overview: return JSON with record=null; detailed: full raw JSON. Default overview." },
        },
        required: ["id"],
      },
    },
    {
      name: "list_plans",
      description: "Get the user's calendar plans. Returns plans from start date for 42 days.",
      inputSchema: {
        type: "object",
        properties: {
          start: { type: "string", description: "Start date YYYY-MM-DD; default today" },
          game_id: { type: "integer", description: "Plan type ID filter, optional" },
        },
      },
    },
    {
      name: "list_feedback",
      description: "Get training feedback in a date range. start and end required; range up to 7 days. By default returns current user's feedback; optional user_ids: comma-separated trainee user IDs (e.g. 4,5,6), only allowed if current user is coach of each. Each row includes: plan_title, plan_content (course segment for coach comparison), activity (overview of linked workout with system score for coach reference), coach_comment (whether you have commented).",
      inputSchema: {
        type: "object",
        properties: {
          start: { type: "string", description: "Start date YYYY-MM-DD (required)" },
          end: { type: "string", description: "End date YYYY-MM-DD (required, max 7 days from start)" },
          user_ids: { type: "string", description: "Optional. Comma-separated user IDs (e.g. 4,5,6) to get multiple trainees' feedback; only if current user is coach of each. Omit to get own feedback." },
        },
        required: ["start", "end"],
      },
    },
    {
      name: "add_feedback_comment",
      description: "Coach adds a comment to a trainee's training feedback. Current user must be a coach; identity is determined by the server. Only content and feedback_id are required.",
      inputSchema: {
        type: "object",
        properties: {
          content: { type: "string", description: "Comment content / training advice" },
          feedback_id: { type: "integer", description: "The training feedback id (from list_feedback rows)" },
        },
        required: ["content", "feedback_id"],
      },
    },
    {
      name: "push_plans",
      description: "Push training plans to calendar (batch). Omit game_id/user_ids to push to current user. To push to multiple trainees as coach: pass game_id (camp ID you own) and user_ids (array of member user IDs, e.g. [4,5,6]). Optional overwrite: when true, deletes existing plans that match (game_id, user_id, created_id=you, start_time) before inserting. Each plan: name (course code), title, start (YYYY-MM-DD), optional weight, type, description, sports, game_id.",
      inputSchema: {
        type: "object",
        properties: {
          plans: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                title: { type: "string" },
                start: { type: "string" },
                weight: { type: "string" },
                type: { type: "string" },
                description: { type: "string" },
                sports: { type: "integer" },
                game_id: { type: "integer" },
              },
              required: ["name", "title", "start"],
            },
          },
          game_id: { type: "integer", description: "Optional. Required when user_ids is set. Camp ID; you must be editor or coach of this camp." },
          user_ids: {
            type: "array",
            items: { type: "integer" },
            description: "Optional. List of user IDs to push to (e.g. [4], [4,5,6]). Only members of the camp (game_id); requires game_id. Coach batch push.",
          },
          overwrite: { type: "boolean", description: "Optional. If true, delete existing plans matching (game_id, user_id, created_id=you, start_time) before inserting, so the same slot is replaced instead of duplicated." },
        },
        required: ["plans"],
      },
    },
    {
      name: "get_game",
      description: "Get a training camp (game) detail and its members. Only allowed if current user is the camp's editor or coach. Returns game basic info and members list (total + rows; non-sensitive training-related fields only).",
      inputSchema: {
        type: "object",
        properties: {
          game_id: { type: "integer", description: "Camp ID (required)" },
        },
        required: ["game_id"],
      },
    },
    {
      name: "list_my_games",
      description: "List training camps where current user is editor or coach (paginated). Returns only camp basic info, no members. Default 10 per page, max 10.",
      inputSchema: {
        type: "object",
        properties: {
          page: { type: "integer", description: "Page number, default 1" },
          limit: { type: "integer", description: "Page size, default 10, max 10" },
        },
      },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  const params = (args || {}) as Record<string, unknown>;

  if (!API_KEY) {
    return textResult("API_KEY environment variable is not set.", true);
  }

  try {
    if (name === "list_activities") {
      const searchParams: Record<string, string> = {};
      if (params.user_id != null) searchParams.user_id = String(params.user_id);
      if (params.start_date) searchParams.start_date = String(params.start_date);
      if (params.end_date) searchParams.end_date = String(params.end_date);
      if (params.page != null) searchParams.page = String(params.page);
      if (params.limit != null) searchParams.limit = String(params.limit);
      if (params.order_by) searchParams.order_by = String(params.order_by);
      if (params.order) searchParams.order = String(params.order);
      const res = await openFetch("/activity", { searchParams });
      if (!res.ok) return textResult(`API error ${res.status}: ${res.body}`, true);
      return textResult(res.body);
    }

    if (name === "get_activity_detail") {
      const id = params.id != null ? Number(params.id) : NaN;
      if (Number.isNaN(id) || id <= 0) return textResult("get_activity_detail requires id (positive integer).", true);
      const mode = params.mode === "detailed" ? "detailed" : "overview";
      const res = await openFetch("/activity/detail", { searchParams: { id: String(id), mode } });
      if (!res.ok) return textResult(`API error ${res.status}: ${res.body}`, true);
      return textResult(res.body);
    }

    if (name === "list_plans") {
      const searchParams: Record<string, string> = {};
      if (params.start) searchParams.start = String(params.start);
      if (params.game_id != null) searchParams.game_id = String(params.game_id);
      const res = await openFetch("/plans", { searchParams });
      if (!res.ok) return textResult(`API error ${res.status}: ${res.body}`, true);
      return textResult(res.body);
    }

    if (name === "list_feedback") {
      const start = params.start ? String(params.start) : "";
      const end = params.end ? String(params.end) : "";
      if (!start || !end) return textResult("list_feedback requires start and end (YYYY-MM-DD).", true);
      const searchParams: Record<string, string> = { start, end };
      if (params.user_ids != null && String(params.user_ids).trim()) searchParams.user_ids = String(params.user_ids).trim();
      const res = await openFetch("/feedback", {
        searchParams,
      });
      if (!res.ok) return textResult(`API error ${res.status}: ${res.body}`, true);
      return textResult(res.body);
    }

    if (name === "add_feedback_comment") {
      const content = params.content != null ? String(params.content) : "";
      const feedbackId = params.feedback_id != null ? Number(params.feedback_id) : NaN;
      if (!content.trim() || Number.isNaN(feedbackId) || feedbackId <= 0) {
        return textResult("add_feedback_comment requires content and feedback_id (both required; feedback_id positive).", true);
      }
      const res = await openFetch("/feedback/comment", {
        method: "POST",
        body: JSON.stringify({ content: content.trim(), feedback_id: feedbackId }),
      });
      if (!res.ok) return textResult(`API error ${res.status}: ${res.body}`, true);
      return textResult(res.body);
    }

    if (name === "push_plans") {
      const plans = params.plans;
      if (!Array.isArray(plans) || plans.length === 0) {
        return textResult("push_plans requires a non-empty plans array.", true);
      }
      const body: { plans: unknown[]; game_id?: number; user_ids?: number[]; overwrite?: boolean } = { plans };
      if (params.game_id != null) body.game_id = Number(params.game_id);
      if (Array.isArray(params.user_ids) && params.user_ids.length > 0) {
        body.user_ids = params.user_ids.map((id) => Number(id)).filter((n) => !Number.isNaN(n) && n > 0);
      }
      if (params.overwrite === true) body.overwrite = true;
      const res = await openFetch("/plans/push", {
        method: "POST",
        body: JSON.stringify(body),
      });
      if (!res.ok) return textResult(`API error ${res.status}: ${res.body}`, true);
      return textResult(res.body);
    }

    if (name === "get_game") {
      const gameId = params.game_id != null ? Number(params.game_id) : NaN;
      if (Number.isNaN(gameId) || gameId <= 0) {
        return textResult("get_game requires game_id (positive integer).", true);
      }
      const res = await openFetch("/game", { searchParams: { game_id: String(gameId) } });
      if (!res.ok) return textResult(`API error ${res.status}: ${res.body}`, true);
      return textResult(res.body);
    }

    if (name === "list_my_games") {
      const searchParams: Record<string, string> = {};
      if (params.page != null) searchParams.page = String(params.page);
      if (params.limit != null) searchParams.limit = String(params.limit);
      const res = await openFetch("/games", { searchParams });
      if (!res.ok) return textResult(`API error ${res.status}: ${res.body}`, true);
      return textResult(res.body);
    }

    return textResult(`Unknown tool: ${name}`, true);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return textResult(`Request failed: ${msg}`, true);
  }
});

const transport = new StdioServerTransport();
await server.connect(transport);
console.error("Likes Open MCP server running on stdio.");
