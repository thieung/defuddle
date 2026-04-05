/** Extract and convert regular web pages using defuddle + Turndown for markdown */

import { parseHTML } from 'linkedom';
import Defuddle from 'defuddle';
import TurndownService from 'turndown';
import type { ConvertResult, ConvertOptions } from './convert-types';
import { MAX_SIZE } from './convert-types';

/** Create a configured Turndown instance for HTML-to-markdown conversion */
function createTurndownService(): TurndownService {
    const turndown = new TurndownService({
        headingStyle: 'atx',
        codeBlockStyle: 'fenced',
        bulletListMarker: '-',
        emDelimiter: '*',
    });
    return turndown;
}

export async function fetchAndParse(targetUrl: string, options?: ConvertOptions): Promise<ConvertResult> {
    const headers: Record<string, string> = {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    };
    if (options?.cookies) {
        headers['Cookie'] = options.cookies;
    }

    const response = await fetch(targetUrl, {
        headers,
        redirect: 'follow',
    });

    if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.status} ${response.statusText}`);
    }

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('text/html') && !contentType.includes('application/xhtml+xml')) {
        throw new Error(`Not an HTML page (content-type: ${contentType})`);
    }

    const contentLength = response.headers.get('content-length');
    if (contentLength && parseInt(contentLength) > MAX_SIZE) {
        throw new Error(`Page too large (${Math.round(parseInt(contentLength) / 1024 / 1024)}MB, max 5MB)`);
    }

    const html = await response.text();
    if (html.length > MAX_SIZE) {
        throw new Error(`Page too large (${Math.round(html.length / 1024 / 1024)}MB, max 5MB)`);
    }

    const { document } = parseHTML(html);

    // Stub missing APIs for defuddle compatibility
    const doc = document as any;
    if (!doc.styleSheets) doc.styleSheets = [];
    if (doc.defaultView && !doc.defaultView.getComputedStyle) {
        doc.defaultView.getComputedStyle = () => ({ display: '' });
    }

    // Use defuddle WITHOUT markdown (linkedom lacks DOM APIs for built-in markdown)
    const defuddle = new Defuddle(document as any, {
        url: targetUrl,
        ...(options?.contentSelector && { contentSelector: options.contentSelector }),
        ...(options?.language && { language: options.language }),
        ...(options?.includeReplies !== undefined && { includeReplies: options.includeReplies }),
    });
    const result = defuddle.parse();

    // Convert HTML content to markdown using Turndown
    const turndown = createTurndownService();
    const markdownContent = turndown.turndown(result.content || '');

    return {
        title: result.title || '',
        author: result.author || '',
        published: result.published || '',
        description: result.description || '',
        domain: result.domain || '',
        content: markdownContent,
        wordCount: result.wordCount || 0,
        source: targetUrl,
        favicon: result.favicon,
        image: result.image,
        site: result.site,
        language: result.language || undefined,
    };
}
