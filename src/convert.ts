import { parseHTML } from 'linkedom';
import Defuddle from 'defuddle';
import TurndownService from 'turndown';

const MAX_SIZE = 5 * 1024 * 1024; // 5MB

const X_URL_PATTERN = /^https?:\/\/(x\.com|twitter\.com)\/\w+\/status\/\d+/;

// ─── FxTwitter API Types ────────────────────────────────────────────────────

interface FxAuthor {
    id: string;
    name: string;
    screen_name: string;
    avatar_url?: string;
    banner_url?: string;
    description?: string;
    followers?: number;
    following?: number;
}

interface FxPhoto {
    type: 'photo';
    url: string;
    width: number;
    height: number;
    altText?: string;
}

interface FxVideo {
    type: 'video' | 'gif';
    url: string;
    thumbnail_url: string;
    width: number;
    height: number;
    duration: number;
    format?: string;
}

interface FxExternalMedia {
    type: 'video';
    url: string;
    thumbnail_url?: string;
    height?: number;
    width?: number;
}

interface FxBroadcast {
    url: string;
    width: number;
    height: number;
    state: 'LIVE' | 'ENDED';
    broadcaster: { username: string; display_name: string; id: string };
    title: string;
    broadcast_id: string;
    stream?: { url: string };
}

interface FxPollChoice {
    label: string;
    count: number;
    percentage: number;
}

interface FxPoll {
    choices: FxPollChoice[];
    total_votes: number;
    ends_at?: string;
    time_left_en?: string;
}

interface FxFacet {
    type: string;
    indices: [number, number];
    original?: string;
    replacement?: string;
    display?: string;
    id?: string;
}

interface FxCommunityNote {
    text: string;
}

interface FxMedia {
    type: string;
    url: string;
    width?: number;
    height?: number;
}

/**
 * Twitter API media entity as passed through FxTwitter for article media.
 * These contain nested media_info with actual image/video URLs.
 */
interface FxArticleMediaEntity {
    media_id?: string;
    media_key?: string;
    media_info?: {
        __typename?: string; // 'ApiImage' | 'ApiVideo'
        original_img_url?: string;
        original_img_width?: number;
        original_img_height?: number;
        color_info?: any;
        video_info?: {
            variants?: { bitrate?: number; content_type?: string; url?: string }[];
            duration_millis?: number;
            aspect_ratio?: number[];
        };
    };
    // Fallback fields for simpler API responses
    url?: string;
    type?: string;
}

interface FxArticle {
    id: string;
    title: string;
    preview_text: string;
    cover_media?: FxArticleMediaEntity;
    content: {
        blocks: DraftBlock[];
        entityMap: Record<string, DraftEntity>;
    };
    media_entities?: FxArticleMediaEntity[];
    created_at?: string;
    modified_at?: string;
}

interface DraftBlock {
    type: string;
    text: string;
    inlineStyleRanges: { offset: number; length: number; style: string }[];
    entityRanges: { offset: number; length: number; key: number }[];
    data?: Record<string, any>;
}

interface DraftEntity {
    // Direct fields (standard DraftJS)
    type?: string;
    mutability?: string;
    data?: Record<string, any>;
    // Nested value wrapper (FxTwitter API format)
    value?: {
        type?: string;
        mutability?: string;
        data?: Record<string, any>;
    };
}

/**
 * Normalize entity access — FxTwitter wraps entity data under .value
 * while standard DraftJS puts type/data at the top level.
 */
function getEntityInfo(entity: DraftEntity): { type: string; data: Record<string, any> } {
    const type = (entity.value?.type || entity.type || '').toUpperCase();
    const data = entity.value?.data || entity.data || {};
    return { type, data };
}

interface FxTweet {
    id: string;
    url: string;
    text: string;
    created_at: string;
    created_timestamp?: number;

    author: FxAuthor;

    likes: number;
    retweets: number;
    replies: number;
    views?: number | null;
    bookmarks?: number | null;

    media?: {
        photos?: FxPhoto[];
        videos?: FxVideo[];
        all?: FxMedia[];
        external?: FxExternalMedia;
        mosaic?: FxMedia;
        broadcast?: FxBroadcast;
    };

