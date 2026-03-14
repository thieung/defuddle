import './polyfill';
import { convertToMarkdown, formatResponse } from './convert';

const BLOCKED_HOSTS = ['localhost'];

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Accept, X-Custom-Cookie',
};

export default {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS_HEADERS });
    }

    // ── /api/convert endpoint (for frontend) ──
    if (path === '/api/convert' && request.method === 'POST') {
      try {
        const body = await request.json() as { url?: string; cookies?: string };
        const targetUrl = body?.url?.trim();
        const cookies = body?.cookies?.trim() || undefined;

        if (!targetUrl) {
          return jsonError('Missing "url" field in request body.', 400);
        }

        let parsedTarget: URL;
        try {
          parsedTarget = new URL(targetUrl);
        } catch {
          return jsonError('Invalid URL. Please provide a valid web address.', 400);
        }

        if (BLOCKED_HOSTS.some(host => parsedTarget.hostname.includes(host))) {
          return jsonError('Cannot convert this URL.', 400);
        }

        const result = await convertToMarkdown(targetUrl, cookies);
        return new Response(JSON.stringify(result, null, 2), {
          headers: {
            'Content-Type': 'application/json; charset=utf-8',
            ...CORS_HEADERS,
            'Cache-Control': 'public, max-age=3600',
          },
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'An unexpected error occurred';
        return jsonError(message, 502);
      }
    }

    // ── Static assets will handle / and other static files ──
    // Only process paths that look like URLs to convert
    if (path === '/' || path === '') {
      // Let static assets handle this (fallthrough)
      return new Response(null, { status: 404 });
    }

    // favicon
    if (path === '/favicon.ico') {
      return new Response(null, { status: 204 });
    }

    // ── URL conversion endpoint (GET /{url}) ──
    let targetUrl = decodeURIComponent(path.slice(1));

    // Skip paths that are clearly static assets
    if (targetUrl.endsWith('.js') || targetUrl.endsWith('.css') || targetUrl.endsWith('.png') || targetUrl.endsWith('.svg') || targetUrl.endsWith('.ico')) {
      return new Response(null, { status: 404 });
    }

    // Append query string if present
    if (url.search) {
      targetUrl += url.search;
    }

    // Prepend https:// if no protocol
    if (!targetUrl.match(/^https?:\/\//)) {
      targetUrl = 'https://' + targetUrl;
    }

    // Validate URL
    let parsedTarget: URL;
    try {
      parsedTarget = new URL(targetUrl);
    } catch {
      return errorResponse('Invalid URL. Please provide a valid web address.', 400);
    }

    // Block self-referential requests
    if (BLOCKED_HOSTS.some(host => parsedTarget.hostname.includes(host))) {
      return errorResponse('Cannot convert this URL.', 400);
    }

    try {
      const cookies = request.headers.get('X-Custom-Cookie') || undefined;
      const result = await convertToMarkdown(targetUrl, cookies);

      // Check Accept header for JSON output
      const accept = request.headers.get('Accept') || '';
      if (accept.includes('application/json')) {
        return new Response(JSON.stringify(result, null, 2), {
          headers: {
            'Content-Type': 'application/json; charset=utf-8',
            ...CORS_HEADERS,
            'Cache-Control': 'public, max-age=3600',
          },
        });
      }

      // Default: return markdown
      const markdown = formatResponse(result, targetUrl);

      return new Response(markdown, {
        headers: {
          'Content-Type': 'text/markdown; charset=utf-8',
          ...CORS_HEADERS,
          'Cache-Control': 'public, max-age=3600',
        },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An unexpected error occurred';
      return errorResponse(message, 502);
    }
  },
} satisfies ExportedHandler;

function errorResponse(message: string, status: number): Response {
  return new Response(`Error: ${message}`, {
    status,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
    },
  });
}

function jsonError(message: string, status: number): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ...CORS_HEADERS,
    },
  });
}
