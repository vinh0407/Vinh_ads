import { NextRequest, NextResponse } from 'next/server';

export interface LiveNewsItem {
  id: string;
  title: string;
  url: string;
  summary: string;
  category: "THOI_SU" | "PHAP_LUAT" | "THE_THAO" | "THE_GIOI" | "CONG_NGHE" | "KINH_TE" | "XA_HOI";
  categoryLabel: string;
  source: string;
  publishedAt: string;
  pubDateTimestamp?: number;
  thumbnailUrl: string;
  contextCause?: string;
  keyFacts?: string[];
  impactConclusion?: string;
}

const RSS_SOURCES = [
  { source: "VnExpress", category: "THOI_SU", categoryLabel: "Thời Sự & Chính Trị", url: "https://vnexpress.net/rss/thoi-su.rss" },
  { source: "VnExpress", category: "CONG_NGHE", categoryLabel: "Công Nghệ & AI", url: "https://vnexpress.net/rss/so-hoa.rss" },
  { source: "Báo Tuổi Trẻ", category: "THOI_SU", categoryLabel: "Thời Sự & Chính Trị", url: "https://tuoitre.vn/rss/thoi-su.rss" },
  { source: "Báo Thanh Niên", category: "THE_GIOI", categoryLabel: "Thế Giới & Quốc Tế", url: "https://thanhnien.vn/rss/the-gioi.rss" },
  { source: "Báo Dân Trí", category: "THE_THAO", categoryLabel: "Thể Thao & Giải Đấu", url: "https://dantri.com.vn/rss/the-thao.rss" },
  { source: "Báo Công An (CAND)", category: "PHAP_LUAT", categoryLabel: "An Ninh & Pháp Luật", url: "https://cand.com.vn/rss/home.rss" },
  { source: "Báo Tiền Phong", category: "XA_HOI", categoryLabel: "Lao Động & Xã Hội", url: "https://tienphong.vn/rss/home.rss" },
  { source: "CafeF", category: "KINH_TE", categoryLabel: "Kinh Tế & Tài Chính", url: "https://cafef.vn/home.rss" },
  { source: "VietNamNet", category: "THE_GIOI", categoryLabel: "Thế Giới & Quốc Tế", url: "https://vietnamnet.vn/rss/the-gioi.rss" },
  { source: "GenK", category: "CONG_NGHE", categoryLabel: "Công Nghệ & AI", url: "https://genk.vn/rss/home.rss" },
  { source: "Znews", category: "THOI_SU", categoryLabel: "Thời Sự & Chính Trị", url: "https://znews.vn/rss/thoi-su.rss" },
];

// In-memory cache for 30 minutes
let cachedNews: LiveNewsItem[] = [];
let lastFetchTime = 0;
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

function cleanText(input: string): string {
  if (!input) return '';
  return input
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/gi, '$1')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .trim();
}

