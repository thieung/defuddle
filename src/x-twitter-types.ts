/** FxTwitter API type definitions */

export interface FxAuthor {
    id: string;
    name: string;
    screen_name: string;
    avatar_url?: string;
    banner_url?: string;
    description?: string;
    followers?: number;
    following?: number;
}

export interface FxPhoto {
    type: 'photo';
    url: string;
    width: number;
    height: number;
    altText?: string;
}

export interface FxVideo {
    type: 'video' | 'gif';
    url: string;
    thumbnail_url: string;
    width: number;
    height: number;
    duration: number;
    format?: string;
}

export interface FxExternalMedia {
    type: 'video';
    url: string;
    thumbnail_url?: string;
    height?: number;
    width?: number;
}

export interface FxBroadcast {
    url: string;
    width: number;
    height: number;
    state: 'LIVE' | 'ENDED';
    broadcaster: { username: string; display_name: string; id: string };
    title: string;
    broadcast_id: string;
    stream?: { url: string };
}

export interface FxPollChoice {
    label: string;
    count: number;
    percentage: number;
}

export interface FxPoll {
    choices: FxPollChoice[];
    total_votes: number;
    ends_at?: string;
    time_left_en?: string;
}

export interface FxFacet {
    type: string;
    indices: [number, number];
    original?: string;
    replacement?: string;
    display?: string;
    id?: string;
}

export interface FxCommunityNote {
    text: string;
}

export interface FxMedia {
    type: string;
    url: string;
    width?: number;
    height?: number;
}

/**
 * Twitter API media entity as passed through FxTwitter for article media.
 * Contains nested media_info with actual image/video URLs.
 */
export interface FxArticleMediaEntity {
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
    url?: string;
    type?: string;
}

export interface FxArticle {
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

export interface DraftBlock {
    type: string;
    text: string;
    inlineStyleRanges: { offset: number; length: number; style: string }[];
    entityRanges: { offset: number; length: number; key: number }[];
    data?: Record<string, any>;
}

export interface DraftEntity {
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

export interface FxTweet {
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
