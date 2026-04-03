// ============================================================
// services/youtube.js — YouTube Data API v3 Service
// ============================================================
// Responsibilities:
//   1. Search YouTube for AI-related videos (last 48 hours)
//   2. Deduplicate results across 6 search queries
//   3. Fetch view counts via the videos/statistics endpoint
//   4. Sort by viewCount descending → return top 10
// ============================================================

const axios = require('axios');

// ── Constants ────────────────────────────────────────────────
const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3';

// The 6 AI-focused search topics to monitor
const SEARCH_QUERIES = [
  'AI agent tutorial',
  'AI app development',
  'AI game development',
  'AI automation tools',
  'build app using AI',
  'no code AI agent',
];

// ── Helper: Get ISO timestamp for 48 hours ago ───────────────
function getPublishedAfter() {
  const date = new Date();
  date.setHours(date.getHours() - 48);
  return date.toISOString(); // e.g. "2024-01-01T00:00:00.000Z"
}

// ── Step 1: Search YouTube for a single query ─────────────────
// Returns array of { videoId, title, channelTitle, publishedAt, thumbnail }
async function searchVideos(query, apiKey, publishedAfter) {
  try {
    const response = await axios.get(`${YOUTUBE_API_BASE}/search`, {
      params: {
        part: 'snippet',
        q: query,
        type: 'video',
        order: 'date',           // most recent first
        publishedAfter,          // only videos from last 48 hours
        maxResults: 50,          // fetch max per query
        key: apiKey,
      },
    });

    return response.data.items.map((item) => ({
      videoId: item.id.videoId,
      title: item.snippet.title,
      channelTitle: item.snippet.channelTitle,
      publishedAt: item.snippet.publishedAt,
      thumbnail:
        item.snippet.thumbnails?.high?.url ||
        item.snippet.thumbnails?.medium?.url ||
        item.snippet.thumbnails?.default?.url ||
        '',
    }));
  } catch (error) {
    console.error(`❌ Search failed for query "${query}":`, error.response?.data?.error?.message || error.message);
    return [];
  }
}

// ── Step 2: Fetch statistics for a batch of video IDs ─────────
// YouTube videos endpoint accepts up to 50 IDs per call
// Returns a map: { videoId → viewCount }
async function fetchVideoStats(videoIds, apiKey) {
  const statsMap = {};

  // Process in batches of 50 (API limit)
  const batchSize = 50;
  for (let i = 0; i < videoIds.length; i += batchSize) {
    const batch = videoIds.slice(i, i + batchSize);

    try {
      const response = await axios.get(`${YOUTUBE_API_BASE}/videos`, {
        params: {
          part: 'statistics',
          id: batch.join(','),
          key: apiKey,
        },
      });

      for (const item of response.data.items) {
        statsMap[item.id] = parseInt(item.statistics.viewCount || '0', 10);
      }
    } catch (error) {
      console.error('❌ Failed to fetch video stats:', error.response?.data?.error?.message || error.message);
    }
  }

  return statsMap;
}

// ── Main Export: fetchTopVideos ───────────────────────────────
// Orchestrates all steps and returns the top 10 videos by view count
async function fetchTopVideos() {
  const apiKey = process.env.YOUTUBE_API_KEY;

  if (!apiKey) {
    throw new Error('YOUTUBE_API_KEY is not set in environment variables.');
  }

  const publishedAfter = getPublishedAfter();
  console.log(`\n📅 Fetching videos published after: ${publishedAfter}`);
  console.log(`🔍 Running ${SEARCH_QUERIES.length} search queries...\n`);

  // ── Step 1: Search all 6 queries in parallel ─────────────
  const searchResults = await Promise.all(
    SEARCH_QUERIES.map((query) => {
      console.log(`  ↳ Searching: "${query}"`);
      return searchVideos(query, apiKey, publishedAfter);
    })
  );

  // ── Step 2: Merge all results into one flat array ─────────
  const allVideos = searchResults.flat();
  console.log(`\n✅ Total raw results fetched: ${allVideos.length}`);

  // ── Step 3: Deduplicate by videoId ────────────────────────
  const seen = new Set();
  const uniqueVideos = allVideos.filter((video) => {
    if (seen.has(video.videoId)) return false;
    seen.add(video.videoId);
    return true;
  });
  console.log(`🔄 After deduplication: ${uniqueVideos.length} unique videos`);

  if (uniqueVideos.length === 0) {
    console.warn('⚠️  No videos found. Check your API key or quota.');
    return [];
  }

  // ── Step 4: Fetch view counts for all unique videos ───────
  const videoIds = uniqueVideos.map((v) => v.videoId);
  console.log(`📊 Fetching view counts for ${videoIds.length} videos...`);
  const statsMap = await fetchVideoStats(videoIds, apiKey);

  // ── Step 5: Attach viewCount to each video ────────────────
  const videosWithStats = uniqueVideos.map((video) => ({
    ...video,
    viewCount: statsMap[video.videoId] || 0,
    videoUrl: `https://www.youtube.com/watch?v=${video.videoId}`,
  }));

  // ── Step 6: Sort by viewCount descending ──────────────────
  videosWithStats.sort((a, b) => b.viewCount - a.viewCount);

  // ── Step 7: Return top 10 ─────────────────────────────────
  const top10 = videosWithStats.slice(0, 10);

  console.log('\n🏆 Top 10 videos by view count:');
  top10.forEach((v, i) => {
    console.log(`  ${i + 1}. [${v.viewCount.toLocaleString()} views] ${v.title}`);
  });

  return top10;
}

module.exports = { fetchTopVideos };
