#!/usr/bin/env node
/**
 * MCP server for My Likes open API.
 * Exposes: list_activities, list_plans, list_feedback, push_plans.
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
    version: "1.0.0",
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
      description: "Get the user's activity list (running/fitness records). Limited to 30 days; rate limit 1 request per 2 minutes per API key.",
      inputSchema: {
        type: "object",
        properties: {
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
      description: "Get the user's training feedback in a date range. start and end required; range up to 30 days.",
      inputSchema: {
        type: "object",
        properties: {
          start: { type: "string", description: "Start date YYYY-MM-DD (required)" },
          end: { type: "string", description: "End date YYYY-MM-DD (required, max 30 days from start)" },
        },
        required: ["start", "end"],
      },
    },
    {
      name: "push_plans",
      description: "Push training plans to the user's calendar (batch). Each plan: name (course code), title, start (YYYY-MM-DD), optional weight, type, description, sports, game_id.",
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
        },
        required: ["plans"],
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
      const res = await openFetch("/feedback", {
        searchParams: { start, end },
      });
      if (!res.ok) return textResult(`API error ${res.status}: ${res.body}`, true);
      return textResult(res.body);
    }

    if (name === "push_plans") {
      const plans = params.plans;
      if (!Array.isArray(plans) || plans.length === 0) {
        return textResult("push_plans requires a non-empty plans array.", true);
      }
      const res = await openFetch("/plans/push", {
        method: "POST",
        body: JSON.stringify({ plans }),
      });
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
