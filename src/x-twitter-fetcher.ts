/** Fetch tweet via FxTwitter API and convert to rich Markdown */

import type { FxTweet, DraftEntity } from './x-twitter-types';
import type { ConvertResult } from './convert-types';
import { expandTweetText } from './x-twitter-text-processor';
import { renderMedia, renderQuote, renderPoll, renderEngagement } from './x-twitter-media-renderer';
import { blocksToMarkdown } from './draftjs-to-markdown-converter';

const X_URL_PATTERN = /^https?:\/\/(x\.com|twitter\.com)\/\w+\/status\/\d+/;

export function isXUrl(url: string): boolean {
    return X_URL_PATTERN.test(url);
}

export function parseTweetUrl(url: string): { username: string; tweetId: string } | null {
    const match = url.match(/^https?:\/\/(?:x\.com|twitter\.com)\/(\w+)\/status\/(\d+)/);
    if (!match) return null;
    return { username: match[1], tweetId: match[2] };
}

export async function fetchTweetData(url: string): Promise<ConvertResult> {
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

    // Replying-to context
    if (tweet.replying_to?.screen_name) {
        content += `*Replying to [@${tweet.replying_to.screen_name}](https://x.com/${tweet.replying_to.screen_name})*\n\n`;
    }

    // X Article (long-form DraftJS content)
    if (tweet.article?.content?.blocks) {
        const article = tweet.article;
        title = article.title || '';
        description = article.preview_text || '';

        const coverUrl = article.cover_media?.media_info?.original_img_url || article.cover_media?.url;
        if (coverUrl) {
            content += `![Cover](${coverUrl})\n\n`;
        }

        const blocks = article.content.blocks;
        const rawEntityMap = article.content.entityMap;
        const mediaEntities = article.media_entities || [];

        // Normalize entityMap: FxTwitter may return array of {key, value}
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
        // Regular tweet
        content += expandTweetText(tweet);
        title = '';
        description = (tweet.text || '').slice(0, 200);
    }

    content += renderMedia(tweet.media);

    if (tweet.quote) {
        content += '\n\n' + renderQuote(tweet.quote);
    }

    if (tweet.poll) {
        content += renderPoll(tweet.poll);
    }

    if (tweet.community_note?.text) {
        content += '\n\n> [!NOTE] **Community Note**\n> ' + tweet.community_note.text.split('\n').join('\n> ');
    }

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
