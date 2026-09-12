import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenAI } from '@google/genai';

export interface NewsSummaryResult {
  title: string;
  summary: string;
  category: 'VIETNAM' | 'WORLD' | 'AI_TECH' | 'ECONOMY' | 'CRYPTO' | 'FITNESS' | 'ENTERTAINMENT';
  whyItMatters: string;
  impactAnalysis: string;
  sentiment: 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE';
  keyFacts: string[];
}

export interface TikTokScriptResult {
  hook: string;
  newsContext: string;
  analysis: string;
  opinion: string;
  callToAction: string;
  estimatedSeconds: number;
  hashtags: string[];
  suggestedVisuals: string[];
  fullScriptText: string;
}

export interface CustomerAnswerResult {
  intent: 'PRODUCT_INQUIRY' | 'PRICING' | 'SHIPPING' | 'ORDER_TRACKING' | 'COMPLAINT' | 'GREETING' | 'OTHER';
  suggestedReply: string;
  confidenceScore: number;
  matchedProductId?: string;
  requiresHumanReview: boolean;
}

export interface SocialDraftResult {
  headline: string;
  body: string;
  hashtags: string[];
  callToAction: string;
  affiliateCallout?: string;
  trendScore: number;
}

export interface ProductAdVideoScriptResult {
  productIdentified: string;
  mainSellingPoint: string;
  customerNeed: string;
  bestAdvertisingAngle: string;
  videoSpecs: {
    aspectRatio: '9:16';
    durationSeconds: number; // 15-20s
    style: string;
    musicSuggestion: string;
    soundEffects: string[];
  };
  voiceover: {
    hook_0_3s: string;
    problem_3_8s: string;
    benefit_8_15s: string;
    cta_15_20s: string;
    fullVoiceoverText: string;
  };
  subtitles: Array<{
    startTime: number;
    endTime: number;
    text: string;
  }>;
  visualTimeline: Array<{
    timeRange: string;
    description: string;
    productFocus: string;
  }>;
  rawSystemPromptUsed: string;
}

export interface SimilarProductMatchResult {
  targetKeyword: string;
  suggestedProductName: string;
  category: string;
  estimatedPriceVND: number;
  reasonForMatch: string;
  searchQueriesShopee: string[];
  repurposeScriptAngle: string;
}

@Injectable()
export class GeminiService {
  private readonly logger = new Logger(GeminiService.name);
  private aiClient: GoogleGenAI | null = null;
  private readonly modelName = 'gemini-3.6-flash';

  constructor(private readonly configService: ConfigService) {
    const apiKey =
      this.configService.get<string>('app.gemini.apiKey') ||
      process.env.GEMINI_API_KEY;

    if (apiKey && apiKey.trim()) {
      try {
        this.aiClient = new GoogleGenAI({ apiKey: apiKey.trim() });
        this.logger.log('Gemini AI Client initialized successfully');
      } catch (error) {
        this.logger.error('Failed to initialize Gemini AI Client', error);
      }
    } else {
      this.logger.warn(
        'GEMINI_API_KEY is not set. GeminiService will run in mock/fallback mode.',
      );
    }
  }

  isConfigured(): boolean {
    return this.aiClient !== null;
  }

  /**
   * Summarizes a news article, categorizes it, and extracts key facts.
   */
  async summarizeNewsArticle(article: {
    title: string;
    content: string;
    url?: string;
  }): Promise<NewsSummaryResult> {
    if (!this.aiClient) {
      return this.mockNewsSummary(article.title, article.content);
    }

    const prompt = `
Bạn là một AI phân tích tin tức và tình báo thông tin hàng đầu.
Hãy đọc kỹ bài viết sau và trích xuất thông tin có cấu trúc dưới dạng JSON thuần túy (không dùng markdown backticks json).

TIÊU ĐỀ: ${article.title}
URL: ${article.url || 'N/A'}
NỘI DUNG:
${article.content.slice(0, 10000)}

Yêu cầu định dạng JSON chính xác như sau:
{
  "title": "Tiêu đề chuẩn hóa hoặc dịch sang tiếng Việt nếu cần",
  "summary": "Tóm tắt súc tích bài viết trong 3-4 câu đầy đủ ý nghĩa",
  "category": "VIETNAM | WORLD | AI_TECH | ECONOMY | CRYPTO | FITNESS | ENTERTAINMENT",
  "whyItMatters": "Giải thích tại sao tin này quan trọng đối với độc giả trong 2 câu",
  "impactAnalysis": "Phân tích tác động ngắn hạn và dài hạn của sự kiện này",
  "sentiment": "POSITIVE | NEUTRAL | NEGATIVE",
  "keyFacts": ["Sự thật 1", "Sự thật 2", "Sự thật 3", "Sự thật 4"]
}
`;

    try {
      const response = await this.aiClient.models.generateContent({
        model: this.modelName,
        contents: prompt,
      });

      const rawText = response.text || '';
      return this.cleanAndParseJson<NewsSummaryResult>(
        rawText,
        () => this.mockNewsSummary(article.title, article.content),
      );
    } catch (error) {
      this.logger.error('Gemini summarizeNewsArticle error, falling back', error);
      return this.mockNewsSummary(article.title, article.content);
    }
  }

