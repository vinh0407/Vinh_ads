"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import {
  Search, Sparkles, ExternalLink, RefreshCw, Copy, Check,
  Newspaper, Globe, Trophy, Cpu, TrendingUp, BookOpen, Clock,
  FileText, ShieldAlert, Zap, History, Trash2, Shield, Briefcase
} from "lucide-react";
import { toast } from "react-hot-toast";

export interface NewsItem {
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
  whyItMatters?: string;
}

const SUPPORTED_SOURCES = [
  { name: "VnExpress", url: "https://vnexpress.net/rss/thoi-su.rss" },
  { name: "Báo Tuổi Trẻ", url: "https://tuoitre.vn/rss/thoi-su.rss" },
  { name: "Báo Thanh Niên", url: "https://thanhnien.vn/rss/the-gioi.rss" },
  { name: "Báo Dân Trí", url: "https://dantri.com.vn/rss/the-thao.rss" },
  { name: "Báo Công An (CAND)", url: "https://cand.com.vn/rss/home.rss" },
  { name: "Báo Tiền Phong", url: "https://tienphong.vn/rss/home.rss" },
  { name: "CafeF", url: "https://cafef.vn/home.rss" },
  { name: "VietNamNet", url: "https://vietnamnet.vn/rss/the-gioi.rss" },
  { name: "GenK", url: "https://genk.vn/rss/home.rss" },
  { name: "Znews", url: "https://znews.vn/rss/thoi-su.rss" },
];

const CATEGORY_TABS = [
  { id: "ALL", label: "🌐 Tất Cả Tin Mới Live", icon: Globe },
  { id: "THOI_SU", label: "📰 Thời Sự & Chính Trị", icon: Newspaper },
  { id: "PHAP_LUAT", label: "🛡️ An Ninh & Pháp Luật", icon: Shield },
  { id: "XA_HOI", label: "👷 Lao Động & Xã Hội", icon: Briefcase },
  { id: "THE_THAO", label: "⚽ Thể Thao & Giải Đấu", icon: Trophy },
  { id: "THE_GIOI", label: "🌐 Thế Giới & Quốc Tế", icon: Globe },
  { id: "CONG_NGHE", label: "💻 Công Nghệ & AI", icon: Cpu },
  { id: "KINH_TE", label: "📈 Kinh Tế & Đầu Tư", icon: TrendingUp },
];

