import type { CategoryKey } from '@/lib/types';

/**
 * Curated YouTube channels that power the keyless (RSS) feed.
 * Every id below was resolved from the channel's @handle and its feed
 * verified live — do not hand-type ids. With YOUTUBE_API_KEY set, the
 * platform-wide trending/search endpoints are used in addition to these.
 */
export interface SourceChannel {
  id: string;
  handle: string;
  title: string;
  category: CategoryKey;
}

export const SOURCE_CHANNELS: SourceChannel[] = [
  { id: 'UCBJycsmduvYEL83R_U4JriQ', handle: 'mkbhd', title: 'Marques Brownlee', category: 'tech' },
  { id: 'UCXuqSBlHAE6Xw-yeJA0Tunw', handle: 'LinusTechTips', title: 'Linus Tech Tips', category: 'tech' },
  { id: 'UCsBjURrPoezykLs9EqgamOA', handle: 'Fireship', title: 'Fireship', category: 'coding' },
  { id: 'UCbfYPyITQ-7l4upoX8nvctg', handle: 'TwoMinutePapers', title: 'Two Minute Papers', category: 'ai' },
  { id: 'UCHnyfMqiRRG1u-2MsSQLbXA', handle: 'veritasium', title: 'Veritasium', category: 'education' },
  { id: 'UCsXVk37bltHxD1rDPwtNM8Q', handle: 'kurzgesagt', title: 'Kurzgesagt – In a Nutshell', category: 'education' },
  { id: 'UCYO_jab_esuFRV4b17AJtAw', handle: '3blue1brown', title: '3Blue1Brown', category: 'education' },
  { id: 'UC4eYXhJI4-7wSWc8UNRwD4A', handle: 'NPRMusic', title: 'NPR Music', category: 'music' },
  { id: 'UC2Qw1dzXDBAZPwS7zm37g8g', handle: 'ColorsxStudios', title: 'COLORS', category: 'music' },
  { id: 'UCKy1dAqELo0zrOtPkf0eTMw', handle: 'IGN', title: 'IGN', category: 'gaming' },
  { id: 'UCbu2SsF-Or3Rsn3NxqODImw', handle: 'GameSpot', title: 'GameSpot', category: 'gaming' },
  { id: 'UC-2Y8dQb0S6DtpxNgAKoJKA', handle: 'PlayStation', title: 'PlayStation', category: 'gaming' },
  { id: 'UCWJ2lWNubArHWmf3FIHbfcQ', handle: 'NBA', title: 'NBA', category: 'sports' },
  { id: 'UCpVm7bg6pXKo1Pr6k5kxG9A', handle: 'NatGeo', title: 'National Geographic', category: 'travel' },
  { id: 'UCRXiA3h1no_PFkb1JCP0yMA', handle: 'Vogue', title: 'Vogue', category: 'fashion' },
  { id: 'UCbpMy0Fg74eXXkvxJrtEn3w', handle: 'bonappetit', title: 'Bon Appétit', category: 'food' },
  { id: 'UChBEbMKI1eCcejTtmI32UEw', handle: 'JoshuaWeissman', title: 'Joshua Weissman', category: 'food' },
  { id: 'UCSHZKyawb77ixDdsGog4iWA', handle: 'lexfridman', title: 'Lex Fridman', category: 'podcasts' },
  { id: 'UCqFzWxSCi39LnW1JKFR3efg', handle: 'SaturdayNightLive', title: 'Saturday Night Live', category: 'comedy' },

  // Expanded pool — resolved from @handles and feed-verified.
  { id: 'UCXZCJLdBC09xxGZ6gcdrc6A', handle: 'OpenAI', title: 'OpenAI', category: 'ai' },
  { id: 'UCrDwWp7EBBv4NwvScIpBDOA', handle: 'anthropic-ai', title: 'Anthropic', category: 'ai' },
  { id: 'UCP7jMXSY2xbc3KCAE0MHQ-A', handle: 'GoogleDeepMind', title: 'Google DeepMind', category: 'ai' },
  { id: 'UC8butISFwT-Wl7EV0hUK0BQ', handle: 'freecodecamp', title: 'freeCodeCamp.org', category: 'coding' },
  { id: 'UC29ju8bIPH5as8OGnQzwJyA', handle: 'TraversyMedia', title: 'Traversy Media', category: 'coding' },
  { id: 'UCFbNIlppjAuEX4znoulh0Cw', handle: 'WebDevSimplified', title: 'Web Dev Simplified', category: 'coding' },
  { id: 'UCeVMnSShP_Iviwkknt83cww', handle: 'CodeWithHarry', title: 'CodeWithHarry', category: 'coding' },
  { id: 'UCa6vGFO9ty8v5KZJXQxdhaw', handle: 'JimmyKimmelLive', title: 'Jimmy Kimmel Live', category: 'comedy' },
  { id: 'UC8-Th83bH_thdKZDJCrn88g', handle: 'FallonTonight', title: 'The Tonight Show Starring Jimmy Fallon', category: 'comedy' },
  { id: 'UCqwUrj10mAEsqezcItqvwEw', handle: 'BBKiVines', title: 'BB Ki Vines', category: 'comedy' },
  { id: 'UCsooa4yRKGN_zEE8iknghZA', handle: 'TEDEd', title: 'TED-Ed', category: 'education' },
  { id: 'UCAuUUnT6oDeKwE6v1NGQxug', handle: 'TED', title: 'TED', category: 'education' },
  { id: 'UCX6b17PVsYBQ0ip5gyeme-Q', handle: 'crashcourse', title: 'CrashCourse', category: 'education' },
  { id: 'UC6nSFpj9HTCZ5t-N3Rm3-HA', handle: 'Vsauce', title: 'Vsauce', category: 'education' },
  { id: 'UC-CSyyi47VX1lD9zyeABW3w', handle: 'dhruvrathee', title: 'Dhruv Rathee', category: 'education' },
  { id: 'UCY1kMZp36IQSyNx_9h4mpCg', handle: 'MarkRober', title: 'Mark Rober', category: 'education' },
  { id: 'UCYQpzRfsIS975untuYLapbw', handle: 'GQ', title: 'GQ', category: 'fashion' },
  { id: 'UCNe161YMUykW264kFe5PWxA', handle: 'Highsnobiety', title: 'Highsnobiety', category: 'fashion' },
  { id: 'UCMyOj6fhvKFMjxUCp3b_3gA', handle: 'NickDiGiovanni', title: 'Nick DiGiovanni', category: 'food' },
  { id: 'UCJFp8uSYCjXOMnkUyb3CQ3Q', handle: 'BuzzFeedTasty', title: 'Tasty', category: 'food' },
  { id: 'UC-lHJZR3Gqxm24_Vd_AJ5Yw', handle: 'PewDiePie', title: 'PewDiePie', category: 'gaming' },
  { id: 'UC7_YxT-KID8kRbqZo7MyscQ', handle: 'markiplier', title: 'Markiplier', category: 'gaming' },
  { id: 'UCj22tfcQrWG7EMEKS0qLeEg', handle: 'CarryMinati', title: 'CarryMinati', category: 'gaming' },
  { id: 'UC5c9VlYTSvBSCaoMu_GI6gQ', handle: 'TotalGaming093', title: 'Total Gaming', category: 'gaming' },
  { id: 'UCq-Fj5jknLsUf-MWSy4_brA', handle: 'TSeries', title: 'T-Series', category: 'music' },
  { id: 'UC56gTxNs4f9xZ7Pa2i5xNzg', handle: 'SonyMusicIndia', title: 'Sony Music India', category: 'music' },
  { id: 'UCqECaJ8Gagnn7YCbPEzWH6g', handle: 'taylorswift', title: 'Taylor Swift', category: 'music' },
  { id: 'UC0C-w0YjGpqDXGB8IHb662A', handle: 'edsheeran', title: 'Ed Sheeran', category: 'music' },
  { id: 'UCiGm_E4ZwYSHV3bcW1pnSeQ', handle: 'BillieEilish', title: 'Billie Eilish', category: 'music' },
  { id: 'UC0WP5P-ufpRfjbNrmOWwLBQ', handle: 'theweeknd', title: 'The Weeknd', category: 'music' },
  { id: 'UCOmHUn--16B90oW2L6FRR3A', handle: 'BLACKPINK', title: 'BLACKPINK', category: 'music' },
  { id: 'UC3IZKseVpdzPSBaWxBxundA', handle: 'HYBELABELS', title: 'HYBE LABELS', category: 'music' },
  { id: 'UCDPM_n1atn2ijUwHd0NNRQw', handle: 'coldplay', title: 'Coldplay', category: 'music' },
  { id: 'UCSJ4gkVC6NrvII8umztf0Ow', handle: 'LofiGirl', title: 'Lofi Girl', category: 'music' },
  { id: 'UCzQUP1qoWDoEbmsQxvdjxgQ', handle: 'joerogan', title: 'The Joe Rogan Experience', category: 'podcasts' },
  { id: 'UC2D2CMWXMOVWx7giW1n3LIg', handle: 'hubermanlab', title: 'Andrew Huberman', category: 'podcasts' },
  { id: 'UCPxMZIFE856tbTfdkdjzTSQ', handle: 'BeerBiceps', title: 'BeerBiceps', category: 'podcasts' },
  { id: 'UCiWLfSweyRNmLpgEHekhoAg', handle: 'ESPN', title: 'ESPN', category: 'sports' },
  { id: 'UCpcTrCXblq78GZrTUTLWeBw', handle: 'FIFA', title: 'FIFA', category: 'sports' },
  { id: 'UCt2JXOLNxqry7B_4rRZME3Q', handle: 'ICC', title: 'ICC', category: 'sports' },
  { id: 'UCB_qr75-ydFVKSF9Dmo6izg', handle: 'Formula1', title: 'FORMULA 1', category: 'sports' },
  { id: 'UCDVYQ4Zhbm3S2dlz7P1GBDg', handle: 'NFL', title: 'NFL', category: 'sports' },
  { id: 'UCOhHO2ICt0ti9KAh-QHvttQ', handle: 'TechnicalGuruji', title: 'Technical Guruji', category: 'tech' },
  { id: 'UCsTcErHg8oDvUnTzoqsYeNw', handle: 'unboxtherapy', title: 'Unbox Therapy', category: 'tech' },
  { id: 'UCMiJRAwDNSNzuYeN2uWa0pA', handle: 'mrwhosetheboss', title: 'Mrwhosetheboss', category: 'tech' },
  { id: 'UCddiUEpeqJcYeBxX1IVBKvQ', handle: 'TheVerge', title: 'The Verge', category: 'tech' },
  { id: 'UCyEd6QBSgat5kkC6svyjudA', handle: 'MarkWiens', title: 'Mark Wiens', category: 'travel' },
  { id: 'UC0Ize0RLIbGdH5x4wI45G-A', handle: 'DrewBinsky', title: 'Drew Binsky', category: 'travel' },
];

export const sourceById = (id: string) => SOURCE_CHANNELS.find((c) => c.id === id);
export const sourceByHandle = (h: string) =>
  SOURCE_CHANNELS.find((c) => c.handle.toLowerCase() === h.replace(/^@/, '').toLowerCase());