  /**
   * Generates a viral 9:16 TikTok/Shorts news analysis script.
   */
  async generateTikTokScript(article: {
    title: string;
    summary: string;
    whyItMatters?: string;
    keyFacts?: string[];
  }): Promise<TikTokScriptResult> {
    if (!this.aiClient) {
      return this.mockTikTokScript(article.title, article.summary);
    }

    const prompt = `
Bạn là một biên kịch sáng tạo video ngắn TikTok/Reels/Shorts triệu view với phong cách cuốn hút, tự tin, thông minh, không sáo rỗng.
Dựa vào thông tin tin tức sau đây, hãy viết một kịch bản video dọc 9:16 thời lượng khoảng 45-60 giây:

TIÊU ĐỀ: ${article.title}
TÓM TẮT: ${article.summary}
TẠI SAO QUAN TRỌNG: ${article.whyItMatters || 'N/A'}
CÁC SỰ THẬT CHÍNH: ${(article.keyFacts || []).join('; ')}

Cấu trúc kịch bản yêu cầu:
1. Hook: 1-2 câu đầu giật mình, gây tò mò trong 3 giây đầu tiên (không dùng từ ngữ phản cảm).
2. NewsContext: 3-4 câu trình bày sự việc cốt lõi, nhanh gọn, hấp dẫn.
3. Analysis: Phân tích sâu góc nhìn mới lạ, tại sao người xem cần quan tâm.
4. Opinion: Đưa ra bình luận sắc sảo, dự báo xu hướng tương lai.
5. CallToAction: Kêu gọi follow/bình luận tranh luận văn minh.

Trả về duy nhất định dạng JSON thuần túy (không dùng markdown code blocks):
{
  "hook": "Câu mở đầu giật gân",
  "newsContext": "Nội dung tin chính",
  "analysis": "Phân tích chuyên sâu",
  "opinion": "Góc nhìn bình luận sắc bén",
  "callToAction": "Lời kêu gọi hành động",
  "estimatedSeconds": 55,
  "hashtags": ["#AI", "#TinTuc", "#TikTokNews", "#CongNghe"],
  "suggestedVisuals": ["Ảnh chụp bài báo lướt nhanh", "Infographic đồ thị tăng trưởng", "Clip demo công nghệ"]
}
`;

    try {
      const response = await this.aiClient.models.generateContent({
        model: this.modelName,
        contents: prompt,
      });

      const rawText = response.text || '';
      const parsed = this.cleanAndParseJson<Partial<TikTokScriptResult>>(
        rawText,
        () => this.mockTikTokScript(article.title, article.summary),
      );

      const hook = parsed.hook || 'Bạn có biết thông tin chấn động vừa được công bố hôm nay?';
      const newsContext = parsed.newsContext || article.summary;
      const analysis = parsed.analysis || (article.whyItMatters || 'Đây là bước ngoặt lớn.');
      const opinion = parsed.opinion || 'Sự thay đổi này sẽ định hình lại thị trường.';
      const callToAction = parsed.callToAction || 'Bạn nghĩ sao về điều này? Hãy bình luận phía dưới và bấm follow để cập nhật tin mới nhất!';

      const fullScriptText = `${hook}\n\n${newsContext}\n\n${analysis}\n\n${opinion}\n\n${callToAction}`;

      return {
        hook,
        newsContext,
        analysis,
        opinion,
        callToAction,
        estimatedSeconds: parsed.estimatedSeconds || 50,
        hashtags: parsed.hashtags || ['#tintuc', '#congnghe', '#xuhuong'],
        suggestedVisuals: parsed.suggestedVisuals || ['Hình ảnh minh họa bài báo', 'Text chữ động viền đen'],
        fullScriptText,
      };
    } catch (error) {
      this.logger.error('Gemini generateTikTokScript error', error);
      return this.mockTikTokScript(article.title, article.summary);
    }
  }