    quote?: FxTweet;
    poll?: FxPoll;

    article?: FxArticle;

    raw_text?: {
        text: string;
        facets: FxFacet[];
    };

    replying_to?: { screen_name: string; post: string } | null;

    community_note?: FxCommunityNote | null;
    is_note_tweet?: boolean;
    lang?: string | null;
    source?: string | null;
    possibly_sensitive?: boolean;
}

// ─── Result Interface ───────────────────────────────────────────────────────

export interface ConvertResult {
    title: string;
    author: string;
    published: string;
    description: string;
    domain: string;
    content: string;
    wordCount: number;
    source: string;
    favicon?: string;
    image?: string;
    site?: string;
    // Engagement stats (X/Twitter only)
    likes?: number;
    retweets?: number;
    replies?: number;
    views?: number | null;
}

// ─── URL Helpers ────────────────────────────────────────────────────────────

function isXUrl(url: string): boolean {
    return X_URL_PATTERN.test(url);
}

function parseTweetUrl(url: string): { username: string; tweetId: string } | null {
    const match = url.match(/^https?:\/\/(?:x\.com|twitter\.com)\/(\w+)\/status\/(\d+)/);
    if (!match) return null;
    return { username: match[1], tweetId: match[2] };
}

// ─── DraftJS → Markdown Conversion ─────────────────────────────────────────

/**
 * Apply bold/italic/code/strikethrough inline styles to text.
 * Processes from end to start to preserve offsets.
 */
function applyInlineStyles(text: string, ranges: DraftBlock['inlineStyleRanges']): string {
    if (!ranges.length) return text;

    const sorted = [...ranges].sort((a, b) => b.offset - a.offset);

    let result = text;
    for (const range of sorted) {
        const before = result.slice(0, range.offset);
        const segment = result.slice(range.offset, range.offset + range.length);
        const after = result.slice(range.offset + range.length);

        switch (range.style) {
            case 'Bold':
            case 'BOLD':
                result = before + `**${segment}**` + after;
                break;
            case 'Italic':
            case 'ITALIC':
                result = before + `*${segment}*` + after;
                break;
            case 'Code':
            case 'CODE':
                result = before + `\`${segment}\`` + after;
                break;
            case 'Strikethrough':
            case 'STRIKETHROUGH':
                result = before + `~~${segment}~~` + after;
                break;
        }
    }

    return result;
}

/**
 * Apply entity links/mentions within a block's text.
 * Entity ranges reference keys in the entityMap for links, @mentions, etc.
 * Processed from end to start to preserve offsets.
 */
function applyEntityLinks(text: string, entityRanges: DraftBlock['entityRanges'], entityMap: Record<string, DraftEntity>): string {
    if (!entityRanges.length) return text;

    const sorted = [...entityRanges].sort((a, b) => b.offset - a.offset);

    let result = text;
    for (const range of sorted) {
        const entity = entityMap[range.key];
        if (!entity) continue;

        const before = result.slice(0, range.offset);
        const segment = result.slice(range.offset, range.offset + range.length);
        const after = result.slice(range.offset + range.length);

        const { type: entityType, data } = getEntityInfo(entity);

        if (entityType === 'LINK' || entityType === 'URL') {
            const url = data.url || data.href || '';
            if (url) {
                result = before + `[${segment}](${url})` + after;
            }
        } else if (entityType === 'MENTION' || entityType === 'AT_MENTION') {
            const screenName = data.screenName || data.screen_name || segment.replace('@', '');
            result = before + `[@${screenName}](https://x.com/${screenName})` + after;
        } else if (entityType === 'HASHTAG') {
            const tag = data.hashtag || segment.replace('#', '');
            result = before + `[#${tag}](https://x.com/hashtag/${tag})` + after;
        }
    }

    return result;
}

/**
 * Resolve a media entity's actual URL from its mediaId using the article's media_entities.
 */
