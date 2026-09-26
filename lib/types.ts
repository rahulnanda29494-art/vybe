/**
 * Domain types. All video content on VYBE is sourced from YouTube; these
 * shapes are what the UI consumes, regardless of whether the data came
 * from the YouTube Data API or the public channel RSS feeds.
 */

export type CategoryKey =
  | 'music'
  | 'gaming'
  | 'tech'
  | 'ai'
  | 'education'
  | 'sports'
  | 'travel'
  | 'fashion'
  | 'food'
  | 'podcasts'
  | 'coding'
  | 'comedy';

export interface Channel {
  /** YouTube channel id (UC…) */
  id: string;
  title: string;
  handle?: string;
  avatar?: string;
  banner?: string;
  description?: string;
  subscribers?: number;
  videoCount?: number;
  totalViews?: number;
  category: CategoryKey;
  verified: boolean;
}

export interface Video {
  /** YouTube video id */
  id: string;
  title: string;
  description: string;
  channelId: string;
  channelTitle: string;
  channelAvatar?: string;
  channelVerified: boolean;
  publishedAt: string; // ISO
  views: number;
  likes?: number;
  comments?: number;
  durationSec?: number;
  category: CategoryKey;
  tags: string[];
  isShort: boolean;
  isLive: boolean;
  /** Concurrent viewers, live streams only. */
  liveViewers?: number;
}

export interface YtComment {
  id: string;
  author: string;
  authorAvatar?: string;
  body: string;
  likes: number;
  publishedAt: string;
  replyCount: number;
  replies: YtComment[];
  isCreator?: boolean;
}

export interface FeedSource {
  /** 'api' = YouTube Data API v3, 'rss' = public channel feeds (no key). */
  mode: 'api' | 'rss';
}
