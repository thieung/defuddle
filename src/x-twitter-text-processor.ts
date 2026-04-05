/** Expand t.co shortened URLs in tweet text using raw_text facets */

import type { FxTweet } from './x-twitter-types';

/**
 * Expand t.co shortened URLs in tweet text using raw_text facets.
 * Falls back to original text if no facets available.
 */
export function expandTweetText(tweet: FxTweet): string {
    if (!tweet.raw_text?.facets?.length) {
        return tweet.text || '';
    }

    const { text, facets } = tweet.raw_text;

    // Convert string to array of code points for correct Unicode handling
    const chars = [...text];
    let result = '';
    let lastIndex = 0;

    const sorted = [...facets].sort((a, b) => a.indices[0] - b.indices[0]);

    for (const facet of sorted) {
        const [start, end] = facet.indices;

        result += chars.slice(lastIndex, start).join('');

        const originalSegment = chars.slice(start, end).join('');

        if (facet.type === 'url' && facet.display) {
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

    result += chars.slice(lastIndex).join('');

    return result;
}