  /**
   * Reads a customer message from Facebook/Zalo and suggests an accurate reply.
   */
  async classifyAndAnswerMessage(payload: {
    message: string;
    channel: string;
    productCatalog?: Array<{ id: string; name: string; price: number; description?: string }>;
  }): Promise<CustomerAnswerResult> {
    if (!this.aiClient) {
      return {
        intent: 'PRODUCT_INQUIRY',
        suggestedReply: `Dạ chào bạn, cảm ơn bạn đã liên hệ qua ${payload.channel}. Shop đã nhận được tin nhắn và sẽ phản hồi tư vấn ngay cho bạn ạ!`,
        confidenceScore: 0.9,
        requiresHumanReview: true,
      };
    }

    const catalogSummary = (payload.productCatalog || [])
      .slice(0, 10)
      .map((p) => `- ${p.name} (Giá: ${p.price.toLocaleString('vi-VN')}đ): ${p.description || ''}`)
      .join('\n');

    const prompt = `
Bạn là nhân viên chăm sóc khách hàng chuyên nghiệp, lịch sự, thân thiện cho shop trên ${payload.channel}.
TIN NHẮN KHÁCH: "${payload.message}"

KHO SẢN PHẨM HIỆN CÓ:
${catalogSummary || 'Chưa có dữ liệu danh mục cụ thể, tư vấn lịch sự chung.'}

Yêu cầu trả lời:
- Luôn dạ/vâng lễ phép, xưng "Shop", gọi khách là "bạn" hoặc "anh/chị".
- Đúng trọng tâm câu hỏi của khách (giá, size, cách đặt hàng, ship).
- Nếu không chắc chắn, báo khách đợi 1 phút để shop kiểm tra kho.

Trả về JSON thuần túy:
{
  "intent": "PRODUCT_INQUIRY | PRICING | SHIPPING | ORDER_TRACKING | COMPLAINT | GREETING | OTHER",
  "suggestedReply": "Nội dung tin nhắn trả lời hoàn chỉnh",
  "confidenceScore": 0.95,
  "requiresHumanReview": true
}
`;

    try {
      const response = await this.aiClient.models.generateContent({
        model: this.modelName,
        contents: prompt,
      });

      return this.cleanAndParseJson<CustomerAnswerResult>(response.text || '', () => ({
        intent: 'PRODUCT_INQUIRY',
        suggestedReply: `Dạ chào bạn, shop đã nhận được tin nhắn và đang hỗ trợ ngay cho bạn ạ!`,
        confidenceScore: 0.8,
        requiresHumanReview: true,
      }));
    } catch (error) {
      this.logger.error('Gemini classifyAndAnswerMessage error', error);
      return {
        intent: 'OTHER',
        suggestedReply: 'Dạ shop đã nhận được thông tin và sẽ phản hồi chi tiết tới bạn ngay ạ!',
        confidenceScore: 0.7,
        requiresHumanReview: true,
      };
    }
  }