const buildAiNewsHostPrompt = (item: NewsItem): string => {
  const factsList = item.keyFacts && item.keyFacts.length > 0
    ? item.keyFacts.map((f, i) => "  " + (i + 1) + ". " + f).join("\n")
    : "  - Số liệu và diễn biến chính được trích xuất trực tiếp từ bài viết.";

  const lines = [
    "# AI NEWS VIDEO HOST — AUTOMATIC VIDEO GENERATION PROMPT",
    "",
    "Bạn là một **AI News Producer + TV Presenter + Video Director + Scriptwriter + Visual Editor**.",
    "Nhiệm vụ của bạn là biến **thông tin đầu vào có sẵn** thành một video dẫn chương trình hoàn chỉnh.",
    "",
    "## 1. INPUT INFORMATION",
    "- Tiêu đề tin tức: " + item.title,
    "- Nguồn phát hành: " + item.source,
    "- Danh mục: " + item.categoryLabel,
    "- Đường link bài báo gốc: " + item.url,
    "- Thời gian phát hành: " + item.publishedAt,
    "- Tóm tắt nội dung chính: " + item.summary,
    "- Bối cảnh & nguyên nhân: " + (item.contextCause || "Được trích xuất từ bài báo."),
    "- Các diễn biến & số liệu cốt lõi:\n" + factsList,
    "- Tác động & Kết luận: " + (item.impactConclusion || "Đánh giá chuyên sâu."),
    "",
    "## 2. DURATION & SPECIFICATIONS",
    "- Độ dài video: 15–20 giây (Tối ưu cho TikTok / Shorts / Reels / Vertical Video).",
    "- Tỷ lệ khung hình: 9:16 (Vertical Video).",
    "- Ngôn ngữ chính: Tiếng Việt tự nhiên, chuẩn giọng MC truyền hình.",
    "",
    "## 3. CORE STRUCTURE OF VIDEO (15-20s)",
    "1. HOOK (0 - 3s): Tiêu đề giật gân, khơi gợi tò mò, gây chú ý lập tức.",
    "2. CONTEXT & FACTS (3 - 10s): Đưa ra 2-3 thông tin/con số quan trọng nhất.",
    "3. INSIGHT & IMPACT (10 - 16s): Giải thích tác động thực tế đến khán giả.",
    "4. CALL TO ACTION (16 - 20s): Nhận định ngắn + Kêu gọi bấm link ở bình luận đầu tiên.",
    "",
    "## 4. MC / PRESENTATION STYLE",
    "- Phong cách: Chuyên nghiệp, tự tin, cuốn hút, giàu năng lượng.",
    "- Trang phục: Vest công sở thanh lịch hoặc trang phục MC hiện đại.",
    "- Thần thái: Ánh mắt tương tác trực tiếp với camera, biểu cảm linh hoạt theo diễn biến tin.",
    "",
    "## 5. VISUAL & B-ROLL INSTRUCTIONS",
    "- Cắt cảnh (B-roll): Mỗi 2-3 giây đổi góc quay hoặc hình ảnh minh họa.",
    "- Đồ họa chữ (Text Overlay): Hiển thị các từ khóa chính, con số kỷ lục nổi bật trên màn hình.",
    "- Hiệu ứng: Chuyển cảnh mượt mà, tông màu hiện đại chuẩn truyền hình.",
    "",
    "## 6. FULL SCRIPT GENERATION TASK",
    "Hãy tạo kịch bản chi tiết bao gồm:",
    "1. Lời thoại MC (Tiếng Việt) đọc liền mạch.",
    "2. Bảng phân cảnh (Scene-by-Scene) kèm thời gian, lời thoại, B-roll và Text Overlay.",
    "3. Chuỗi prompt tạo video hoạt họa / người thật dẫn chương trình AI.",
    "",
    "# 12. OUTPUT FORMAT",
    "Xuất ra đầy đủ:",
    "1. **VIDEO TITLE**: Tiêu đề giật gân thu hút.",
    "2. **FULL MC SCRIPT**: Lời thoại tiếng Việt tự nhiên.",
    "3. **SCENE BY SCENE PLAN**: Bảng thời gian, hình ảnh, B-roll, Text Overlay.",
    "4. **GENERATED VIDEO PROMPT**: Chuỗi prompt tạo video hoạt họa MC chuẩn."
  ];

  return lines.join("\n");
};

