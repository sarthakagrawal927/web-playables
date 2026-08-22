/**
 * Cloudflare Pages Functions middleware — agent SEO surfaces for idle.aliveville.com.
 * Handles /openapi.json, /api/ai, /llms.txt, JSON error responses, Vary: Accept,
 * and agent-friendly 404s.
 */

const SITE_ORIGIN = "https://idle.aliveville.com";

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
  paths: {
    "/api/ai": {
      get: {
        operationId: "getAgentCatalog",
        tags: ["agent-surfaces"],
        summary: "Agent catalog",
        responses: { "200": { description: "Agent catalog JSON", content: { "application/json": {} } } },
      },
    },
    "/llms.txt": {
      get: {
        operationId: "getLlmsTxt",
        tags: ["agent-surfaces"],
        summary: "llms.txt index",
        responses: { "200": { description: "Markdown index", content: { "text/plain": {} } } },
      },
    },
    "/sitemap.xml": {
      get: {
        operationId: "getSitemap",
        tags: ["agent-surfaces"],
        summary: "Sitemap",
        responses: { "200": { description: "XML sitemap", content: { "application/xml": {} } } },
      },
    },
    "/openapi.json": {
      get: {
        operationId: "getOpenApiSpec",
        tags: ["agent-surfaces"],
        summary: "OpenAPI specification",
        description: "This document.",
        responses: { "200": { description: "OpenAPI 3.1 spec", content: { "application/json": {} } } },
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

function jsonError(status: number, code: string, message: string, path: string): Response {
  return new Response(
    JSON.stringify({ error: { code, message, path } }),
    {
      status,
      headers: {
        "content-type": "application/json; charset=utf-8",
        "cache-control": "no-store",
        "access-control-allow-origin": "*",
      },
    },
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
  return new Response(body, {
    status: 404,
    headers: {
      "content-type": "text/markdown; charset=utf-8",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
    },
  });
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
    return new Response(JSON.stringify(OPENAPI_SPEC, null, 2), {
      headers: {
        "content-type": "application/json; charset=utf-8",
        "access-control-allow-origin": "*",
        "cache-control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800",
      },
    });
  }

  if (pathname === "/api/ai") {
    return new Response(JSON.stringify(API_AI_CATALOG, null, 2) + "\n", {
      headers: {
        "content-type": "application/json; charset=utf-8",
        "access-control-allow-origin": "*",
        "cache-control": "public, max-age=300",
      },
    });
  }

  if (pathname === "/llms.txt") {
    return new Response(LLMS_TXT, {
      headers: {
        "content-type": "text/plain; charset=utf-8",
        "cache-control": "public, max-age=300",
      },
    });
  }

  if (pathname === "/sitemap.xml") {
    return new Response(sitemapXml(origin), {
      headers: {
        "content-type": "application/xml; charset=utf-8",
        "cache-control": "public, max-age=300",
      },
    });
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
    const headers = new Headers(response.headers);
    const vary = headers.get("vary");
    headers.set("vary", vary ? `${vary}, Accept, Accept-Encoding` : "Accept, Accept-Encoding");
    return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
  }

  return response;
}