  /**
   * Analyzes trends and drafts high-engagement posts for Threads or Facebook.
   */
  async generateSocialDraft(payload: {
    topic: string;
    platform: 'THREADS' | 'FACEBOOK';
    affiliateProduct?: { name: string; url: string; price?: number };
  }): Promise<SocialDraftResult> {
    if (!this.aiClient) {
      return {
        headline: `Xu hướng đáng chú ý hôm nay: ${payload.topic}`,
        body: `Cộng đồng đang bàn luận rất nhiều về ${payload.topic}. Đây là góc nhìn đáng quan sát.`,
        hashtags: ['#trend', '#xuhuong', '#review'],
        callToAction: 'Bình luận ý kiến của bạn phía dưới nhé!',
        affiliateCallout: payload.affiliateProduct
          ? `Món đồ này đang được nhiều người tìm kiếm: ${payload.affiliateProduct.url}`
          : undefined,
        trendScore: 85,
      };
    }

    const platformStyle =
      payload.platform === 'THREADS'
        ? 'Phong cách Threads: ngắn gọn, sắc sảo, tự nhiên, đậm tính cá nhân, mở ra tranh luận, không viết văn mẫu quảng cáo.'
        : 'Phong cách Facebook: có tiêu đề in hoa thu hút, gạch đầu dòng rõ ràng, câu chuyện thực tế, kêu gọi chia sẻ.';

    const prompt = `
Bạn là chuyên gia sáng tạo nội dung mạng xã hội cho nền tảng ${payload.platform}.
CHỦ ĐỀ/TREND: ${payload.topic}
${platformStyle}
${
  payload.affiliateProduct
    ? `SẢN PHẨM GẮN KÈM: ${payload.affiliateProduct.name} - Link: ${payload.affiliateProduct.url}. Lồng ghép sản phẩm một cách cực kỳ khéo léo và hữu ích, KHÔNG spam link thô thiển.`
    : 'Không kèm sản phẩm, tập trung thảo luận viral.'
}

Trả về JSON thuần túy:
{
  "headline": "Tiêu đề bài viết",
  "body": "Nội dung bài viết hoàn chỉnh",
  "hashtags": ["#hashtag1", "#hashtag2"],
  "callToAction": "Câu kêu gọi tương tác",
  "affiliateCallout": "Đoạn nhắc link sản phẩm khéo léo nếu có",
  "trendScore": 88
}
`;

    try {
      const response = await this.aiClient.models.generateContent({
        model: this.modelName,
        contents: prompt,
      });

      return this.cleanAndParseJson<SocialDraftResult>(response.text || '', () => ({
        headline: payload.topic,
        body: `Đang có sự chú ý lớn về ${payload.topic}. Cùng theo dõi các chuyển biến tiếp theo.`,
        hashtags: ['#trend', '#tintuc'],
        callToAction: 'Bạn thấy sao?',
        trendScore: 80,
      }));
    } catch (error) {
      this.logger.error('Gemini generateSocialDraft error', error);
      return {
        headline: payload.topic,
        body: `Nội dung về ${payload.topic}`,
        hashtags: ['#trend'],
        callToAction: 'Theo dõi để cập nhật thêm!',
        trendScore: 75,
      };
    }
  }

