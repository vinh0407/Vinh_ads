'use client';

import { matchProductToContent, stripHashtags, getMultipleMatchedProducts } from '@/lib/smart-product-matcher';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Bot,
  Play,
  OctagonX,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Send,
  Eye,
  Check,
  X,
  Sparkles,
  ShieldAlert,
  Film,
  MessageSquare,
  ShoppingBag,
  Trash2,
  GripVertical,
  Flame,
  Facebook,
  Zap,
  Calendar,
  Layers,
  ArrowRight,
  Shuffle,
  RotateCcw,
  ChevronDown,
  Plus,
  Link as LinkIcon,
  Image as ImageIcon,
  Sliders,
  CheckSquare,
  Settings2,
  Edit,
  Filter,
  CheckSquare2,
  Square,
  Wrench,
  Save,
  Instagram,
  Youtube,
  Globe,
  Newspaper,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { api, productsApi } from '@/lib/api';
import toast from 'react-hot-toast';
import { safeSetLocalStorage } from '@/lib/utils';

interface PipelineStep {
  id: string;
  name: string;
  desc: string;
  enabled: boolean;
  category: 'TEXT' | 'MEDIA' | 'LINK' | 'COMMENT' | 'TIME' | 'PUBLISH';
}

interface MissionStep {
  id: string;
  agent: string;
  title: string;
  status: 'PENDING' | 'RUNNING' | 'DONE' | 'WAITING_APPROVAL' | 'FAILED' | 'ABORTED';
  details?: string;
  output?: any;
}

interface MissionExecution {
  id: string;
  goal: string;
  type: 'THREADS_ONLY' | 'FACEBOOK_ONLY' | 'ALL_IN_ONE' | 'CUSTOM_AUTO';
  status: 'RUNNING' | 'COMPLETED' | 'STOPPED';
  steps: MissionStep[];
  postsCreated: number;
  scheduledTimes: string[];
  createdAt: string;
}

interface AutoPresetItem {
  id: string;
  name: string;
  desc: string;
  type: 'THREADS_ONLY' | 'FACEBOOK_ONLY' | 'ALL_IN_ONE' | 'CUSTOM_AUTO';
  icon: 'threads' | 'facebook' | 'all' | 'custom';
  postCount?: number;
  channelIds?: string[];
  shopeeProductIds?: string[];
  mediaItemIds?: string[];
  startHour?: string;
  endHour?: string;
}

// Fallback Default Accounts (If /dashboard/Socialmedia has no data yet)
const DEFAULT_SOCIAL_ACCOUNTS = [
  { id: 'soc_fb_1', name: 'Shopee Việt Nam Fanpage', platform: 'FACEBOOK', handle: '@shopeevn', url: 'https://facebook.com/shopeevn' },
  { id: 'soc_fb_2', name: 'Cộng Đồng Tinh Tế', platform: 'FACEBOOK', handle: '@tinhte', url: 'https://facebook.com/tinhte' },
  { id: 'soc_th_1', name: 'Thảo Tâm Story', platform: 'THREADS', handle: '@thaotam.story', url: 'https://threads.net/@thaotam.story' },
  { id: 'soc_th_2', name: 'Schannel Official', platform: 'THREADS', handle: '@schannelvn', url: 'https://threads.net/@schannelvn' },
  { id: 'soc_yt_1', name: 'Góc Review Công Nghệ', platform: 'YOUTUBE', handle: '@reviewtech', url: 'https://youtube.com' },
];