function resolveArticleMediaUrl(mediaId: string, mediaEntities: FxArticleMediaEntity[]): { url: string; type: 'image' | 'video' } | null {
    const entity = mediaEntities.find(m => m.media_id === mediaId || m.media_key === mediaId);
    if (!entity) return null;

    const info = entity.media_info;
    if (!info) {
        // Fallback: entity might have a direct url
        if (entity.url) return { url: entity.url, type: (entity.type === 'video' ? 'video' : 'image') };
        return null;
    }

    // ApiImage
    if (info.__typename === 'ApiImage' || info.original_img_url) {
        return { url: info.original_img_url!, type: 'image' };
    }

    // ApiVideo
    if (info.__typename === 'ApiVideo' || info.video_info) {
        const variants = info.video_info?.variants || [];
        // Pick highest bitrate MP4 variant
        const mp4s = variants.filter(v => v.content_type === 'video/mp4' && v.url);
        const best = mp4s.sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0))[0];
        if (best?.url) return { url: best.url, type: 'video' };
        // Fallback to any variant
        const any = variants.find(v => v.url);
        if (any?.url) return { url: any.url, type: 'video' };
    }

    return null;
}

/**
 * Convert DraftJS-style blocks (from X articles) to Markdown.
 * Handles headers, lists, blockquotes, code blocks, atomic entities (images, embedded content).
 * @param mediaEntities - Article-level media entities for resolving MEDIA entity types
 */
function blocksToMarkdown(blocks: DraftBlock[], entityMap: Record<string, DraftEntity>, mediaEntities: FxArticleMediaEntity[] = []): string {
    const lines: string[] = [];

    for (const block of blocks) {
        let text = applyEntityLinks(block.text || '', block.entityRanges || [], entityMap);
        text = applyInlineStyles(text, block.inlineStyleRanges || []);

        switch (block.type) {
            case 'header-one':
                lines.push(`# ${text}`);
                break;
            case 'header-two':
                lines.push(`## ${text}`);
                break;
            case 'header-three':
                lines.push(`### ${text}`);
                break;
            case 'unordered-list-item':
                lines.push(`- ${text}`);
                break;
            case 'ordered-list-item':
                lines.push(`1. ${text}`);
                break;
            case 'blockquote':
                lines.push(`> ${text}`);
                break;
            case 'code-block':
                lines.push('```\n' + block.text + '\n```');
                break;
            case 'atomic': {
                // Atomic blocks reference entities (images, code, tweet embeds, etc.)
                const entityRanges = block.entityRanges || [];
                for (const range of entityRanges) {
                    const entity = entityMap[range.key];
                    if (!entity) continue;

                    const { type: entityType, data } = getEntityInfo(entity);

                    // Markdown code block entity (can be under value.data.markdown or data.markdown)
                    const markdown = data.markdown;
                    if (markdown) {
                        lines.push(markdown);
                        continue;
                    }

                    // MEDIA entity — article images/videos stored via mediaItems[].mediaId
                    if (entityType === 'MEDIA') {
                        const mediaItems: any[] = data.mediaItems || [];
                        for (const item of mediaItems) {
                            const mediaId = item.mediaId || item.media_id || '';
                            if (!mediaId) continue;
                            const resolved = resolveArticleMediaUrl(mediaId, mediaEntities);
                            if (resolved) {
                                if (resolved.type === 'image') {
                                    lines.push(`![](${resolved.url})`);
                                } else {
                                    lines.push(`[Video](${resolved.url})`);
                                }
                            }
                        }
                        continue;
                    }

                    // MARKDOWN entity — code blocks with language
                    if (entityType === 'MARKDOWN') {
                        const code = data.markdown || data.content || '';
                        const lang = data.language || '';
                        if (code) {
                            lines.push('```' + lang + '\n' + code + '\n```');
                        }
                        continue;
                    }

                    // TWEET entity — embedded tweet
                    if (entityType === 'TWEET' || entityType === 'EMBEDDED_TWEET') {
                        const tweetId = data.id || data.tweetId || '';
                        if (tweetId) {
                            lines.push(`> [Embedded Tweet](https://x.com/i/status/${tweetId})`);
                        }
                        continue;
                    }

                    // IMAGE / PHOTO entity (direct)
                    if (entityType === 'IMAGE' || entityType === 'PHOTO') {
                        const url = data.src || data.url || '';
                        const alt = data.alt || data.altText || '';
                        if (url) {
                            lines.push(`![${alt}](${url})`);
                        }
                        continue;
                    }

                    // VIDEO entity (direct)
                    if (entityType === 'VIDEO') {
                        const url = data.src || data.url || '';
                        if (url) {
                            lines.push(`[Video](${url})`);
                        }
                        continue;
                    }
                }
                break;
            }
            default: // 'unstyled' and others
                lines.push(text);
                break;
        }
    }

    return lines.join('\n\n');
}

