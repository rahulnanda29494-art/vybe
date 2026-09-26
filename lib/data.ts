/**
 * Creator Studio demo analytics for the signed-in creator.
 *
 * Every video a viewer watches on VYBE comes from YouTube (see
 * server/youtube). The Studio shows the signed-in creator's *own* channel
 * stats, which would come from the YouTube Analytics API once the creator
 * connects their account over OAuth — until then it runs on this sample.
 */

export const studioViewSeries = [
  { day: 'Mon', views: 42_100, watch: 3_120 },
  { day: 'Tue', views: 51_400, watch: 3_890 },
  { day: 'Wed', views: 48_900, watch: 3_640 },
  { day: 'Thu', views: 67_300, watch: 5_120 },
  { day: 'Fri', views: 88_600, watch: 6_740 },
  { day: 'Sat', views: 102_400, watch: 8_010 },
  { day: 'Sun', views: 94_200, watch: 7_320 },
];

export const studioFollowerSeries = [
  { week: 'W1', followers: 2_940_000 },
  { week: 'W2', followers: 2_982_000 },
  { week: 'W3', followers: 3_044_000 },
  { week: 'W4', followers: 3_098_000 },
  { week: 'W5', followers: 3_162_000 },
  { week: 'W6', followers: 3_240_000 },
];

export const studioEngagement = [
  { name: 'Likes', value: 46 },
  { name: 'Comments', value: 21 },
  { name: 'Saves', value: 19 },
  { name: 'Shares', value: 14 },
];

export const studioTopVideos = [
  { id: 's1', title: 'How AI Agents Will Change Everything You Build', views: 1_800_000, likes: 96_400, hoursAgo: 4, art: 3 },
  { id: 's2', title: 'Building a Real-Time App With Zero Backend Code', views: 1_120_000, likes: 71_400, hoursAgo: 60, art: 12 },
  { id: 's3', title: 'Type Systems Are a Design Tool, Not a Chore', views: 640_000, likes: 58_200, hoursAgo: 210, art: 20 },
];

export const studioComments = [
  {
    id: 'sc1',
    author: 'Ishaan M.',
    handle: 'ishaanbuilds',
    body: 'The section on tool routing at 14:20 genuinely fixed an architecture argument my team has been having for a month.',
    hoursAgo: 3,
  },
  { id: 'sc2', author: 'nova_', handle: 'novaonline', body: 'nobody talks about how clean this edit is. the pacing never drags.', hoursAgo: 4 },
  { id: 'sc3', author: 'Dee', handle: 'deeplearns', body: 'Watched at 2x and still had to rewind twice. Dense in the best way.', hoursAgo: 6 },
  { id: 'sc4', author: 'Lena K.', handle: 'lenakay', body: 'Finally an explanation that does not assume I already know the answer.', hoursAgo: 9 },
];
