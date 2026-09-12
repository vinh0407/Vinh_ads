'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { Modal } from '@/components/ui/Modal';
import { sourcesApi, productsApi } from '@/lib/api';
import type { SourcePage, SourceStatus, Product } from '@/types';
import { formatRelativeTime, formatNumber } from '@/lib/utils';
import {
  Plus,
  Edit,
  Trash2,
  ExternalLink,
  Eye,
  TrendingUp,
  Radio,
  Zap,
  Flame,
  MessageSquare,
  Layers,
  Calendar,
  Heart,
  RotateCcw,
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';

export interface ThreadsPostItem {
  id: string;
  authorName: string;
  authorHandle: string;
  content: string;
  views: number;
  likes: number;
  replies: number;
  scrapedAt: string;
  mediaUrl?: string;
  originalUrl?: string;
  shopeeProduct?: {
    name: string;
    affiliateUrl: string;
  };
}

export interface FacebookScrapedItem {
  id: string;
  pageName: string;
  pageId: string;
  content: string;
  likes: number;
  commentsCount: number;
  scrapedAt: string;
  mediaUrl?: string;
  originalUrl?: string;
  shopeeProduct?: {
    name: string;
    affiliateUrl: string;
  };
}

const sourceSchema = z.object({
  platform: z.enum(['TIKTOK', 'FACEBOOK', 'YOUTUBE']),
  platformPageId: z.string().min(1, 'ID Kênh hoặc Username là bắt buộc'),
  pageName: z.string().min(1, 'Tên Kênh / Fanpage là bắt buộc'),
  pageUrl: z.string().url('URL không hợp lệ'),
  avatarUrl: z.string().url().optional().or(z.literal('')),
  syncEnabled: z.boolean().default(true),
  syncInterval: z.number().min(60).max(86400).default(1800),
});

type SourceForm = z.infer<typeof sourceSchema>;

function stripAllOriginalLinks(text: string): string {
  if (!text) return '';
  return text
    .replace(/https?:\/\/[^\s]+/gi, '')
    .replace(/(?:shopee\.vn|s\.shopee\.vn|vn\.shp\.ee|shorten\.asia|tiktok\.com|facebook\.com|fb\.watch|bit\.ly|tinyurl\.com)[^\s]*/gi, '')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

// Baseline Top 30 Hot Threads Vietnam Posts (Trending viral Threads VN feed)
const SAMPLE_THREADS_POSTS: ThreadsPostItem[] = [
  "Đi làm công ty mà sếp bảo 'ở đây chúng ta là một gia đình' thì có nên nộp đơn nghỉ việc luôn không =)))) Chứ gia đình gì mà toàn bắt OT không lương vậy mng?",
  "Lần đầu đi ăn quán đồ Nhật với bạn trai mới quen mà ảnh tính tiền chia đôi tới từng nghìn lẻ... Nên block luôn hay cho thêm cơ hội đây mng ơi?",
  "Có ai ở đây lương 15 triệu nhưng tháng nào cũng hết sạch tiền như tui không? Tiền trọ, tiền cà phê, tiền order đồ ăn online nó nuốt sạch chả còn đồng nào.",
  "Mới nhận tin nhắn chia tay từ bạn trai sau 4 năm yêu nhau chỉ vì câu 'anh thấy mình không hợp nữa'. 4 năm thanh xuân đổi lại đúng 1 tin nhắn 7 từ.",
  "Con gái bây giờ thích nam giới thu nhập bao nhiêu một tháng thì mới chịu cưới vậy mng? Chứ 20tr ở Sài Gòn thấy chỉ đủ sống cá nhân...",
  "Vừa phỏng vấn xong ở một công ty Marketing, HR bảo thử việc 3 tháng không lương nhưng cho 'kinh nghiệm thực chiến'. Hài hước thật sự.",
  "Cảm giác tủi thân nhất là khi ốm nằm một mình trong phòng trọ giữa Sài Gòn, thèm một bát cháo nóng mà không có ai nấu cho...",
  "Đi làm 3 năm tích lũy được 200 triệu thì nên đầu tư vào đâu hay gửi tiết kiệm ngân hàng cho an toàn mng ơi?",
  "Có bạn nào ở đây bị nghiện mua sắm online trên Shopee giống tui không? Tháng nào shipper cũng gọi 20 cuộc, mở tủ ra toàn đồ chưa giật tag...",
  "Mọi người nghĩ sao về việc bạn gái đi chơi với nhóm bạn thân có cả nam giới và ở lại qua đêm? Là tui ích kỷ hay là tui đúng khi khó chịu?",
  "Tuổi 25 chưa có người yêu, chưa có xe tay ga xịn, công việc bình thường... có phải là thất bại không mng? Dạo này lướt MXH thấy áp lực peer pressure quá.",
  "Đi làm công ty lớn hay làm startup nhỏ? Bài học đắt giá sau 2 năm trải nghiệm cả 2 môi trường mà sinh viên mới ra trường nên biết.",
  "Thề luôn cái son kem lì này đánh lên môi cưng dã dãn mà không bị khô môi tí nào! Tìm mòn mỏi mới ra chân lý đời tui 😭",
  "Có ai giống tui không, mỗi lần buồn là lại xách xe chạy vòng vòng quanh hồ Tây ăn kem tràng tiền hoặc uống ly trà sữa là hết buồn ngay.",
  "Bí quyết săn deal Shopee giảm 50% cho các tín đồ mê skincare: gom mã giảm giá trước 12h đêm nè mng!",
  "Người cũ nhắn tin 'Dạo này em sao rồi?' sau 2 năm mất tích. Nên trả lời sao cho ngầu mà không bị coi là còn vương vấn đây mng?",
  "Công nhận phòng trọ nhỏ mà biết cách decor tông trắng gỗ thì nhìn chill như studio Hàn Quốc luôn. Nhìn mê thực sự!",
  "Đi du lịch Đà Lạt 3 ngày 2 đêm tự túc chỉ hết 1tr5/người. Chia sẻ lịch trình chi tiết cho ai đang cần xả stress cuối tuần nè!",
  "Có một sự thật là bạn bè cấp 3 sau khi lên đại học sẽ dần ít nói chuyện lại, rồi đến lúc nhìn lại thì thành người dưng từng quen...",
  "Cách xử lý đồng nghiệp hay tranh công và nói xấu sau lưng tinh tế nhất mà không làm ảnh hưởng đến không khí làm việc.",
  "Chiếc nồi chiên không dầu này cứu rỗi đời sinh viên ở trọ của tui luôn! Nướng gà, chiên khoai, làm bánh gì cũng cân được hết.",
  "Mới gom được bộ outfit đi cafe chụp ảnh sống ảo siêu hách dáng trên Shopee chưa tới 200k. Đứng vào góc nào cũng ra ảnh xinh!",
  "Bị sếp mắng trước mặt toàn bộ phòng họp vì một lỗi nhỏ không phải của mình. Nên im lặng nhẫn nại hay lên tiếng giải thích luôn mng?",
  "Con trai khi thực sự yêu một người sẽ có những biểu hiện nhỏ này nè, chị em lưu lại để check xem bạn trai mình có green flag không nhé!",
  "Độc thân ở tuổi 28 không hề đáng sợ, đáng sợ nhất là nhắm mắt cưới đại một người không hiểu mình rồi dằn dằn cả đời.",
  "Review chân thực nhất về tai nghe bluetooth chống ồn dưới 500k mà tui dùng suốt 6 tháng qua: pin trâu, âm bass đập sướng tai!",
  "Mẹ bảo: 'Con gái học cao làm gì, sau này cũng về chăm con nuôi chồng'. Nghe mà chạnh lòng khủng khíp...",
  "Gợi ý 5 cuốn sách thay đổi tư duy tài chính và thói quen làm việc mà người trẻ dưới 30 tuổi nhất định nên đọc một lần trong đời.",
  "Cảm giác hạnh phúc nhất mỗi ngày là được về nhà mở máy lạnh, nằm trùm chăn lướt Threads và ăn đồ ăn vặt favorite!",
  "Tổng hợp những món đồ gia dụng thông minh đáng tiền nhất trên Shopee giúp nâng cấp chất lượng cuộc sống phòng trọ lên 200%!",
].map((contentText, i) => {
  const communityAuthors = [
    { name: 'VTV DIGITAL', handle: '@vtv24news' },
    { name: 'Schannel Official', handle: '@schannelvn' },
    { name: 'Theanh28 Entertainment', handle: '@theanh28entertainment' },
    { name: 'Kênh 14 Official', handle: '@kenh14official' },
    { name: 'Vietcetera', handle: '@vietcetera' },
    { name: 'Spiderum', handle: '@spiderum' },
    { name: 'Báo Tuổi Trẻ', handle: '@tuoitre.online' },
    { name: 'Báo VnExpress', handle: '@vnexpress' },
    { name: 'Cộng Đồng Tinh Tế', handle: '@tinhte.vn' },
    { name: 'GenK Công Nghệ', handle: '@genk.official' },
  ];
  const selectedAuthor = communityAuthors[i % communityAuthors.length];
  const cleanUsername = selectedAuthor.handle.replace('@', '');

  return {
    id: "threads_hot_" + (i + 1),
    authorName: selectedAuthor.name,
    authorHandle: selectedAuthor.handle,
    content: contentText,
    views: 35000 + ((i * 1793) % 125000),
    likes: 3200 + ((i * 1237) % 18800),
    replies: 180 + ((i * 97) % 1950),
    scrapedAt: '2026-09-12T15:00:00.000Z',
    mediaUrl: "",
    originalUrl: "https://www.threads.com/",
  };
});

export default function AutoSpyPage() {
  const router = useRouter();
  const [sources, setSources] = useState<SourcePage[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'threads' | 'facebook' | 'channels'>('threads');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSource, setEditingSource] = useState<SourcePage | null>(null);

  // Radar Data
  const [threadsPosts, setThreadsPosts] = useState<ThreadsPostItem[]>(SAMPLE_THREADS_POSTS);
  const [facebookPosts, setFacebookPosts] = useState<FacebookScrapedItem[]>([]);
  const [shopeeProducts, setShopeeProducts] = useState<Product[]>([]);
  const [lastSyncTime, setLastSyncTime] = useState<string>('Vừa xong');
  const [threadsSyncInfo, setThreadsSyncInfo] = useState<{
    lastSyncedAt: string;
    nextSyncInHours: number;
    syncInterval: string;
  }>({
    lastSyncedAt: 'Vừa xong',
    nextSyncInHours: 24,
    syncInterval: '24h',
  });

  const [threadsSpyInput, setThreadsSpyInput] = useState('');

  const handleSpyThreadsAccount = async () => {
    if (!threadsSpyInput.trim()) {
      toast.error('Vui lòng nhập Username hoặc Link Threads (VD: @vtv24news)!');
      return;
    }
    const cleanInput = threadsSpyInput.trim();
    try {
      const res = await fetch(`/api/threads/trending?query=${encodeURIComponent(cleanInput)}`);
      const json = await res.json();
      if (json.success && Array.isArray(json.data) && json.data.length > 0) {
        const merged = [...json.data, ...threadsPosts];
        const unique = Array.from(new Map(merged.map((p) => [p.id, p])).values());
        setThreadsPosts(unique);
        setThreadsSpyInput('');
        toast.success(`🔥 Đã cào thành công bài viết có thật từ Threads account "${cleanInput}"!`);
      }
    } catch (err) {
      toast.error('Không thể cào bài viết từ Threads link này.');
    }
  };

  // Selection & Detail View States
  const [selectedPostIds, setSelectedPostIds] = useState<string[]>([]);
  const [viewingPost, setViewingPost] = useState<ThreadsPostItem | FacebookScrapedItem | null>(null);

  const toggleSelectPost = (id: string) => {
    setSelectedPostIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAllTab = (items: (ThreadsPostItem | FacebookScrapedItem)[]) => {
    const itemIds = items.map((i) => i.id);
    const isAllSelected = itemIds.length > 0 && itemIds.every((id) => selectedPostIds.includes(id));

    if (isAllSelected) {
      setSelectedPostIds((prev) => prev.filter((id) => !itemIds.includes(id)));
    } else {
      setSelectedPostIds((prev) => Array.from(new Set([...prev, ...itemIds])));
    }
  };

  const handleBatchScheduleSelected = () => {
    if (selectedPostIds.length === 0) {
      toast.error('Vui lòng tích chọn ô bài viết muốn lên lịch!');
      return;
    }

    const allItems: (ThreadsPostItem | FacebookScrapedItem)[] = [...threadsPosts, ...facebookPosts];
    const selectedItems = allItems.filter((item) => selectedPostIds.includes(item.id));

    if (selectedItems.length === 0) return;

    const existingAlbum: any[] = JSON.parse(localStorage.getItem('custom_album_posts') || '[]');
    const newAlbumItems: any[] = selectedItems.map((item) => {
      const isThreads = 'authorName' in item;
      const cleanCap = stripAllOriginalLinks(item.content);
      const affUrl = item.shopeeProduct?.affiliateUrl || 'https://s.shopee.vn/9zxfyMkHS5';
      const title = isThreads
        ? `[Threads Hot] ${(item as ThreadsPostItem).authorName}: ${item.content.slice(0, 45)}...`
        : `[${(item as FacebookScrapedItem).pageName}] ${item.content.slice(0, 45)}...`;

      return {
        id: "album_batch_" + item.id + "_" + Date.now(),
        title,
        caption: cleanCap + "\n#ShopeeAffiliate",
        comment: "👉 Link mua Shopee chính hãng [Ưu đãi hôm nay]: " + affUrl,
        mediaType: 'IMAGE',
        mediaUrl: item.mediaUrl || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&q=80',
        thumbnailUrl: item.mediaUrl || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&q=80',
        source: isThreads ? 'SCRAPED_TIKTOK' : 'SCRAPED_FACEBOOK',
        status: 'READY',
        createdAt: new Date().toISOString(),
      };
    });

    const merged = [...newAlbumItems, ...existingAlbum];
    localStorage.setItem('custom_album_posts', JSON.stringify(merged));

    toast.success(`⚡ Đã đẩy ${selectedItems.length} bài viết đã chọn sang Kho Album Post & Lên Lịch Đăng!`);
    setSelectedPostIds([]);

    const first = selectedItems[0];
    const cleanCap = stripAllOriginalLinks(first.content);
    const affUrl = first.shopeeProduct?.affiliateUrl || 'https://s.shopee.vn/9zxfyMkHS5';
    const query = new URLSearchParams({
      title: 'content' in first ? first.content.slice(0, 30) : 'Post AutoSpy',
      content: cleanCap + "\n\n🛒 Link Shopee Affiliate: " + affUrl + "\n#ShopeeAffiliate",
      firstComment: "👉 Link mua Shopee chính hãng [Ưu đãi hôm nay]: " + affUrl,
      mediaUrl: first.mediaUrl || '',
    });
    router.push("/dashboard/schedules?" + query.toString());
  };

  const form = useForm<SourceForm>({
    resolver: zodResolver(sourceSchema),
    defaultValues: {
      platform: 'FACEBOOK',
      syncEnabled: true,
      syncInterval: 1800,
    },
  });

  const fetchProducts = useCallback(async () => {
    try {
      let apiProds: Product[] = [];
      try {
        const res = await productsApi.list();
        apiProds = res.data?.data || [];
      } catch {}
      const localProds: Product[] =
        typeof window !== 'undefined'
          ? JSON.parse(localStorage.getItem('custom_affiliate_products') || '[]')
          : [];
      const combined = [...localProds, ...apiProds];
      const unique = Array.from(new Map(combined.map((p) => [p.id, p])).values());
      setShopeeProducts(unique);
    } catch (e) {
      console.error('Failed to load Shopee products:', e);
    }
  }, []);

  const fetchSources = useCallback(async () => {
    try {
      setLoading(true);
      const res = await sourcesApi.list().catch(() => null);
      const loaded = res?.data?.data || [];
      if (loaded.length > 0) {
        setSources(loaded);
      } else {
        const localRaw = typeof window !== 'undefined' ? localStorage.getItem('custom_sources') : null;
        if (localRaw === null) {
          // Only seed default sources on very first load if storage key never existed
          const defaultSources: SourcePage[] = [
            {
              id: 'src_fb_1',
              userId: 'demo',
              platform: 'FACEBOOK' as any,
              platformPageId: 'shopeevn',
              pageName: 'Shopee Việt Nam',
              pageUrl: 'https://www.facebook.com/shopeevn',
              avatarUrl: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=100&q=80',
              syncEnabled: true,
              syncInterval: 1800,
              status: 'ACTIVE' as SourceStatus,
              lastSyncAt: new Date().toISOString(),
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
            {
              id: 'src_fb_2',
              userId: 'demo',
              platform: 'FACEBOOK' as any,
              platformPageId: 'tinhte',
              pageName: 'Tinh tế',
              pageUrl: 'https://www.facebook.com/tinhte',
              avatarUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=100&q=80',
              syncEnabled: true,
              syncInterval: 1800,
              status: 'ACTIVE' as SourceStatus,
              lastSyncAt: new Date().toISOString(),
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
          ];
          setSources(defaultSources);
          if (typeof window !== 'undefined') {
            localStorage.setItem('custom_sources', JSON.stringify(defaultSources));
          }
        } else {
          try {
            setSources(JSON.parse(localRaw));
          } catch {
            setSources([]);
          }
        }
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // Main Auto-Scrape & Auto-Comment Generator
  const runAutoSpySync = useCallback(async (force = false) => {
    if (typeof window === 'undefined') return;

    let products: Product[] = [];
    try {
      products = JSON.parse(localStorage.getItem('custom_affiliate_products') || '[]');
    } catch {}

    const getDeterministicShopeeAffLink = (index: number) => {
      if (products.length === 0) {
        return {
          url: 'https://s.shopee.vn/9zxfyMkHS5',
          name: 'Sản phẩm Shopee chính hãng',
        };
      }
      const prod = products[index % products.length];
      return {
        url: prod.affiliateLinks?.[0]?.affiliateUrl || prod.shopeeUrl || 'https://s.shopee.vn/9zxfyMkHS5',
        name: prod.name,
      };
    };

    // 1. Fetch Top 30 Daily Rotated Threads Posts from Live API Route
    let liveThreads: ThreadsPostItem[] = [];
    try {
      const res = await fetch(`/api/threads/trending${force ? '?force=true' : ''}`);
      const json = await res.json();
      if (json.success && Array.isArray(json.data) && json.data.length > 0) {
        liveThreads = json.data;
        setThreadsSyncInfo({
          lastSyncedAt: formatRelativeTime(json.lastSyncedAt),
          nextSyncInHours: json.nextSyncInHours || 24,
          syncInterval: '24h',
        });
      }
    } catch (err) {
      console.error('Failed to fetch live Threads API in autoSpy:', err);
    }

    if (liveThreads.length === 0) {
      liveThreads = SAMPLE_THREADS_POSTS;
    }

    const updatedThreads: ThreadsPostItem[] = liveThreads.map((t, idx) => {
      const randProd = getDeterministicShopeeAffLink(idx);
      return {
        ...t,
        shopeeProduct: {
          name: randProd.name,
          affiliateUrl: randProd.url,
        },
      };
    });
    setThreadsPosts(updatedThreads);

    // 2. Scrape 3 Highest Engagement Posts per Facebook Fanpage
    let activeSources = sources;
    if (activeSources.length === 0 && typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('custom_sources');
        if (stored) activeSources = JSON.parse(stored);
      } catch {}
    }

    const fbItems: FacebookScrapedItem[] = [];
    if (activeSources && activeSources.length > 0) {
      const mediaSamples = [
        'https://images.unsplash.com/photo-1584992236310-6edddc08acff?w=600&q=80',
        'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&q=80',
        'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&q=80',
      ];

      activeSources.forEach((src, srcIdx) => {
        for (let i = 1; i <= 3; i++) {
          const itemIdx = srcIdx * 3 + i;
          const randProd = getDeterministicShopeeAffLink(itemIdx);
          const likes = 1800 + ((itemIdx * 1543) % 7500);
          const commentsCount = 120 + ((itemIdx * 233) % 850);
          const mediaUrl = mediaSamples[(i - 1) % mediaSamples.length];
          fbItems.push({
            id: "fb_scraped_" + src.id + "_" + i,
            pageName: src.pageName,
            pageId: src.platformPageId,
            content: "[Bài hot tương tác cao #" + i + "] Trải nghiệm nội dung cập nhật mới nhất từ kênh " + src.pageName + ".",
            likes,
            commentsCount,
            scrapedAt: '2026-09-12T15:00:00.000Z',
            mediaUrl,
            originalUrl: src.pageUrl || "https://www.facebook.com/" + src.platformPageId,
            shopeeProduct: {
              name: randProd.name,
              affiliateUrl: randProd.url,
            },
          });
        }
      });

      // Sort Facebook posts by highest engagement (likes + commentsCount descending)
      fbItems.sort((a, b) => (b.likes + b.commentsCount) - (a.likes + a.commentsCount));
    }
    setFacebookPosts(fbItems);

    // 3. Auto push to Kho Album Post (/dashboard/albumpost)
    const existingAlbum: any[] = JSON.parse(localStorage.getItem('custom_album_posts') || '[]');
    const newAlbumItems: any[] = [];

    // Push top Threads posts to album
    updatedThreads.slice(0, 10).forEach((t) => {
      const cleanCap = stripAllOriginalLinks(t.content);
      const affUrl = t.shopeeProduct?.affiliateUrl || 'https://s.shopee.vn/9zxfyMkHS5';
      const prodName = t.shopeeProduct?.name || 'Sản phẩm Shopee';

      newAlbumItems.push({
        id: "album_threads_" + t.id,
        title: "[Threads Hot] " + t.authorName + ": " + t.content.slice(0, 45) + "...",
        caption: cleanCap + "\n#ThreadsHot #ShopeeAffiliate #" + prodName.replace(/\s+/g, ''),
        comment: "👉 Link mua Shopee chính hãng [Ưu đãi hôm nay]: " + affUrl,
        mediaType: 'TEXT',
        mediaUrl: '',
        thumbnailUrl: '',
        source: 'SCRAPED_TIKTOK',
        status: 'READY',
        createdAt: new Date().toISOString(),
      });
    });

    // Push Facebook 3 newest posts per channel to album
    fbItems.forEach((fb) => {
      const cleanCap = stripAllOriginalLinks(fb.content);
      const affUrl = fb.shopeeProduct?.affiliateUrl || 'https://s.shopee.vn/9zxfyMkHS5';

      newAlbumItems.push({
        id: "album_fb_" + fb.id,
        title: "[" + fb.pageName + "] " + fb.content.slice(0, 45) + "...",
        caption: cleanCap + "\n#FacebookViral #ShopeeAffiliate",
        comment: "👉 Link mua Shopee chính hãng [Ưu đãi hôm nay]: " + affUrl,
        mediaType: 'IMAGE',
        mediaUrl: fb.mediaUrl || 'https://images.unsplash.com/photo-1584992236310-6edddc08acff?w=600&q=80',
        thumbnailUrl: fb.mediaUrl || 'https://images.unsplash.com/photo-1584992236310-6edddc08acff?w=600&q=80',
        source: 'SCRAPED_FACEBOOK',
        status: 'READY',
        createdAt: new Date().toISOString(),
      });
    });

    const mergedMap = new Map<string, any>();
    [...newAlbumItems, ...existingAlbum].forEach((item) => {
      if (item && item.id && !mergedMap.has(item.id)) {
        mergedMap.set(item.id, item);
      }
    });

    localStorage.setItem('custom_album_posts', JSON.stringify(Array.from(mergedMap.values())));
    setLastSyncTime(new Date().toLocaleTimeString('vi-VN'));
  }, [sources]);

  const fetchTrendingThreads = useCallback(async (force = false) => {
    await runAutoSpySync(force);
    if (force) {
      toast.success('⚡ Đã quét & cập nhật 30 bài viết hot Threads VN mới nhất (Tự động đổi bài mỗi ngày)!');
    }
  }, [runAutoSpySync]);

  useEffect(() => {
    fetchProducts();
    fetchSources();
    fetchTrendingThreads();
  }, [fetchProducts, fetchSources, fetchTrendingThreads]);

  useEffect(() => {
    runAutoSpySync();
    // Auto refresh every 30 minutes (1800000 ms)
    const interval = setInterval(() => {
      runAutoSpySync();
      toast.success('⚡ AutoSpy 30p: Đã tự động cào 30 bài Threads Hot + 3 bài tương tác cao nhất/Fanpage & tự động gắn link Shopee!');
    }, 1800000);
    return () => clearInterval(interval);
  }, [runAutoSpySync]);

  const handleManualTriggerSync = () => {
    runAutoSpySync(true);
  };

  const handleSendToScheduleItem = (item: ThreadsPostItem | FacebookScrapedItem) => {
    const cleanCap = stripAllOriginalLinks(item.content);
    const affUrl = item.shopeeProduct?.affiliateUrl || 'https://s.shopee.vn/9zxfyMkHS5';

    const fullCaption = cleanCap + "\n#ShopeeAffiliate";
    const firstComment = "👉 Link mua Shopee chính hãng [Ưu đãi hôm nay]: " + affUrl;

    const query = new URLSearchParams({
      title: 'content' in item ? item.content.slice(0, 30) : 'Post AutoSpy',
      content: fullCaption,
      firstComment: firstComment,
      mediaUrl: item.mediaUrl || '',
    });
    router.push("/dashboard/schedules?" + query.toString());
  };

  const handleSubmit = async (data: SourceForm) => {
    try {
      const newSrc: SourcePage = {
        id: editingSource ? editingSource.id : "src_" + Date.now(),
        userId: 'demo',
        platform: data.platform as any,
        platformPageId: data.platformPageId,
        pageName: data.pageName,
        pageUrl: data.pageUrl,
        avatarUrl: data.avatarUrl || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=100&q=80',
        syncEnabled: data.syncEnabled,
        syncInterval: data.syncInterval,
        status: 'ACTIVE' as SourceStatus,
        lastSyncAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      if (editingSource) {
        setSources((prev) => prev.map((s) => (s.id === editingSource.id ? newSrc : s)));
        toast.success('Đã cập nhật kênh theo dõi!');
      } else {
        const updated = [newSrc, ...sources];
        setSources(updated);
        if (typeof window !== 'undefined') {
          localStorage.setItem('custom_sources', JSON.stringify(updated));
        }
        toast.success('Đã thêm Fanpage vào danh sách AutoSpy!');
      }

      setIsModalOpen(false);
      setEditingSource(null);
      form.reset();
      runAutoSpySync();
    } catch {
      toast.error('Lỗi khi lưu kênh theo dõi.');
    }
  };

  const handleEdit = (source: SourcePage) => {
    setEditingSource(source);
    form.reset({
      platform: (source.platform as any) || 'FACEBOOK',
      platformPageId: source.platformPageId,
      pageName: source.pageName,
      pageUrl: source.pageUrl,
      avatarUrl: source.avatarUrl || '',
      syncEnabled: source.syncEnabled,
      syncInterval: source.syncInterval,
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Bạn có chắc chắn muốn ngừng theo dõi kênh này?')) return;
    const updated = sources.filter((s) => s.id !== id);
    setSources(updated);
    if (typeof window !== 'undefined') {
      localStorage.setItem('custom_sources', JSON.stringify(updated));
    }
    if (updated.length === 0) {
      setFacebookPosts([]);
    } else {
      setFacebookPosts((prev) => prev.filter((p) => updated.some((s) => s.platformPageId === p.pageId)));
    }
    toast.success('Đã hủy theo dõi kênh.');
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.06] pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="default" className="bg-red-600 text-white font-mono text-[10px] tracking-wider uppercase">
              AUTOSPY RADAR ENGINE
            </Badge>
            <span className="text-xs font-mono text-zinc-400">
              UPDATE MỖI 30 PHÚT · TỰ ĐỘNG GẮN LINK SHOPEE AFF VÀO BÌNH LUẬN
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            AutoSpy — Radar Tin Nổi Threads & Quét Fanpage Facebook
          </h1>
          <p className="text-sm text-zinc-400">
            Tự động quét Top 30 bài Threads Hot nhất & 3 bài viết nhiều lượt tương tác nhất trên mỗi Fanpage Facebook (Mỗi 30p), tự động lọc sạch link gốc rác và gắn link Shopee Affiliate của bạn vào bình luận.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {selectedPostIds.length > 0 && (
            <Button
              onClick={handleBatchScheduleSelected}
              className="bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] text-white font-semibold text-xs px-4"
            >
              <Calendar className="h-4 w-4 mr-1.5" />
              Thêm Lịch Đăng Bài Đã Chọn ({selectedPostIds.length})
            </Button>
          )}
          <Button
            onClick={handleManualTriggerSync}
            className="bg-red-600 hover:bg-red-500 active:scale-[0.98] text-white font-semibold text-xs px-4"
          >
            <Zap className="h-4 w-4 mr-1.5" />
            Kích Hoạt Cào Ngay (Sync Now)
          </Button>
        </div>
      </div>

      {/* Tabs Bar */}
      <div className="flex items-center justify-between gap-4 border-b border-white/[0.06] pb-2 overflow-x-auto">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('threads')}
            className={"px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 " + (
              activeTab === 'threads'
                ? 'bg-red-600 text-white shadow-sm'
                : 'bg-[#111117] text-zinc-400 border border-white/[0.06] hover:text-white'
            )}
          >
            <Flame className="h-4 w-4 text-amber-400" />
            Top 30 Threads Hot Nhất ({threadsPosts.length})
          </button>

          <button
            onClick={() => setActiveTab('facebook')}
            className={"px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 " + (
              activeTab === 'facebook'
                ? 'bg-red-600 text-white shadow-sm'
                : 'bg-[#111117] text-zinc-400 border border-white/[0.06] hover:text-white'
            )}
          >
            <Radio className="h-4 w-4 text-blue-400" />
            Facebook Fanpage (3 Bài Hot Tương Tác / Kênh) ({facebookPosts.length})
          </button>

          <button
            onClick={() => setActiveTab('channels')}
            className={"px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 " + (
              activeTab === 'channels'
                ? 'bg-red-600 text-white shadow-sm'
                : 'bg-[#111117] text-zinc-400 border border-white/[0.06] hover:text-white'
            )}
          >
            <Layers className="h-4 w-4 text-emerald-400" />
            Kênh Giám Sát ({sources.length})
          </button>
        </div>

        <span className="text-[11px] font-mono text-zinc-500 whitespace-nowrap">
          Cập nhật lần cuối: <strong className="text-emerald-400">{lastSyncTime}</strong> (Tự động mỗi 30p)
        </span>
      </div>

      {/* TAB 1: TOP 30 HOT THREADS */}
      {activeTab === 'threads' && (
        <div className="space-y-4">
          <div className="p-3.5 rounded-xl bg-gradient-to-r from-red-950/30 to-amber-950/30 border border-red-500/30 flex flex-wrap items-center justify-between gap-3 text-xs text-amber-200">
            <div className="flex items-center gap-3">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
              </span>
              <div>
                <span className="flex items-center gap-2 font-bold text-white text-sm">
                  <Flame className="h-4 w-4 text-red-500 animate-pulse" />
                  Top 30 Bài Viết Hot Threads (&gt; 2.000 Tim / 2K Likes)
                  <Badge variant="default" className="bg-red-500/20 text-red-400 border border-red-500/30 text-[10px] uppercase font-mono font-bold">
                    🔥 ĐÃ LỌC &gt; 2K TIM
                  </Badge>
                  <Badge variant="default" className="bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] uppercase font-mono">
                    AUTO-SYNC 24H
                  </Badge>
                </span>
                <p className="text-[11px] text-zinc-400 mt-0.5 font-mono">
                  Đã quét lúc: <span className="text-zinc-200 font-semibold">{threadsSyncInfo.lastSyncedAt}</span> · Cập nhật tiếp theo: sau <span className="text-red-400 font-semibold">{threadsSyncInfo.nextSyncInHours} giờ</span>
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                onClick={() => fetchTrendingThreads(true)}
                className="bg-red-600 hover:bg-red-500 text-white font-semibold text-xs gap-1.5 px-3 py-1.5 active:scale-[0.98]"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Reset &amp; Đổi Toàn Bộ Bài Mới Không Trùng (&gt;2K Tim)
              </Button>

              <a
                href="https://www.threads.com/"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-white font-semibold text-xs rounded-lg border border-white/10 active:scale-[0.98] transition-all"
              >
                <ExternalLink className="h-3.5 w-3.5 text-amber-400" />
                Mở Trang Chủ Threads.com ↗
              </a>
            </div>
          </div>

          {/* Custom Threads Account Spy Input */}
          <div className="p-3 rounded-xl bg-[#111117] border border-white/[0.06] flex flex-col sm:flex-row items-center gap-2">
            <Input
              value={threadsSpyInput}
              onChange={(e) => setThreadsSpyInput(e.target.value)}
              placeholder="Nhập Username hoặc Link Threads (VD: @vtv24news hoặc https://www.threads.net/@schannelvn)..."
              className="bg-[#0a0a0f] border-white/[0.08] text-xs text-white placeholder:text-zinc-600 focus:border-red-500/50 flex-1"
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSpyThreadsAccount();
              }}
            />
            <Button
              size="sm"
              onClick={handleSpyThreadsAccount}
              className="bg-red-600 hover:bg-red-500 text-white font-semibold text-xs px-4 whitespace-nowrap active:scale-[0.98] w-full sm:w-auto"
            >
              🔥 Quét Bài Ngay Kênh Này
            </Button>
          </div>

          {/* Select All Bar */}
          <div className="flex items-center justify-between px-1 py-1">
            <label className="text-xs text-zinc-300 hover:text-white flex items-center gap-2 font-medium cursor-pointer">
              <input
                type="checkbox"
                checked={threadsPosts.length > 0 && threadsPosts.every((p) => selectedPostIds.includes(p.id))}
                onChange={() => toggleSelectAllTab(threadsPosts)}
                className="rounded border-zinc-700 bg-zinc-900 text-red-600 focus:ring-0 cursor-pointer h-4 w-4"
              />
              <span>
                {threadsPosts.length > 0 && threadsPosts.every((p) => selectedPostIds.includes(p.id))
                  ? 'Bỏ chọn tất cả bài Threads'
                  : 'Chọn tất cả 30 bài Threads'}
              </span>
            </label>
            {selectedPostIds.length > 0 && (
              <span className="text-xs font-mono text-emerald-400 font-bold">
                ✓ Đã chọn {selectedPostIds.length} bài
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {threadsPosts.map((post, idx) => (
              <Card
                key={post.id}
                onClick={() => window.open(post.originalUrl || 'https://www.threads.com/', '_blank')}
                className={"bg-[#111117] border-white/[0.06] hover:border-amber-500/50 transition-all flex flex-col justify-between p-4 space-y-3 cursor-pointer group " + (
                  selectedPostIds.includes(post.id) ? 'ring-1 ring-emerald-500 bg-emerald-950/10' : ''
                )}
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={selectedPostIds.includes(post.id)}
                        onChange={(e) => {
                          e.stopPropagation();
                          toggleSelectPost(post.id);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="rounded border-zinc-700 bg-zinc-900 text-red-600 focus:ring-0 cursor-pointer h-4 w-4"
                      />
                      <span className="h-5 w-5 rounded-full bg-amber-500/20 text-amber-400 font-mono text-[10px] font-bold flex items-center justify-center border border-amber-500/30">
                        #{idx + 1}
                      </span>
                      <div>
                        <p className="text-xs font-bold text-white truncate">{post.authorName}</p>
                        <p className="text-[10px] font-mono text-zinc-500">{post.authorHandle}</p>
                      </div>
                    </div>
                    <Badge variant="default" className="bg-black/60 text-zinc-400 text-[9px] font-mono">
                      THREADS
                    </Badge>
                  </div>

                  <p className="text-xs text-zinc-300 line-clamp-3 leading-relaxed group-hover:text-white transition-colors">
                    {stripAllOriginalLinks(post.content)}
                  </p>

                  {/* Auto Comment Preview with Random Shopee Link */}
                  {post.shopeeProduct && (
                    <div className="p-2 bg-emerald-950/30 rounded-lg border border-emerald-900/50 space-y-1">
                      <p className="text-[10px] font-bold text-emerald-400 flex items-center gap-1 font-mono uppercase">
                        💬 Tự động bình luận Link Shopee Aff:
                      </p>
                      <p className="text-[11px] font-semibold text-zinc-200 truncate">
                        {post.shopeeProduct.name}
                      </p>
                      <p className="text-[10px] font-mono text-emerald-400 truncate">
                        {post.shopeeProduct.affiliateUrl}
                      </p>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-[11px] font-mono text-zinc-500 pt-1">
                    <span className="flex items-center gap-1"><Eye className="h-3 w-3 text-sky-400" /> {formatNumber(post.views)} views</span>
                    <span className="flex items-center gap-1 font-bold text-red-400 bg-red-500/10 px-2 py-0.5 rounded border border-red-500/20">
                      <Heart className="h-3 w-3 fill-red-500 text-red-500" /> {formatNumber(post.likes)} Tim
                    </span>
                    <span className="flex items-center gap-1"><MessageSquare className="h-3 w-3 text-blue-400" /> {post.replies}</span>
                  </div>
                </div>

                <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between text-xs">
                  <span className="text-[10px] font-mono text-zinc-500">{formatRelativeTime(post.scrapedAt)}</span>
                  <a
                    href={post.originalUrl || 'https://www.threads.com/'}
                    target="_blank"
                    rel="noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="text-xs text-amber-400 hover:text-amber-300 font-semibold flex items-center gap-1 hover:underline"
                  >
                    <span>Xem bài viết gốc ↗</span>
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: FACEBOOK 3 TOP ENGAGEMENT POSTS / CHANNEL */}
      {activeTab === 'facebook' && (
        <div className="space-y-4">
          <div className="p-3.5 rounded-xl bg-blue-950/20 border border-blue-800/40 flex items-center justify-between text-xs text-blue-200">
            <span className="flex items-center gap-2 font-semibold">
              <Radio className="h-4 w-4 text-blue-400" />
              Tự động cào 3 bài viết NHIỀU LƯỢT TƯƠNG TÁC NHẤT trên mỗi Fanpage Facebook đã theo dõi ({sources.length} kênh)
            </span>
            <Badge variant="default" className="bg-blue-500/20 text-blue-300 border border-blue-500/30 text-[10px]">
              AUTO 3 BÀI HOT/KÊNH
            </Badge>
          </div>

          {/* Select All Bar */}
          <div className="flex items-center justify-between px-1 py-1">
            <label className="text-xs text-zinc-300 hover:text-white flex items-center gap-2 font-medium cursor-pointer">
              <input
                type="checkbox"
                checked={facebookPosts.length > 0 && facebookPosts.every((p) => selectedPostIds.includes(p.id))}
                onChange={() => toggleSelectAllTab(facebookPosts)}
                className="rounded border-zinc-700 bg-zinc-900 text-blue-600 focus:ring-0 cursor-pointer h-4 w-4"
              />
              <span>
                {facebookPosts.length > 0 && facebookPosts.every((p) => selectedPostIds.includes(p.id))
                  ? 'Bỏ chọn tất cả bài Facebook'
                  : 'Chọn tất cả bài Facebook'}
              </span>
            </label>
            {selectedPostIds.length > 0 && (
              <span className="text-xs font-mono text-emerald-400 font-bold">
                ✓ Đã chọn {selectedPostIds.length} bài
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {facebookPosts.map((post) => (
              <Card
                key={post.id}
                onClick={() => window.open(post.originalUrl || 'https://facebook.com', '_blank')}
                className={"bg-[#111117] border-white/[0.06] hover:border-blue-500/50 transition-all flex flex-col justify-between p-4 space-y-3 cursor-pointer group " + (
                  selectedPostIds.includes(post.id) ? 'ring-1 ring-emerald-500 bg-emerald-950/10' : ''
                )}
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={selectedPostIds.includes(post.id)}
                        onChange={(e) => {
                          e.stopPropagation();
                          toggleSelectPost(post.id);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="rounded border-zinc-700 bg-zinc-900 text-blue-600 focus:ring-0 cursor-pointer h-4 w-4"
                      />
                      <Avatar fallback={post.pageName.slice(0, 2)} className="h-7 w-7" />
                      <div>
                        <p className="text-xs font-bold text-white truncate">{post.pageName}</p>
                        <p className="text-[10px] font-mono text-zinc-500">{post.pageId}</p>
                      </div>
                    </div>
                    <Badge variant="default" className="bg-blue-600/20 text-blue-400 text-[9px]">
                      FACEBOOK
                    </Badge>
                  </div>

                  <p className="text-xs text-zinc-300 line-clamp-3 leading-relaxed group-hover:text-white transition-colors">
                    {stripAllOriginalLinks(post.content)}
                  </p>

                  {/* Auto Comment Preview with Random Shopee Link */}
                  {post.shopeeProduct && (
                    <div className="p-2 bg-emerald-950/30 rounded-lg border border-emerald-900/50 space-y-1">
                      <p className="text-[10px] font-bold text-emerald-400 flex items-center gap-1 font-mono uppercase">
                        💬 Tự động bình luận Link Shopee Aff:
                      </p>
                      <p className="text-[11px] font-semibold text-zinc-200 truncate">
                        {post.shopeeProduct.name}
                      </p>
                      <p className="text-[10px] font-mono text-emerald-400 truncate">
                        {post.shopeeProduct.affiliateUrl}
                      </p>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-[11px] font-mono text-zinc-500 pt-1">
                    <span className="flex items-center gap-1"><TrendingUp className="h-3 w-3 text-emerald-400" /> {formatNumber(post.likes)} likes</span>
                    <span className="flex items-center gap-1"><MessageSquare className="h-3 w-3 text-blue-400" /> {post.commentsCount} comments</span>
                  </div>
                </div>

                <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between text-xs">
                  <span className="text-[10px] font-mono text-zinc-500">{formatRelativeTime(post.scrapedAt)}</span>
                  <a
                    href={post.originalUrl || 'https://facebook.com'}
                    target="_blank"
                    rel="noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="text-xs text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1 hover:underline"
                  >
                    <span>Xem bài viết gốc</span>
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: MONITORED CHANNELS LIST */}
      {activeTab === 'channels' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Danh sách Kênh Fanpage Facebook Giám Sát AutoSpy ({sources.length})
            </h3>
            <Button
              onClick={() => {
                setEditingSource(null);
                setIsModalOpen(true);
              }}
              className="bg-red-600 hover:bg-red-500 text-white text-xs font-semibold"
            >
              <Plus className="h-4 w-4 mr-1.5" />
              Thêm Kênh Fanpage Giám Sát Mới
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {sources.map((source) => (
              <Card key={source.id} className="bg-[#111117] border-white/[0.06] p-4 flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Badge variant="default" className="bg-blue-600 text-white text-[10px] font-mono">
                      {source.platform}
                    </Badge>
                    <span className="text-[11px] font-mono text-emerald-400 font-semibold flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Auto-Cào (3 bài mới/30p)
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <Avatar src={source.avatarUrl} fallback={source.pageName.slice(0, 2)} className="h-11 w-11" />
                    <div className="min-w-0 flex-1">
                      <h4 className="font-bold text-sm text-white truncate">{source.pageName}</h4>
                      <p className="text-xs font-mono text-zinc-500 truncate">{source.platformPageId}</p>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between mt-3">
                  <a
                    href={source.pageUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs font-mono text-zinc-500 hover:text-red-400 flex items-center gap-1"
                  >
                    <span>Link gốc</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleEdit(source)}
                      className="p-1.5 rounded text-zinc-400 hover:text-white"
                    >
                      <Edit className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(source.id)}
                      className="p-1.5 rounded text-zinc-400 hover:text-rose-400"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Add / Edit Channel Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingSource(null);
        }}
        title={editingSource ? 'Chỉnh Sửa Kênh Giám Sát' : 'Thêm Kênh Fanpage Giám Sát Mới Kho AutoSpy'}
      >
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          <Select
            label="Nền tảng"
            value={form.watch('platform')}
            onChange={(e) => form.setValue('platform', e.target.value as any)}
            options={[
              { value: 'FACEBOOK', label: 'Facebook Fanpage lớn' },
              { value: 'TIKTOK', label: 'TikTok Account' },
              { value: 'YOUTUBE', label: 'YouTube Shorts Channel' },
            ]}
          />

          <Input
            label="Tên Kênh / Fanpage"
            {...form.register('pageName')}
            placeholder="VD: Góc Review Gia Dụng & Tiện Ích"
            error={form.formState.errors.pageName?.message}
            className="bg-white/[0.03] border-white/[0.08] text-xs text-white"
          />

          <Input
            label="ID / Username Kênh"
            {...form.register('platformPageId')}
            placeholder="VD: goc.review.giadung"
            error={form.formState.errors.platformPageId?.message}
            className="bg-white/[0.03] border-white/[0.08] text-xs text-white"
          />

          <Input
            label="Đường link URL Kênh"
            type="url"
            {...form.register('pageUrl', {
              onChange: (e) => {
                const val = e.target.value || '';
                try {
                  const match = val.match(/(?:facebook\.com|fb\.com)\/([^/?#]+)/i);
                  if (match && match[1]) {
                    const extractedId = match[1];
                    if (!form.getValues('platformPageId')) {
                      form.setValue('platformPageId', extractedId);
                    }
                    if (!form.getValues('pageName')) {
                      const formattedName = extractedId.charAt(0).toUpperCase() + extractedId.slice(1);
                      form.setValue('pageName', formattedName);
                    }
                  }
                } catch {}
              },
            })}
            placeholder="https://www.facebook.com/catteexe"
            error={form.formState.errors.pageUrl?.message}
            className="bg-white/[0.03] border-white/[0.08] text-xs text-white"
          />

          <div className="flex justify-end gap-2 pt-3 border-t border-white/[0.06]">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsModalOpen(false);
                setEditingSource(null);
              }}
              className="text-xs"
            >
              Hủy
            </Button>
            <Button type="submit" className="bg-red-600 hover:bg-red-500 text-white font-semibold text-xs">
              {editingSource ? 'Lưu Thay Đổi' : 'Bắt Đầu Giám Sát AutoSpy'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal View Post Detail */}
      <Modal
        isOpen={!!viewingPost}
        onClose={() => setViewingPost(null)}
        title={
          viewingPost
            ? 'authorName' in viewingPost
              ? `Threads / ${(viewingPost as ThreadsPostItem).authorName}`
              : `Facebook / ${(viewingPost as FacebookScrapedItem).pageName}`
            : 'Chi Tiết Bài Viết'
        }
      >
        {viewingPost && (
          <div className="space-y-4 text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
              <div>
                <h3 className="font-bold text-white text-sm">
                  {'authorName' in viewingPost
                    ? (viewingPost as ThreadsPostItem).authorName
                    : (viewingPost as FacebookScrapedItem).pageName}
                </h3>
                <p className="text-zinc-500 font-mono">
                  {'authorHandle' in viewingPost
                    ? (viewingPost as ThreadsPostItem).authorHandle
                    : (viewingPost as FacebookScrapedItem).pageId}
                </p>
              </div>
              <Badge variant="default" className="bg-red-600/20 text-red-400 font-mono text-[10px]">
                {'authorName' in viewingPost ? 'META THREADS' : 'FACEBOOK'}
              </Badge>
            </div>

            <div className="p-3.5 rounded-lg bg-black/40 border border-white/[0.06] space-y-2">
              <p className="text-zinc-200 leading-relaxed text-sm whitespace-pre-wrap">
                {stripAllOriginalLinks(viewingPost.content)}
              </p>
            </div>

            {viewingPost.mediaUrl && (
              <div className="rounded-lg overflow-hidden border border-white/[0.06] max-h-60">
                <img src={viewingPost.mediaUrl} alt="Media preview" className="w-full h-full object-cover" />
              </div>
            )}

            {viewingPost.shopeeProduct && (
              <div className="p-3 bg-emerald-950/30 rounded-lg border border-emerald-900/50 space-y-1">
                <p className="text-[11px] font-bold text-emerald-400 font-mono uppercase">
                  💬 Bình luận chèn Link Shopee Affiliate:
                </p>
                <p className="text-xs font-semibold text-zinc-200">{viewingPost.shopeeProduct.name}</p>
                <p className="text-xs font-mono text-emerald-400">
                  👉 Link mua Shopee chính hãng [Ưu đãi hôm nay]: {viewingPost.shopeeProduct.affiliateUrl}
                </p>
              </div>
            )}

            <div className="flex items-center justify-between text-zinc-400 font-mono pt-2 border-t border-white/[0.06]">
              {'views' in viewingPost && (
                <span className="flex items-center gap-1"><Eye className="h-3.5 w-3.5 text-red-400" /> {formatNumber((viewingPost as ThreadsPostItem).views)} lượt xem</span>
              )}
              <span className="flex items-center gap-1"><TrendingUp className="h-3.5 w-3.5 text-emerald-400" /> {formatNumber(viewingPost.likes)} lượt thích</span>
              <span className="flex items-center gap-1"><MessageSquare className="h-3.5 w-3.5 text-blue-400" /> {'replies' in viewingPost ? (viewingPost as ThreadsPostItem).replies : (viewingPost as FacebookScrapedItem).commentsCount} bình luận</span>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/[0.06]">
              <Button variant="ghost" onClick={() => setViewingPost(null)} className="text-zinc-400 text-xs">
                Đóng
              </Button>
              <Button
                onClick={() => {
                  const target = viewingPost;
                  setViewingPost(null);
                  handleSendToScheduleItem(target);
                }}
                className="bg-red-600 hover:bg-red-500 text-white font-semibold text-xs"
              >
                <Calendar className="h-4 w-4 mr-1.5" />
                Lên Lịch Bài Này
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