  /**
   * Generates a 15–20 second vertical advertising video script for TikTok, Facebook Reels, and YouTube Shorts
   * adhering strictly to the Google Flow / Gemini system prompt specification.
   */
  async generateProductAdVideoScript(payload: {
    productName: string;
    productImage?: string;
    price?: number;
    category?: string;
    description?: string;
  }): Promise<ProductAdVideoScriptResult> {
    const rawSystemPrompt = `Analyze the uploaded product image OR product name and create a 15–20 second vertical advertising video for TikTok, Facebook Reels, and YouTube Shorts.

Automatically identify the product, main selling point, customer need, and best advertising angle.

VIDEO:
* 9:16 vertical
* Duration: 15–20 seconds
* Cinematic, realistic, modern commercial
* Fast pacing, smooth transitions, attractive product shots
* Show the product clearly and naturally in use
* Add suitable music and sound effects

VIETNAMESE VOICEOVER:
Create a natural Vietnamese voiceover based on the product image or name.

Structure:
0–3s: Powerful hook
3–8s: Introduce product + problem
8–15s: Show main benefit / product usage
15–20s: Strong CTA

Voiceover must be:
* Natural Vietnamese
* Short and conversational
* Persuasive but not exaggerated
* Synchronized with the visuals

Add Vietnamese subtitles synchronized with the voice.

PRODUCT ACCURACY:
Use the uploaded product image as the visual reference.
Preserve the exact product shape, color, logo, packaging, materials, and distinctive details.
Do not redesign, distort, duplicate, or invent product features.

If only the product name is provided, create a suitable advertising concept without making unsupported claims.

Optimize for attention, retention, engagement, and conversion.`;

    if (!this.aiClient) {
      return this.mockProductAdVideoScript(payload.productName, payload.price, payload.category, rawSystemPrompt);
    }

    const userPrompt = `
${rawSystemPrompt}

INPUT PRODUCT:
- Product Name: ${payload.productName}
- Product Image URL: ${payload.productImage || 'N/A'}
- Price: ${payload.price ? payload.price.toLocaleString('vi-VN') + ' VND' : 'N/A'}
- Category: ${payload.category || 'N/A'}
- Description: ${payload.description || 'N/A'}

Return STRICT pure JSON:
{
  "productIdentified": "${payload.productName}",
  "mainSellingPoint": "Điểm bán hàng độc nhất (USP)",
  "customerNeed": "Nhu cầu hoặc nỗi đau của khách hàng được giải quyết",
  "bestAdvertisingAngle": "Góc tiếp cận quảng cáo hiệu quả nhất",
  "videoSpecs": {
    "aspectRatio": "9:16",
    "durationSeconds": 18,
    "style": "Cinematic, realistic, modern commercial 9:16",
    "musicSuggestion": "Upbeat energetic tech lifestyle pop",
    "soundEffects": ["Whoosh transition", "Click chime", "Cash bell"]
  },
  "voiceover": {
    "hook_0_3s": "Dừng lại 3 giây! Bạn đã biết món đồ này đang gây bão chưa?",
    "problem_3_8s": "Nếu bạn từng mệt mỏi với sự bất tiện hàng ngày, đây chính là giải pháp.",
    "benefit_8_15s": "Thiết kế nhỏ gọn, công năng vượt trội giúp cuộc sống của bạn tiện lợi hơn gấp 10 lần.",
    "cta_15_20s": "Bấm ngay vào link bình luận đầu tiên bên dưới để nhận ưu đãi trước khi hết hàng nhé!",
    "fullVoiceoverText": "Dừng lại 3 giây! Bạn đã biết món đồ này đang gây bão chưa? Nếu bạn từng mệt mỏi với sự bất tiện hàng ngày, đây chính là giải pháp. Thiết kế nhỏ gọn, công năng vượt trội giúp cuộc sống của bạn tiện lợi hơn gấp 10 lần. Bấm ngay vào link bình luận đầu tiên bên dưới để nhận ưu đãi nhé!"
  },
  "subtitles": [
    { "startTime": 0, "endTime": 3, "text": "Dừng lại 3 giây! Bạn đã biết món đồ này chưa?" },
    { "startTime": 3, "endTime": 8, "text": "Giải pháp đánh bay mọi phiền toái thường ngày" },
    { "startTime": 8, "endTime": 15, "text": "Trải nghiệm mượt mà, tiện lợi gấp 10 lần" },
    { "startTime": 15, "endTime": 18, "text": "Bấm link ở bình luận đầu tiên nhận deal sốc!" }
  ],
  "visualTimeline": [
    { "timeRange": "0–3s", "description": "Cận cảnh mở hộp giật gân, hiệu ứng zoom nhanh", "productFocus": "Sản phẩm thực tế nguyên bản" },
    { "timeRange": "3–8s", "description": "Diễn tả nỗi đau phiền toái và sản phẩm xuất hiện cứu cánh", "productFocus": "Chi tiết thiết kế và logo" },
    { "timeRange": "8–15s", "description": "Quay cận cảnh thao tác sử dụng mượt mà trong thực tế", "productFocus": "Công năng và điểm mạnh chính" },
    { "timeRange": "15–18s", "description": "Khung CTA nổi bật chỉ tay xuống phần bình luận", "productFocus": "Bao bì kèm nhãn giảm giá" }
  ]
}
`;

    try {
      const response = await this.aiClient.models.generateContent({
        model: this.modelName,
        contents: userPrompt,
      });

      const parsed = this.cleanAndParseJson<ProductAdVideoScriptResult>(
        response.text || '',
        () => this.mockProductAdVideoScript(payload.productName, payload.price, payload.category, rawSystemPrompt),
      );
      parsed.rawSystemPromptUsed = rawSystemPrompt;
      return parsed;
    } catch (err) {
      this.logger.error('Gemini generateProductAdVideoScript error', err);
      return this.mockProductAdVideoScript(payload.productName, payload.price, payload.category, rawSystemPrompt);
    }
  }