export default function NewsPage() {
  const [urlInput, setUrlInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetchingLive, setFetchingLive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdatedTime, setLastUpdatedTime] = useState<string>("");
  
  // Search History State (Newest at top)
  const [searchHistory, setSearchHistory] = useState<NewsItem[]>([]);
  const [newsList, setNewsList] = useState<NewsItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  
  // Interactive Modal Reader State
  const [activeReadItem, setActiveReadItem] = useState<NewsItem | null>(null);
  const [copiedPromptId, setCopiedPromptId] = useState<string | null>(null);

  // Fetch Live RSS News
  const fetchLiveNews = useCallback(async (force = false) => {
    setFetchingLive(true);
    try {
      const res = await fetch("/api/fetch-live-news" + (force ? "?force=true" : ""));
      const json = await res.json();
      if (json.success && Array.isArray(json.data) && json.data.length > 0) {
        setNewsList(json.data);
        const timeStr = new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
        setLastUpdatedTime(timeStr);
        if (force) {
          toast.success("Đã cập nhật tin tức trực tiếp từ các tòa soạn!");
        }
      }
    } catch (err) {
      console.warn("Live news fetch warning:", err);
    } finally {
      setFetchingLive(false);
    }
  }, []);

  useEffect(() => {
    // Initial fetch
    fetchLiveNews(false);

    // Auto-refresh every 30 minutes (1,800,000 ms)
    const intervalId = setInterval(() => {
      console.log("Auto refreshing live news every 30 minutes...");
      fetchLiveNews(true);
    }, 30 * 60 * 1000);

    // Load search history
    if (typeof window !== "undefined") {
      try {
        const savedHistory = JSON.parse(localStorage.getItem("news_search_history_v5") || "[]");
        setSearchHistory(savedHistory);
      } catch {}
    }

    return () => clearInterval(intervalId);
  }, [fetchLiveNews]);

  const handleClearHistory = () => {
    if (!confirm("Bạn có chắc chắn muốn xóa toàn bộ lịch sử phân tích bài báo?")) return;
    setSearchHistory([]);
    if (typeof window !== "undefined") {
      localStorage.removeItem("news_search_history_v5");
    }
    toast.success("Đã dọn sạch lịch sử tìm kiếm bài báo!");
  };

  const handleAnalyze = async (targetUrl: string) => {
    if (!targetUrl.trim()) {
      toast.error("Vui lòng nhập đường link bài viết cần phân tích");
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/analyze-news", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: targetUrl.trim() }),
      });

      const resData = await res.json();

      if (resData.success && resData.data) {
        const d = resData.data;
        const newItem: NewsItem = {
          id: "news_hist_" + Date.now(),
          title: d.article?.title || d.analysis?.title || targetUrl,
          url: targetUrl.trim(),
          summary: d.analysis?.summary || d.article?.description || "Tóm tắt cốt lõi bài viết",
          category: "THOI_SU",
          categoryLabel: d.analysis?.category || "Thời Sự & Tin Nóng",
          source: d.article?.sourceDomain || "Internet",
          publishedAt: "Vừa xong",
          thumbnailUrl: d.article?.thumbnailUrl || "https://images.unsplash.com/photo-1585829365295-ab7cd400c167?w=600&q=80",
          contextCause: d.analysis?.whyItMatters || "Nội dung vừa được bóc tách trực tiếp từ link.",
          keyFacts: d.analysis?.keyFacts || ["Chi tiết bài viết được trích xuất tự động."],
          impactConclusion: d.analysis?.impactAnalysis || "Đánh giá tác động tin tức.",
          whyItMatters: d.analysis?.whyItMatters || "Thông tin quan trọng."
        };

        // Add to Search History (Newest at Top)
        const updatedHistory = [newItem, ...searchHistory.filter((h) => h.url !== newItem.url)];
        setSearchHistory(updatedHistory);
        if (typeof window !== "undefined") {
          localStorage.setItem("news_search_history_v5", JSON.stringify(updatedHistory));
        }

        // Add to active feed
        setNewsList((prev) => [newItem, ...prev.filter((n) => n.id !== newItem.id)]);

        // Open Modal Reader immediately
        setActiveReadItem(newItem);
        setUrlInput("");
        toast.success("Đã phân tích thành công bài báo! Mở cửa sổ đọc & xuất Prompt AI News Host.");
      } else {
        throw new Error(resData.error || "Không thể phân tích đường link này. Vui lòng kiểm tra lại URL.");
      }
    } catch (err: any) {
      console.error("Lỗi phân tích tin tức:", err);
      const msg = err?.message || "Không thể phân tích đường link này. Vui lòng kiểm tra lại.";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyAiPrompt = (item: NewsItem) => {
    const fullPrompt = buildAiNewsHostPrompt(item);
    navigator.clipboard.writeText(fullPrompt);
    setCopiedPromptId(item.id);
    toast.success("Đã copy toàn bộ Bài báo & Prompt AI News Video Host! Dán ngay vào Gemini/ChatGPT.");
    setTimeout(() => setCopiedPromptId(null), 2500);
  };

  const filteredNews = newsList
    .filter((item) => {
      if (selectedCategory === "ALL") return true;
      return item.category === selectedCategory;
    })
    .sort((a, b) => (b.pubDateTimestamp || 0) - (a.pubDateTimestamp || 0));

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/[0.06] pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="default" className="bg-red-600 text-white font-mono text-[10px] tracking-wider uppercase">
              LIVE NEWS CRAWLER (TỰ ĐỘNG CẬP NHẬT 30P)
            </Badge>
            <span className="inline-flex items-center gap-1 text-xs font-mono text-emerald-400 bg-emerald-950/40 border border-emerald-500/30 px-2 py-0.5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Auto Refresh 30m {lastUpdatedTime && "(" + lastUpdatedTime + ")"}
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Radar Tin Tức Live 24/7 & AI News Video Host
          </h1>
          <p className="text-sm text-zinc-400">
            Tự động lấy link báo mới từ các tòa soạn (VnExpress, Tuổi Trẻ, Thanh Niên, Dân Trí, CAND, CafeF, Znews...), cập nhật 30 phút/lần
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchLiveNews(true)}
            disabled={fetchingLive}
            className="border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10 text-xs shrink-0 font-semibold"
          >
            <RefreshCw className={"w-3.5 h-3.5 mr-1.5 " + (fetchingLive ? "animate-spin text-emerald-400" : "")} />
            {fetchingLive ? "Đang Cập Nhật..." : "Làm Mới Live (30 Phút)"}
          </Button>

          {searchHistory.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearHistory}
              className="border-red-500/30 text-red-400 hover:bg-red-500/10 text-xs shrink-0"
            >
              <Trash2 className="w-3.5 h-3.5 mr-1.5" />
              Xóa Lịch Sử
            </Button>
          )}
        </div>
      </div>

      {/* Search & Analyze Link Input Bar */}
      <Card className="bg-[#111117] border-white/[0.06]">
        <CardContent className="p-4 space-y-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleAnalyze(urlInput);
            }}
            className="flex flex-col sm:flex-row items-center gap-3"
          >
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <Input
                type="url"
                placeholder="Dán link bài báo trực tiếp (VnExpress, Tuổi Trẻ, Thanh Niên, Dân Trí, Báo Công An CAND, CafeF, GenK...)"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                className="pl-10 h-10 bg-zinc-900 border-zinc-800 text-xs text-white placeholder-zinc-500"
                required
              />
            </div>
            <Button
              type="submit"
              disabled={loading}
              className="h-10 px-5 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold w-full sm:w-auto shrink-0"
            >
              {loading ? (
                <>
                  <LoaderIcon />
                  Đang Phân Tích...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-1.5" />
                  Phân Tích & Lưu Lịch Sử
                </>
              )}
            </Button>
          </form>

          {/* Quick Source Chips Bar */}
          <div className="pt-2 border-t border-white/[0.04]">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Globe className="w-3.5 h-3.5 text-zinc-400" />
                <span className="text-[11px] font-mono text-zinc-400 font-semibold uppercase tracking-wider">
                  Nguồn RSS báo điện tử cập nhật 30 phút/lần:
                </span>
              </div>
              <span className="text-[11px] font-mono text-emerald-400 font-semibold">
                ● LIVE RSS STREAMING
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              {SUPPORTED_SOURCES.map((src) => (
                <button
                  key={src.name}
                  type="button"
                  onClick={() => {
                    setUrlInput(src.url);
                    toast.success("Đã nạp link RSS từ " + src.name + ". Bấm Phân Tích để bóc tách!");
                  }}
                  className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-zinc-800/80 hover:bg-red-600/20 hover:text-red-400 text-zinc-300 border border-zinc-700/60 transition-colors flex items-center gap-1"
                >
                  <Newspaper className="w-3 h-3 text-red-500" />
                  {src.name}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="mt-3 p-3 rounded-lg bg-red-950/40 border border-red-800/50 flex items-center gap-2 text-xs text-red-300">
              <ShieldAlert className="w-4 h-4 text-red-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* SECTION: LỊCH SỬ PHÂN TÍCH BÀI BÁO NÓNG (MỚI NHẤT XẾP ĐẦU) */}
      {searchHistory.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-red-400 text-sm font-extrabold uppercase tracking-wider">
              <History className="w-4 h-4 text-red-500" />
              <span>Lịch Sử Bài Báo Đã Phân Tích (Mới Nhất Trên Đầu)</span>
            </div>
            <span className="text-xs font-mono text-zinc-500">{searchHistory.length} bài báo đã lưu</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {searchHistory.map((item) => (
              <Card
                key={item.id}
                onClick={() => setActiveReadItem(item)}
                className="bg-[#111117] border border-red-500/30 hover:border-red-500 transition-all cursor-pointer flex flex-col justify-between group p-4"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2 text-[11px] font-mono">
                    <Badge variant="default" className="bg-red-600 text-white text-[10px]">
                      {item.categoryLabel}
                    </Badge>
                    <span className="text-emerald-400 font-bold">{item.publishedAt}</span>
                  </div>

                  <h3 className="font-bold text-sm text-zinc-100 group-hover:text-red-400 transition-colors leading-snug">
                    {item.title}
                  </h3>

                  <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed">
                    {item.summary}
                  </p>
                </div>

                <div className="flex items-center justify-between gap-2 pt-3 mt-3 border-t border-white/[0.04]">
                  <span className="text-[11px] font-mono text-zinc-500">{item.source}</span>
                  <div className="flex items-center gap-2">
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="text-xs text-blue-400 hover:underline flex items-center gap-1 font-semibold"
                    >
                      <ExternalLink className="w-3 h-3" />
                      Mở Bài Gốc
                    </a>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveReadItem(item);
                      }}
                      className="text-[11px] h-7 px-2 border-zinc-700 text-zinc-200"
                    >
                      <BookOpen className="w-3 h-3 mr-1 text-amber-400" />
                      Đọc Tóm Tắt
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Category Tabs Filter */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-zinc-300 text-sm font-extrabold uppercase tracking-wider">
            <Newspaper className="w-4 h-4 text-red-500" />
            <span>Kho Tin Tức Trực Tiếp Đa Kênh (Tự Động Cập Nhật 30 Phút)</span>
          </div>
          <span className="text-xs font-mono text-emerald-400 font-bold">
            Hiển thị {filteredNews.length} bài báo thực tế
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2 pb-2 overflow-x-auto">
          {CATEGORY_TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = selectedCategory === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setSelectedCategory(tab.id)}
                className={"px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 " + (
                  isActive
                    ? "bg-red-600 text-white shadow-lg shadow-red-600/20"
                    : "bg-[#111117] text-zinc-400 hover:text-white border border-white/[0.06] hover:border-white/[0.12]"
                )}
              >
                <Icon className={"w-3.5 h-3.5 " + (isActive ? "text-white" : "text-zinc-400")} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* News Feed Grid */}
        {fetchingLive && newsList.length === 0 ? (
          <div className="p-12 text-center space-y-3 bg-[#111117] rounded-xl border border-white/[0.06]">
            <LoaderIcon />
            <p className="text-sm font-semibold text-zinc-300">Đang tải nguồn tin tức trực tiếp từ các tòa soạn báo lớn...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredNews.map((item) => (
              <Card
                key={item.id}
                onClick={() => setActiveReadItem(item)}
                className="bg-[#111117] border-white/[0.06] hover:border-red-500/50 transition-all duration-200 cursor-pointer flex flex-col justify-between group overflow-hidden"
              >
                <div>
                  {item.thumbnailUrl && (
                    <div className="h-44 w-full relative overflow-hidden bg-zinc-900">
                      <img
                        src={item.thumbnailUrl}
                        alt={item.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = "none";
                        }}
                      />
                      <div className="absolute top-2 left-2 flex items-center gap-1.5">
                        <Badge variant="default" className="bg-black/80 backdrop-blur-md text-white text-[10px] font-mono">
                          {item.categoryLabel}
                        </Badge>
                      </div>
                      <div className="absolute bottom-2 right-2 bg-black/80 backdrop-blur-md px-2 py-0.5 rounded text-[11px] font-mono text-zinc-300">
                        {item.source}
                      </div>
                    </div>
                  )}

                  <div className="p-4 space-y-3">
                    <div className="flex items-center justify-between gap-2 text-[11px] font-mono text-zinc-500">
                      <span className="font-bold text-zinc-400">{item.source}</span>
                      <span className="flex items-center gap-1 text-emerald-400 font-semibold">
                        <Clock className="w-3 h-3" />
                        {item.publishedAt}
                      </span>
                    </div>

                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="font-bold text-base text-zinc-100 hover:text-red-400 transition-colors leading-snug flex items-start justify-between gap-1 group/link"
                    >
                      <span>{item.title}</span>
                      <ExternalLink className="w-4 h-4 text-zinc-500 group-hover/link:text-red-400 flex-shrink-0 mt-0.5" />
                    </a>

                    {/* Detailed Summary */}
                    <p className="text-xs text-zinc-400 line-clamp-3 leading-relaxed">
                      {item.summary}
                    </p>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="p-4 pt-0 border-t border-white/[0.04] space-y-2 mt-2">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2">
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="w-full inline-flex items-center justify-center gap-1 px-2 py-1.5 text-xs font-semibold rounded-md border border-blue-500/40 bg-blue-600/10 text-blue-400 hover:bg-blue-600/20 transition-colors h-8"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      Mở Bài Gốc
                    </a>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveReadItem(item);
                      }}
                      className="w-full text-xs h-8 border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                    >
                      <BookOpen className="h-3.5 w-3.5 mr-1 text-amber-400" />
                      Tóm Tắt & Prompt
                    </Button>

                    <Button
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCopyAiPrompt(item);
                      }}
                      className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold text-xs h-8"
                    >
                      {copiedPromptId === item.id ? (
                        <>
                          <Check className="h-3.5 w-3.5 mr-1 text-emerald-400" />
                          Đã Copy
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5 mr-1" />
                          Copy Prompt AI
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* CỬA SỔ NỔI NẰM NGANG (LANDSCAPE MODAL) ĐỌC BÁO ĐẦY ĐỦ KÈM BẢN TÓM TẮT & PROMPT */}
      {activeReadItem && (
        <Modal
          size="full"
          isOpen={!!activeReadItem}
          onClose={() => setActiveReadItem(null)}
          title={"Chi Tiết Bài Báo & Bản Tóm Tắt // " + activeReadItem.source}
        >
          <div className="space-y-6">
            {/* Modal Header Controls */}
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
              <div className="flex items-center gap-2">
                <Badge variant="default" className="bg-red-600 text-white text-[10px]">
                  {activeReadItem.categoryLabel}
                </Badge>
                <span className="text-xs font-mono text-zinc-300 font-bold">{activeReadItem.source}</span>
                <span className="text-xs text-emerald-400 font-mono">● {activeReadItem.publishedAt}</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setActiveReadItem(null)}
                className="h-8 border-red-500/40 text-red-400 hover:bg-red-500/10 text-xs font-semibold flex items-center gap-1.5"
              >
                <X className="w-4 h-4" />
                Tắt Cửa Sổ Nổi
              </Button>
            </div>

            {/* LANDSCAPE 2-COLUMN GRID (NẰM NGANG) */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
              {/* LEFT COLUMN (5 COLS): Image & Meta Links */}
              <div className="md:col-span-5 space-y-4">
                {activeReadItem.thumbnailUrl ? (
                  <div className="h-64 w-full rounded-xl overflow-hidden bg-zinc-900 border border-white/[0.08] shadow-md">
                    <img
                      src={activeReadItem.thumbnailUrl}
                      alt={activeReadItem.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="h-48 w-full rounded-xl bg-zinc-900 border border-white/[0.08] flex items-center justify-center text-zinc-500">
                    <Newspaper className="w-12 h-12" />
                  </div>
                )}

                <div className="p-4 rounded-xl bg-zinc-900/60 border border-white/[0.06] space-y-3">
                  <span className="text-xs font-mono font-bold text-zinc-400 uppercase tracking-wider block">
                    🌐 THÔNG TIN TRUY CẬP TRỰC TIẾP:
                  </span>
                  <a
                    href={activeReadItem.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-xs text-red-400 hover:underline font-mono truncate max-w-full"
                    title={activeReadItem.url}
                  >
                    <ExternalLink className="w-3.5 h-3.5 flex-shrink-0 text-red-500" />
                    <span className="truncate">{activeReadItem.url}</span>
                  </a>

                  <div className="pt-2 border-t border-white/[0.04] space-y-2">
                    <a
                      href={activeReadItem.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full inline-flex items-center justify-center gap-2 px-3 py-2.5 text-xs font-bold rounded-lg border border-blue-500/50 bg-blue-600/20 text-blue-300 hover:bg-blue-600/30 transition-colors shadow-md"
                    >
                      <ExternalLink className="w-4 h-4 text-blue-400" />
                      Mở Trực Tiếp Bài Viết Gốc ({activeReadItem.source})
                    </a>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setActiveReadItem(null)}
                      className="w-full text-xs h-9 border-zinc-800 text-zinc-400 hover:text-white"
                    >
                      <X className="w-3.5 h-3.5 mr-1 text-red-500" />
                      Tắt Cửa Sổ Nổi (Đóng Đọc Báo)
                    </Button>
                  </div>
                </div>
              </div>

              {/* RIGHT COLUMN (7 COLS): Full Detailed Summary & Copy Prompt CTA */}
              <div className="md:col-span-7 space-y-4">
                <h2 className="text-xl font-extrabold text-white leading-snug">
                  {activeReadItem.title}
                </h2>

                <div className="p-4 rounded-xl bg-zinc-900/90 border border-white/[0.08] space-y-4">
                  <div>
                    <h4 className="text-xs font-bold text-red-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                      <FileText className="w-4 h-4 text-red-500" />
                      Bản Tóm Tắt Cốt Lõi Chi Tiết:
                    </h4>
                    <p className="text-sm text-zinc-200 leading-relaxed font-sans">
                      {activeReadItem.summary}
                    </p>
                  </div>

                  {activeReadItem.contextCause && (
                    <div className="pt-3 border-t border-white/[0.06]">
                      <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-1">
                        💡 Bối cảnh & Nguyên nhân sự việc:
                      </h4>
                      <p className="text-xs text-zinc-300 leading-relaxed">
                        {activeReadItem.contextCause}
                      </p>
                    </div>
                  )}

                  {activeReadItem.keyFacts && activeReadItem.keyFacts.length > 0 && (
                    <div className="pt-3 border-t border-white/[0.06]">
                      <h4 className="text-xs font-bold text-sky-400 uppercase tracking-wider mb-1.5">
                        📊 Các diễn biến & Con số trọng tâm:
                      </h4>
                      <ul className="list-disc list-inside space-y-1.5 text-xs text-zinc-300">
                        {activeReadItem.keyFacts.map((fact, idx) => (
                          <li key={idx}>{fact}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {activeReadItem.impactConclusion && (
                    <div className="pt-3 border-t border-white/[0.06]">
                      <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-1">
                        📈 Tác động & Đánh giá kết luận:
                      </h4>
                      <p className="text-xs text-zinc-300 leading-relaxed">
                        {activeReadItem.impactConclusion}
                      </p>
                    </div>
                  )}
                </div>

                {/* Primary CTA Button inside Landscape Modal */}
                <div className="pt-2">
                  <Button
                    size="sm"
                    onClick={() => {
                      handleCopyAiPrompt(activeReadItem);
                    }}
                    className="w-full bg-red-600 hover:bg-red-700 text-white font-bold text-sm h-11 shadow-lg shadow-red-600/20"
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copy Prompt AI News Host (Kịch Bản + Bài Báo)
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

function LoaderIcon() {
  return <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-1.5" />;
}

function X({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}
