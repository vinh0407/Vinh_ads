import { NextRequest, NextResponse } from 'next/server';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const rawUrl = body?.url?.trim();

    if (!rawUrl) {
      return NextResponse.json({ success: false, error: 'URL không được để trống' }, { status: 400 });
    }

    let finalUrl = rawUrl;
    let shopId = '';
    let itemId = '';
    let shopName = '';
    let urlTitle = '';

    // 1. Follow HTTP redirect if short link (e.g. s.shopee.vn / shp.ee)
    try {
      const redirectRes = await fetch(rawUrl, {
        redirect: 'follow',
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          Accept:
            'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
          'Accept-Language': 'vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7',
        },
      });
      finalUrl = redirectRes.url || rawUrl;

      const urlObj = new URL(finalUrl);
      const cleanPath = urlObj.pathname;
      const pathParts = cleanPath.split('/').filter(Boolean);

      // Extract IDs: /product/137184188/23073213252 or /name-i.137184188.23073213252
      const iMatch = cleanPath.match(/-i\.(\d+)\.(\d+)/);
      const numMatch = cleanPath.match(/\/(\d+)\/(\d+)/);

      if (iMatch) {
        shopId = iMatch[1];
        itemId = iMatch[2];
      } else if (numMatch) {
        shopId = numMatch[1];
        itemId = numMatch[2];
      }

      if (pathParts.length > 0 && !pathParts[0].startsWith('gP') && pathParts[0] !== 'product') {
        shopName = decodeURIComponent(pathParts[0].replace(/-/g, ' '));
        if (cleanPath.includes('-i.')) {
          urlTitle = decodeURIComponent(pathParts[0].replace(/-/g, ' '));
        }
      }
    } catch (e) {
      console.warn('Redirect error in resolve-shopee:', e);
    }

    // 2. Try DuckDuckGo search fallback for indexed title if slug is opaque
    let searchTitle = urlTitle;
    if (!searchTitle) {
      try {
        const cleanLink = finalUrl.split('?')[0];
        const ddgRes = await fetch(
          `https://html.duckduckgo.com/html/?q=${encodeURIComponent(cleanLink)}`,
          {
            headers: {
              'User-Agent':
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
            },
          }
        );
        const ddgHtml = await ddgRes.text();
        const titleRegex = /<h2 class="result__title">[\s\S]*?<a[^>]*class="result__a"[^>]*>([\s\S]*?)<\/a>/gi;
        let m;
        while ((m = titleRegex.exec(ddgHtml)) !== null) {
          const t = m[1].replace(/<[^>]+>/g, '').trim();
          const lower = t.toLowerCase();
          if (
            t &&
            !lower.includes('shopee') &&
            !lower.includes('đăng nhập') &&
            !lower.includes('shopping platform') &&
            !lower.includes('leading online') &&
            t.length > 8
          ) {
            searchTitle = t.replace(/\|\s*Shopee.*$/i, '').trim();
            break;
          }
        }
      } catch (e) {
        console.warn('DDG lookup error:', e);
      }
    }

    // 3. Enrich with Gemini AI
    let productData = {
      name:
        searchTitle ||
        (shopName ? `Sản phẩm thời trang / gia dụng (${shopName})` : 'Sản phẩm Hot Shopee'),
      price: 139000,
      category: 'Thời trang & Đời sống',
      description: `Sản phẩm tiếp thị liên kết từ Shopee của gian hàng ${shopName || 'Shopee'}.`,
      keySellingPoints: ['Chất lượng cao, vải bền đẹp', 'Giá ưu đãi kèm voucher Shopee', 'Giao hàng nhanh'],
      suggestedVoiceoverHook: 'Đừng bỏ lỡ deal hời này hôm nay nhé!',
      suggestedComment: `🛒 Link đặt mua chính hãng săn voucher tại đây: ${rawUrl}`,
      imageUrl: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500&q=80',
      shopName: shopName || 'Shopee Store',
      shopId,
      itemId,
      resolvedUrl: finalUrl,
      affiliateUrl: rawUrl,
    };

    try {
      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;
      const prompt = `Bạn là hệ thống bóc tách thông tin sản phẩm Shopee Affiliate chuyên nghiệp.
Phân tích thông tin từ link:
- Link rút gọn: ${rawUrl}
- Link đích: ${finalUrl}
- Shop: ${shopName || 'Shopee'}
- Mã Shop: ${shopId || 'N/A'}, Mã Sản phẩm: ${itemId || 'N/A'}
${searchTitle ? `- Tiêu đề tìm thấy: ${searchTitle}` : ''}

Hãy trả về DUY NHẤT một chuỗi JSON hợp lệ (không kèm markdown \`\`\`json) theo cấu trúc:
{
  "name": "Tên sản phẩm đầy đủ chuẩn tiếng Việt và thu hút người mua",
  "price": 139000,
  "category": "DUY NHẤT chọn 1 trong 8 danh mục chính xác: 'Điện Tử & Công Nghệ', 'Học Tập & Sách Vở', 'Thời Trang & Phụ Kiện', 'Mẹ & Bé', 'Gia Dụng & Đời Sống', 'Sức Khỏe & Sắc Đẹp', 'Thể Thao & Dã Ngoại', 'Khác'",
  "description": "Mô tả ngắn về sản phẩm, chất liệu, tính năng nổi bật",
  "keySellingPoints": ["Điểm nổi bật 1", "Điểm nổi bật 2", "Điểm nổi bật 3"],
  "suggestedVoiceoverHook": "Câu mở đầu video 3s giật gân thu hút người xem",
  "suggestedComment": "Nội dung bình luận tự động ghim kèm link mua",
  "imageUrl": "https://images.unsplash.com/photo-..."
}`;

      const gRes = await fetch(geminiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
        }),
      });

      const gData = await gRes.json();
      if (gData.candidates && gData.candidates[0]?.content?.parts?.[0]?.text) {
        let rawText = gData.candidates[0].content.parts[0].text.trim();
        rawText = rawText.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim();
        const parsed = JSON.parse(rawText);
        productData = {
          ...productData,
          ...parsed,
          name: searchTitle || parsed.name || productData.name,
          resolvedUrl: finalUrl,
          affiliateUrl: rawUrl,
          shopName: shopName || productData.shopName,
          shopId,
          itemId,
        };
      }
    } catch (err) {
      console.warn('Gemini enrichment error in route:', err);
    }

    return NextResponse.json({
      success: true,
      data: productData,
    });
  } catch (error: any) {
    console.error('Error resolving Shopee URL:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Không thể bóc tách link Shopee' },
      { status: 500 }
    );
  }
}
