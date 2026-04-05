/** Shared types and constants for the conversion pipeline */

export const MAX_SIZE = 5 * 1024 * 1024; // 5MB

/** Options passed through the API to control extraction behavior */
export interface ConvertOptions {
    cookies?: string;
    contentSelector?: string;
    language?: string;
    includeReplies?: boolean;
}

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
    language?: string;
    // Engagement stats (X/Twitter only)
    likes?: number;
    retweets?: number;
    replies?: number;
    views?: number | null;
}
