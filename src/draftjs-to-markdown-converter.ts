/** Convert DraftJS-style blocks (from X articles) to Markdown */

import type { DraftBlock, DraftEntity, FxArticleMediaEntity } from './x-twitter-types';

/**
 * Normalize entity access — FxTwitter wraps entity data under .value
 * while standard DraftJS puts type/data at the top level.
 */
export function getEntityInfo(entity: DraftEntity): { type: string; data: Record<string, any> } {
    const type = (entity.value?.type || entity.type || '').toUpperCase();
    const data = entity.value?.data || entity.data || {};
    return { type, data };
}

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
export function resolveArticleMediaUrl(mediaId: string, mediaEntities: FxArticleMediaEntity[]): { url: string; type: 'image' | 'video' } | null {
    const entity = mediaEntities.find(m => m.media_id === mediaId || m.media_key === mediaId);
    if (!entity) return null;

    const info = entity.media_info;
    if (!info) {
        if (entity.url) return { url: entity.url, type: (entity.type === 'video' ? 'video' : 'image') };
        return null;
    }

    if (info.__typename === 'ApiImage' || info.original_img_url) {
        return { url: info.original_img_url!, type: 'image' };
    }

    if (info.__typename === 'ApiVideo' || info.video_info) {
        const variants = info.video_info?.variants || [];
        const mp4s = variants.filter(v => v.content_type === 'video/mp4' && v.url);
        const best = mp4s.sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0))[0];
        if (best?.url) return { url: best.url, type: 'video' };
        const any = variants.find(v => v.url);
        if (any?.url) return { url: any.url, type: 'video' };
    }

    return null;
}

/**
 * Convert DraftJS-style blocks (from X articles) to Markdown.
 * Handles headers, lists, blockquotes, code blocks, atomic entities.
 */
export function blocksToMarkdown(blocks: DraftBlock[], entityMap: Record<string, DraftEntity>, mediaEntities: FxArticleMediaEntity[] = []): string {
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
                const entityRanges = block.entityRanges || [];
                for (const range of entityRanges) {
                    const entity = entityMap[range.key];
                    if (!entity) continue;

                    const { type: entityType, data } = getEntityInfo(entity);

                    const markdown = data.markdown;
                    if (markdown) {
                        lines.push(markdown);
                        continue;
                    }

                    if (entityType === 'MEDIA') {
                        const mediaItems: any[] = data.mediaItems || [];
                        for (const item of mediaItems) {
                            const mediaId = item.mediaId || item.media_id || '';
                            if (!mediaId) continue;
                            const resolved = resolveArticleMediaUrl(mediaId, mediaEntities);
                            if (resolved) {
                                lines.push(resolved.type === 'image' ? `![](${resolved.url})` : `[Video](${resolved.url})`);
                            }
                        }
                        continue;
                    }

                    if (entityType === 'MARKDOWN') {
                        const code = data.markdown || data.content || '';
                        const lang = data.language || '';
                        if (code) lines.push('```' + lang + '\n' + code + '\n```');
                        continue;
                    }

                    if (entityType === 'TWEET' || entityType === 'EMBEDDED_TWEET') {
                        const tweetId = data.id || data.tweetId || '';
                        if (tweetId) lines.push(`> [Embedded Tweet](https://x.com/i/status/${tweetId})`);
                        continue;
                    }

                    if (entityType === 'IMAGE' || entityType === 'PHOTO') {
                        const url = data.src || data.url || '';
                        const alt = data.alt || data.altText || '';
                        if (url) lines.push(`![${alt}](${url})`);
                        continue;
                    }

                    if (entityType === 'VIDEO') {
                        const url = data.src || data.url || '';
                        if (url) lines.push(`[Video](${url})`);
                        continue;
                    }
                }
                break;
            }
            default:
                lines.push(text);
                break;
        }
    }

    return lines.join('\n\n');
}
