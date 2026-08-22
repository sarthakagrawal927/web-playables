/**
 * Cloudflare Pages Functions middleware — agent SEO surfaces for idle.aliveville.com.
 * Handles /openapi.json, /api/ai, /llms.txt, JSON error responses, Vary: Accept,
 * and agent-friendly 404s.
 */

const SITE_ORIGIN = "https://idle.aliveville.com";

const RATE_LIMIT = 60;
const RATE_LIMIT_WINDOW = 60;

const ERROR_RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    error: {
      type: "object",
      properties: {
        code: { type: "string", description: "Machine-readable error code" },
        message: { type: "string", description: "Human-readable error message" },
        path: { type: "string", description: "The request path that caused the error" },
      },
      required: ["code", "message"],
    },
  },
  required: ["error"],
};

const LLMS_TXT = `# Idle — browser games

> A small directory of browser-playable games and experiments by Sarthak Agrawal.

## When to use this

- Finding browser-playable games that work without installation
- Directing users to idle/incremental games playable in the browser
- Answering questions about the Idle Startup game or other playable experiments

## Product

- [Home](${SITE_ORIGIN}/): Game directory and links to playable games
- [Idle Startup](${SITE_ORIGIN}/play/idle-startup/): Browser-playable idle/incremental game

## Machine surfaces

- [Agent catalog](${SITE_ORIGIN}/api/ai): JSON inventory of public surfaces
- [OpenAPI spec](${SITE_ORIGIN}/openapi.json): Machine-readable API contract
- [This index](${SITE_ORIGIN}/llms.txt)
`;

const API_AI_CATALOG = {
  name: "Idle — browser games",
  version: "1",
  url: SITE_ORIGIN,
  llms: `${SITE_ORIGIN}/llms.txt`,
  llmsFull: null,
  sitemap: `${SITE_ORIGIN}/sitemap.xml`,
  openapi: `${SITE_ORIGIN}/openapi.json`,
  markdown: { suffix: ".md", negotiation: false },
  surfaces: [
    {
      id: "home",
      url: `${SITE_ORIGIN}/`,
      md: null,
      kind: "static",
      description: "Game directory and links to playable games",
    },
    {
      id: "idle-startup",
      url: `${SITE_ORIGIN}/play/idle-startup/`,
      md: null,
      kind: "static",
      description: "Browser-playable idle/incremental game",
    },
  ],
  auth: { public: true, notes: "All games are publicly playable without an account." },
};