  /**
   * Analyzes an input video/article from TikTok or Facebook and finds matching Shopee products.
   */
  async matchSimilarShopeeProduct(payload: {
    title: string;
    content: string;
    existingCatalog?: Array<{ id: string; name: string; shopeeUrl: string; price: number }>;
  }): Promise<SimilarProductMatchResult> {
    if (!this.aiClient) {
      return this.mockSimilarProductMatch(payload.title);
    }

    const catalogList = (payload.existingCatalog || [])
      .slice(0, 10)
      .map((c) => `- [${c.id}] ${c.name} (${c.price.toLocaleString('vi-VN')}đ) - ${c.shopeeUrl}`)
      .join('\n');

    const prompt = `
Bạn là chuyên gia đối chiếu sản phẩm thương mại điện tử Shopee Affiliate.
Từ nội dung video/bài viết sau:
TIÊU ĐỀ: ${payload.title}
NỘI DUNG: ${payload.content.slice(0, 3000)}

KHO SẢN PHẨM HIỆN CÓ CỦA SHOP:
${catalogList || 'Chưa có sản phẩm khớp sẵn, hãy đề xuất sản phẩm tốt nhất trên Shopee.'}

Yêu cầu: Phân tích và tìm sản phẩm Shopee có khả năng chuyển đổi cao nhất ăn khớp với nội dung trên.
Trả về JSON thuần túy:
{
  "targetKeyword": "Từ khóa tìm kiếm chính",
  "suggestedProductName": "Tên sản phẩm Shopee tương tự phù hợp",
  "category": "TECH | HOME | BEAUTY | FASHION | LIFESTYLE",
  "estimatedPriceVND": 250000,
  "reasonForMatch": "Lý do vì sao sản phẩm này gắn vào video sẽ có tỷ lệ click cao",
  "searchQueriesShopee": ["từ khóa 1", "từ khóa 2"],
  "repurposeScriptAngle": "Góc kịch bản mới để đăng lại video và gán link sản phẩm này vào first comment"
}
`;

    try {
      const response = await this.aiClient.models.generateContent({
        model: this.modelName,
        contents: prompt,
      });

      return this.cleanAndParseJson<SimilarProductMatchResult>(
        response.text || '',
        () => this.mockSimilarProductMatch(payload.title),
      );
    } catch (err) {
      this.logger.error('Gemini matchSimilarShopeeProduct error', err);
      return this.mockSimilarProductMatch(payload.title);
    }
  }

  // --- Helpers & Fallbacks ---

  private cleanAndParseJson<T>(raw: string, fallback: () => T): T {
    try {
      let cleaned = raw.trim();
      if (cleaned.startsWith('```json')) {
        cleaned = cleaned.replace(/^```json\s*/, '').replace(/```\s*$/, '');
      } else if (cleaned.startsWith('```')) {
        cleaned = cleaned.replace(/^```\s*/, '').replace(/```\s*$/, '');
      }
      return JSON.parse(cleaned) as T;
    } catch (err) {
      this.logger.warn('Failed to parse JSON response from Gemini, using fallback');
      return fallback();
    }
  }

  private mockNewsSummary(title: string, content: string): NewsSummaryResult {
    return {
      title,
      summary: content.slice(0, 300) + '...',
      category: 'AI_TECH',
      whyItMatters:
        'Sự kiện này đánh dấu bước tiến công nghệ mới và tác động trực tiếp tới thị trường người tiêu dùng.',
      impactAnalysis:
        'Thúc đẩy quá trình tự động hóa và tối ưu hóa quy trình làm việc trong ngắn hạn.',
      sentiment: 'POSITIVE',
      keyFacts: [
        'Cập nhật tin tức công nghệ mới nhất.',
        'Được xác minh từ nguồn thông tin uy tín.',
        'Ảnh hưởng sâu rộng đến xu hướng tiếp theo.',
      ],
    };
  }