// ─── Tweet Text Processing ──────────────────────────────────────────────────

/**
 * Expand t.co shortened URLs in tweet text using raw_text facets.
 * Falls back to original text if no facets available.
 */
function expandTweetText(tweet: FxTweet): string {
    if (!tweet.raw_text?.facets?.length) {
        return tweet.text || '';
    }

    const { text, facets } = tweet.raw_text;

    // Convert string to array of code points for correct Unicode handling
    const chars = [...text];
    let result = '';
    let lastIndex = 0;

    // Sort facets by start index
    const sorted = [...facets].sort((a, b) => a.indices[0] - b.indices[0]);

    for (const facet of sorted) {
        const [start, end] = facet.indices;

        // Add text before this facet
        result += chars.slice(lastIndex, start).join('');

        const originalSegment = chars.slice(start, end).join('');

        if (facet.type === 'url' && facet.display) {
            // Replace t.co URL with display URL as a markdown link
            const linkUrl = facet.replacement || facet.original || originalSegment;
            result += `[${facet.display}](${linkUrl})`;
        } else if (facet.type === 'mention') {
            const screenName = facet.id || originalSegment.replace('@', '');
            result += `[@${screenName}](https://x.com/${screenName})`;
        } else if (facet.type === 'hashtag') {
            const tag = facet.display || originalSegment.replace('#', '');
            result += `[#${tag}](https://x.com/hashtag/${tag})`;
        } else {
            result += originalSegment;
        }

        lastIndex = end;
    }

    // Add remaining text
    result += chars.slice(lastIndex).join('');

    return result;
}

// ─── Media Rendering ────────────────────────────────────────────────────────

function renderMedia(media: FxTweet['media'], indent = ''): string {
    if (!media) return '';

    const parts: string[] = [];

    // Photos
    if (media.photos?.length) {
        for (const photo of media.photos) {
            const alt = photo.altText || '';
            parts.push(`${indent}![${alt}](${photo.url})`);
        }
    }

    // Videos / GIFs
    if (media.videos?.length) {
        for (const video of media.videos) {
            const label = video.type === 'gif' ? 'GIF' : 'Video';
            const durationStr = video.duration > 0 ? ` (${formatDuration(video.duration)})` : '';
            parts.push(`${indent}[${label}${durationStr}](${video.url})`);
            if (video.thumbnail_url) {
                parts.push(`${indent}![Thumbnail](${video.thumbnail_url})`);
            }
        }
    }

    // External media (YouTube embeds, etc.)
    if (media.external) {
        parts.push(`${indent}[External Video](${media.external.url})`);
    }

    // Broadcast / live streams
    if (media.broadcast) {
        const bc = media.broadcast;
        const stateLabel = bc.state === 'LIVE' ? '🔴 LIVE' : '⏹ Ended';
        parts.push(`${indent}**${stateLabel}: ${bc.title}** by @${bc.broadcaster.username}`);
        if (bc.stream?.url) {
            parts.push(`${indent}[Watch Stream](${bc.stream.url})`);
        } else {
            parts.push(`${indent}[Watch Broadcast](${bc.url})`);
        }
    }

    // Use media.all as fallback if specific arrays weren't populated
    if (!parts.length && media.all?.length) {
        for (const m of media.all) {
            if (m.type === 'photo') {
                parts.push(`${indent}![](${m.url})`);
            } else if (m.type === 'video' || m.type === 'gif') {
                parts.push(`${indent}[Video](${m.url})`);
            }
        }
    }

    return parts.length ? '\n\n' + parts.join('\n\n') : '';
}

