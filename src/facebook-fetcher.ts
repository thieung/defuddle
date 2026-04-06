/** Fetch Facebook post via embed plugin (full content) with og:meta fallback */

import { parseHTML } from 'linkedom';
import TurndownService from 'turndown';
import type { ConvertResult } from './convert-types';

const FB_URL_PATTERN = /^https?:\/\/(www\.|m\.|web\.|mbasic\.)?facebook\.com\//;

export function isFacebookUrl(url: string): boolean {
    return FB_URL_PATTERN.test(url);
}

/** Normalize to www.facebook.com for embed API compatibility */
function toCanonicalUrl(url: string): string {
    return url.replace(/^(https?:\/\/)(m\.|mbasic\.|web\.)?facebook\.com/, '$1www.facebook.com');
}

/** Extract og:meta content from a parsed document */
function getMetaContent(document: any, property: string): string {
    const el = document.querySelector(`meta[property="${property}"]`)
        || document.querySelector(`meta[name="${property}"]`);
    return el?.getAttribute('content') || '';
}

/** Fetch full post content from Facebook's embed plugin endpoint */
async function fetchViaEmbed(canonicalUrl: string): Promise<string | null> {
    const embedUrl = `https://www.facebook.com/plugins/post.php?href=${encodeURIComponent(canonicalUrl)}`;

    const response = await fetch(embedUrl, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
            'Referer': 'https://www.facebook.com/',
        },
        redirect: 'follow',
    });

    if (!response.ok) return null;

    const html = await response.text();
    const { document } = parseHTML(html);

    // Facebook embed renders post text inside .text_exposed_root or userContent
    const postBody = document.querySelector('.text_exposed_root')
        || document.querySelector('[data-ft] .userContent')
        || document.querySelector('.userContent');

    if (!postBody) return null;

    // Convert HTML to markdown for clean output
    const turndown = new TurndownService({
        headingStyle: 'atx',
        bulletListMarker: '-',
    });
    // Remove Facebook's "See More" links and emoji image fallbacks
    turndown.addRule('removeSeeMore', {
        filter: (node: any) => {
            return node.classList?.contains('text_exposed_hide')
                && node.querySelector?.('.see_more_link');
        },
        replacement: () => '',
    });

    return turndown.turndown(postBody.innerHTML).trim() || null;
}

/** Fetch og:meta tags from m.facebook.com as metadata source */
async function fetchOgMeta(canonicalUrl: string): Promise<{
    title: string; description: string; image: string; ogUrl: string;
}> {
    const mobileUrl = canonicalUrl.replace('www.facebook.com', 'm.facebook.com');

    const response = await fetch(mobileUrl, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
            'Accept': 'text/html',
            'Accept-Language': 'en-US,en;q=0.9',
        },
        redirect: 'follow',
    });

    if (!response.ok) {
        return { title: '', description: '', image: '', ogUrl: '' };
    }

    const html = await response.text();
    const { document } = parseHTML(html);

    return {
        title: getMetaContent(document, 'og:title') || document.querySelector('title')?.textContent || '',
        description: getMetaContent(document, 'og:description'),
        image: getMetaContent(document, 'og:image'),
        ogUrl: getMetaContent(document, 'og:url'),
    };
}

export async function fetchFacebookPost(url: string): Promise<ConvertResult> {
    const canonicalUrl = toCanonicalUrl(url);

    // Fetch embed (full content) and og:meta (metadata) in parallel
    const [embedContent, meta] = await Promise.all([
        fetchViaEmbed(canonicalUrl),
        fetchOgMeta(canonicalUrl),
    ]);

    const content = embedContent || meta.description;

    if (!content && !meta.title) {
        throw new Error('Could not extract Facebook post content. The post may be private or require login.');
    }

    // Append image if present and not already in embed content
    let fullContent = content || '';
    if (meta.image && !fullContent.includes(meta.image)) {
        fullContent += `\n\n![](${meta.image})`;
    }

    return {
        title: meta.title,
        author: meta.title, // og:title is the author name for FB posts
        published: '',
        description: meta.description.slice(0, 200),
        domain: 'facebook.com',
        content: fullContent,
        wordCount: fullContent.split(/\s+/).filter(Boolean).length,
        source: meta.ogUrl || url,
        image: meta.image || undefined,
    };
}
