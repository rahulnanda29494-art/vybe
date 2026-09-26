import {
  Clapperboard,
  Clock3,
  Compass,
  Flame,
  GraduationCap,
  Heart,
  History,
  Home,
  ListVideo,
  type LucideIcon,
  Mic,
  Music4,
  Plane,
  Radio,
  Shirt,
  Sparkles,
  Trophy,
  UtensilsCrossed,
  Cpu,
  Gamepad2,
} from 'lucide-react';

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

export interface NavGroup {
  title: string;
  items: NavItem[];
}

export const NAV: NavGroup[] = [
  {
    title: 'Discover',
    items: [
      { label: 'Home', href: '/', icon: Home },
      { label: 'Explore', href: '/explore', icon: Compass },
      { label: 'Trending', href: '/trending', icon: Flame },
      { label: 'Live', href: '/live', icon: Radio },
      { label: 'Shorts', href: '/shorts', icon: Sparkles },
    ],
  },
  {
    title: 'Your VYBE',
    items: [
      { label: 'Subscriptions', href: '/subscriptions', icon: Clapperboard },
      { label: 'History', href: '/history', icon: History },
      { label: 'Watch Later', href: '/later', icon: Clock3 },
      { label: 'Liked', href: '/liked', icon: Heart },
      { label: 'Playlists', href: '/playlists', icon: ListVideo },
    ],
  },
  {
    title: 'Categories',
    items: [
      { label: 'Music', href: '/category/music', icon: Music4 },
      { label: 'Gaming', href: '/category/gaming', icon: Gamepad2 },
      { label: 'Technology', href: '/category/tech', icon: Cpu },
      { label: 'Education', href: '/category/education', icon: GraduationCap },
      { label: 'Sports', href: '/category/sports', icon: Trophy },
      { label: 'Travel', href: '/category/travel', icon: Plane },
      { label: 'Fashion', href: '/category/fashion', icon: Shirt },
      { label: 'Food', href: '/category/food', icon: UtensilsCrossed },
      { label: 'Podcasts', href: '/category/podcasts', icon: Mic },
    ],
  },
];

export const CATEGORY_PILLS = [
  { label: 'All', href: '/' },
  { label: 'For You', href: '/?feed=for-you' },
  { label: 'Trending', href: '/trending' },
  { label: 'Music', href: '/category/music' },
  { label: 'Gaming', href: '/category/gaming' },
  { label: 'AI', href: '/category/ai' },
  { label: 'Tech', href: '/category/tech' },
  { label: 'Coding', href: '/category/coding' },
  { label: 'Sports', href: '/category/sports' },
  { label: 'Podcasts', href: '/category/podcasts' },
  { label: 'Travel', href: '/category/travel' },
  { label: 'Fashion', href: '/category/fashion' },
  { label: 'Comedy', href: '/category/comedy' },
  { label: 'Education', href: '/category/education' },
  { label: 'Food', href: '/category/food' },
];