function formatDuration(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return mins > 0 ? `${mins}m${secs.toString().padStart(2, '0')}s` : `${secs}s`;
}

// ─── Quote Tweet Rendering ──────────────────────────────────────────────────

function renderQuote(quote: FxTweet): string {
    const qAuthor = quote.author?.name || '';
    const qHandle = quote.author?.screen_name || '';
    const qUrl = quote.url || `https://x.com/${qHandle}/status/${quote.id}`;

    let content = `> **${qAuthor}** ([@${qHandle}](https://x.com/${qHandle})):`;

    // Quote text
    const qText = expandTweetText(quote);
    if (qText) {
        content += '\n> \n' + qText.split('\n').map(line => `> ${line}`).join('\n');
    }

    // Quote media
    const qMedia = renderMedia(quote.media, '> ');
    if (qMedia) {
        content += qMedia;
    }

    // Link to original
    content += `\n>\n> [View original](${qUrl})`;

    return content;
}

// ─── Poll Rendering ─────────────────────────────────────────────────────────

function renderPoll(poll: FxPoll): string {
    let content = '\n\n📊 **Poll:**';
    for (const c of poll.choices) {
        const bar = '█'.repeat(Math.round(c.percentage / 5)) + '░'.repeat(20 - Math.round(c.percentage / 5));
        content += `\n- ${c.label}: ${bar} ${c.percentage}% (${c.count.toLocaleString()} votes)`;
    }
    content += `\n- **Total votes:** ${poll.total_votes.toLocaleString()}`;
    if (poll.time_left_en) {
        content += ` · ${poll.time_left_en}`;
    } else if (poll.ends_at) {
        content += ` · Ends: ${poll.ends_at}`;
    }
    return content;
}

// ─── Engagement Stats ───────────────────────────────────────────────────────

function renderEngagement(tweet: FxTweet): string {
    const parts: string[] = [];
    if (tweet.likes != null) parts.push(`❤️ ${tweet.likes.toLocaleString()}`);
    if (tweet.retweets != null) parts.push(`🔁 ${tweet.retweets.toLocaleString()}`);
    if (tweet.replies != null) parts.push(`💬 ${tweet.replies.toLocaleString()}`);
    if (tweet.views != null) parts.push(`👁 ${tweet.views.toLocaleString()}`);
    if (tweet.bookmarks != null) parts.push(`🔖 ${tweet.bookmarks.toLocaleString()}`);
    return parts.length ? '\n\n---\n' + parts.join(' · ') : '';
}

// ─── Main Tweet Fetcher ─────────────────────────────────────────────────────

/**
 * Fetch tweet via FxTwitter API and convert to rich Markdown.
 */