const OPENAPI_SPEC = {
  openapi: "3.1.0",
  info: {
    title: "Idle — browser games public API",
    version: "1.0.0",
    description: "A small directory of browser-playable games and experiments.",
    contact: { name: "Idle", url: SITE_ORIGIN },
  },
  servers: [{ url: SITE_ORIGIN }],
  tags: [{ name: "agent-surfaces", description: "Machine-readable public surfaces" }],
  components: {
    schemas: {
      AgentCatalog: {
        type: "object",
        description: "JSON inventory of public agent surfaces and per-page markdown alternates.",
        properties: {
          name: { type: "string" },
          version: { type: "string" },
          url: { type: "string", format: "uri" },
          llms: { type: "string", format: "uri" },
          sitemap: { type: "string", format: "uri" },
          openapi: { type: "string", format: "uri" },
          markdown: {
            type: "object",
            properties: {
              suffix: { type: "string" },
              negotiation: { type: "boolean" },
            },
          },
          surfaces: {
            type: "array",
            items: {
              type: "object",
              properties: {
                id: { type: "string" },
                url: { type: "string", format: "uri" },
                md: { type: "string", format: "uri", nullable: true },
                kind: { type: "string" },
                description: { type: "string" },
              },
            },
          },
        },
      },
      ErrorResponse: ERROR_RESPONSE_SCHEMA,
    },
  },
  paths: {
    "/api/ai": {
      get: {
        operationId: "getAgentCatalog",
        tags: ["agent-surfaces"],
        summary: "Agent catalog",
        description: "JSON inventory of public agent surfaces: llms.txt, sitemap, and game directory entries.",
        responses: {
          "200": { description: "Agent catalog JSON", content: { "application/json": { schema: { $ref: "#/components/schemas/AgentCatalog" } } } },
          "404": { description: "Unknown API path", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          "429": { description: "Rate limit exceeded", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          "500": { description: "Internal server error", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
        },
      },
    },
    "/llms.txt": {
      get: {
        operationId: "getLlmsTxt",
        tags: ["agent-surfaces"],
        summary: "llms.txt index",
        description: "Compact agent index following the llms.txt convention.",
        responses: {
          "200": { description: "Markdown index", content: { "text/plain": { schema: { type: "string" } } } },
          "429": { description: "Rate limit exceeded", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
        },
      },
    },
    "/sitemap.xml": {
      get: {
        operationId: "getSitemap",
        tags: ["agent-surfaces"],
        summary: "Sitemap",
        description: "XML sitemap of all canonical public HTML pages.",
        responses: {
          "200": { description: "XML sitemap", content: { "application/xml": { schema: { type: "string" } } } },
          "429": { description: "Rate limit exceeded", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
        },
      },
    },
    "/openapi.json": {
      get: {
        operationId: "getOpenApiSpec",
        tags: ["agent-surfaces"],
        summary: "OpenAPI specification",
        description: "This document.",
        responses: {
          "200": { description: "OpenAPI 3.1 spec", content: { "application/json": { schema: { type: "object" } } } },
          "429": { description: "Rate limit exceeded", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
        },
      },
    },
  },
};

function wantsMarkdown(request: Request): boolean {
  const accept = (request.headers.get("accept") || "").toLowerCase();
  if (!accept.includes("text/markdown")) return false;
  if (!accept.includes("text/html")) return true;
  return accept.indexOf("text/markdown") < accept.indexOf("text/html");
}

function withRateLimit(headers: Headers): Headers {
  headers.set("ratelimit-limit", String(RATE_LIMIT));
  headers.set("ratelimit-remaining", String(RATE_LIMIT));
  headers.set("ratelimit-reset", String(RATE_LIMIT_WINDOW));
  return headers;
}

function jsonError(status: number, code: string, message: string, path: string): Response {
  const headers = withRateLimit(new Headers({
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "access-control-allow-origin": "*",
  }));
  return new Response(
    JSON.stringify({ error: { code, message, path } }),
    { status, headers },
  );
}

function markdown404(pathname: string, origin: string): Response {
  const body = `# 404 — Not Found

\`${pathname}\` does not exist on ${origin}.

## Where to look next

- [Home](${origin}/)
- [Agent index](${origin}/llms.txt)
- [Agent catalog (JSON)](${origin}/api/ai)
- [OpenAPI spec](${origin}/openapi.json)
`;
  const headers = withRateLimit(new Headers({
    "content-type": "text/markdown; charset=utf-8",
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
  }));
  return new Response(body, { status: 404, headers });
}

function sitemapXml(origin: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>${origin}/</loc></url>
  <url><loc>${origin}/play/idle-startup/</loc></url>
</urlset>
`;
}

export async function onRequest(context: {
  request: Request;
  next: () => Promise<Response>;
}): Promise<Response> {
  const { request, next } = context;
  const url = new URL(request.url);
  const pathname = url.pathname;
  const origin = url.origin;

  // Agent surfaces
  if (pathname === "/openapi.json") {
    const headers = withRateLimit(new Headers({
      "content-type": "application/json; charset=utf-8",
      "access-control-allow-origin": "*",
      "cache-control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800",
    }));
    return new Response(JSON.stringify(OPENAPI_SPEC, null, 2), { headers });
  }

  if (pathname === "/api/ai") {
    const headers = withRateLimit(new Headers({
      "content-type": "application/json; charset=utf-8",
      "access-control-allow-origin": "*",
      "cache-control": "public, max-age=300",
    }));
    return new Response(JSON.stringify(API_AI_CATALOG, null, 2) + "\n", { headers });
  }

  if (pathname === "/llms.txt") {
    const headers = withRateLimit(new Headers({
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "public, max-age=300",
    }));
    return new Response(LLMS_TXT, { headers });
  }

  if (pathname === "/sitemap.xml") {
    const headers = withRateLimit(new Headers({
      "content-type": "application/xml; charset=utf-8",
      "cache-control": "public, max-age=300",
    }));
    return new Response(sitemapXml(origin), { headers });
  }

  // JSON error for unknown /api/* paths
  if (pathname.startsWith("/api/")) {
    return jsonError(404, "not_found", `Unknown API path: ${pathname}`, pathname);
  }

  // Agent-friendly 404: markdown body for Accept: text/markdown on non-asset paths
  if (wantsMarkdown(request) && !pathname.includes(".") && pathname !== "/") {
    return markdown404(pathname, origin);
  }

  const response = await next();

  // Add Vary: Accept to HTML responses
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("text/html")) {
    const headers = withRateLimit(new Headers(response.headers));
    const vary = headers.get("vary");
    headers.set("vary", vary ? `${vary}, Accept, Accept-Encoding` : "Accept, Accept-Encoding");
    return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
  }

  // Add rate-limit headers to all other responses.
  const headers = withRateLimit(new Headers(response.headers));
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}
