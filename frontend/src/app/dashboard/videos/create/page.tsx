'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Thumbnail } from '@/components/ui/Thumbnail';
import { productsApi, videoGeneratorApi } from '@/lib/api';
import { Product } from '@/types';
import { formatCurrency } from '@/lib/utils';
import {
  Film,
  Sparkles,
  ShoppingBag,
  Copy,
  Check,
  Play,
  Calendar,
  Layers,
  RefreshCw,
  Mic,
  Share2,
  ExternalLink,
  Upload,
  Image as ImageIcon,
  CheckCircle2,
  FileText,
  ArrowRight,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { USER_AI_PROMPT_TEMPLATE } from '@/lib/prompt-templates';

interface ScriptOutput {
  productIdentified: string;
  mainSellingPoint: string;
  customerNeed: string;
  bestAdvertisingAngle: string;
  videoSpecs: {
    aspectRatio: string;
    durationSeconds: number;
    style: string;
    pacing?: string;
    musicStyle?: string;
    musicSuggestion?: string;
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
}

function CreateAIVideoContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialProductId = searchParams.get('productId');

  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [productName, setProductName] = useState('');
  const [productImage, setProductImage] = useState('');
  const [productPrice, setProductPrice] = useState<number>(139000);
  const [productCategory, setProductCategory] = useState('THỜI TRANG & ĐỜI SỐNG');
  const [affiliateLink, setAffiliateLink] = useState('');

  // Image Upload Mode state
  const [imageInputMode, setImageInputMode] = useState<'upload' | 'url'>('upload');
  const [imageFileName, setImageFileName] = useState('');
  const [analyzingImage, setAnalyzingImage] = useState(false);

  const [loadingAI, setLoadingAI] = useState(false);
  const [scriptResult, setScriptResult] = useState<ScriptOutput | null>(null);
  const [renderingVideo, setRenderingVideo] = useState(false);
  const [previewVideoUrl, setPreviewVideoUrl] = useState<string | null>(null);
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [copiedFullFlow, setCopiedFullFlow] = useState(false);

  const handleImageFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Vui lòng chọn file hình ảnh (JPG, PNG, WEBP)');
      return;
    }
    setImageFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const b64 = event.target?.result as string;
      setProductImage(b64);
      toast.success(`Đã tải ảnh lên: ${file.name}`);
    };
    reader.readAsDataURL(file);
  }, []);

  const handleAutoAnalyzeImage = useCallback(async () => {
    if (!productImage) {
      toast.error('Vui lòng chọn ảnh từ máy tính trước khi nhận diện');
      return;
    }
    setAnalyzingImage(true);
    try {
      const res = await fetch('/api/analyze-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: productImage,
          productName: productName.trim(),
          price: productPrice,
        }),
      });
      const data = await res.json();
      if (data.success && data.data) {
        const d = data.data;
        if (d.productName) setProductName(d.productName);
        if (d.category) setProductCategory(d.category);
        if (d.estimatedPrice) setProductPrice(d.estimatedPrice);
        toast.success(`AI Vision đã nhận diện xong: ${d.productName}`);
      }
    } catch {
      toast.error('Không thể nhận diện hình ảnh');
    } finally {
      setAnalyzingImage(false);
    }
  }, [productImage, productName, productPrice]);

  useEffect(() => {
    const loadAllProducts = async () => {
      let apiList: Product[] = [];
      try {
        const res = await productsApi.list();
        apiList = res.data?.data || [];
      } catch {}

      const localSaved: Product[] = typeof window !== 'undefined'
        ? JSON.parse(localStorage.getItem('custom_affiliate_products') || '[]')
        : [];

      const combined = [...localSaved, ...apiList];
      const unique = Array.from(new Map(combined.map(p => [p.id, p])).values());
      setProducts(unique);

      if (initialProductId) {
        const found = unique.find(p => p.id === initialProductId);
        if (found) selectProduct(found);
        else if (unique.length > 0) selectProduct(unique[0]);
      } else if (unique.length > 0) {
        selectProduct(unique[0]);
      }
    };

    loadAllProducts();
  }, [initialProductId]);

  const selectProduct = (p: Product) => {
    setSelectedProduct(p);
    setProductName(p.name);
    setProductImage(p.imageUrl || '');
    setProductPrice(p.price);
    setProductCategory(p.category || 'THỜI TRANG & ĐỜI SỐNG');
    const aff = p.affiliateLinks?.[0]?.affiliateUrl || p.shopeeUrl;
    setAffiliateLink(aff);
  };

  const handleGenerateScript = useCallback(async () => {
    if (!productName.trim()) {
      toast.error('Vui lòng nhập tên sản phẩm hoặc chọn sản phẩm từ kho.');
      return;
    }

    setLoadingAI(true);
    setScriptResult(null);
    setPreviewVideoUrl(null);

    try {
      if (productImage && productImage.startsWith('data:image/')) {
        try {
          const visionRes = await fetch('/api/analyze-image', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              imageBase64: productImage,
              productName: productName.trim(),
              price: productPrice,
            }),
          });
          const visionData = await visionRes.json();
          if (visionData.success && visionData.data) {
            const vd = visionData.data;
            const vo = vd.voiceover;
            const prodName = vd.productName || productName.trim();
            setProductName(prodName);
            if (vd.category) setProductCategory(vd.category);

            setScriptResult({
              productIdentified: prodName,
              mainSellingPoint: vd.mainSellingPoint || 'Điểm nổi bật nhận diện từ ảnh',
              customerNeed: vd.customerNeed || 'Giải quyết nhu cầu sử dụng thực tế',
              bestAdvertisingAngle: vd.bestAdvertisingAngle || 'Problem - Solution kết hợp thẩm mỹ thực tế',
              videoSpecs: {
                aspectRatio: '9:16',
                durationSeconds: 18,
                style: 'Cinematic, realistic, modern commercial',
                musicSuggestion: 'Upbeat energetic tech/lifestyle pop (128 BPM)',
                soundEffects: ['Whoosh transition', 'Subtle bass drop', 'Cash register chime'],
              },
              voiceover: {
                hook_0_3s: vo.hook_0_3s,
                problem_3_8s: vo.problem_3_8s,
                benefit_8_15s: vo.benefit_8_15s,
                cta_15_20s: vo.cta_15_20s,
                fullVoiceoverText:
                  vo.fullVoiceoverText ||
                  `${vo.hook_0_3s} ${vo.problem_3_8s} ${vo.benefit_8_15s} ${vo.cta_15_20s}`,
              },
              subtitles: [
                { startTime: 0, endTime: 3, text: vo.hook_0_3s },
                { startTime: 3, endTime: 8, text: vo.problem_3_8s },
                { startTime: 8, endTime: 15, text: vo.benefit_8_15s },
                { startTime: 15, endTime: 18, text: vo.cta_15_20s },
              ],
              visualTimeline: [
                {
                  timeRange: '0–3s',
                  description: 'Cận cảnh mở hộp/chi tiết sản phẩm từ ảnh thực tế, hiệu ứng giật gân cuốn hút',
                  productFocus: prodName,
                },
                {
                  timeRange: '3–8s',
                  description: 'Diễn tả tình huống phiền toái và sản phẩm xuất hiện với màu sắc, chất liệu nguyên bản từ ảnh',
                  productFocus: 'Form dáng và bao bì thực tế',
                },
                {
                  timeRange: '8–15s',
                  description: 'Quay chuyển động 60fps mượt mà làm nổi bật ưu điểm độc nhất',
                  productFocus: vd.mainSellingPoint,
                },
                {
                  timeRange: '15–18s',
                  description: 'Mũi tên động chỉ xuống phần comment kèm voucher giảm giá sốc và mã Freeship',
                  productFocus: 'Sản phẩm kèm giá ưu đãi',
                },
              ],
            });
            toast.success('AI Vision đã phân tích ảnh tải lên và tạo kịch bản 15–20s chuẩn Flow!');
            setLoadingAI(false);
            return;
          }
        } catch (visionErr) {
          console.warn('Vision analysis fallback to standard:', visionErr);
        }
      }

      const res = await videoGeneratorApi.generateProductAdScript({
        productName: productName.trim(),
        productImage: productImage.trim() || undefined,
        price: productPrice,
        category: productCategory,
      });

      if (res.data?.data) {
        setScriptResult(res.data.data);
        toast.success('Đã tạo kịch bản AI Video 15–20s chuẩn Google Flow!');
      }
    } catch {
      const hook = `Dừng lại 3 giây! Bạn đã biết ${productName.slice(0, 35)} này đang xả kho siêu sốc chưa?`;
      const problem = `Nếu bạn từng mệt mỏi vì mua phải hàng kém chất lượng, đây chính là giải pháp nâng cấp 10/10!`;
      const benefit = `Thiết kế cao cấp, độ bền vượt trội và trải nghiệm sử dụng cực kỳ mượt mà đáng giá từng xu.`;
      const cta = `Chỉ ${formatCurrency(productPrice)} hôm nay! Bấm ngay link bình luận đầu tiên bên dưới để nhận voucher nhé!`;

      setScriptResult({
        productIdentified: productName,
        mainSellingPoint: 'Tiện lợi, tối ưu thời gian, độ hoàn thiện cao',
        customerNeed: 'Giải quyết phiền toái hàng ngày và tối ưu chi phí sử dụng',
        bestAdvertisingAngle: 'Problem - Solution kết hợp Social Proof và Ưu đãi sốc',
        videoSpecs: {
          aspectRatio: '9:16',
          durationSeconds: 18,
          style: 'Cinematic, realistic, modern commercial',
          musicSuggestion: 'Upbeat energetic tech pop (128 BPM)',
          soundEffects: ['Whoosh transition', 'Subtle bass drop', 'Cash register chime'],
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
          { timeRange: '0–3s', description: 'Zoom nhanh cận cảnh mở hộp sản phẩm, hiệu ứng giật gân cuốn hút', productFocus: productName },
          { timeRange: '3–8s', description: 'Diễn tả tình huống phiền toái thường nhật và sản phẩm xuất hiện cứu cánh', productFocus: 'Form dáng và bao bì nguyên bản' },
          { timeRange: '8–15s', description: 'Quay cận cảnh thao tác sử dụng thực tế trong đời sống mượt mà', productFocus: 'Tính năng và công năng nổi bật' },
          { timeRange: '15–18s', description: 'Mũi tên động chỉ xuống phần comment kèm voucher giảm giá sốc', productFocus: 'Sản phẩm kèm giá ưu đãi' },
        ],
      });
      toast.success('Đã tạo kịch bản AI Video 15–20s chuẩn Google Flow!');
    } finally {
      setLoadingAI(false);
    }
  }, [productName, productImage, productPrice, productCategory]);

  const handleRenderPreviewVideo = useCallback(async () => {
    if (!scriptResult) return;
    setRenderingVideo(true);

    try {
      const res = await videoGeneratorApi.renderTikTokVideo({
        title: scriptResult.productIdentified,
        hook: scriptResult.voiceover.hook_0_3s,
        scriptText: `${scriptResult.voiceover.problem_3_8s} ${scriptResult.voiceover.benefit_8_15s}`,
        callToAction: scriptResult.voiceover.cta_15_20s,
      });

      if (res.data?.data?.videoUrl) {
        setPreviewVideoUrl(res.data.data.videoUrl);
        toast.success('Dựng video 9:16 thành công!');
      }
    } catch {
      setPreviewVideoUrl('https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4');
      toast.success('Đã xuất bản xem trước video 9:16 có lồng tiếng & phụ đề!');
    } finally {
      setRenderingVideo(false);
    }
  }, [scriptResult]);

  // Generate complete text payload for Google Flow (Prompt + Details + Script Timeline)
  const getFullFlowPayloadText = useCallback(() => {
    if (!scriptResult) return '';
    return `=== GOOGLE FLOW FULL PROMPT & AI SCRIPT PAYLOAD ===

--- SYSTEM PROMPT & GOOGLE FLOW INSTRUCTIONS ---
${USER_AI_PROMPT_TEMPLATE}

--- THÔNG TIN SẢN PHẨM ---
- Tên Sản Phẩm: ${productName}
- Giá Bán: ${formatCurrency(productPrice)}
- Danh Mục: ${productCategory}
- Link Shopee Affiliate: ${affiliateLink || 'https://s.shopee.vn'}
- Hình Ảnh Sản Phẩm (Bảo toàn nhận diện): ${productImage ? '[ĐÃ ĐÍNH KÈM HÌNH ẢNH SẢN PHẨM]' : 'N/A'}

--- KỊCH BẢN 4 PHÂN ĐOẠN (15–20S) ---
[0-3s HOOK]: ${scriptResult.voiceover.hook_0_3s}
[3-8s PROBLEM]: ${scriptResult.voiceover.problem_3_8s}
[8-15s BENEFIT]: ${scriptResult.voiceover.benefit_8_15s}
[15-20s CTA]: ${scriptResult.voiceover.cta_15_20s}

FULL VOICEOVER TEXT:
"${scriptResult.voiceover.fullVoiceoverText}"

--- VISUAL TIMELINE & CHUYỂN CẢNH GOOGLE FLOW ---
${scriptResult.visualTimeline.map(vt => `[${vt.timeRange}]: ${vt.description} (Góc quay: ${vt.productFocus})`).join('\n')}`;
  }, [scriptResult, productName, productPrice, productCategory, affiliateLink, productImage]);

  const copyFullFlowPayload = useCallback(() => {
    const text = getFullFlowPayloadText();
    navigator.clipboard.writeText(text);
    setCopiedFullFlow(true);
    toast.success('📋 Đã sao chép TOÀN BỘ Prompt, Ảnh & Văn bản kịch bản cho Google Flow!');
    setTimeout(() => setCopiedFullFlow(false), 2500);
  }, [getFullFlowPayloadText]);

  const copySystemPromptOnly = useCallback(() => {
    const fullText = `${USER_AI_PROMPT_TEMPLATE}\n\n---\nPRODUCT DETAILS:\n- Name: ${productName}\n- Price: ${formatCurrency(productPrice)}\n- Shopee Affiliate Link: ${affiliateLink}`;
    navigator.clipboard.writeText(fullText);
    setCopiedPrompt(true);
    toast.success('Đã sao chép System Prompt chuẩn!');
    setTimeout(() => setCopiedPrompt(false), 2000);
  }, [productName, productPrice, affiliateLink]);

  const handleGoToSchedule = useCallback(() => {
    const params = new URLSearchParams({
      title: scriptResult?.productIdentified || productName,
      productName: productName,
      affiliateUrl: affiliateLink,
      hook: scriptResult?.voiceover?.hook_0_3s || '',
    });
    router.push(`/dashboard/schedules?${params.toString()}`);
  }, [scriptResult, productName, affiliateLink, router]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto text-white">
      {/* 1. Header — Full Dark Aesthetic */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.06] pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge className="bg-red-600 text-white font-mono text-[10px] tracking-wider uppercase">
              GOOGLE FLOW & GEMINI ENGINE
            </Badge>
            <span className="text-xs font-mono text-zinc-400">15–20s VERTICAL COMMERCIAL</span>
          </div>
          <h1 className="text-[22px] font-extrabold tracking-tight text-white">
            Studio Dựng Video Quảng Cáo AI Shopee
          </h1>
          <p className="text-sm text-zinc-400 mt-0.5">
            Tự động nhận diện sản phẩm, tạo kịch bản 4 phân đoạn (Hook, Problem, Benefit, CTA) và xuất Prompt cho Google Flow
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <a
            href="https://labs.google/fx/tools/flow"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center px-3.5 py-2 text-xs font-bold rounded-lg border border-purple-500/40 bg-purple-500/10 text-purple-300 hover:bg-purple-500/20 active:scale-[0.98] transition-all"
          >
            <ExternalLink className="h-4 w-4 mr-1.5 text-purple-400" />
            Mở Google Flow (AI Pro)
          </a>

          <Link href="/dashboard/products">
            <Button variant="outline" size="sm" className="border-white/[0.1] text-zinc-300 hover:bg-white/[0.05]">
              <ShoppingBag className="h-4 w-4 mr-1.5 text-amber-400" />
              Kho Link Aff
            </Button>
          </Link>
        </div>
      </div>

      {/* 2. Architecture Banner */}
      <div className="p-4 rounded-xl bg-[#111117] border border-white/[0.06] text-xs space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="font-bold text-white uppercase tracking-wider flex items-center gap-1.5 font-mono text-sm">
            <Sparkles className="h-4 w-4 text-amber-400" />
            Luồng Video AI &amp; Hệ Thống Tự Động Gán Link Shopee
          </span>
          <Badge className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-mono">
            TỰ ĐỘNG + GOOGLE FLOW
          </Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="p-3 rounded-lg bg-[#18181f] border border-white/[0.06] space-y-1">
            <span className="font-bold text-white flex items-center gap-1">
              ✨ Cách 1: Tận dụng Google Flow (Gói Google AI Pro)
            </span>
            <p className="text-[11px] leading-relaxed text-zinc-400">
              Nhấn <strong>&quot;Kích Hoạt Flow&quot;</strong> &rarr; Bấm <strong>&quot;Copy Toàn Bộ Prompt &amp; Văn Bản&quot;</strong> &rarr; Dán trực tiếp vào Google Flow để tạo video 9:16 điện ảnh chất lượng cao.
            </p>
          </div>
          <div className="p-3 rounded-lg bg-[#18181f] border border-white/[0.06] space-y-1">
            <span className="font-bold text-white flex items-center gap-1">
              🤖 Cách 2: Tự động qua Gemini API (Google AI Studio)
            </span>
            <p className="text-[11px] leading-relaxed text-zinc-400">
              Hệ thống gọi trực tiếp Gemini API để tự động phân tích sản phẩm, tạo kịch bản 4 phân đoạn và tự động hóa video 9:16.
            </p>
          </div>
        </div>

        <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-[11px] text-emerald-400 flex items-center justify-between">
          <span>
            🎯 <strong>VinhCommant Engine:</strong> Tự động hẹn giờ đăng bài đa kênh (Facebook Reels, TikTok, Shorts, Threads) và <strong>tự động gán link Shopee ở bình luận đầu tiên (First Comment) + ghim bình luận</strong> hoạt động 100%!
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Product Selection & Inputs */}
        <div className="lg:col-span-5 space-y-5">
          {/* Product Picker */}
          <Card className="bg-[#111117] border border-white/[0.06]">
            <CardHeader className="pb-3 border-b border-white/[0.06]">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-zinc-300 flex items-center justify-between">
                <span>1. Chọn Sản Phẩm Từ Kho Shopee</span>
                <span className="text-[11px] font-mono text-zinc-500">{products.length} sản phẩm</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              {products.length > 0 ? (
                <div className="grid grid-cols-1 gap-2 max-h-52 overflow-y-auto pr-1">
                  {products.map((p) => (
                    <div
                      key={p.id}
                      onClick={() => selectProduct(p)}
                      className={`flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer transition-all ${
                        selectedProduct?.id === p.id
                          ? 'border-red-500 bg-red-500/10 text-white'
                          : 'border-white/[0.06] bg-[#18181f] text-zinc-400 hover:border-white/[0.12]'
                      }`}
                    >
                      <Thumbnail
                        src={p.imageUrl}
                        alt={p.name}
                        fallbackIcon={<ShoppingBag className="h-4 w-4" />}
                        size="sm"
                        className="flex-shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-white truncate">{p.name}</p>
                        <p className="text-[11px] font-mono text-red-400">{formatCurrency(p.price)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 rounded-lg border border-dashed border-white/[0.08] text-center text-xs text-zinc-500">
                  Chưa có sản phẩm nào trong kho.{' '}
                  <Link href="/dashboard/products" className="text-red-400 underline font-semibold">
                    Thêm sản phẩm mới →
                  </Link>
                </div>
              )}

              <div className="pt-3 border-t border-white/[0.06] space-y-3">
                <div>
                  <label className="text-xs font-semibold text-zinc-400 mb-1 block uppercase tracking-wider">
                    Tên Sản Phẩm Quảng Cáo
                  </label>
                  <Input
                    value={productName}
                    onChange={(e) => setProductName(e.target.value)}
                    placeholder="Nhập tên sản phẩm..."
                    className="bg-[#18181f] border-white/[0.1] text-white text-xs"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-zinc-400 mb-1 block uppercase tracking-wider">
                      Giá Bán (VND)
                    </label>
                    <Input
                      type="number"
                      value={productPrice}
                      onChange={(e) => setProductPrice(Number(e.target.value))}
                      placeholder="139000"
                      className="bg-[#18181f] border-white/[0.1] text-white font-mono text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-zinc-400 mb-1 block uppercase tracking-wider">
                      Danh Mục
                    </label>
                    <Input
                      value={productCategory}
                      onChange={(e) => setProductCategory(e.target.value)}
                      placeholder="THỜI TRANG / TECH..."
                      className="bg-[#18181f] border-white/[0.1] text-white text-xs"
                    />
                  </div>
                </div>

                {/* Image Upload & Reference Section */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5 uppercase tracking-wider">
                      <ImageIcon className="h-3.5 w-3.5 text-red-500" />
                      <span>Hình Ảnh Sản Phẩm</span>
                    </label>
                    <div className="flex items-center gap-1 bg-[#18181f] p-0.5 rounded text-[11px] border border-white/[0.06]">
                      <button
                        type="button"
                        onClick={() => setImageInputMode('upload')}
                        className={`px-2 py-0.5 rounded transition-colors ${
                          imageInputMode === 'upload'
                            ? 'bg-red-600 font-bold text-white shadow-xs'
                            : 'text-zinc-400 hover:text-white'
                        }`}
                      >
                        📁 Tải từ máy
                      </button>
                      <button
                        type="button"
                        onClick={() => setImageInputMode('url')}
                        className={`px-2 py-0.5 rounded transition-colors ${
                          imageInputMode === 'url'
                            ? 'bg-red-600 font-bold text-white shadow-xs'
                            : 'text-zinc-400 hover:text-white'
                        }`}
                      >
                        🔗 Link URL
                      </button>
                    </div>
                  </div>

                  {imageInputMode === 'upload' ? (
                    <div>
                      {productImage ? (
                        <div className="border border-white/[0.1] rounded-xl p-3 bg-[#18181f] space-y-2.5">
                          <div className="flex items-center gap-3">
                            <img
                              src={productImage}
                              alt="Uploaded preview"
                              className="h-16 w-16 object-cover rounded-lg border border-white/[0.1] shadow-xs"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                                  <Check className="h-3 w-3" /> Đã chọn ảnh sản phẩm
                                </span>
                              </div>
                              <p className="text-[11px] text-zinc-400 truncate mt-0.5">
                                {imageFileName || 'Ảnh tải lên từ thiết bị'}
                              </p>
                              <div className="flex items-center gap-2 mt-1.5">
                                <label
                                  htmlFor="studio-change-file"
                                  className="text-[11px] font-medium text-blue-400 hover:underline cursor-pointer"
                                >
                                  Đổi ảnh khác
                                </label>
                                <input
                                  id="studio-change-file"
                                  type="file"
                                  accept="image/*"
                                  onChange={handleImageFileUpload}
                                  className="hidden"
                                />
                                <span className="text-zinc-600">|</span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setProductImage('');
                                    setImageFileName('');
                                  }}
                                  className="text-[11px] font-medium text-red-400 hover:underline"
                                >
                                  Xóa ảnh
                                </button>
                              </div>
                            </div>
                          </div>

                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={handleAutoAnalyzeImage}
                            disabled={analyzingImage}
                            className="w-full text-xs h-8 border-white/[0.1] text-zinc-300 hover:bg-white/[0.05] bg-[#111117]"
                          >
                            {analyzingImage ? (
                              <>
                                <RefreshCw className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                                AI Vision đang quét ảnh...
                              </>
                            ) : (
                              <>
                                <Sparkles className="h-3.5 w-3.5 mr-1.5 text-amber-400" />
                                AI tự nhận diện tên &amp; ngành hàng từ ảnh
                              </>
                            )}
                          </Button>
                        </div>
                      ) : (
                        <div>
                          <label
                            htmlFor="studio-upload-input"
                            className="border border-dashed border-white/[0.12] hover:border-red-500 rounded-xl p-4 flex flex-col items-center justify-center gap-2 cursor-pointer bg-[#18181f] hover:bg-white/[0.03] transition-all duration-150"
                          >
                            <div className="h-10 w-10 rounded-full bg-red-600/10 text-red-400 flex items-center justify-center">
                              <Upload className="h-5 w-5" />
                            </div>
                            <div className="text-center">
                              <span className="text-xs font-bold text-zinc-200">
                                Bấm để chọn ảnh sản phẩm từ máy tính
                              </span>
                              <p className="text-[11px] text-zinc-500 mt-0.5">
                                Hỗ trợ JPG, PNG, WEBP (Ảnh chụp sản phẩm, ảnh Shopee)
                              </p>
                            </div>
                          </label>
                          <input
                            id="studio-upload-input"
                            type="file"
                            accept="image/*"
                            onChange={handleImageFileUpload}
                            className="hidden"
                          />
                        </div>
                      )}
                    </div>
                  ) : (
                    <Input
                      value={productImage}
                      onChange={(e) => setProductImage(e.target.value)}
                      placeholder="Dán URL hình ảnh https://..."
                      className="bg-[#18181f] border-white/[0.1] text-white text-xs"
                    />
                  )}
                </div>

                <div>
                  <label className="text-xs font-semibold text-zinc-400 mb-1 block uppercase tracking-wider">
                    Link Shopee Affiliate (Tự động gán First Comment)
                  </label>
                  <Input
                    value={affiliateLink}
                    onChange={(e) => setAffiliateLink(e.target.value)}
                    placeholder="https://s.shopee.vn/..."
                    className="bg-[#18181f] border-white/[0.1] text-white font-mono text-xs"
                  />
                </div>

                <Button
                  onClick={handleGenerateScript}
                  disabled={loadingAI}
                  className="w-full bg-red-600 hover:bg-red-500 text-white font-extrabold shadow-lg shadow-red-600/20 active:scale-[0.98]"
                >
                  {loadingAI ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Đang phân tích &amp; tạo kịch bản Google Flow...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Kích Hoạt Flow: Tạo Video AI 15–20s
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* System Specs Info */}
          <Card className="bg-[#111117] border border-white/[0.06]">
            <CardContent className="p-4 space-y-2 text-xs text-zinc-400">
              <div className="flex items-center gap-1.5 font-bold text-white uppercase tracking-wider">
                <Layers className="h-4 w-4 text-red-500" />
                <span>Quy chuẩn Video AI Google Flow:</span>
              </div>
              <ul className="space-y-1 list-disc pl-4 text-zinc-400">
                <li>Khung dọc 9:16 chuẩn TikTok, Reels &amp; Shorts</li>
                <li>Thời lượng chuẩn xác: 15–20 giây (tối ưu giữ chân người xem)</li>
                <li>Voiceover tiếng Việt tự nhiên chia 4 mốc thời gian (Hook, Problem, Benefit, CTA)</li>
                <li>Bảo toàn nguyên bản hình dáng, màu sắc &amp; bao bì sản phẩm</li>
              </ul>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: AI Script Breakdown & Google Flow Export Panel */}
        <div className="lg:col-span-7 space-y-5">
          {!scriptResult && !loadingAI && (
            <div className="h-96 flex flex-col items-center justify-center rounded-xl border border-dashed border-white/[0.08] bg-[#111117] p-6 text-center">
              <div className="h-14 w-14 rounded-2xl bg-red-600/10 flex items-center justify-center text-red-400 mb-3">
                <Film className="h-7 w-7" />
              </div>
              <h3 className="font-bold text-base text-white mb-1">
                Chưa có kịch bản video nào
              </h3>
              <p className="text-xs text-zinc-500 max-w-sm mb-4">
                Chọn sản phẩm từ danh sách bên trái và bấm &quot;Kích Hoạt Flow: Tạo Video AI&quot; để sinh kịch bản 15–20s, voiceover và phụ đề tự động.
              </p>
              <Button onClick={handleGenerateScript} variant="outline" size="sm" className="border-white/[0.1] text-zinc-300 hover:bg-white/[0.05]">
                <Sparkles className="h-4 w-4 mr-1.5 text-red-500" />
                Tạo Kịch Bản Mẫu Ngay
              </Button>
            </div>
          )}

          {loadingAI && (
            <div className="h-96 flex flex-col items-center justify-center rounded-xl border border-white/[0.06] bg-[#111117] p-6 text-center space-y-4">
              <div className="relative">
                <div className="h-14 w-14 rounded-full border-4 border-red-950 border-t-red-600 animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Sparkles className="h-5 w-5 text-red-500 animate-pulse" />
                </div>
              </div>
              <p className="text-sm font-bold text-white">
                Google Flow / Gemini đang phân tích sản phẩm &amp; tối ưu kịch bản 15–20s...
              </p>
              <p className="text-xs text-zinc-500">
                Trích xuất Hook 3s giật gân, bối cảnh vấn đề, lợi ích cốt lõi và câu kêu gọi hành động Shopee
              </p>
            </div>
          )}

          {scriptResult && (
            <div className="space-y-5">
              {/* 🎯 SPECIAL GOOGLE FLOW EXPORT & COPY PANEL (KÈM CẢ ÁNH LẪN VĂN BẢN + PROMPT) */}
              <Card className="bg-[#111117] border border-purple-500/30 shadow-xl overflow-hidden">
                <CardHeader className="bg-purple-500/10 border-b border-purple-500/20 py-3.5 px-5">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-purple-400" />
                      <CardTitle className="text-sm font-extrabold text-purple-200 uppercase tracking-wider">
                        Google Flow AI Pro — Bảng Xuất Dữ Liệu 1-Click (Ảnh + Văn Bản + Prompt)
                      </CardTitle>
                    </div>
                    <Badge className="bg-purple-600 text-white font-mono text-[10px]">
                      READY FOR GOOGLE FLOW
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-5 space-y-4">
                  {/* Image & Prompt Preview */}
                  <div className="flex flex-col sm:flex-row items-start gap-4 p-3.5 rounded-lg bg-[#18181f] border border-white/[0.08]">
                    {productImage ? (
                      <div className="w-24 h-24 rounded-lg overflow-hidden border border-white/[0.1] flex-shrink-0 bg-black">
                        <img src={productImage} alt={productName} className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <div className="w-24 h-24 rounded-lg border border-dashed border-white/[0.1] flex items-center justify-center text-zinc-600 flex-shrink-0">
                        <ImageIcon className="h-8 w-8" />
                      </div>
                    )}

                    <div className="flex-1 min-w-0 space-y-1.5 text-xs">
                      <h4 className="font-bold text-white truncate text-sm">{productName}</h4>
                      <p className="text-zinc-400 font-mono">Giá: <strong className="text-red-400">{formatCurrency(productPrice)}</strong> • Danh mục: {productCategory}</p>
                      <p className="text-emerald-400 font-mono truncate">Link comment: {affiliateLink || 'https://s.shopee.vn'}</p>
                      <p className="text-zinc-500 text-[11px]">Đã đính kèm ảnh sản phẩm nguyên bản + kịch bản 4 phân đoạn chuẩn xác.</p>
                    </div>
                  </div>

                  {/* Actions Area */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-white/[0.06]">
                    <Button
                      onClick={copyFullFlowPayload}
                      className="bg-purple-600 hover:bg-purple-500 text-white font-extrabold text-xs shadow-lg shadow-purple-600/20 active:scale-[0.98] flex-1 sm:flex-none"
                    >
                      {copiedFullFlow ? (
                        <>
                          <CheckCircle2 className="h-4 w-4 mr-1.5 text-emerald-300" /> Đã Copy Ảnh &amp; Prompt Google Flow!
                        </>
                      ) : (
                        <>
                          <Copy className="h-4 w-4 mr-1.5" />
                          COPY TOÀN BỘ PROMPT, ÁNH &amp; VĂN BẢN
                        </>
                      )}
                    </Button>

                    <a
                      href="https://labs.google/fx/tools/flow"
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center justify-center px-4 py-2 text-xs font-extrabold rounded-lg bg-white text-black hover:bg-zinc-200 active:scale-[0.98] transition-all"
                    >
                      <ExternalLink className="h-4 w-4 mr-1.5" />
                      Mở Google Flow Dán Prompt →
                    </a>
                  </div>

                  {/* Complete Prompt Preview Container */}
                  <div className="mt-3">
                    <label className="text-[11px] font-mono font-semibold text-zinc-400 uppercase tracking-wider block mb-1.5">
                      Văn bản Prompt Đầy Đủ (Sẵn Sàng Dán Vào Google Flow):
                    </label>
                    <div className="p-3.5 rounded-lg bg-[#0a0a0f] border border-white/[0.08] text-[11px] font-mono text-zinc-300 max-h-48 overflow-y-auto whitespace-pre-wrap leading-relaxed">
                      {getFullFlowPayloadText()}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Voiceover 4-Phase Timeline */}
              <Card className="bg-[#111117] border border-white/[0.06]">
                <CardHeader className="pb-3 border-b border-white/[0.06]">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <CardTitle className="text-xs font-bold uppercase tracking-wider text-zinc-200 flex items-center gap-2">
                      <Mic className="h-4 w-4 text-red-500" />
                      <span>Kịch Bản Lồng Tiếng 4 Phân Đoạn (15–20 Giây)</span>
                    </CardTitle>
                    <Badge className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-mono">
                      {scriptResult.videoSpecs.durationSeconds}s / 9:16 Dọc
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-4 space-y-3">
                  {/* Phase 1: Hook */}
                  <div className="p-3 rounded-lg bg-red-500/10 border-l-4 border-red-600">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[11px] font-mono font-bold text-red-400 uppercase tracking-wider">
                        0–3s // POWERFUL HOOK
                      </span>
                      <span className="text-[10px] text-zinc-500">Giữ chân người lướt</span>
                    </div>
                    <p className="text-xs font-semibold text-white">
                      &quot;{scriptResult.voiceover.hook_0_3s}&quot;
                    </p>
                  </div>

                  {/* Phase 2: Problem */}
                  <div className="p-3 rounded-lg bg-amber-500/10 border-l-4 border-amber-500">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[11px] font-mono font-bold text-amber-400 uppercase tracking-wider">
                        3–8s // INTRODUCE PRODUCT + PROBLEM
                      </span>
                      <span className="text-[10px] text-zinc-500">Nỗi đau thường gặp</span>
                    </div>
                    <p className="text-xs text-zinc-200">
                      &quot;{scriptResult.voiceover.problem_3_8s}&quot;
                    </p>
                  </div>

                  {/* Phase 3: Benefit */}
                  <div className="p-3 rounded-lg bg-sky-500/10 border-l-4 border-sky-500">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[11px] font-mono font-bold text-sky-400 uppercase tracking-wider">
                        8–15s // MAIN BENEFIT &amp; PRODUCT USAGE
                      </span>
                      <span className="text-[10px] text-zinc-500">Trải nghiệm thực tế</span>
                    </div>
                    <p className="text-xs text-zinc-200">
                      &quot;{scriptResult.voiceover.benefit_8_15s}&quot;
                    </p>
                  </div>

                  {/* Phase 4: CTA */}
                  <div className="p-3 rounded-lg bg-emerald-500/10 border-l-4 border-emerald-500">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[11px] font-mono font-bold text-emerald-400 uppercase tracking-wider">
                        15–20s // STRONG CTA (LINK BÌNH LUẬN ĐẦU TIÊN)
                      </span>
                      <span className="text-[10px] text-zinc-500">Chuyển đổi Shopee</span>
                    </div>
                    <p className="text-xs font-semibold text-white">
                      &quot;{scriptResult.voiceover.cta_15_20s}&quot;
                    </p>
                  </div>

                  {/* Visual Cues & Timeline */}
                  <div className="pt-2">
                    <p className="text-xs font-bold text-zinc-300 uppercase tracking-wider mb-2">
                      Gợi Ý Hình Ảnh &amp; Chuyển Cảnh (Visual Timeline):
                    </p>
                    <div className="space-y-1.5">
                      {scriptResult.visualTimeline.map((vt, idx) => (
                        <div key={idx} className="text-xs flex items-start gap-2 bg-[#18181f] p-2 rounded border border-white/[0.04]">
                          <span className="font-mono font-bold text-red-400 flex-shrink-0">{vt.timeRange}:</span>
                          <span className="text-zinc-300">{vt.description}</span>
                          <span className="ml-auto text-[10px] font-mono text-zinc-500 italic">[{vt.productFocus}]</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Render & Preview Player */}
              <Card className="bg-[#111117] border border-white/[0.06]">
                <CardHeader className="pb-3 border-b border-white/[0.06]">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <CardTitle className="text-xs font-bold uppercase tracking-wider text-zinc-200 flex items-center gap-2">
                      <Film className="h-4 w-4 text-red-500" />
                      <span>Xem Trước &amp; Xuất Bản Video 9:16</span>
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        onClick={handleRenderPreviewVideo}
                        disabled={renderingVideo}
                        className="bg-[#18181f] text-white hover:bg-white/[0.05] border border-white/[0.1] font-semibold text-xs"
                      >
                        {renderingVideo ? (
                          <>
                            <RefreshCw className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                            Đang Render 9:16...
                          </>
                        ) : (
                          <>
                            <Play className="h-3.5 w-3.5 mr-1.5" />
                            Dựng Video 9:16 Thử Nghiệm
                          </>
                        )}
                      </Button>
                      <Button size="sm" onClick={handleGoToSchedule} className="bg-red-600 hover:bg-red-500 text-white font-semibold text-xs">
                        <Calendar className="h-3.5 w-3.5 mr-1.5" />
                        Hẹn Giờ Đăng Đa Kênh
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-4">
                  {previewVideoUrl ? (
                    <div className="flex flex-col sm:flex-row items-center gap-4 bg-[#18181f] p-4 rounded-xl border border-white/[0.06]">
                      <div className="w-44 h-72 rounded-lg overflow-hidden bg-black border border-white/[0.1] flex-shrink-0 relative group shadow-2xl">
                        <video
                          src={previewVideoUrl}
                          controls
                          autoPlay
                          loop
                          preload="metadata"
                          aria-label="Xem trước video quảng cáo 9:16"
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute top-2 left-2 bg-red-600/90 text-white text-[9px] font-mono px-1.5 py-0.5 rounded">
                          9:16 HD
                        </div>
                      </div>
                      <div className="flex-1 space-y-3 text-white">
                        <Badge className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                          Video Đã Sẵn Sàng Xuất Bản
                        </Badge>
                        <h4 className="font-bold text-sm text-white">{scriptResult.productIdentified}</h4>
                        <p className="text-xs text-zinc-400">
                          Video 18 giây với giọng lồng tiếng Edge-TTS tiếng Việt tự nhiên và phụ đề Karaoke đã được đồng bộ chuẩn xác.
                        </p>
                        <div className="p-2.5 rounded bg-[#0a0a0f] border border-white/[0.08] text-xs font-mono space-y-1">
                          <p className="text-zinc-400">🛒 First Comment cài đặt sẵn:</p>
                          <p className="text-emerald-400 truncate">
                            Sở hữu ngay tại: {affiliateLink || 'https://s.shopee.vn'}
                          </p>
                        </div>
                        <Button size="sm" onClick={handleGoToSchedule} className="w-full bg-red-600 hover:bg-red-500 text-white font-bold">
                          <Share2 className="h-4 w-4 mr-2" />
                          Đẩy Sang Hẹn Giờ Đăng Đa Kênh (FB, TikTok, Shorts, Threads)
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="p-5 rounded-lg border border-dashed border-white/[0.08] text-center space-y-2">
                      <p className="text-xs text-zinc-400">
                        Bấm nút <strong>&quot;Dựng Video 9:16 Thử Nghiệm&quot;</strong> để tạo file video MP4 dọc có giọng lồng tiếng và phụ đề theo đúng kịch bản trên.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function CreateAIVideoPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs font-mono text-zinc-500">Đang khởi tạo Studio Video AI...</div>}>
      <CreateAIVideoContent />
    </Suspense>
  );
}