async function fetchTweetData(url: string): Promise<ConvertResult> {
    const parsed = parseTweetUrl(url);
    if (!parsed) throw new Error('Invalid X/Twitter URL');

    const apiUrl = `https://api.fxtwitter.com/${parsed.username}/status/${parsed.tweetId}`;

    const response = await fetch(apiUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; DefuddleWorker/1.0)' },
    });

    if (!response.ok) {
        throw new Error(`FxTwitter API error: ${response.status}`);
    }

    const data = await response.json() as { tweet?: FxTweet };
    const tweet = data.tweet;
    if (!tweet) throw new Error('Tweet not found');

    let content = '';
    let title = '';
    let description = '';

    // ── Replying-to context ──
    if (tweet.replying_to?.screen_name) {
        content += `*Replying to [@${tweet.replying_to.screen_name}](https://x.com/${tweet.replying_to.screen_name})*\n\n`;
    }

    // ── X Article (long-form DraftJS content) ──
    if (tweet.article?.content?.blocks) {
        const article = tweet.article;
        title = article.title || '';
        description = article.preview_text || '';

        // Article cover media — resolve from media_info or direct url
        const coverUrl = article.cover_media?.media_info?.original_img_url || article.cover_media?.url;
        if (coverUrl) {
            content += `![Cover](${coverUrl})\n\n`;
        }

        const blocks = article.content.blocks;
        const rawEntityMap = article.content.entityMap;
        const mediaEntities = article.media_entities || [];

        // Normalize entityMap: FxTwitter may return it as an array of {key, value}
        // instead of a Record<string, Entity>. Convert to Record for consistent access.
        let entityMap: Record<string, DraftEntity>;
        if (Array.isArray(rawEntityMap)) {
            entityMap = {};
            for (const entry of rawEntityMap as any[]) {
                const key = String(entry.key ?? entry.index ?? '');
                entityMap[key] = entry.value ?? entry;
            }
        } else {
            entityMap = rawEntityMap || {};
        }

        content += blocksToMarkdown(blocks, entityMap, mediaEntities);
    } else {
        // ── Regular tweet ──
        content += expandTweetText(tweet);
        title = '';
        description = (tweet.text || '').slice(0, 200);
    }

    // ── Media ──
    content += renderMedia(tweet.media);

    // ── Quote tweet ──
    if (tweet.quote) {
        content += '\n\n' + renderQuote(tweet.quote);
    }

    // ── Poll ──
    if (tweet.poll) {
        content += renderPoll(tweet.poll);
    }

    // ── Community note ──
    if (tweet.community_note?.text) {
        content += '\n\n> [!NOTE] **Community Note**\n> ' + tweet.community_note.text.split('\n').join('\n> ');
    }

    // ── Engagement stats ──
    content += renderEngagement(tweet);

    const authorName = tweet.author?.name || '';
    const authorHandle = tweet.author?.screen_name || '';
    const displayTitle = title || `${authorName} (@${authorHandle})`;

    return {
        title: displayTitle,
        author: `${authorName} (@${authorHandle})`,
        published: tweet.created_at || '',
        description,
        domain: 'x.com',
        content,
        wordCount: content.split(/\s+/).filter(Boolean).length,
        source: url,
        image: tweet.author?.avatar_url || undefined,
        likes: tweet.likes,
        retweets: tweet.retweets,
        replies: tweet.replies,
        views: tweet.views,
    };
}

// ─── Regular Web Page Parser ────────────────────────────────────────────────

