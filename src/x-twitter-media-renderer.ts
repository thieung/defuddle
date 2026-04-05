/** Render media, quotes, polls, and engagement stats for X/Twitter tweets */

import type { FxTweet, FxPoll } from './x-twitter-types';
import { expandTweetText } from './x-twitter-text-processor';

export function renderMedia(media: FxTweet['media'], indent = ''): string {
    if (!media) return '';

    const parts: string[] = [];

    if (media.photos?.length) {
        for (const photo of media.photos) {
            const alt = photo.altText || '';
            parts.push(`${indent}![${alt}](${photo.url})`);
        }
    }

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

    if (media.external) {
        parts.push(`${indent}[External Video](${media.external.url})`);
    }

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

export function formatDuration(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return mins > 0 ? `${mins}m${secs.toString().padStart(2, '0')}s` : `${secs}s`;
}

export function renderQuote(quote: FxTweet): string {
    const qAuthor = quote.author?.name || '';
    const qHandle = quote.author?.screen_name || '';
    const qUrl = quote.url || `https://x.com/${qHandle}/status/${quote.id}`;

    let content = `> **${qAuthor}** ([@${qHandle}](https://x.com/${qHandle})):`;

    const qText = expandTweetText(quote);
    if (qText) {
        content += '\n> \n' + qText.split('\n').map(line => `> ${line}`).join('\n');
    }

    const qMedia = renderMedia(quote.media, '> ');
    if (qMedia) {
        content += qMedia;
    }

    content += `\n>\n> [View original](${qUrl})`;

    return content;
}

export function renderPoll(poll: FxPoll): string {
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

export function renderEngagement(tweet: FxTweet): string {
    const parts: string[] = [];
    if (tweet.likes != null) parts.push(`❤️ ${tweet.likes.toLocaleString()}`);
    if (tweet.retweets != null) parts.push(`🔁 ${tweet.retweets.toLocaleString()}`);
    if (tweet.replies != null) parts.push(`💬 ${tweet.replies.toLocaleString()}`);
    if (tweet.views != null) parts.push(`👁 ${tweet.views.toLocaleString()}`);
    if (tweet.bookmarks != null) parts.push(`🔖 ${tweet.bookmarks.toLocaleString()}`);
    return parts.length ? '\n\n---\n' + parts.join(' · ') : '';
}
