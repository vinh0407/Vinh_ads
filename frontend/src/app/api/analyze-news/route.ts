import { NextRequest, NextResponse } from 'next/server';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const rawUrl = body?.url?.trim();

    if (!rawUrl) {
      return NextResponse.json(
        { success: false, error: 'Vui lòng nhập đường link bài viết hoặc tin tức cần phân tích' },
        { status: 400 }
      );
    }

    let domain = 'Internet';
    try {
      const parsed = new URL(rawUrl);
      domain = parsed.hostname.replace(/^www\./, '');
    } catch {
      domain = 'Báo chí & MXH';
    }

    let title = '';
    let description = '';
    let content = '';
    let thumbnailUrl = '';

    // 1. Fetch live content from URL
    try {
      const fetchRes = await fetch(rawUrl, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          Accept:
            'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
          'Accept-Language': 'vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7',
        },
      });

      if (fetchRes.ok) {
        const html = await fetchRes.text();

        const ogTitle = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i);
        const titleTag = html.match(/<title[^>]*>([^<]+)<\/title>/i);
        const h1Tag = html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
        title = (ogTitle ? ogTitle[1] : (h1Tag ? h1Tag[1] : (titleTag ? titleTag[1] : ''))).trim();

        const ogDesc = html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["']/i);
        const metaDesc = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i);
        description = (ogDesc ? ogDesc[1] : (metaDesc ? metaDesc[1] : '')).trim();

        const ogImg = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i);
        thumbnailUrl = ogImg ? ogImg[1] : '';

        // Extract paragraphs
        const pMatches = html.match(/<p[^>]*>([\s\S]*?)<\/p>/gi) || [];
        const pTexts = pMatches
          .map((p) => p.replace(/<[^>]+>/g, '').trim())
          .filter(
            (t) =>
              t.length > 20 &&
              !t.toLowerCase().includes('cookie') &&
              !t.toLowerCase().includes('copyright') &&
              !t.toLowerCase().includes('điều khoản')
          );
        content = pTexts.slice(0, 12).join('\n\n');
      }
    } catch (err: any) {
      console.warn('Article fetch warning:', err.message);
    }

    if (!title && !content) {
      title = `Tin tức từ ${domain}`;
      description = `Nội dung tổng hợp từ liên kết: ${rawUrl}`;
      content = `Chủ đề bài viết liên kết: ${rawUrl}. Đang cập nhật nội dung tự động từ ${domain}.`;
    }

    // 2. Call Gemini 3.6 Flash to analyze & generate TikTok script
    const prompt = `Bạn là Chuyên gia Phân tích Tin tức Viral và Giám đốc Sản xuất Video Ngắn (TikTok, Reels, Shorts).
Hãy phân tích nội dung bài viết sau:
- Đường link: ${rawUrl}
- Nguồn: ${domain}
- Tiêu đề gốc: ${title}
- Tóm tắt gốc: ${description}
- Nội dung trích xuất: ${content.slice(0, 2500)}

QUY CHUẨN ĐẦU RA:
1. Tóm tắt cốt lõi, lý do quan trọng, tác động và 3 sự thật nổi bật.
2. Viết kịch bản video TikTok 15–20s (hoặc 30-40s) giật gân, ngôn ngữ tự nhiên, chia rõ:
   - Hook (0-3s): Giật gân, khơi gợi tò mò hoặc đánh trúng tâm lý đám đông.
   - Bối cảnh tin tức (3-8s): Tóm tắt sự việc một cách súc tích, dễ hiểu.
   - Phân tích & Góc nhìn (8-15s): Đưa ra góc nhìn sâu sắc, tại sao mọi người cần quan tâm.
   - Nhận định & Kêu gọi (15-20s): Nhận định cá nhân và kêu gọi xem thêm / kiểm tra link ở bình luận đầu tiên.
3. Đề xuất sản phẩm Shopee Affiliate phù hợp để gán vào bình luận (Ví dụ: Sản phẩm thời trang, công nghệ, gia dụng, hoặc link Shopee Affiliate sẵn có: https://s.shopee.vn/gPxzs7jlZ).

Trả về DUY NHẤT một chuỗi JSON hợp lệ (không kèm markdown \`\`\`json):
{
  "article": {
    "title": "Tiêu đề chuẩn của bài viết",
    "description": "Mô tả ngắn gọn về bài viết",
    "content": "Nội dung tóm tắt chính của bài viết",
    "thumbnailUrl": "${thumbnailUrl || 'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?w=600&q=80'}",
    "sourceDomain": "${domain}",
    "author": "Tổng Hợp AI"
  },
  "analysis": {
    "title": "Tiêu đề phân tích hấp dẫn",
    "summary": "Tóm tắt cốt lõi bài viết (2-3 câu ngắn gọn)",
    "category": "Ngành hàng / Danh mục (vd: AI & Công Nghệ, Đời Sống & Tiêu Dùng, Kinh Doanh, Thời Trang...)",
    "whyItMatters": "Tại sao điều này lại quan trọng với người xem",
    "impactAnalysis": "Phân tích tác động thực tế",
    "sentiment": "Tích cực (85%) hoặc Trung lập hoặc Cảnh báo",
    "keyFacts": [
      "Sự thật quan trọng 1",
      "Sự thật quan trọng 2",
      "Sự thật quan trọng 3"
    ]
  },
  "tiktokScript": {
    "hook": "Câu mở đầu 0-3s giật gân",
    "newsContext": "Bối cảnh sự việc 3-8s",
    "analysis": "Phân tích góc nhìn 8-15s",
    "opinion": "Nhận định 15-20s",
    "callToAction": "Kêu gọi hành động và hướng dẫn bấm vào link ở bình luận đầu tiên",
    "estimatedSeconds": 20,
    "hashtags": ["#TinNong", "#Trending", "#ShopeeAffiliate"],
    "suggestedVisuals": [
      "Cảnh 1 (0-3s): Mở đầu với đồ họa tin tức giật gân hoặc biểu cảm bất ngờ",
      "Cảnh 2 (3-8s): B-roll minh họa bối cảnh thực tế sự kiện",
      "Cảnh 3 (8-15s): Đồ họa số liệu hoặc hình ảnh sản phẩm liên quan",
      "Cảnh 4 (15-20s): Mũi tên động hướng xuống bình luận ghim voucher"
    ],
    "fullScriptText": "Toàn bộ đoạn văn thoại kịch bản đọc liền mạch từ Hook đến CTA."
  },
  "matchedShopeeProduct": {
    "name": "Sản phẩm liên quan phù hợp với chủ đề bài viết",
    "price": 139000,
    "affiliateUrl": "https://s.shopee.vn/gPxzs7jlZ"
  }
}`;

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;
    const gRes = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
      }),
    });

    const gData = await gRes.json();
    if (!gRes.ok || !gData?.candidates?.[0]?.content?.parts?.[0]?.text) {
      console.error('Gemini News Analysis Error:', JSON.stringify(gData));
      throw new Error(gData?.error?.message || 'Không thể phân tích nội dung');
    }

    let rawJson = gData.candidates[0].content.parts[0].text.trim();
    rawJson = rawJson.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim();
    const result = JSON.parse(rawJson);

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error('Error analyzing news URL:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Không thể phân tích đường link này' },
      { status: 500 }
    );
  }
}