async function fetchAndParse(targetUrl: string, cookies?: string): Promise<ConvertResult> {
    const headers: Record<string, string> = {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    };
    if (cookies) {
        headers['Cookie'] = cookies;
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

    // Stub missing APIs for defuddle
    const doc = document as any;
    if (!doc.styleSheets) doc.styleSheets = [];
    if (doc.defaultView && !doc.defaultView.getComputedStyle) {
        doc.defaultView.getComputedStyle = () => ({ display: '' });
    }

    const defuddle = new Defuddle(document as any, {
        url: targetUrl,
    });
    const result = defuddle.parse();

    // Convert extracted HTML to Markdown via Turndown
    const turndown = new TurndownService({
        headingStyle: 'atx',
        codeBlockStyle: 'fenced',
        bulletListMarker: '-',
        hr: '---',
    });

    // Override Turndown's default escape to avoid adding backslashes before
    // hyphens at the start of lines. The default escapes include /^-/g → '\-'
    // which corrupts output like "- list item" into "\- list item".
    const defaultEscape = turndown.escape.bind(turndown);
    turndown.escape = function (str: string) {
        const escaped = defaultEscape(str);
        // Remove the backslash that Turndown adds before leading hyphens
        return escaped.replace(/^\\-/gm, '-');
    };

    // Override list item rule to collapse "loose lists" (li > p) into "tight lists".
    // Many CMSes (Substack, WordPress, etc.) wrap <li> content in <p> tags, causing
    // Turndown to produce double-spaced list items. This strips the extra newlines.
    turndown.addRule('tightListItem', {
        filter: 'li',
        replacement: function (content: string, node: any, options: any) {
            // Strip leading/trailing newlines and collapse multiple newlines
            // added by inner <p> blocks into single newlines (tight list)
            content = content
                .replace(/^\n+/, '')
                .replace(/\n+$/, '')
                .replace(/\n\n+/g, '\n');

            const parent = node.parentNode;
            const isOrdered = parent && parent.nodeName === 'OL';
            let prefix = options.bulletListMarker + ' ';

            if (isOrdered) {
                const start = parent.getAttribute('start');
                const index = Array.prototype.indexOf.call(parent.children, node);
                prefix = (start ? Number(start) + index : index + 1) + '. ';
            }

            // Indent continuation lines
            if (content.includes('\n')) {
                content = content.replace(/\n/gm, '\n' + ' '.repeat(prefix.length));
            }

            return prefix + content + (node.nextSibling ? '\n' : '');
        },
    });

    // Custom image rule: omit title when it duplicates alt text
    turndown.addRule('imageNoRedundantTitle', {
        filter: 'img',
        replacement: function (_content: string, node: any) {
            const alt = (node.getAttribute('alt') || '').replace(/(\n+\s*)+/g, '\n');
            const src = node.getAttribute('src') || '';
            if (!src) return '';
            const title = (node.getAttribute('title') || '').replace(/(\n+\s*)+/g, '\n');
            // Skip title if it's the same as alt text
            const titlePart = title && title !== alt ? ` "${title}"` : '';
            return `![${alt}](${src}${titlePart})`;
        },
    });

    // Custom link rule: when <a> wraps only an <img>, produce [![alt](img)](href)
    // instead of broken [\n\n![alt](img)\n\n](href)
    turndown.addRule('linkedImage', {
        filter: function (node: any) {
            return (
                node.nodeName === 'A' &&
                node.getAttribute('href') &&
                node.querySelector &&
                node.querySelector('img') &&
                // Only apply when the link's meaningful content is just the image
                node.textContent.trim() === ''
            );
        },
        replacement: function (_content: string, node: any) {
            const href = (node.getAttribute('href') || '').replace(/([()])/g, '\\$1');
            const img = node.querySelector('img');
            if (!img) return '';
            const alt = (img.getAttribute('alt') || '').replace(/(\n+\s*)+/g, '\n');
            const src = img.getAttribute('src') || '';
            if (!src) return '';
            return `[![${alt}](${src})](${href})`;
        },
    });

    const markdown = turndown.turndown(result.content || '');

    return {
        title: result.title || '',
        author: result.author || '',
        published: result.published || '',
        description: result.description || '',
        domain: result.domain || '',
        content: markdown,
        wordCount: result.wordCount || 0,
        source: targetUrl,
        favicon: result.favicon,
        image: result.image,
        site: result.site,
    };
}

// ─── Public API ─────────────────────────────────────────────────────────────

export async function convertToMarkdown(targetUrl: string, cookies?: string): Promise<ConvertResult> {
    if (isXUrl(targetUrl)) {
        return fetchTweetData(targetUrl);
    }
    return fetchAndParse(targetUrl, cookies);
}

export function formatResponse(result: ConvertResult, targetUrl?: string): string {
    const frontmatter: string[] = ['---'];

    if (result.title) {
        frontmatter.push(`title: "${result.title.replace(/"/g, '\\"')}"`);
    }
    if (result.author) {
        frontmatter.push(`author: "${result.author.replace(/"/g, '\\"')}"`);
    }
    if (result.published) {
        frontmatter.push(`published: ${result.published}`);
    }
    frontmatter.push(`source: "${result.source}"`);
    if (result.domain) {
        frontmatter.push(`domain: "${result.domain}"`);
    }
    if (result.description) {
        frontmatter.push(`description: "${result.description.replace(/"/g, '\\"')}"`);
    }
    if (result.wordCount) {
        frontmatter.push(`word_count: ${result.wordCount}`);
    }
    // Engagement stats (X/Twitter)
    if (result.likes != null) frontmatter.push(`likes: ${result.likes}`);
    if (result.retweets != null) frontmatter.push(`retweets: ${result.retweets}`);
    if (result.replies != null) frontmatter.push(`replies: ${result.replies}`);
    if (result.views != null) frontmatter.push(`views: ${result.views}`);

    frontmatter.push('---');

    return frontmatter.join('\n') + '\n\n' + result.content;
}
