import './polyfill';
import { convertToMarkdown, formatResponse } from './convert';
import type { ConvertOptions } from './convert';

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

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS_HEADERS });
    }

    // ── POST /api/convert ──
    if (path === '/api/convert' && request.method === 'POST') {
      try {
        const body = await request.json() as {
          url?: string;
          cookies?: string;
          contentSelector?: string;
          language?: string;
          includeReplies?: boolean;
        };
        const targetUrl = body?.url?.trim();

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

        const options: ConvertOptions = {
          cookies: body.cookies?.trim() || undefined,
          contentSelector: body.contentSelector?.trim() || undefined,
          language: body.language?.trim() || undefined,
          includeReplies: body.includeReplies,
        };

        const result = await convertToMarkdown(targetUrl, options);
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

    // ── Static assets ──
    if (path === '/' || path === '') {
      return new Response(null, { status: 404 });
    }
    if (path === '/favicon.ico') {
      return new Response(null, { status: 204 });
    }

    // ── GET /{url} ──
    let targetUrl = decodeURIComponent(path.slice(1));

    if (targetUrl.endsWith('.js') || targetUrl.endsWith('.css') || targetUrl.endsWith('.png') || targetUrl.endsWith('.svg') || targetUrl.endsWith('.ico')) {
      return new Response(null, { status: 404 });
    }

    // Append query string if present (but extract our custom params first)
    const contentSelector = url.searchParams.get('contentSelector') || undefined;
    const language = url.searchParams.get('language') || undefined;
    const includeRepliesParam = url.searchParams.get('includeReplies');
    const includeReplies = includeRepliesParam !== null ? includeRepliesParam !== 'false' : undefined;

    // Remove our custom params from the query string before appending to target URL
    const forwardParams = new URLSearchParams(url.searchParams);
    forwardParams.delete('contentSelector');
    forwardParams.delete('language');
    forwardParams.delete('includeReplies');
    const forwardSearch = forwardParams.toString();
    if (forwardSearch) {
      targetUrl += '?' + forwardSearch;
    }

    if (!targetUrl.match(/^https?:\/\//)) {
      targetUrl = 'https://' + targetUrl;
    }

    let parsedTarget: URL;
    try {
      parsedTarget = new URL(targetUrl);
    } catch {
      return errorResponse('Invalid URL. Please provide a valid web address.', 400);
    }

    if (BLOCKED_HOSTS.some(host => parsedTarget.hostname.includes(host))) {
      return errorResponse('Cannot convert this URL.', 400);
    }

    try {
      const options: ConvertOptions = {
        cookies: request.headers.get('X-Custom-Cookie') || undefined,
        contentSelector,
        language,
        includeReplies,
      };

      const result = await convertToMarkdown(targetUrl, options);

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

      const markdown = formatResponse(result);

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