// Fallback Default Shopee Products (If /dashboard/products has no data yet)
const DEFAULT_SHOPEE_PRODUCTS = [
  { id: 'p1', name: 'Khăn giấy cao cấp Top Gia (Lốc 10 gói)', url: 'https://s.shopee.vn/9zxfyMkHS5', price: '106.250đ', imgUrl: 'https://images.unsplash.com/photo-1584992236310-6edddc08acff?w=200&q=80' },
  { id: 'p2', name: 'Bộ thun lụa lạnh dài tay cho Bé trai, Bé gái', url: 'https://s.shopee.vn/gPxzs7jlZ', price: '139.000đ', imgUrl: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=200&q=80' },
  { id: 'p3', name: 'Tai nghe Bluetooth không dây chống ồn TWS', url: 'https://s.shopee.vn/7fHx82kLp', price: '199.000đ', imgUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=200&q=80' },
  { id: 'p4', name: 'Nồi chiên không dầu Lock&Lock 5.5L', url: 'https://s.shopee.vn/3kLx91mNq', price: '890.000đ', imgUrl: 'https://images.unsplash.com/photo-1584992236310-6edddc08acff?w=200&q=80' },
  { id: 'p5', name: 'Son kem lì Hàn Quốc Romand Zero Velvet', url: 'https://s.shopee.vn/5aQz10pRs', price: '145.000đ', imgUrl: 'https://images.unsplash.com/photo-1586495777744-4413f21062fa?w=200&q=80' },
  { id: 'p6', name: 'Bộ lau nhà thông minh tự vắt 360 độ', url: 'https://s.shopee.vn/8bWy22qTu', price: '210.000đ', imgUrl: 'https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?w=200&q=80' },
  { id: 'p7', name: 'Đồng hồ thông minh Smartwatch T800 Ultra', url: 'https://s.shopee.vn/1cVz33rVw', price: '290.000đ', imgUrl: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=200&q=80' },
  { id: 'p8', name: 'Xịt thơm quần áo giữ hương 24h Grace', url: 'https://s.shopee.vn/4dWz44sXy', price: '85.000đ', imgUrl: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=200&q=80' },
  { id: 'p9', name: 'Gối cao su non chống đau cổ vai thần kinh', url: 'https://s.shopee.vn/6eXz55tZz', price: '175.000đ', imgUrl: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=200&q=80' },
];

// Fallback Default Media Items (If /dashboard/albumpost has no data yet)
const DEFAULT_MEDIA_ITEMS: any[] = [];


const DEFAULT_NEWS_ARTICLES = [
  { id: 'news_1', title: 'Xu hướng ứng dụng AI & Tự động hóa trong quản trị doanh nghiệp 2026', summary: 'Phân tích chiều sâu về việc tích hợp trí tuệ nhân tạo vào sản xuất nội dung số và affiliate marketing.', source: 'VnExpress', category: 'CONG_NGHE', thumbnailUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=200&q=80' },
  { id: 'news_2', title: 'Thị trường Thương mại Điện tử Việt Nam tăng trưởng bứt phá trong quý 3', summary: 'Báo cáo mới nhất cho thấy doanh số thương mại điện tử qua kênh affiliate đạt mốc kỷ lục.', source: 'CafeF', category: 'KINH_TE', thumbnailUrl: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=200&q=80' },
  { id: 'news_3', title: 'Bí quyết xây dựng kênh Threads thu hút triệu lượt tương tác tự nhiên', summary: 'Chiến lược sáng tạo nội dung ngắn, không chèn link rác trong caption chính để tối ưu thuật toán phân phối.', source: 'Znews', category: 'XA_HOI', thumbnailUrl: 'https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=200&q=80' },
  { id: 'news_4', title: 'Ngân hàng Nhà nước ban hành quy định mới về thanh toán điện tử', summary: 'Các chính sách ưu đãi tài chính và thúc đẩy hạ tầng thanh toán không dùng tiền mặt toàn quốc.', source: 'Báo Tuổi Trẻ', category: 'THOI_SU', thumbnailUrl: 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=200&q=80' },
  { id: 'news_5', title: 'Giải pháp tối ưu hóa logistics và kho vận cho các gian hàng Shopee', summary: 'Ứng dụng công nghệ giao hàng siêu tốc 2h giúp nâng cao trải nghiệm khách hàng và tỉ lệ hoàn đơn.', source: 'VietNamNet', category: 'KINH_TE', thumbnailUrl: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=200&q=80' },
  { id: 'news_6', title: 'Đòn bẩy công nghệ giúp các Creator bứt phá doanh thu Affiliate', summary: 'Hướng dẫn tự động hóa quy trình rải link sản phẩm thông minh dưới phần bình luận.', source: 'GenK', category: 'CONG_NGHE', thumbnailUrl: 'https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=200&q=80' },
  { id: 'news_7', title: 'Hội thảo Quốc tế về Trí tuệ Nhân tạo và Xu hướng Tiêu dùng số', summary: 'Các chuyên gia hàng đầu thảo luận về tương lai của mua sắm trực tuyến gắn với các nền tảng mạng xã hội.', source: 'Báo Thanh Niên', category: 'THE_GIOI', thumbnailUrl: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=200&q=80' },
  { id: 'news_8', title: 'Cập nhật chính sách thuật toán mới của Meta cho Threads và Facebook', summary: 'Meta tập trung ưu tiên nội dung góc nhìn trải nghiệm cá nhân và hạn chế các bài đăng spam.', source: 'Znews', category: 'CONG_NGHE', thumbnailUrl: 'https://images.unsplash.com/photo-1611162616305-c69b3fa7fbe0?w=200&q=80' },
  { id: 'news_9', title: 'Thói quen tiêu dùng thông minh của thế hệ trẻ trong thời đại số', summary: 'Xu hướng chọn mua các sản phẩm gia dụng tiện ích có lượt đánh giá cao trên Shopee.', source: 'Báo Dân Trí', category: 'XA_HOI', thumbnailUrl: 'https://images.unsplash.com/photo-1511556532299-8f662fc26c06?w=200&q=80' },
  { id: 'news_10', title: 'Chương trình kích cầu thương mại và mua sắm trực tuyến cuối năm', summary: 'Loạt mã giảm giá và chương trình ưu đãi hấp dẫn dành cho người tiêu dùng trên các sàn TMĐT.', source: 'CafeF', category: 'KINH_TE', thumbnailUrl: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=200&q=80' },
];

const DEFAULT_PRESETS: AutoPresetItem[] = [
  {
    id: 'preset_th',
    name: '🚀 Auto Threads ReUp (Threads Only)',
    desc: 'Chỉ đăng Meta Threads + N bình luận Shopee độc lập + Rải giờ random.',
    type: 'THREADS_ONLY',
    icon: 'threads',
    postCount: 1,
  },
  {
    id: 'preset_fb',
    name: '🚀 Auto Facebook Media (FB Fanpage Only)',
    desc: '9 bài 9 Ảnh/Video khác nhau + 9 bình luận Shopee/bài.',
    type: 'FACEBOOK_ONLY',
    icon: 'facebook',
    postCount: 1,
  },
  {
    id: 'preset_all',
    name: '⚡ All-In-One Full Auto-Pilot',
    desc: 'Khởi chạy đồng thời cả Threads ReUp & Facebook Media cùng lúc.',
    type: 'ALL_IN_ONE',
    icon: 'all',
    postCount: 1,
  },
];


function getUniqueScrapedCaption(index: number): string {
  let pool: string[] = [];
  if (typeof window !== 'undefined') {
    try {
      const localAlbum: any[] = JSON.parse(localStorage.getItem('custom_album_posts') || '[]');
      localAlbum.forEach((item) => {
        if (item?.caption || item?.title) pool.push(item.caption || item.title);
      });
      const localSrc: any[] = JSON.parse(localStorage.getItem('custom_sources') || '[]');
      localSrc.forEach((s) => {
        if (s?.content) pool.push(s.content);
      });
    } catch {}
  }
  if (pool.length === 0) {
    pool = [
      "Những thói quen nhỏ giúp bạn tiết kiệm được 2 triệu mỗi tháng mà không cảm thấy cuộc sống bị gò bó hay kham khổ.",
      "Đi làm 3 năm tích lũy được 200 triệu thì nên đầu tư vào đâu hay gửi tiết kiệm ngân hàng cho an toàn mng ơi?",
      "Review chân thực nhất về trải nghiệm sử dụng thực tế và cách bảo quản tốt nhất.",
      "Bí quyết decor góc làm việc tối giản tại nhà giúp truyền cảm hứng mỗi sáng thức dậy.",
      "Kinh nghiệm tự trải nghiệm và lựa chọn sản phẩm chất lượng vượt trội."
    ];
  }
  const raw = pool[index % pool.length];
  const cleaned = stripHashtags(raw.replace(/https?:\/\/[^\s]+/gi, '').trim());
  return cleaned || ("Nội dung chia sẻ bài viết #" + (index + 1));
}

export default function MissionsPage() {

  const [editingMission, setEditingMission] = useState<MissionExecution | null>(null);
  const [editGoalText, setEditGoalText] = useState('');
  const [editTargetThreads, setEditTargetThreads] = useState(true);
  const [editTargetFacebook, setEditTargetFacebook] = useState(true);

  const handleOpenEditMission = (mission: MissionExecution) => {
    setEditingMission(mission);
    setEditGoalText(mission.goal);
    setEditTargetThreads(mission.type === 'THREADS_ONLY' || mission.type === 'ALL_IN_ONE' || mission.type === 'CUSTOM_AUTO');
    setEditTargetFacebook(mission.type === 'FACEBOOK_ONLY' || mission.type === 'ALL_IN_ONE' || mission.type === 'CUSTOM_AUTO');
  };

  const handleSaveEditedMission = () => {
    if (!editingMission) return;
    if (!editGoalText.trim()) {
      toast.error('Tên/Mục tiêu nhiệm vụ không được để trống!');
      return;
    }

    let newType: MissionExecution['type'] = editingMission.type;
    if (editTargetThreads && !editTargetFacebook) newType = 'THREADS_ONLY';
    else if (!editTargetThreads && editTargetFacebook) newType = 'FACEBOOK_ONLY';
    else if (editTargetThreads && editTargetFacebook) newType = 'ALL_IN_ONE';

    const updatedMissions = missions.map((m) => {
      if (m.id === editingMission.id) {
        return {
          ...m,
          goal: editGoalText.trim(),
          type: newType,
        };
      }
      return m;
    });

    setMissions(updatedMissions);
    if (typeof window !== 'undefined') {
      localStorage.setItem('custom_missions', JSON.stringify(updatedMissions));
    }

    setEditingMission(null);
    toast.success('⚡ Đã cập nhật thành công nội dung Auto Mission!');
  };

  const handleRunPresetMission = async (preset: AutoPresetItem) => {
    setIsDropdownOpen(false);
    setLoading(true);
    try {
      const times = generateRandomScheduleTimes(preset.postCount || 1);
      const activeProducts = (preset.shopeeProductIds && preset.shopeeProductIds.length > 0)
        ? shopeeProducts.filter((p) => preset.shopeeProductIds?.includes(p.id))
        : shopeeProducts;

      const commentBlocks = activeProducts.map((p) => '👉 Link mua ' + p.name + ' chính hãng [Ưu đãi hôm nay]: ' + p.url + ' ⚡');
      const multiCommentText = commentBlocks.join('\n\n');

      const pickedNews = newsArticles.filter((n) => selectedNewsIds.includes(n.id));
      const activeNews = pickedNews.length > 0 ? pickedNews : newsArticles;

      const count = preset.postCount || 1;
      const newAlbumItems: any[] = [];
      const platforms: ('FACEBOOK' | 'THREADS')[] = [];
      if (preset.type === 'THREADS_ONLY' || preset.type === 'ALL_IN_ONE' || preset.type === 'CUSTOM_AUTO') platforms.push('THREADS');
      if (preset.type === 'FACEBOOK_ONLY' || preset.type === 'ALL_IN_ONE' || preset.type === 'CUSTOM_AUTO') platforms.push('FACEBOOK');

      for (let i = 0; i < count; i++) {
        const timeISO = times[i % times.length];
        const newsItem = activeNews[i % activeNews.length];
        const rawCaption = newsItem ? (newsItem.title + '\n\n' + (newsItem.summary || '')) : getUniqueScrapedCaption(i);
        const cleanCaption = stripHashtags(stripLinks(rawCaption));
        const newsImage = newsItem?.thumbnailUrl || newsItem?.imageUrl || '';

        newAlbumItems.push({
          id: 'preset_run_' + Date.now() + '_' + (i + 1),
          title: '[' + preset.name + ' #' + (i + 1) + '] ' + (newsItem?.title || 'Bài báo #' + (i + 1)),
          caption: cleanCaption,
          comment: multiCommentText,
          firstCommentText: multiCommentText,
          mediaType: newsImage ? 'IMAGE' : 'TEXT',
          mediaUrl: newsImage,
          thumbnailUrl: newsImage,
          platforms,
          scheduledAt: timeISO,
          status: 'SCHEDULED',
          createdAt: new Date().toISOString(),
        });
      }

      const existingAlbum: any[] = JSON.parse(localStorage.getItem('custom_album_posts') || '[]');
      safeSetLocalStorage('custom_album_posts', [...newAlbumItems, ...existingAlbum], 60);

      const newMission: MissionExecution = {
        id: 'mission_' + Date.now(),
        goal: preset.name + ': Đăng ' + count + ' bài kèm ' + commentBlocks.length + ' bình luận Shopee',
        type: preset.type,
        status: 'COMPLETED',
        postsCreated: count,
        scheduledTimes: times.map((t) => t.split('T')[1].slice(0, 5)),
        steps: [
          { id: '1', agent: 'TOOL_LAUNCHER', title: 'Khởi chạy Preset: "' + preset.name + '"', status: 'DONE' },
          { id: '2', agent: 'NEWS_FETCHER', title: 'Tự động lấy bài & hình ảnh từ Radar Tin Tức (/dashboard/news)', status: 'DONE' },
          { id: '3', agent: 'SHOPEE_PARSER', title: 'Nối link Shopee kho Affiliate', status: 'DONE' },
          { id: '4', agent: 'RANDOM_SCHEDULER', title: 'Xếp mốc giờ đăng ngẫu nhiên trong ngày', status: 'DONE' },
          { id: '5', agent: 'PUBLISHER', title: 'Đẩy bài vào Hàng Đợi Lên Lịch xuất bản', status: 'DONE' },
        ],
        createdAt: new Date().toISOString(),
      };

      setMissions((prev) => {
        const updated = [newMission, ...prev];
        localStorage.setItem('custom_missions', JSON.stringify(updated));
        return updated;
      });

      toast.success('⚡ Đã kích hoạt Preset: "' + preset.name + '" thành công!');
    } catch {
      toast.error('Có lỗi xảy ra khi chạy Preset.');
    } finally {
      setLoading(false);
    }
  };

  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [missions, setMissions] = useState<MissionExecution[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // PRESETS LIST & UNIFIED BUILDER MODAL
  const [presets, setPresets] = useState<AutoPresetItem[]>(DEFAULT_PRESETS);
  const [isUnifiedBuilderOpen, setIsUnifiedBuilderOpen] = useState(false);
  const [editingPreset, setEditingPreset] = useState<AutoPresetItem | null>(null);

  // DYNAMIC DATA FROM THE 3 TARGET PAGES
  const [socialAccounts, setSocialAccounts] = useState<any[]>(DEFAULT_SOCIAL_ACCOUNTS);
  const [shopeeProducts, setShopeeProducts] = useState<any[]>(DEFAULT_SHOPEE_PRODUCTS);
  const [mediaAlbumItems, setMediaAlbumItems] = useState<any[]>(DEFAULT_MEDIA_ITEMS);
  const [newsArticles, setNewsArticles] = useState<any[]>(DEFAULT_NEWS_ARTICLES);
  const [selectedNewsIds, setSelectedNewsIds] = useState<string[]>([]);
  const [threadsSpyPosts, setThreadsSpyPosts] = useState<any[]>([]);
  const [selectedThreadsSpyIds, setSelectedThreadsSpyIds] = useState<string[]>([]);

  // FORM FIELDS INSIDE UNIFIED BUILDER MODAL
  const [toolNameInput, setToolNameInput] = useState('');
  const [toolDescInput, setToolDescInput] = useState('');
  const [postCountInput, setPostCountInput] = useState(1);

  const [selectedChannelIds, setSelectedChannelIds] = useState<string[]>([]);
  const [selectedShopeeIds, setSelectedShopeeIds] = useState<string[]>([]);
  const [selectedMediaIds, setSelectedMediaIds] = useState<string[]>([]);

  const [startHourInput, setStartHourInput] = useState('08:00');
  const [endHourInput, setEndHourInput] = useState('22:00');
  const [enableJitterInput, setEnableJitterInput] = useState(true);

  // Filter Platform State for History Log
  const [filterPlatform, setFilterPlatform] = useState<'ALL' | 'THREADS' | 'FACEBOOK'>('ALL');

  // DRAG AND DROP PIPELINE STEPS
  const [pipelineSteps, setPipelineSteps] = useState<PipelineStep[]>([
    { id: 'step_text', name: '1. Giai Đoạn Text: Lấy/Tạo Văn Bản Bài Viết (Caption)', desc: 'Tự động cào từ Sources hoặc tạo bài theo câu lệnh AI', enabled: true, category: 'TEXT' },
    { id: 'step_media', name: '2. Giai Đoạn Hình Ảnh: Tự Động Lấy Hình Ảnh Từ Bài Báo Radar Tin Tức', desc: 'Sử dụng hình ảnh minh họa đính kèm thực tế từ bài báo đã chọn', enabled: true, category: 'MEDIA' },
    { id: 'step_link', name: '3. Giai Đoạn Link: Lọc Link Rác & Ghép Link Shopee Affiliate', desc: 'Lọc bỏ link quảng cáo rác, gắn link Shopee Affiliate của bạn', enabled: true, category: 'LINK' },
    { id: 'step_comment', name: '4. Giai Đoạn Comment: Tự Tách N Bình Luận (1 Comment/1 Link SP)', desc: 'Mỗi sản phẩm Shopee được tách thành 1 bình luận độc lập', enabled: true, category: 'COMMENT' },
    { id: 'step_time', name: '5. Giai Đoạn Time: Phân Bổ Giờ Đăng & Sai Số Random Time', desc: 'Rải mốc giờ ngẫu nhiên trong ngày tránh bị thuật toán chặn', enabled: true, category: 'TIME' },
    { id: 'step_publish', name: '6. Giai Đoạn Xuất Bản: Đăng Lên Meta Threads / FB Fanpage', desc: 'Đẩy bài vào hàng chờ xuất bản tự động trên hệ thống', enabled: true, category: 'PUBLISH' },
  ]);

  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  // DYNAMIC DATA LOADING FROM THE 3 PAGES:
  // 1. /dashboard/Socialmedia
  // 2. /dashboard/products
  // 3. /dashboard/albumpost
  const loadDynamicData = useCallback(async () => {
    if (typeof window === 'undefined') return;

    // 1. Load Social Accounts from /dashboard/Socialmedia (localStorage key: custom_social_accounts or custom_facebook_pages or custom_sources)
    try {
      let loadedSocial: any[] = [];
      const socRaw = localStorage.getItem('custom_social_accounts');
      if (socRaw) {
        loadedSocial = JSON.parse(socRaw);
      }
      const fbRaw = localStorage.getItem('custom_facebook_pages');
      if (fbRaw) {
        const parsedFb = JSON.parse(fbRaw);
        parsedFb.forEach((fb: any) => {
          loadedSocial.push({
            id: fb.id || 'soc_fb_' + fb.pageId,
            name: fb.pageName,
            platform: 'FACEBOOK',
            handle: fb.pageId ? '@' + fb.pageId : '@fanpage',
          });
        });
      }
      const srcRaw = localStorage.getItem('custom_sources');
      if (srcRaw) {
        const parsedSrc = JSON.parse(srcRaw);
        parsedSrc.forEach((s: any) => {
          loadedSocial.push({
            id: s.id || 'src_' + s.platformPageId,
            name: s.pageName,
            platform: s.platform || 'FACEBOOK',
            handle: '@' + s.platformPageId,
          });
        });
      }

      if (loadedSocial.length > 0) {
        const deduplicated = Array.from(new Map(loadedSocial.map((item) => [item.id || item.name, item])).values());
        setSocialAccounts(deduplicated);
      } else {
        setSocialAccounts(DEFAULT_SOCIAL_ACCOUNTS);
      }
    } catch {
      setSocialAccounts(DEFAULT_SOCIAL_ACCOUNTS);
    }

    // 2. Load Shopee Products from /dashboard/products (localStorage key: custom_affiliate_products or productsApi)
    try {
      let loadedProds: any[] = [];
      try {
        const res = await productsApi.list();
        if (res.data?.data) loadedProds = res.data.data;
      } catch {}

      const localProdsRaw = localStorage.getItem('custom_affiliate_products');
      if (localProdsRaw) {
        const parsedLocal = JSON.parse(localProdsRaw);
        loadedProds = [...loadedProds, ...parsedLocal];
      }

      if (loadedProds.length > 0) {
        const dedupProds = Array.from(new Map(loadedProds.map((p) => [p.id || p.name, p])).values()).map((p: any) => ({
          id: p.id || 'p_' + Date.now(),
          name: p.name || 'Sản phẩm Shopee',
          url: p.affiliateLinks?.[0]?.affiliateUrl || p.shopeeUrl || 'https://s.shopee.vn/9zxfyMkHS5',
          price: p.price ? (typeof p.price === 'number' ? p.price.toLocaleString('vi-VN') + 'đ' : p.price) : '139.000đ',
          imgUrl: p.imageUrl || 'https://images.unsplash.com/photo-1584992236310-6edddc08acff?w=200&q=80',
        }));
        setShopeeProducts(dedupProds);
      } else {
        setShopeeProducts(DEFAULT_SHOPEE_PRODUCTS);
      }
    } catch {
      setShopeeProducts(DEFAULT_SHOPEE_PRODUCTS);
    }

    // 3. Load Media Items from /dashboard/albumpost (localStorage key: custom_album_posts)
    try {
      const albumRaw = localStorage.getItem('custom_album_posts');
      if (albumRaw) {
        const parsedAlbum = JSON.parse(albumRaw);
        if (Array.isArray(parsedAlbum) && parsedAlbum.length > 0) {
          const formattedMedia = parsedAlbum
            .filter((item: any) => item && (item.mediaUrl || item.thumbnailUrl))
            .map((item: any) => ({
              id: item.id || 'm_' + Date.now(),
              title: item.title || item.caption?.slice(0, 35) || 'Tệp Media Kho Album',
              mediaType: item.mediaType || 'IMAGE',
              url: item.thumbnailUrl || item.mediaUrl || 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=600&q=80',
            }));

          if (formattedMedia.length > 0) {
            const dedupMedia = Array.from(new Map(formattedMedia.map((m) => [m.id || m.title, m])).values());
            setMediaAlbumItems(dedupMedia);
          } else {
            setMediaAlbumItems(DEFAULT_MEDIA_ITEMS);
          }
        } else {
          setMediaAlbumItems(DEFAULT_MEDIA_ITEMS);
        }
      } else {
        setMediaAlbumItems(DEFAULT_MEDIA_ITEMS);
      }
    } catch {
      setMediaAlbumItems(DEFAULT_MEDIA_ITEMS);
    }
  }, []);

  // Load presets & dynamic data on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('custom_auto_presets');
        if (saved) {
          setPresets(JSON.parse(saved));
        }
        const cachedNews = localStorage.getItem('cached_live_news_articles');
        if (cachedNews) {
          const parsed = JSON.parse(cachedNews);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setNewsArticles(parsed);
          }
        }
      } catch {}
    }
    try {
      fetch('/api/threads/trending')
      .then((res) => res.json())
      .then((resJson) => {
        if (resJson && resJson.success && Array.isArray(resJson.data) && resJson.data.length > 0) {
          setThreadsSpyPosts(resJson.data);
        }
      })
      .catch(() => {});

    fetch('/api/fetch-live-news')
        .then((res) => res.json())
        .then((resJson) => {
          const list = resJson?.data || resJson?.articles;
          if (resJson && resJson.success && Array.isArray(list) && list.length > 0) {
            setNewsArticles(list);
            if (typeof window !== 'undefined') {
              localStorage.setItem('cached_live_news_articles', JSON.stringify(list));
            }
          }
        })
        .catch(() => {});
    } catch {}
    loadDynamicData();
  }, [loadDynamicData]);

  const savePresetsToStorage = (updated: AutoPresetItem[]) => {
    setPresets(updated);
    if (typeof window !== 'undefined') {
      localStorage.setItem('custom_auto_presets', JSON.stringify(updated));
    }
  };

  // OPEN UNIFIED BUILDER MODAL TO CREATE NEW AUTO TOOL
  const handleOpenCreateUnifiedToolModal = () => {
    setIsDropdownOpen(false);
    setEditingPreset(null);

    setToolNameInput('✨ Tool Auto Mới #' + (presets.length + 1));
    setToolDescInput('Tự động hóa cào bài, ghép link Shopee & đăng đa kênh.');
    setPostCountInput(9);

    setSelectedChannelIds(socialAccounts.map((a) => a.id));
    setSelectedShopeeIds(shopeeProducts.map((p) => p.id));
    setSelectedMediaIds(mediaAlbumItems.map((m) => m.id));

    setStartHourInput('08:00');
    setEndHourInput('22:00');
    setEnableJitterInput(true);

    setIsUnifiedBuilderOpen(true);
  };

  // OPEN UNIFIED BUILDER MODAL TO EDIT EXISTING AUTO TOOL (EDIT BOTH NAME & FEATURES)
  const handleOpenEditPresetModal = (preset: AutoPresetItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDropdownOpen(false);

    setEditingPreset(preset);
    setToolNameInput(preset.name);
    setToolDescInput(preset.desc);
    setPostCountInput(preset.postCount || 1);

    if (preset.channelIds && preset.channelIds.length > 0) {
      setSelectedChannelIds(preset.channelIds);
    } else {
      setSelectedChannelIds(socialAccounts.map((a) => a.id));
    }

    if (preset.shopeeProductIds && preset.shopeeProductIds.length > 0) {
      setSelectedShopeeIds(preset.shopeeProductIds);
    } else {
      setSelectedShopeeIds(shopeeProducts.map((p) => p.id));
    }

    if (preset.mediaItemIds && preset.mediaItemIds.length > 0) {
      setSelectedMediaIds(preset.mediaItemIds);
    } else {
      setSelectedMediaIds(mediaAlbumItems.map((m) => m.id));
    }

    setStartHourInput(preset.startHour || '08:00');
    setEndHourInput(preset.endHour || '22:00');
    setEnableJitterInput(true);

    setIsUnifiedBuilderOpen(true);
  };

  // DELETE PRESET AUTO TOOL FROM DROPDOWN LIST
  const handleDeletePreset = (presetId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Bạn có chắc muốn xóa Tool Auto này khỏi danh sách xổ xuống?')) return;
    const updated = presets.filter((p) => p.id !== presetId);
    savePresetsToStorage(updated);
    toast.success('Đã xóa Tool Auto khỏi danh sách!');
  };

  // Helper: Generate randomized schedule timestamps within time window
  const generateRandomScheduleTimes = (count: number, sHStr = '08:00', eHStr = '22:00', jitter = true): string[] => {
    const times: string[] = [];
    const [sH, sM] = sHStr.split(':').map(Number);
    const [eH, eM] = eHStr.split(':').map(Number);

    const startTotal = sH * 60 + sM;
    const endTotal = eH * 60 + eM;
    const duration = Math.max(60, endTotal - startTotal);
    const stepInterval = duration / Math.max(1, count);

    const todayStr = new Date().toISOString().split('T')[0];

    for (let i = 0; i < count; i++) {
      let baseMinutes = startTotal + i * stepInterval;
      if (jitter) {
        const offset = Math.floor(Math.random() * 35) - 15;
        baseMinutes = Math.max(startTotal, Math.min(endTotal, baseMinutes + offset));
      }
      const hour = Math.floor(baseMinutes / 60);
      const minute = Math.floor(baseMinutes % 60);
      const hStr = String(hour).padStart(2, '0');
      const mStr = String(minute).padStart(2, '0');
      times.push(todayStr + 'T' + hStr + ':' + mStr + ':00.000Z');
    }

    return times;
  };

  // Helper: Strip links from text
  const stripLinks = (str: string) => {
    if (!str) return '';
    return str.replace(/https?:\/\/[^\s]+/gi, '').replace(/[ \t]{2,}/g, ' ').trim();
  };

  // SAVE UPDATED PRESET OR RUN IT IMMEDIATELY
  const handleSaveOrRunUnifiedPreset = async (actionType: 'SAVE_PRESET' | 'RUN_NOW') => {
    if (!toolNameInput.trim()) {
      toast.error('Vui lòng nhập Tên Tool Auto!');
      return;
    }
    if (selectedChannelIds.length === 0) {
      toast.error('Vui lòng tích chọn ít nhất 1 Trang/Kênh từ /dashboard/Socialmedia!');
      return;
    }

    const selectedChannels = socialAccounts.filter((a) => selectedChannelIds.includes(a.id));
    const hasThreads = selectedChannels.some((c) => c.platform === 'THREADS');
    const hasFacebook = selectedChannels.some((c) => c.platform === 'FACEBOOK');

    let toolType: AutoPresetItem['type'] = 'ALL_IN_ONE';
    if (hasThreads && !hasFacebook) toolType = 'THREADS_ONLY';
    if (!hasThreads && hasFacebook) toolType = 'FACEBOOK_ONLY';

    const updatedPresetItem: AutoPresetItem = {
      id: editingPreset ? editingPreset.id : 'preset_' + Date.now(),
      name: toolNameInput.trim(),
      desc: toolDescInput.trim() || 'Tự động cào bài, ghép link Shopee & rải giờ ngẫu nhiên.',
      type: toolType,
      icon: toolType === 'THREADS_ONLY' ? 'threads' : toolType === 'FACEBOOK_ONLY' ? 'facebook' : 'all',
      postCount: postCountInput,
      channelIds: selectedChannelIds,
      shopeeProductIds: selectedShopeeIds,
      mediaItemIds: [],
      startHour: startHourInput,
      endHour: endHourInput,
    };

    // Save to Presets
    let newPresetList = presets;
    if (editingPreset) {
      newPresetList = presets.map((p) => (p.id === editingPreset.id ? updatedPresetItem : p));
    } else {
      newPresetList = [...presets, updatedPresetItem];
    }
    savePresetsToStorage(newPresetList);

    if (actionType === 'SAVE_PRESET') {
      setIsUnifiedBuilderOpen(false);
      toast.success('💾 Đã lưu thành công Tool Auto: "' + updatedPresetItem.name + '" vào danh sách xổ xuống!');
      return;
    }

    // RUN NOW ACTION
    setIsUnifiedBuilderOpen(false);
    setLoading(true);

    try {
      const times = generateRandomScheduleTimes(
        postCountInput,
        startHourInput,
        endHourInput,
        enableJitterInput
      );

      const pickedProducts = shopeeProducts.filter((p) => selectedShopeeIds.includes(p.id));
      let activeProducts = pickedProducts.length > 0 ? pickedProducts : shopeeProducts;

      // ENSURE AT LEAST 10 SHOPEE COMMENTS PER POST (MỖI BÀI ÍT NHẤT 10 BÌNH LUẬN LINK SP RANDOM)
      if (activeProducts.length < 10) {
        const fullPool = shopeeProducts.length > 0 ? shopeeProducts : DEFAULT_SHOPEE_PRODUCTS;
        activeProducts = [];
        for (let k = 0; k < 10; k++) {
          activeProducts.push(fullPool[k % fullPool.length]);
        }
      }

      const commentBlocks = activeProducts.slice(0, 10).map((p, idx) => '🛍️ [SP #' + (idx + 1) + '] ' + p.name + ': ' + p.url);
      const multiCommentText = commentBlocks.join('\n\n');

      const pickedThreads = threadsSpyPosts.filter((t) => selectedThreadsSpyIds.includes(t.id));
      const activeThreads = pickedThreads.length > 0 ? pickedThreads : threadsSpyPosts;

      const pickedNews = newsArticles.filter((n) => selectedNewsIds.includes(n.id));
      const activeNews = pickedNews.length > 0 ? pickedNews : newsArticles;

      const platforms: ('FACEBOOK' | 'THREADS')[] = [];
      if (hasThreads) platforms.push('THREADS');
      if (hasFacebook) platforms.push('FACEBOOK');

      const newAlbumItems: any[] = [];

      for (let i = 0; i < postCountInput; i++) {
        const timeISO = times[i % times.length];
        
        let rawCaption = '';
        let postTitle = '';
        let newsImage = '';

        if (activeThreads.length > 0 && selectedThreadsSpyIds.length > 0) {
          const tItem = activeThreads[i % activeThreads.length];
          rawCaption = tItem.content;
          postTitle = '[' + updatedPresetItem.name + ' #' + (i + 1) + '] ' + (tItem.authorName || 'Threads') + ': ' + tItem.content.slice(0, 35) + '...';
        } else {
          const newsItem = activeNews[i % activeNews.length];
          rawCaption = newsItem ? (newsItem.title + '\n\n' + (newsItem.summary || '')) : getUniqueScrapedCaption(i);
          postTitle = '[' + updatedPresetItem.name + ' #' + (i + 1) + '] ' + (newsItem?.title || 'Bài báo #' + (i + 1));
          newsImage = newsItem?.thumbnailUrl || newsItem?.imageUrl || '';
        }

        const cleanCaption = stripHashtags(stripLinks(rawCaption));

        newAlbumItems.push({
          id: 'auto_run_' + Date.now() + '_' + (i + 1),
          title: postTitle,
          caption: cleanCaption,
          comment: multiCommentText,
          firstCommentText: multiCommentText,
          mediaType: newsImage ? 'IMAGE' : 'TEXT',
          mediaUrl: newsImage,
          thumbnailUrl: newsImage,
          platforms,
          scheduledAt: timeISO,
          status: 'SCHEDULED',
          createdAt: new Date().toISOString(),
        });
      }

      const existingAlbum: any[] = JSON.parse(localStorage.getItem('custom_album_posts') || '[]');
      safeSetLocalStorage('custom_album_posts', [...newAlbumItems, ...existingAlbum], 60);

      const newMission: MissionExecution = {
        id: 'mission_' + Date.now(),
        goal: updatedPresetItem.name + ': Đăng ' + postCountInput + ' bài lên ' + selectedChannels.length + ' Trang đã chọn kèm ' + commentBlocks.length + ' bình luận Shopee',
        type: toolType,
        status: 'COMPLETED',
        postsCreated: postCountInput,
        scheduledTimes: times.map((t) => t.split('T')[1].slice(0, 5)),
        steps: [
          { id: '1', agent: 'TOOL_LAUNCHER', title: 'Khởi chạy Tool: "' + updatedPresetItem.name + '" trên ' + selectedChannels.length + ' Trang', status: 'DONE' },
          { id: '2', agent: 'POST_FETCHER', title: 'Tự động cào bài viết từ ' + (selectedThreadsSpyIds.length > 0 ? 'AutoSpy Threads' : 'Radar Tin Tức'), status: 'DONE' },
          { id: '3', agent: 'SHOPEE_PARSER', title: 'Tích chọn ' + commentBlocks.length + ' bình luận link Shopee Affiliate (/dashboard/products)', status: 'DONE' },
          { id: '4', agent: 'RANDOM_SCHEDULER', title: 'Phân bổ mốc giờ ngẫu nhiên (' + startHourInput + ' - ' + endHourInput + ')', status: 'DONE' },
          { id: '5', agent: 'PUBLISHER', title: 'Hoàn tất đẩy ' + postCountInput + ' bài vào Hàng Đợi Lên Lịch', status: 'DONE' },
        ],
        createdAt: new Date().toISOString(),
      };

      setMissions((prev) => {
        const updated = [newMission, ...prev];
        localStorage.setItem('custom_missions', JSON.stringify(updated));
        return updated;
      });

      toast.success('⚡ KHỞI CHẠY THÀNH CÔNG TOOL AUTO: "' + updatedPresetItem.name + '"!');
    } catch (e) {
      toast.error('Lỗi khi khởi chạy Tool Auto.');
    } finally {
      setLoading(false);
    }
  };

  // DELETE SINGLE MISSION BY ID & CLEAN LOCALSTORAGE POSTS
  const handleDeleteMission = (missionId: string) => {
    if (!confirm('Bạn có chắc muốn xóa nhiệm vụ này khỏi nhật ký?')) return;
    const updated = missions.filter((m) => m.id !== missionId);
    setMissions(updated);
    if (typeof window !== 'undefined') {
      localStorage.setItem('custom_missions', JSON.stringify(updated));
    }
    toast.success('Đã xóa nhiệm vụ khỏi danh sách!');
  };

  // PLATFORM-SPECIFIC DELETE (XÓA CHỈ THREADS HOẶC CHỈ FACEBOOK)
  const handleDeletePlatformPostsOfMission = (mission: MissionExecution, platformToDelete: 'THREADS' | 'FACEBOOK') => {
    const platformLabel = platformToDelete === 'THREADS' ? 'Meta Threads' : 'Facebook Fanpage';
    if (!confirm('Bạn có chắc muốn xóa tất cả bài đăng trên kênh ' + platformLabel + ' của nhiệm vụ này?')) return;

    if (typeof window !== 'undefined') {
      const album: any[] = JSON.parse(localStorage.getItem('custom_album_posts') || '[]');
      const filteredAlbum = album.filter((item) => {
        if (!item.platforms) return true;
        return !item.platforms.includes(platformToDelete);
      });
      safeSetLocalStorage('custom_album_posts', filteredAlbum, 60);
    }

    toast.success('Đã xóa sạch bài đăng ' + platformLabel + ' của nhiệm vụ này!');
  };

  // DRAG AND DROP PIPELINE HANDLERS
  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    const updated = [...pipelineSteps];
    const item = updated.splice(draggedIndex, 1)[0];
    updated.splice(index, 0, item);
    setPipelineSteps(updated);
    setDraggedIndex(index);
  };

  const toggleStepEnabled = (id: string) => {
    setPipelineSteps((prev) =>
      prev.map((step) => (step.id === id ? { ...step, enabled: !step.enabled } : step))
    );
  };

  const moveStep = (index: number, direction: 'UP' | 'DOWN') => {
    const targetIndex = direction === 'UP' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= pipelineSteps.length) return;
    const updated = [...pipelineSteps];
    const item = updated.splice(index, 1)[0];
    updated.splice(targetIndex, 0, item);
    setPipelineSteps(updated);
  };

  const fetchMissions = useCallback(async () => {
    try {
      const res = await api.get<{ success: boolean; data: MissionExecution[] }>('/api/missions');
      if (res.data?.data && res.data.data.length > 0) {
        setMissions(res.data.data);
        return;
      }
    } catch {}

    if (typeof window !== 'undefined') {
      try {
        const saved = JSON.parse(localStorage.getItem('custom_missions') || '[]');
        setMissions(saved);
      } catch {
        setMissions([]);
      }
    }
  }, []);

  const handleClearAllMissions = () => {
    if (confirm('Bạn có chắc muốn xóa toàn bộ lịch sử nhiệm vụ trên hệ thống?')) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('custom_missions');
      }
      setMissions([]);
      toast.success('Đã dọn sạch lịch sử nhiệm vụ!');
    }
  };

  useEffect(() => {
    fetchMissions();
  }, [fetchMissions]);

  // Filtered missions for rendering
  const filteredMissions = missions.filter((m) => {
    if (filterPlatform === 'THREADS') return m.type === 'THREADS_ONLY' || m.type === 'ALL_IN_ONE';
    if (filterPlatform === 'FACEBOOK') return m.type === 'FACEBOOK_ONLY' || m.type === 'ALL_IN_ONE';
    return true;
  });

  // Toggle selection helpers
  const toggleChannelSelection = (id: string) => {
    setSelectedChannelIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const toggleShopeeSelection = (id: string) => {
    setSelectedShopeeIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleSelectNThreadsSpy = (count: number, isRandom = false) => {
    const validCount = Math.max(1, count);
    setPostCountInput(validCount);
    const pool = threadsSpyPosts.length > 0 ? threadsSpyPosts : [];
    if (pool.length === 0) return;

    let selected: string[] = [];
    if (isRandom) {
      const shuffled = [...pool].sort(() => 0.5 - Math.random());
      selected = shuffled.slice(0, validCount).map((t) => t.id);
    } else {
      selected = pool.slice(0, validCount).map((t) => t.id);
    }

    setSelectedThreadsSpyIds(selected);

    // Auto select at least 10 Shopee products for 10 comments
    const top10Prods = shopeeProducts.slice(0, 10).map((p) => p.id);
    setSelectedShopeeIds(top10Prods);

    toast.success("⚡ Đã chọn " + selected.length + " bài Threads AutoSpy & 10 sản phẩm Shopee!");
  };

  const toggleThreadsSpySelection = (id: string) => {
    setSelectedThreadsSpyIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleSelect10NewestNews = () => {
    setPostCountInput(10);
    const pool = newsArticles.length > 0 ? newsArticles : DEFAULT_NEWS_ARTICLES;
    const top10News = pool.slice(0, 10).map((n) => n.id);
    setSelectedNewsIds(top10News);
    const top10Prods = shopeeProducts.slice(0, 10).map((p) => p.id);
    setSelectedShopeeIds(top10Prods);
    toast.success('⚡ Đã tự động chọn 10 bài báo mới nhất & 10 sản phẩm Shopee!');
  };

  const toggleNewsSelection = (id: string) => {
    setSelectedNewsIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const toggleMediaSelection = (id: string) => {
    setSelectedMediaIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* Header Banner & Master Action Dropdown */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2 border-b border-white/[0.08] pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-red-500/10 border border-red-500/20 text-[11px] font-mono font-semibold text-red-400 uppercase tracking-wider">
              <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
              Auto-Pilot Command Center v2.4
            </span>
          </div>
          <h1 className="text-[22px] font-extrabold tracking-tight text-white flex items-center gap-2">
            VinceAgent AI Missions Builder
          </h1>
          <p className="text-sm text-zinc-400 mt-0.5">
            Mọi tính năng thủ công đều có thể kéo thả trật tự. Nhấn 1 nút để chọn Mệnh lệnh Auto hoặc Thêm tính năng Auto tùy chỉnh.
          </p>
        </div>

        {/* MASTER DROPDOWN BUTTON SELECTOR */}
        <div className="relative flex items-center gap-2">
          <div className="relative">
            <Button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              disabled={loading}
              className="h-10 bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 active:scale-[0.98] text-white font-extrabold text-xs shadow-lg shadow-red-600/30 px-5 gap-2"
            >
              <Zap className="w-4 h-4 animate-pulse" />
              ⚡ CHỌN MỆNH LỆNH AUTO-PILOT ({presets.length})
              <ChevronDown className={'w-4 h-4 transition-transform ' + (isDropdownOpen ? 'rotate-180' : '')} />
            </Button>

            {/* Dropdown Menu List with Edit & Delete Actions for Each Auto Tool */}
            {isDropdownOpen && (
              <div className="absolute right-0 mt-2 w-88 rounded-xl bg-[#18181f] border border-white/[0.12] shadow-2xl z-50 overflow-hidden divide-y divide-white/[0.06] animate-fade-in">
                {presets.map((p) => {
                  const isFb = p.type === 'FACEBOOK_ONLY';
                  const isTh = p.type === 'THREADS_ONLY';
                  return (
                    <div
                      key={p.id}
                      onClick={() => handleRunPresetMission(p)}
                      className="w-full p-3.5 text-left hover:bg-white/[0.04] transition-colors flex items-start justify-between gap-3 group cursor-pointer"
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        <div className={'p-2 rounded-lg mt-0.5 flex-shrink-0 ' + (
                          isTh ? 'bg-amber-500/15 text-amber-400' : isFb ? 'bg-blue-500/15 text-blue-400' : 'bg-red-500/20 text-red-400'
                        )}>
                          {isTh ? <Flame className="w-4 h-4" /> : isFb ? <Facebook className="w-4 h-4" /> : <Zap className="w-4 h-4" />}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-white group-hover:text-amber-300 truncate">
                            {p.name}
                          </p>
                          <p className="text-[11px] text-zinc-400 mt-0.5 line-clamp-2">
                            {p.desc}
                          </p>
                        </div>
                      </div>

                      {/* EDIT & DELETE PRESET BUTTONS */}
                      <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 flex-shrink-0">
                        <button
                          type="button"
                          title="Sửa tên & tính năng Tool Auto này"
                          onClick={(e) => handleOpenEditPresetModal(p, e)}
                          className="p-1 rounded hover:bg-white/[0.1] text-sky-400 transition-colors"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          title="Xóa Tool Auto khỏi danh sách"
                          onClick={(e) => handleDeletePreset(p.id, e)}
                          className="p-1 rounded hover:bg-white/[0.1] text-red-400 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}

                {/* UNIFIED BUTTON: TẠO TOOL AUTO MỚI / THÊM TÍNH NĂNG AUTO TÙY CHỈNH */}
                <button
                  type="button"
                  onClick={handleOpenCreateUnifiedToolModal}
                  className="w-full p-3.5 text-left bg-gradient-to-r from-purple-950/40 to-transparent hover:bg-purple-900/30 transition-colors flex items-center gap-3 text-purple-300 font-bold text-xs group"
                >
                  <div className="p-2 rounded-lg bg-purple-500/20 text-purple-300 flex-shrink-0">
                    <Plus className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-purple-300 group-hover:text-purple-200">
                      ➕ Tạo Tool Auto Mới &amp; Thêm Tính Năng Auto Tùy Chỉnh
                    </p>
                    <p className="text-[11px] text-purple-400/80 mt-0.5">
                      Đặt tên tool, chọn Trang (/Socialmedia), Kho Shopee (/products) &amp; Kho Media (/albumpost).
                    </p>
                  </div>
                </button>
              </div>
            )}
          </div>

          <Button
            onClick={() => router.push('/dashboard/schedules')}
            variant="outline"
            className="h-10 border-white/[0.1] text-zinc-300 hover:bg-white/[0.05] text-xs font-semibold px-4"
          >
            <Calendar className="w-4 h-4 mr-1.5" /> Hàng Đợi Lên Lịch
          </Button>
        </div>
      </div>

      {/* DRAG AND DROP PIPELINE CONFIG (MỌI TÍNH NĂNG THỦ CÔNG ĐỀU KÉO THẢ ĐƯỢC) */}
      <Card className="p-5 border-white/[0.08] bg-[#111117] space-y-4">
        <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-2 uppercase tracking-wider">
              <Sliders className="w-4 h-4 text-red-500" />
              Cấu Hình Quy Trình Thủ Công Kéo Thả (Drag &amp; Drop Auto Pipeline)
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Bạn có thể kéo thả các khối bên dưới để thay đổi trật tự thực thi hoặc bật/tắt công tắc (ON/OFF) từng tính năng.
            </p>
          </div>
          <Badge variant="outline" className="border-red-500/30 text-red-400 text-[10px] uppercase font-mono">
            KÉO THẢ TRỰC TIẾP (DRAG &amp; DROP)
          </Badge>
        </div>

        <div className="space-y-2.5">
          {pipelineSteps.map((step, index) => (
            <div
              key={step.id}
              draggable
              onDragStart={() => handleDragStart(index)}
              onDragOver={(e) => handleDragOver(e, index)}
              className={'flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-xl border transition-all cursor-move gap-3 ' + (
                step.enabled
                  ? 'border-white/[0.1] bg-[#18181f] text-white hover:border-red-500/40 shadow-sm'
                  : 'border-white/[0.04] bg-white/[0.02] text-zinc-500 opacity-60'
              )}
            >
              <div className="flex items-center gap-3">
                <div className="text-zinc-600 hover:text-red-400 transition-colors">
                  <GripVertical className="w-5 h-5" />
                </div>
                <span className="w-7 h-7 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center font-mono text-xs font-bold flex-shrink-0">
                  0{index + 1}
                </span>
                <div>
                  <p className="text-xs font-bold text-zinc-200">{step.name}</p>
                  <p className="text-[11px] text-zinc-500">{step.desc}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-center">
                <div className="flex items-center gap-1 mr-2">
                  <button
                    onClick={() => moveStep(index, 'UP')}
                    disabled={index === 0}
                    className="px-2 py-1 rounded text-[10px] bg-white/[0.05] hover:bg-white/[0.1] disabled:opacity-20 text-zinc-300 font-bold"
                  >
                    ▲ Lên
                  </button>
                  <button
                    onClick={() => moveStep(index, 'DOWN')}
                    disabled={index === pipelineSteps.length - 1}
                    className="px-2 py-1 rounded text-[10px] bg-white/[0.05] hover:bg-white/[0.1] disabled:opacity-20 text-zinc-300 font-bold"
                  >
                    ▼ Xuống
                  </button>
                </div>

                <button
                  onClick={() => toggleStepEnabled(step.id)}
                  className={'px-3 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase transition-colors ' + (
                    step.enabled
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'bg-zinc-800 text-zinc-500 border border-zinc-700'
                  )}
                >
                  {step.enabled ? 'KÍCH HOẠT (ON)' : 'TẮT (OFF)'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* UNIFIED CUSTOM AUTO TOOL BUILDER MODAL */}
      <Modal
        isOpen={isUnifiedBuilderOpen}
        onClose={() => setIsUnifiedBuilderOpen(false)}
        title={editingPreset ? '✏️ CHỈNH SỬA TÊN & TÍNH NĂNG TOOL AUTO' : '➕ TẠO TOOL AUTO MỚI & THÊM TÍNH NĂNG AUTO TÙY CHỈNH'}
        size="2xl"
      >
        <div className="space-y-4">
          <div className="max-h-[70vh] overflow-y-auto pr-1">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* LEFT COLUMN */}
            <div className="space-y-4">
              {/* Tool Name & Description */}
              <div className="p-3.5 rounded-xl border border-amber-500/30 bg-amber-950/10 space-y-3">
                <h3 className="text-xs font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Wrench className="w-4 h-4 text-amber-400" />
                  Đặt Tên Tool Auto &amp; Mô Tả Ngắn
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-zinc-300 mb-1 font-semibold">Tên Tool Auto (Tool Name):</label>
                    <input
                      type="text"
                      placeholder="VD: Tool Auto ReUp Threads Mỹ Phẩm 9 Bài"
                      value={toolNameInput}
                      onChange={(e) => setToolNameInput(e.target.value)}
                      className="w-full h-9 px-3 rounded-lg border border-white/[0.1] bg-[#111117] text-white text-xs font-bold focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-zinc-300 mb-1 font-semibold">Mô tả ngắn Tool Auto:</label>
                    <input
                      type="text"
                      placeholder="VD: Đăng bài Threads + 9 comment Shopee lốc giấy..."
                      value={toolDescInput}
                      onChange={(e) => setToolDescInput(e.target.value)}
                      className="w-full h-9 px-3 rounded-lg border border-white/[0.1] bg-[#111117] text-white text-xs focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>
              </div>

              {/* Section 1: Post Count & Connected Platforms List */}
              <div className="p-3.5 rounded-xl border border-white/[0.08] bg-[#18181f] space-y-3">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Settings2 className="w-4 h-4 text-purple-400" />
                  1. Cấu Hình Số Lượng Bài &amp; Trang/Kênh Từ /dashboard/Socialmedia
                </h3>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1 font-medium">Số lượng bài viết xuất bản (Chỉnh sửa số lượng):</label>
                    <input
                      type="number"
                      min={1}
                      max={30}
                      value={postCountInput}
                      onChange={(e) => {
    const newCount = Math.max(1, Number(e.target.value));
    setPostCountInput(newCount);
    if (threadsSpyPosts.length > 0) {
      setSelectedThreadsSpyIds(threadsSpyPosts.slice(0, newCount).map((t) => t.id));
    }
    if (newsArticles.length > 0) {
      setSelectedNewsIds(newsArticles.slice(0, newCount).map((n) => n.id));
    }
  }}
                      className="w-full h-9 px-3 rounded-lg border border-white/[0.1] bg-[#111117] text-white text-xs font-bold text-amber-400 focus:outline-none focus:border-purple-500"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs text-zinc-300 font-semibold">
                        Tích chọn Trang / Fanpage / Kênh ({selectedChannelIds.length}/{socialAccounts.length} đã chọn):
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          if (selectedChannelIds.length === socialAccounts.length) {
                            setSelectedChannelIds([]);
                          } else {
                            setSelectedChannelIds(socialAccounts.map((p) => p.id));
                          }
                        }}
                        className="text-[11px] text-purple-400 hover:text-purple-300 font-medium"
                      >
                        {selectedChannelIds.length === socialAccounts.length ? 'Bỏ chọn tất cả' : 'Tích chọn tất cả'}
                      </button>
                    </div>

                    <div className="p-2 rounded-xl border border-white/[0.1] bg-[#111117] space-y-1.5 max-h-36 overflow-y-auto">
                      {socialAccounts.map((channel) => {
                        const isSelected = selectedChannelIds.includes(channel.id);
                        const isFb = channel.platform === 'FACEBOOK';
                        const isTh = channel.platform === 'THREADS';
                        const isYt = channel.platform === 'YOUTUBE';
                        return (
                          <div
                            key={channel.id}
                            onClick={() => toggleChannelSelection(channel.id)}
                            className={'flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors ' + (
                              isSelected
                                ? 'bg-purple-950/30 border border-purple-500/30 text-white'
                                : 'bg-white/[0.02] border border-transparent text-zinc-400 hover:bg-white/[0.04]'
                            )}
                          >
                            <div className="flex items-center gap-2.5">
                              {isFb ? (
                                <Facebook className="w-4 h-4 text-blue-400 flex-shrink-0" />
                              ) : isTh ? (
                                <Flame className="w-4 h-4 text-amber-400 flex-shrink-0" />
                              ) : isYt ? (
                                <Youtube className="w-4 h-4 text-red-500 flex-shrink-0" />
                              ) : (
                                <Globe className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                              )}
                              <span className="text-xs font-semibold">{channel.name}</span>
                              <span className="text-[10px] text-zinc-500 font-mono">{channel.handle || '@channel'}</span>
                            </div>

                            {isSelected ? (
                              <CheckSquare2 className="w-4 h-4 text-purple-400" />
                            ) : (
                              <Square className="w-4 h-4 text-zinc-600" />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 2: Radar Tin Tức News Picker */}
              <div className="p-3.5 rounded-xl border border-white/[0.08] bg-[#18181f] space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/[0.06] pb-2.5">
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                    <Newspaper className="w-4 h-4 text-rose-400" />
                    2. Bài Báo Từ Radar Tin Tức (http://localhost:3001/dashboard/news) - {selectedNewsIds.length} bài đã chọn
                  </h3>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleSelect10NewestNews}
                      className="px-2.5 py-1 rounded bg-gradient-to-r from-red-600 via-amber-600 to-emerald-600 hover:from-red-500 hover:to-emerald-500 text-white font-extrabold text-[11px] shadow flex items-center gap-1 active:scale-[0.98] transition-all flex-shrink-0"
                    >
                      <Zap className="w-3.5 h-3.5" /> Tự Động Chọn 10 Bài Báo &amp; 10 SP
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (selectedNewsIds.length === newsArticles.length) {
                          setSelectedNewsIds([]);
                        } else {
                          setSelectedNewsIds(newsArticles.map((n) => n.id));
                        }
                      }}
                      className="text-[11px] text-rose-400 hover:text-rose-300 font-medium whitespace-nowrap"
                    >
                      {selectedNewsIds.length === newsArticles.length ? 'Bỏ chọn' : 'Chọn tất cả'}
                    </button>
                  </div>
                </div>

                <div className="p-2 rounded-xl border border-white/[0.1] bg-[#111117] space-y-2 max-h-48 overflow-y-auto">
                  {newsArticles.map((article) => {
                    const isChecked = selectedNewsIds.includes(article.id);
                    return (
                      <div
                        key={article.id}
                        onClick={() => toggleNewsSelection(article.id)}
                        className={'flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors gap-3 ' + (
                          isChecked
                            ? 'bg-rose-950/30 border border-rose-500/30 text-white'
                            : 'bg-white/[0.02] border border-transparent text-zinc-400 hover:bg-white/[0.04]'
                        )}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          {article.thumbnailUrl ? (
                            <img src={article.thumbnailUrl} alt="" className="w-8 h-8 rounded object-cover flex-shrink-0 border border-white/[0.1]" />
                          ) : (
                            <div className="w-8 h-8 rounded bg-zinc-800 flex items-center justify-center flex-shrink-0 text-zinc-500">
                              <Newspaper className="w-4 h-4" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-zinc-200 truncate">{article.title}</p>
                            <p className="text-[10px] text-rose-400 font-mono truncate">{article.source} · {article.summary?.slice(0, 45)}...</p>
                          </div>
                        </div>

                        {isChecked ? (
                          <CheckSquare2 className="w-4 h-4 text-rose-400 flex-shrink-0" />
                        ) : (
                          <Square className="w-4 h-4 text-zinc-600 flex-shrink-0" />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

                          {/* Section 3: Threads Viral Posts Picker from AutoSpy (/dashboard/sources) */}
              <div className="p-3.5 rounded-xl border border-white/[0.08] bg-[#18181f] space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/[0.06] pb-2.5">
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                    <Flame className="w-4 h-4 text-amber-400" />
                    3. Bài Viết Threads Từ AutoSpy (http://localhost:3001/dashboard/sources) - {selectedThreadsSpyIds.length} bài đã chọn
                  </h3>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleSelectNThreadsSpy(postCountInput || 10, false)}
                      className="px-2.5 py-1 rounded bg-gradient-to-r from-amber-600 via-rose-600 to-purple-600 hover:from-amber-500 hover:to-purple-500 text-white font-extrabold text-[11px] shadow flex items-center gap-1 active:scale-[0.98] transition-all flex-shrink-0"
                    >
                      <Zap className="w-3.5 h-3.5" /> ⚡ Tự Động Chọn {postCountInput || 10} Bài Threads &amp; 10 SP
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSelectNThreadsSpy(postCountInput || 10, true)}
                      className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-amber-300 font-semibold text-[11px] border border-amber-500/30 flex items-center gap-1 flex-shrink-0"
                    >
                      <Shuffle className="w-3 h-3" /> Random {postCountInput || 10} Bài
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (selectedThreadsSpyIds.length === threadsSpyPosts.length) {
                          setSelectedThreadsSpyIds([]);
                        } else {
                          setSelectedThreadsSpyIds(threadsSpyPosts.map((t) => t.id));
                        }
                      }}
                      className="text-[11px] text-amber-400 hover:text-amber-300 font-medium whitespace-nowrap"
                    >
                      {selectedThreadsSpyIds.length === threadsSpyPosts.length ? 'Bỏ chọn' : 'Chọn tất cả'}
                    </button>
                  </div>
                </div>

                <div className="p-2 rounded-xl border border-white/[0.1] bg-[#111117] space-y-2 max-h-48 overflow-y-auto">
                  {threadsSpyPosts.map((tPost) => {
                    const isChecked = selectedThreadsSpyIds.includes(tPost.id);
                    return (
                      <div
                        key={tPost.id}
                        onClick={() => toggleThreadsSpySelection(tPost.id)}
                        className={'flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors gap-3 ' + (
                          isChecked
                            ? 'bg-amber-950/30 border border-amber-500/30 text-white'
                            : 'bg-white/[0.02] border border-transparent text-zinc-400 hover:bg-white/[0.04]'
                        )}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-8 h-8 rounded bg-amber-500/20 text-amber-400 flex items-center justify-center flex-shrink-0 font-bold text-xs">
                            🧵
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-zinc-200 truncate">{tPost.authorName || tPost.authorHandle} ({tPost.authorHandle})</p>
                            <p className="text-[10px] text-amber-400 font-mono truncate">{tPost.content?.slice(0, 55)}...</p>
                          </div>
                        </div>

                        {isChecked ? (
                          <CheckSquare2 className="w-4 h-4 text-amber-400 flex-shrink-0" />
                        ) : (
                          <Square className="w-4 h-4 text-zinc-600 flex-shrink-0" />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN */}
            <div className="space-y-4">
              {/* Section 3: Shopee Products Visual List Picker */}
              <div className="p-3.5 rounded-xl border border-white/[0.08] bg-[#18181f] space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                    <LinkIcon className="w-4 h-4 text-emerald-400" />
                    3. Tích Chọn Sản Phẩm Từ Kho Shopee Affiliate (http://localhost:3001/dashboard/products) - {selectedShopeeIds.length} SP đã chọn
                  </h3>
                  <button
                    type="button"
                    onClick={() => {
                      if (selectedShopeeIds.length === shopeeProducts.length) {
                        setSelectedShopeeIds([]);
                      } else {
                        setSelectedShopeeIds(shopeeProducts.map((p) => p.id));
                      }
                    }}
                    className="text-[11px] text-emerald-400 hover:text-emerald-300 font-medium"
                  >
                    {selectedShopeeIds.length === shopeeProducts.length ? 'Bỏ chọn tất cả' : 'Tích chọn tất cả Kho SP'}
                  </button>
                </div>

                <div className="p-2 rounded-xl border border-white/[0.1] bg-[#111117] space-y-2 max-h-44 overflow-y-auto">
                  {shopeeProducts.map((prod) => {
                    const isChecked = selectedShopeeIds.includes(prod.id);
                    return (
                      <div
                        key={prod.id}
                        onClick={() => toggleShopeeSelection(prod.id)}
                        className={'flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors gap-3 ' + (
                          isChecked
                            ? 'bg-emerald-950/30 border border-emerald-500/30 text-white'
                            : 'bg-white/[0.02] border border-transparent text-zinc-400 hover:bg-white/[0.04]'
                        )}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <img src={prod.imgUrl} alt="" className="w-8 h-8 rounded object-cover flex-shrink-0 border border-white/[0.1]" />
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-zinc-200 truncate">{prod.name}</p>
                            <p className="text-[10px] text-emerald-400 font-mono">{prod.price} · {prod.url}</p>
                          </div>
                        </div>

                        {isChecked ? (
                          <CheckSquare2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                        ) : (
                          <Square className="w-4 h-4 text-zinc-600 flex-shrink-0" />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Section 4: Schedule Time Window */}
              <div className="p-3.5 rounded-xl border border-white/[0.08] bg-[#18181f] space-y-3">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-amber-400" />
                  4. Khung Giờ Đăng &amp; Random Time Delay
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] text-zinc-400 mb-1">Giờ bắt đầu:</label>
                    <input
                      type="time"
                      value={startHourInput}
                      onChange={(e) => setStartHourInput(e.target.value)}
                      className="w-full h-9 px-3 rounded-lg border border-white/[0.1] bg-[#111117] text-white text-xs focus:outline-none focus:border-purple-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-zinc-400 mb-1">Giờ kết thúc:</label>
                    <input
                      type="time"
                      value={endHourInput}
                      onChange={(e) => setEndHourInput(e.target.value)}
                      className="w-full h-9 px-3 rounded-lg border border-white/[0.1] bg-[#111117] text-white text-xs focus:outline-none focus:border-purple-500"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

                    <div className="pt-2 flex items-center justify-between border-t border-white/[0.08]">
            <Button
              variant="outline"
              onClick={() => setIsUnifiedBuilderOpen(false)}
              className="h-9 border-white/[0.1] text-zinc-400 hover:text-white text-xs"
            >
              Hủy Bỏ
            </Button>
            <div className="flex items-center gap-2">
              <Button
                onClick={() => handleSaveOrRunUnifiedPreset('SAVE_PRESET')}
                className="h-9 bg-zinc-800 hover:bg-zinc-700 border border-white/[0.1] text-white font-bold text-xs px-4 gap-1.5"
              >
                <Save className="w-4 h-4 text-amber-400" /> LƯU THÀNH TOOL AUTO
              </Button>
              <Button
                onClick={() => handleSaveOrRunUnifiedPreset('RUN_NOW')}
                className="h-9 bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white font-extrabold text-xs px-5 shadow-lg shadow-red-600/30 gap-1.5"
              >
                <Zap className="w-4 h-4" /> KÍCH HOẠT VÀ CHẠY NGAY
              </Button>
            </div>
          </div>
        </div>
      </Modal>

      {/* EDIT EXECUTED MISSION MODAL */}
      <Modal
        isOpen={Boolean(editingMission)}
        onClose={() => setEditingMission(null)}
        title="✏️ CHỈNH SỬA NHIỆM VỤ AUTOPILOT (EDIT MISSION)"
        size="md"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1">
              Tên / Mục Tiêu Nhiệm Vụ Autopilot:
            </label>
            <input
              type="text"
              value={editGoalText}
              onChange={(e) => setEditGoalText(e.target.value)}
              className="w-full h-10 px-3 rounded-lg border border-white/[0.1] bg-[#18181f] text-white text-xs focus:outline-none focus:border-red-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1">
              Phân Biệt Trang/Kênh Xuất Bản:
            </label>
            <div className="flex items-center gap-4 pt-1">
              <label className="flex items-center gap-2 text-xs text-zinc-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editTargetThreads}
                  onChange={(e) => setEditTargetThreads(e.target.checked)}
                  className="rounded border-zinc-700 bg-zinc-900 text-amber-500 focus:ring-amber-500"
                />
                <span className="font-bold text-amber-300">🔥 Meta Threads</span>
              </label>

              <label className="flex items-center gap-2 text-xs text-zinc-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editTargetFacebook}
                  onChange={(e) => setEditTargetFacebook(e.target.checked)}
                  className="rounded border-zinc-700 bg-zinc-900 text-blue-500 focus:ring-blue-500"
                />
                <span className="font-bold text-blue-300">🟦 Facebook Fanpage</span>
              </label>
            </div>
          </div>

          <div className="pt-3 flex items-center justify-end gap-2 border-t border-white/[0.08]">
            <Button
              variant="outline"
              onClick={() => setEditingMission(null)}
              className="h-9 border-white/[0.1] text-zinc-400 hover:text-white text-xs"
            >
              Hủy Bỏ
            </Button>
            <Button
              onClick={handleSaveEditedMission}
              className="h-9 bg-red-600 hover:bg-red-500 text-white font-bold text-xs px-5 shadow-lg shadow-red-600/30 gap-1.5"
            >
              <Check className="w-4 h-4" /> LƯU THAY ĐỔI
            </Button>
          </div>
        </div>
      </Modal>

      {/* MISSION EXECUTION HISTORY LOG WITH PLATFORM FILTERS & SPECIFIC DELETE BUTTONS */}
      <Card className="p-5 border-white/[0.08] bg-[#111117] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/[0.08] pb-3">
          <div className="flex items-center gap-2">
            <Bot className="w-5 h-5 text-red-500" />
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              Lịch Sử Mệnh Lệnh Autopilot ({filteredMissions.length}/{missions.length})
            </h2>
          </div>

          {/* FILTER BY PLATFORM */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-400 font-medium flex items-center gap-1">
              <Filter className="w-3.5 h-3.5 text-zinc-500" /> Lọc Theo Trang:
            </span>
            <div className="flex items-center gap-1 bg-[#18181f] p-1 rounded-lg border border-white/[0.08]">
              <button
                onClick={() => setFilterPlatform('ALL')}
                className={'px-2.5 py-1 rounded text-[11px] font-bold transition-all ' + (
                  filterPlatform === 'ALL'
                    ? 'bg-red-600 text-white'
                    : 'text-zinc-400 hover:text-white'
                )}
              >
                Tất Cả Trang
              </button>
              <button
                onClick={() => setFilterPlatform('THREADS')}
                className={'px-2.5 py-1 rounded text-[11px] font-bold transition-all ' + (
                  filterPlatform === 'THREADS'
                    ? 'bg-amber-600 text-white'
                    : 'text-zinc-400 hover:text-white'
                )}
              >
                🔥 Trang Threads
              </button>
              <button
                onClick={() => setFilterPlatform('FACEBOOK')}
                className={'px-2.5 py-1 rounded text-[11px] font-bold transition-all ' + (
                  filterPlatform === 'FACEBOOK'
                    ? 'bg-blue-600 text-white'
                    : 'text-zinc-400 hover:text-white'
                )}
              >
                🟦 Trang Facebook
              </button>
            </div>
          </div>
        </div>

        {filteredMissions.length === 0 ? (
          <div className="p-8 text-center text-zinc-500 bg-[#18181f] rounded-xl border border-white/[0.06]">
            <Clock className="w-8 h-8 mx-auto mb-2 text-zinc-600 opacity-60" />
            <p className="text-xs font-semibold text-zinc-400">Không tìm thấy mệnh lệnh nào phù hợp với bộ lọc</p>
            <p className="text-[11px] text-zinc-600 mt-1">
              Bấm nút &ldquo;⚡ CHỌN MỆNH LỆNH AUTO-PILOT&rdquo; góc trên để kích hoạt quy trình tự động.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredMissions.map((m) => (
              <div
                key={m.id}
                className="p-4 rounded-xl border border-white/[0.08] bg-[#18181f] space-y-3 hover:border-white/[0.12] transition-colors"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/[0.06] pb-2.5">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono text-zinc-500">#{m.id.slice(-8)}</span>

                      {/* CLEAR PLATFORM BADGES */}
                      <Badge
                        variant="default"
                        className={
                          m.type === 'THREADS_ONLY'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold'
                            : m.type === 'FACEBOOK_ONLY'
                            ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30 text-[10px] font-bold'
                            : m.type === 'CUSTOM_AUTO'
                            ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[10px] font-bold'
                            : 'bg-red-500/20 text-red-400 border border-red-500/30 text-[10px] font-bold'
                        }
                      >
                        {m.type === 'THREADS_ONLY'
                          ? '🔥 CHỈ TRANG THREADS'
                          : m.type === 'FACEBOOK_ONLY'
                          ? '🟦 CHỈ TRANG FACEBOOK'
                          : m.type === 'CUSTOM_AUTO'
                          ? '🟣 AUTO MISSION TÙY CHỈNH'
                          : '⚡ ALL-IN-ONE (THREADS + FB)'}
                      </Badge>

                      <span className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Hoàn thành ({m.postsCreated} bài)
                      </span>
                    </div>
                    <h3 className="text-xs font-bold text-white">&ldquo;{m.goal}&rdquo;</h3>
                  </div>

                  {/* ACTION BUTTONS: EDIT & SPECIFIC DELETE FOR PLATFORMS */}
                  <div className="flex items-center gap-1.5 self-end sm:self-center">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleOpenEditMission(m)}
                      className="h-7 text-[11px] text-sky-400 border-sky-500/30 hover:bg-sky-500/10 px-2.5"
                    >
                      <Edit className="w-3 h-3 mr-1" /> Chỉnh Sửa Auto
                    </Button>

                    {(m.type === 'ALL_IN_ONE' || m.type === 'CUSTOM_AUTO') && (
                      <>
                        <button
                          onClick={() => handleDeletePlatformPostsOfMission(m, 'THREADS')}
                          className="px-2 py-1 rounded text-[10px] font-semibold bg-amber-950/40 text-amber-300 border border-amber-500/30 hover:bg-amber-500/20"
                        >
                          Xóa Bài Threads
                        </button>
                        <button
                          onClick={() => handleDeletePlatformPostsOfMission(m, 'FACEBOOK')}
                          className="px-2 py-1 rounded text-[10px] font-semibold bg-blue-950/40 text-blue-300 border border-blue-500/30 hover:bg-blue-500/20"
                        >
                          Xóa Bài FB
                        </button>
                      </>
                    )}

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDeleteMission(m.id)}
                      className="h-7 text-[11px] text-red-400 border-red-500/30 hover:bg-red-500/10 px-2.5"
                    >
                      <Trash2 className="w-3 h-3 mr-1" /> Xóa Auto Này
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-2">
                  {m.steps.map((step, idx) => (
                    <div
                      key={step.id}
                      className="p-2.5 rounded-lg border border-emerald-500/30 bg-emerald-950/10 text-[11px] text-emerald-300 space-y-1"
                    >
                      <div className="flex items-center justify-between font-mono text-[9px] font-bold uppercase text-emerald-400">
                        <span>0{idx + 1}. {step.agent}</span>
                        <Check className="w-3 h-3 text-emerald-400" />
                      </div>
                      <p className="font-medium text-[11px] text-zinc-300 truncate">{step.title}</p>
                    </div>
                  ))}
                </div>

                {m.scheduledTimes && m.scheduledTimes.length > 0 && (
                  <div className="flex items-center gap-2 pt-1 overflow-x-auto text-[10px] font-mono text-zinc-400">
                    <Clock className="w-3 h-3 text-amber-400 flex-shrink-0" />
                    <span>Khung giờ đã xếp:</span>
                    {m.scheduledTimes.map((t, idx) => (
                      <span key={idx} className="px-1.5 py-0.5 rounded bg-white/[0.05] border border-white/[0.08] text-amber-300">
                        {t}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
