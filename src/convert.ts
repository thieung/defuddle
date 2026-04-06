/** Orchestrator: routes URLs to the appropriate extractor */

import type { ConvertResult, ConvertOptions } from './convert-types';
import { isXUrl, fetchTweetData } from './x-twitter-fetcher';
import { isFacebookUrl, fetchFacebookPost } from './facebook-fetcher';
import { fetchAndParse } from './web-page-extractor';

export type { ConvertResult, ConvertOptions } from './convert-types';

export async function convertToMarkdown(targetUrl: string, options?: ConvertOptions): Promise<ConvertResult> {
    if (isXUrl(targetUrl)) {
        return fetchTweetData(targetUrl);
    }
    if (isFacebookUrl(targetUrl)) {
        return fetchFacebookPost(targetUrl);
    }
    return fetchAndParse(targetUrl, options);
}

export function formatResponse(result: ConvertResult): string {
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
    if (result.language) {
        frontmatter.push(`language: "${result.language}"`);
    }
    if (result.likes != null) frontmatter.push(`likes: ${result.likes}`);
    if (result.retweets != null) frontmatter.push(`retweets: ${result.retweets}`);
    if (result.replies != null) frontmatter.push(`replies: ${result.replies}`);
    if (result.views != null) frontmatter.push(`views: ${result.views}`);

    frontmatter.push('---');

    return frontmatter.join('\n') + '\n\n' + result.content;
}