function extractThumbnail(itemXml: string): string {
  const imgMatch = itemXml.match(/src=["'](https?:\/\/[^"']+\.(?:jpg|jpeg|png|webp)[^"']*)["']/i);
  if (imgMatch) return imgMatch[1];
  
  const enclosureMatch = itemXml.match(/<enclosure[^>]*url=["']([^"']+)["']/i);
  if (enclosureMatch) return enclosureMatch[1];
  
  const mediaMatch = itemXml.match(/<media:content[^>]*url=["']([^"']+)["']/i);
  if (mediaMatch) return mediaMatch[1];
  
  return "https://images.unsplash.com/photo-1585829365295-ab7cd400c167?w=600&q=80";
}

function formatRelativeTime(dateStr: string): string {
  try {
    const pub = new Date(dateStr);
    if (isNaN(pub.getTime())) return "Mới cập nhật";
    const diffMins = Math.floor((Date.now() - pub.getTime()) / (1000 * 60));
    if (diffMins < 5) return "Vừa xong";
    if (diffMins < 60) return `${diffMins} phút trước`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} giờ trước`;
    return `${Math.floor(diffHours / 24)} ngày trước`;
  } catch {
    return "Mới cập nhật";
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const forceRefresh = searchParams.get('force') === 'true';

  const now = Date.now();
  if (!forceRefresh && cachedNews.length > 0 && now - lastFetchTime < CACHE_TTL_MS) {
    return NextResponse.json({
      success: true,
      cached: true,
      lastFetchTime: new Date(lastFetchTime).toISOString(),
      nextRefreshInMinutes: Math.ceil((CACHE_TTL_MS - (now - lastFetchTime)) / 60000),
      data: cachedNews,
    });
  }

  const allArticles: LiveNewsItem[] = [];

  await Promise.all(
    RSS_SOURCES.map(async (srcInfo) => {
      try {
        const res = await fetch(srcInfo.url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
            'Accept': 'application/xml, text/xml, */*',
          },
          next: { revalidate: 1800 },
        });

        if (!res.ok) return;
        const xmlText = await res.text();
        const items = xmlText.match(/<item>([\s\S]*?)<\/item>/gi) || [];

        items.slice(0, 3).forEach((itemXml, idx) => {
          const rawTitle = (itemXml.match(/<title>([\s\S]*?)<\/title>/i) || [])[1] || '';
          const rawLink = (itemXml.match(/<link>([\s\S]*?)<\/link>/i) || [])[1] || '';
          const rawDesc = (itemXml.match(/<description>([\s\S]*?)<\/description>/i) || [])[1] || '';
          const rawPubDate = (itemXml.match(/<pubDate>([\s\S]*?)<\/pubDate>/i) || [])[1] || '';

          const title = cleanText(rawTitle);
          const link = cleanText(rawLink);
          const summary = cleanText(rawDesc);
          const thumb = extractThumbnail(itemXml);

          const parsedTime = new Date(rawPubDate).getTime();
          const pubDateTimestamp = !isNaN(parsedTime) ? parsedTime : (now - idx * 600000);

          if (title && link && link.startsWith('http')) {
            allArticles.push({
              id: `live_${srcInfo.source}_${Date.now()}_${idx}_${Math.random().toString(36).substr(2, 4)}`,
              title,
              url: link,
              summary: summary.slice(0, 220) || `Tin tức thời sự nóng phát hành trực tiếp từ ${srcInfo.source}.`,
              category: srcInfo.category as LiveNewsItem['category'],
              categoryLabel: srcInfo.categoryLabel,
              source: srcInfo.source,
              publishedAt: formatRelativeTime(rawPubDate),
              pubDateTimestamp,
              thumbnailUrl: thumb,
              contextCause: `Tin tức được phát hành trực tiếp từ trang chính thống ${srcInfo.source}.`,
              keyFacts: [
                `Bài viết cập nhật trực tiếp tại ${srcInfo.source}`,
                `Thông tin chính xác, kiểm duyệt từ tòa soạn`,
                `Sẵn sàng bóc tách kịch bản AI Video ngắn`
              ],
              impactConclusion: `Cung cấp góc nhìn thời sự nhanh chóng cho người xem.`
            });
          }
        });
      } catch (err) {
        console.warn(`Error fetching RSS for ${srcInfo.source}:`, err);
      }
    })
  );

  if (allArticles.length > 0) {
    // Sort strictly by newest timestamp first (newest RSS pubDate on top)
    allArticles.sort((a, b) => (b.pubDateTimestamp || 0) - (a.pubDateTimestamp || 0));

    const uniqueMap = new Map<string, LiveNewsItem>();
    allArticles.forEach((art) => {
      if (!uniqueMap.has(art.url)) {
        uniqueMap.set(art.url, art);
      }
    });
    cachedNews = Array.from(uniqueMap.values());
    lastFetchTime = now;
  }

  return NextResponse.json({
    success: true,
    cached: false,
    lastFetchTime: new Date(lastFetchTime).toISOString(),
    nextRefreshInMinutes: 30,
    data: cachedNews,
  });
}
