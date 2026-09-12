import { NextRequest, NextResponse } from 'next/server';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { imageBase64, mimeType = 'image/jpeg', productName = '', price = 0 } = body;

    if (!imageBase64) {
      return NextResponse.json(
        { success: false, error: 'Vui lòng cung cấp dữ liệu hình ảnh (base64)' },
        { status: 400 }
      );
    }

    // Clean base64 string if it has data URL prefix (e.g. data:image/png;base64,...)
    const cleanBase64 = imageBase64.replace(/^data:[a-zA-Z0-9/+-]+;base64,/, '').trim();
    const cleanMime = mimeType || 'image/jpeg';

    const promptText = `Bạn là Giám đốc Sáng tạo Video AI hàng đầu cho TikTok, Facebook Reels và YouTube Shorts.
Hãy phân tích hình ảnh sản phẩm được gửi lên từ máy tính của người dùng ${productName ? `(Tên tham khảo: "${productName}")` : ''} và tạo kịch bản video quảng cáo 15–20 giây chuyển đổi cao.

QUY CHUẨN BẮT BUỘC:
1. Xác định chính xác: Tên sản phẩm trong ảnh, điểm bán độc nhất (USP), chất liệu, đối tượng khách hàng mục tiêu.
2. Kịch bản thoại Tiếng Việt (15–20s) chia đúng 4 phân đoạn:
   - [0–3s]: Hook giật gân, khơi gợi tò mò hoặc đánh trúng nỗi đau.
   - [3–8s]: Nêu vấn đề và giải pháp từ sản phẩm trong ảnh.
   - [8–15s]: Nêu bật 2-3 ưu điểm, chất liệu, tính năng thực tế của sản phẩm.
   - [15–20s]: Kêu gọi hành động (CTA) hướng dẫn người xem bấm vào link ở bình luận đầu tiên để nhận voucher.
3. Prompt Tiếng Anh chuẩn điện ảnh để dán vào Google Flow (Veo Video Generator):
   - Khung dọc 9:16, Cinematic commercial, realistic lighting, macro close-up, bảo toàn đúng hình ảnh/chi tiết sản phẩm trong ảnh tải lên.
4. Nội dung bình luận ghim (VinhCommant): Kêu gọi mua kèm mã freeship và voucher giảm giá.

Trả về kết quả duy nhất ở định dạng JSON thuần (không kèm markdown \`\`\`json):
{
  "productName": "Tên sản phẩm được nhận diện từ ảnh",
  "category": "Ngành hàng (vd: Thời Trang, Mẹ & Bé, Đồ Gia Dụng, Công Nghệ...)",
  "estimatedPrice": 150000,
  "mainSellingPoint": "Điểm bán độc nhất từ ảnh",
  "customerNeed": "Nhu cầu khách hàng mục tiêu",
  "bestAdvertisingAngle": "Góc tiếp cận quảng cáo hiệu quả nhất",
  "voiceover": {
    "hook_0_3s": "Câu hook 0-3s",
    "problem_3_8s": "Câu vấn đề 3-8s",
    "benefit_8_15s": "Câu lợi ích 8-15s",
    "cta_15_20s": "Câu kêu gọi 15-20s",
    "fullVoiceoverText": "Toàn bộ kịch bản đọc liền mạch"
  },
  "flowPrompt": "Prompt tiếng Anh 9:16 Cinematic mô tả sản phẩm và bối cảnh để dán vào Google Flow",
  "pinnedComment": "Nội dung bình luận ghim kêu gọi mua hàng kèm voucher"
}`;

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${GEMINI_API_KEY}`;

    const response = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: promptText },
              {
                inline_data: {
                  mime_type: cleanMime,
                  data: cleanBase64,
                },
              },
            ],
          },
        ],
      }),
    });

    const data = await response.json();

    if (!response.ok || !data?.candidates?.[0]?.content?.parts?.[0]?.text) {
      console.error('Gemini Vision Error:', JSON.stringify(data));
      throw new Error(data?.error?.message || 'Gemini không thể xử lý ảnh');
    }

    let rawJson = data.candidates[0].content.parts[0].text.trim();
    rawJson = rawJson.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim();
    const result = JSON.parse(rawJson);

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error('Analyze Image Error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Lỗi phân tích hình ảnh' },
      { status: 500 }
    );
  }
}