  private mockTikTokScript(title: string, summary: string): TikTokScriptResult {
    const hook = `Bạn sẽ bất ngờ khi biết chuyện này đang diễn ra: ${title.slice(0, 60)}!`;
    const newsContext = summary.slice(0, 200);
    const analysis = 'Đây là lý do tại sao sự kiện này lại tạo ra làn sóng thảo luận mạnh mẽ đến vậy.';
    const opinion = 'Trong thời gian tới, điều này sẽ thay đổi cách chúng ta làm việc và sáng tạo nội dung.';
    const callToAction = 'Follow ngay kênh để không bỏ lỡ tin tức công nghệ nóng nhất mỗi ngày!';

    return {
      hook,
      newsContext,
      analysis,
      opinion,
      callToAction,
      estimatedSeconds: 50,
      hashtags: ['#tintuc', '#congnghe', '#xuhuong', '#tiktoknews'],
      suggestedVisuals: ['Bài báo tiêu đề', 'Đồ thị tăng trưởng', 'B-roll công nghệ'],
      fullScriptText: `${hook}\n\n${newsContext}\n\n${analysis}\n\n${opinion}\n\n${callToAction}`,
    };
  }

  private mockProductAdVideoScript(
    productName: string,
    price?: number,
    category?: string,
    rawPrompt?: string,
  ): ProductAdVideoScriptResult {
    const formattedPrice = price ? price.toLocaleString('vi-VN') + 'đ' : 'giá siêu hời';
    const hook = `Dừng lại 3 giây! Món đồ ${productName} này đang làm mưa làm gió trên mạng xã hội!`;
    const problem = `Nếu bạn từng phát cáu vì những phiền toái bất tiện mỗi ngày, đây chính là giải pháp chân ái.`;
    const benefit = `Thiết kế tinh xảo, công năng vượt trội và độ bền cực cao giúp bạn tiết kiệm tối đa thời gian và công sức.`;
    const cta = `Chỉ ${formattedPrice} hôm nay! Bấm ngay vào link bình luận đầu tiên bên dưới để nhận voucher giảm giá nhé!`;

    return {
      productIdentified: productName,
      mainSellingPoint: 'Tiện lợi, thiết kế công thái học hiện đại, độ bền cao',
      customerNeed: 'Giải quyết phiền toái hàng ngày với chi phí hợp lý',
      bestAdvertisingAngle: 'Problem - Solution kết hợp Social Proof và Ưu đãi sốc',
      videoSpecs: {
        aspectRatio: '9:16',
        durationSeconds: 18,
        style: 'Cinematic, realistic, modern commercial 9:16',
        musicSuggestion: 'Upbeat modern commercial electronic pop',
        soundEffects: ['Fast whoosh', 'Pop chime', 'Cash bell sound'],
      },
      voiceover: {
        hook_0_3s: hook,
        problem_3_8s: problem,
        benefit_8_15s: benefit,
        cta_15_20s: cta,
        fullVoiceoverText: `${hook} ${problem} ${benefit} ${cta}`,
      },
      subtitles: [
        { startTime: 0, endTime: 3, text: hook },
        { startTime: 3, endTime: 8, text: problem },
        { startTime: 8, endTime: 15, text: benefit },
        { startTime: 15, endTime: 18, text: cta },
      ],
      visualTimeline: [
        { timeRange: '0–3s', description: 'Màn hình đếm ngược, zoom cận sản phẩm mở hộp', productFocus: productName },
        { timeRange: '3–8s', description: 'Minh họa nỗi đau thường gặp và sản phẩm xuất hiện', productFocus: 'Form dáng nguyên bản' },
        { timeRange: '8–15s', description: 'Thao tác sử dụng trực quan mượt mà trong cuộc sống', productFocus: 'Công năng nổi bật' },
        { timeRange: '15–18s', description: 'Mũi tên động chỉ xuống phần comment kèm voucher', productFocus: 'Bao bì & giá ưu đãi' },
      ],
      rawSystemPromptUsed: rawPrompt || '',
    };
  }

  private mockSimilarProductMatch(title: string): SimilarProductMatchResult {
    return {
      targetKeyword: title.slice(0, 30),
      suggestedProductName: `Sản phẩm tương tự thịnh hành theo xu hướng: ${title.slice(0, 40)}`,
      category: 'TECH',
      estimatedPriceVND: 220000,
      reasonForMatch: 'Tỷ lệ người xem video có nhu cầu sở hữu sản phẩm giải quyết vấn đề trong video rất cao.',
      searchQueriesShopee: ['sản phẩm xu hướng shopee', 'deal hot shopee hôm nay'],
      repurposeScriptAngle: 'Review thực tế công tâm và hướng dẫn mua đúng sản phẩm chính hãng qua link bình luận.',
    };
  }
}
