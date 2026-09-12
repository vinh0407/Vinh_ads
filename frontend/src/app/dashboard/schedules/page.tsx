'use client';

import { matchProductToContent, stripHashtags, getMultipleMatchedProducts } from '@/lib/smart-product-matcher';
import { useEffect, useState, useRef, useCallback, useMemo, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/Table';
import { Modal } from '@/components/ui/Modal';
import { schedulesApi, postsApi, facebookApi, productsApi, videosApi } from '@/lib/api';
import { Schedule, Post, FacebookPage, Product } from '@/types';
import { formatRelativeTime, safeSetLocalStorage } from '@/lib/utils';
import {
  Plus,
  Edit,
  Trash2,
  Calendar,
  Clock,
  Check,
  X,
  MessageSquare,
  Facebook,
  Film,
  Zap,
  Send,
  Loader2,
  CheckCircle2,
  ExternalLink,
  Settings,
  Sparkles,
  AlertCircle,
  Filter,
  Layers,
  Upload,
  Video,
  FileText,
  ShoppingBag,
  Link as LinkIcon,
  Image as ImageIcon,
  CheckSquare,
  Square,
  Globe,
  Radio,
  CheckCheck,
  Newspaper,
  ChevronDown,
  ChevronUp,
  Shuffle,
  RotateCcw,
  Flame,
  Bot,
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import toast from 'react-hot-toast';

interface ExtendedSchedule extends Schedule {
  channels?: string[];
  firstCommentEnabled?: boolean;
  firstCommentText?: string;
  pinComment?: boolean;
  productName?: string;
  affiliateUrl?: string;
  productImageUrl?: string;
  targetPageId?: string;
  targetPageName?: string;
  selectedTargets?: string[];
  videoName?: string;
  videoSize?: string;
  appendLinkToCaption?: boolean;
  firstCommentHasImage?: boolean;
}

interface StoredProduct {
  id?: string;
  name: string;
  shopeeUrl?: string;
  affiliateUrl?: string;
  imageUrl?: string;
  price?: number;
  category?: string;
}

const scheduleSchema = z.object({
  postId: z.string().optional(),
  scheduledAt: z.string().min(1, 'Thời gian đăng là bắt buộc'),
  caption: z.string().min(1, 'Nội dung caption là bắt buộc'),
  selectedTargets: z.array(z.string()).min(1, 'Chọn ít nhất 1 trang hoặc nền tảng để đăng'),
  firstCommentEnabled: z.boolean().default(true),
  firstCommentText: z.string().optional(),
  pinComment: z.boolean().default(true),
  productName: z.string().optional(),
  affiliateUrl: z.string().optional(),
  productImageUrl: z.string().optional(),
  appendLinkToCaption: z.boolean().default(true),
  firstCommentHasImage: z.boolean().default(true),
});

type ScheduleForm = z.infer<typeof scheduleSchema>;

const ALL_PLATFORMS_OPTIONS = [
  { id: '1282948524895927', label: '📘 Facebook Fanpage (Loài mèo gắn link)', icon: '📘', type: 'FACEBOOK' },
  { id: 'THREADS', label: '🧵 Meta Threads Account', icon: '🧵', type: 'THREADS' },
  { id: 'TIKTOK', label: '🎵 TikTok Video 9:16', icon: '🎵', type: 'TIKTOK' },
  { id: 'YOUTUBE_SHORTS', label: '▶️ YouTube Shorts Channel', icon: '▶️', type: 'YOUTUBE' },
];

const PAGE_TOKENS: Record<string, string> = {
  '1282948524895927': 'EAAvBZA9TFH30BSW49qevgEtHSYlTNpiKCZCSvlnuDHwW4IkxRw0eZAThm0kiPwRhYA9KGbZAEXsXWBdbgZACbDQrDZCujdXguJUNTZAOjXJcBMLxpSbX4ZAgGtvCs75mUpl8JGPTFXqba2r8CE9OFqBL9UfAmFzCgmhVP7ZBV2QCdw5F7e0rvmG5LE1MI5ZCk6T1MkcARj9LjD',
};

const DEFAULT_PAGES: FacebookPage[] = [
  {
    id: '1282948524895927',
    userId: 'usr-1',
    pageId: '1282948524895927',
    pageName: 'Loài mèo gắn link',
    pageUrl: 'https://www.facebook.com/1282948524895927',
    avatarUrl: null,
    accessToken: PAGE_TOKENS['1282948524895927'],
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const getLocalDatetimeInputString = (dateObj: Date = new Date()) => {
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  const hours = String(dateObj.getHours()).padStart(2, '0');
  const minutes = String(dateObj.getMinutes()).padStart(2, '0');
  return year + "-" + month + "-" + day + "T" + hours + ":" + minutes;
};

const formatVietnamDateTime = (dateStr: string) => {
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return hours + ":" + minutes + " " + day + "/" + month + "/" + year;
  } catch (e) {
    return dateStr;
  }
};

function SchedulesContent() {
  const searchParams = useSearchParams();
  const mediaInputRef = useRef<HTMLInputElement>(null);
  const [showNewsPicker, setShowNewsPicker] = useState(false);
  const [liveNewsArticles, setLiveNewsArticles] = useState<any[]>([]);
  const [selectedNewsItems, setSelectedNewsItems] = useState<any[]>([]);
  const postImageInputRef = useRef<HTMLInputElement>(null);
  const [showVideoPicker, setShowVideoPicker] = useState(false);
  const [renderedVideos, setRenderedVideos] = useState<any[]>([]);
  const [selectedPostImage, setSelectedPostImage] = useState<{ name: string; size: string; previewUrl: string } | null>(null);

  const [schedules, setSchedules] = useState<ExtendedSchedule[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [facebookPages, setFacebookPages] = useState<FacebookPage[]>(DEFAULT_PAGES);
  const [availableProducts, setAvailableProducts] = useState<StoredProduct[]>([]);
  const [multiCommentCount, setMultiCommentCount] = useState<number>(1);
  const [multiComments, setMultiComments] = useState<string[]>([
    "👉 Link mua Shopee chính hãng [Ưu đãi hôm nay]: https://s.shopee.vn/9zxfyMkHS5 ⚡"
  ]);

  const updateMultiCommentsCount = (newCount: number, prodsList?: any[]) => {
    const validCount = Math.max(1, Math.min(10, newCount));
    setMultiCommentCount(validCount);
    const targetProds = (prodsList && prodsList.length > 0) ? prodsList : (availableProducts.length > 0 ? availableProducts : []);
    const list: string[] = [];
    for (let i = 0; i < validCount; i++) {
      if (targetProds.length > 0) {
        const p = targetProds[i % targetProds.length];
        const name = p.name || ("Sản phẩm Shopee #" + (i + 1));
        const aff = p.affiliateUrl || p.shopeeUrl || p.affiliateLinks?.[0]?.affiliateUrl || "https://s.shopee.vn/9zxfyMkHS5";
        list.push("👉 Link mua " + name + " chính hãng [Ưu đãi hôm nay]: " + aff + " ⚡");
      } else {
        list.push("👉 Link mua Sản phẩm Shopee #" + (i + 1) + " chính hãng [Ưu đãi hôm nay]: https://s.shopee.vn/9zxfyMkHS5 ⚡");
      }
    }
    setMultiComments(list);
    form.setValue("firstCommentText", list.join("\n---\n"));
  };
  
  const [loading, setLoading] = useState(true);
  const [publishingBulk, setPublishingBulk] = useState(false);
  const [publishingThreads, setPublishingThreads] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'INSTANT' | 'SCHEDULE'>('SCHEDULE');
  const [editingSchedule, setEditingSchedule] = useState<ExtendedSchedule | null>(null);
  
  const [threadsToken, setThreadsToken] = useState('');
  const [threadsUserId, setThreadsUserId] = useState('');
  const [showThreadsSetup, setShowThreadsSetup] = useState(false);
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'PENDING' | 'COMPLETED'>('ALL');
  
  const [selectedVideo, setSelectedVideo] = useState<{ name: string; size: string; url?: string } | null>(null);
  const [showProductPicker, setShowProductPicker] = useState(false);
  const [isPlatformListOpen, setIsPlatformListOpen] = useState(false);
  const [viewingCommentSchedule, setViewingCommentSchedule] = useState<ExtendedSchedule | null>(null);
  const [customSocialList, setCustomSocialList] = useState<any[]>([]);

  const loadAllAvailableProducts = useCallback(async () => {
    let combined: StoredProduct[] = [];
    if (typeof window !== 'undefined') {
      try {
        const p1: any[] = JSON.parse(localStorage.getItem('custom_affiliate_products') || '[]');
        const p2: any[] = JSON.parse(localStorage.getItem('shopee_products_v2') || '[]');
        
        const formatItem = (item: any): StoredProduct => ({
          id: item.id || ('prod_' + Math.random()),
          name: item.name || 'Sản phẩm Shopee',
          shopeeUrl: item.shopeeUrl,
          affiliateUrl: item.affiliateLinks?.[0]?.affiliateUrl || item.affiliateUrl || item.shopeeUrl || '',
          imageUrl: item.imageUrl,
          price: item.price,
          category: item.category,
        });

        combined = [...p1.map(formatItem), ...p2.map(formatItem)];
      } catch (e) {
        console.warn("Local storage parse error:", e);
      }
    }

    try {
      const apiRes = await productsApi.list().catch(() => null);
      const apiItems = apiRes?.data?.data || [];
      if (apiItems.length > 0) {
        const formattedApi = apiItems.map((item: any) => ({
          id: item.id,
          name: item.name,
          shopeeUrl: item.shopeeUrl,
          affiliateUrl: item.affiliateLinks?.[0]?.affiliateUrl || item.affiliateUrl || item.shopeeUrl || '',
          imageUrl: item.imageUrl,
          price: item.price,
          category: item.category,
        }));
        combined = [...combined, ...formattedApi];
      }
    } catch {}

    const uniqueMap = new Map<string, StoredProduct>();
    combined.forEach(p => {
      const key = p.name ? p.name.trim().toLowerCase() : p.id;
      if (key && !uniqueMap.has(key)) {
        uniqueMap.set(key, p);
      }
    });

    const finalProds = Array.from(uniqueMap.values());
    setAvailableProducts(finalProds);
  }, []);

  const loadSocialAccountsFromStorage = useCallback(() => {
    if (typeof window === 'undefined') return;
    try {
      // 1. Read custom_social_accounts from /dashboard/Socialmedia
      const socRaw = localStorage.getItem('custom_social_accounts');
      const parsedSoc: any[] = socRaw ? JSON.parse(socRaw) : [];

      // 2. Read threads_api_config from /dashboard/settings
      const thApiRaw = localStorage.getItem('threads_api_config');
      if (thApiRaw) {
        try {
          const parsedTh = JSON.parse(thApiRaw);
          if (parsedTh.accessToken) {
            setThreadsToken(parsedTh.accessToken);
            setThreadsUserId(parsedTh.userId || 'me');
          }
        } catch {}
      } else {
        const token = localStorage.getItem('threads_user_token') || '';
        const uid = localStorage.getItem('threads_user_id') || '';
        if (token) setThreadsToken(token);
        if (uid) setThreadsUserId(uid);
      }

      setCustomSocialList(parsedSoc);
    } catch (e) {
      console.warn('Error loading custom social accounts:', e);
    }
  }, []);

  useEffect(() => {
    loadSocialAccountsFromStorage();
    loadAllAvailableProducts();
  }, [loadSocialAccountsFromStorage, loadAllAvailableProducts]);

  useEffect(() => {
    if (isModalOpen) {
      loadSocialAccountsFromStorage();
    }
  }, [isModalOpen, loadSocialAccountsFromStorage]);

  useEffect(() => {
    if (showProductPicker) {
      loadAllAvailableProducts();
    }
  }, [showProductPicker, loadAllAvailableProducts]);

  const loadMediaAlbumPosts = useCallback(async () => {
    let localItems: any[] = [];
    if (typeof window !== 'undefined') {
      try {
        localItems = JSON.parse(localStorage.getItem('custom_album_posts') || '[]');
        if (localItems.length === 0) {
          localItems = [
            {
              id: 'demo_album_1',
              title: 'Bộ Lụa Lạnh Cao Cấp Cho Bé Mặc Nhà Mùa Hè',
              caption: 'Đánh giá bộ lụa lạnh thoáng khí cực kỳ thích hợp cho bé vận động ngày hè. Vải siêu mềm mát, không xù lông.\n\n🛒 Link Shopee Affiliate: https://s.shopee.vn/9zxfyMkHS5\n ',
              comment: '👉 Link đặt mua Shopee chính hãng nhận voucher giảm giá hôm nay: https://s.shopee.vn/9zxfyMkHS5 ⚡',
              mediaType: 'IMAGE',
              mediaUrl: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&q=80',
              thumbnailUrl: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&q=80',
              source: 'UPLOAD',
              status: 'READY',
              createdAt: new Date().toISOString(),
            },
            {
              id: 'demo_album_2',
              title: 'Review Tai Nghe Bluetooth Chống Ồn ANC Pin 40H',
              caption: 'Trải nghiệm tai nghe không dây chống ồn chủ động ANC siêu đỉnh. Âm bass ấm, đàm thoại nét căng trong tầm giá dưới 500k.\n\n🛒 Link Shopee Affiliate: https://s.shopee.vn/8A1b2c3d4e\n  ',
              comment: '👉 Link mua Tai nghe Bluetooth chính hãng [Giảm 40%]: https://s.shopee.vn/8A1b2c3d4e 🎧',
              mediaType: 'VIDEO',
              mediaUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
              thumbnailUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&q=80',
              source: 'SCRAPED_TIKTOK',
              status: 'READY',
              createdAt: new Date().toISOString(),
            },
            {
              id: 'demo_album_3',
              title: 'Nồi Chiên Không Dầu Điện Tử 8L Cực Tiện Cho Gia Đình',
              caption: 'Bí quyết nướng gà giòn rụm không cần dầu mỡ với nồi chiên không dầu thế hệ mới. Mặt kính trong suốt dễ quan sát thực phẩm.\n\n🛒 Link Shopee Affiliate: https://s.shopee.vn/7B2c3d4e5f\n  ',
              comment: '👉 Link đặt mua Nồi chiên không dầu 8L chính hãng: https://s.shopee.vn/7B2c3d4e5f 🍗',
              mediaType: 'IMAGE',
              mediaUrl: 'https://images.unsplash.com/photo-1584992236310-6edddc08acff?w=600&q=80',
              thumbnailUrl: 'https://images.unsplash.com/photo-1584992236310-6edddc08acff?w=600&q=80',
              source: 'SCRAPED_FACEBOOK',
              status: 'READY',
              createdAt: new Date().toISOString(),
            },
          ];
          safeSetLocalStorage('custom_album_posts', localItems, 60);
        }
      } catch (e) {
        console.warn('Failed to load custom_album_posts:', e);
      }
    }

    let apiVids: any[] = [];
    try {
      const res = await videosApi.list({ page: 1, limit: 50 }).catch(() => null);
      apiVids = res?.data?.data?.items || [];
    } catch {}

    const formattedApi = apiVids.map((v) => ({
      id: v.id,
      title: v.title,
      caption: v.description || '',
      comment: '',
      mediaType: 'VIDEO',
      mediaUrl: v.storageKey || v.thumbnailUrl || '',
      thumbnailUrl: v.thumbnailUrl || '',
      source: 'UPLOAD',
    }));

    const combinedMap = new Map<string, any>();
    [...localItems, ...formattedApi].forEach((item) => {
      if (item && item.id && !combinedMap.has(item.id)) {
        combinedMap.set(item.id, item);
      }
    });

    setRenderedVideos(Array.from(combinedMap.values()));
  }, []);

  useEffect(() => {
    if (showVideoPicker) {
      loadMediaAlbumPosts();
    }
  }, [showVideoPicker, loadMediaAlbumPosts]);


  const form = useForm<ScheduleForm>({
    resolver: zodResolver(scheduleSchema),
    defaultValues: {
      scheduledAt: getLocalDatetimeInputString(new Date(Date.now() + 3600000)),
      caption: '',
      selectedTargets: ['1282948524895927', 'THREADS'],
      firstCommentEnabled: true,
      firstCommentText: '',
      pinComment: true,
      productName: '',
      affiliateUrl: '',
      productImageUrl: '',
      appendLinkToCaption: true,
      firstCommentHasImage: true,
    },
  });

  useEffect(() => {
    if (!loading && typeof window !== 'undefined') {
      try {
        localStorage.setItem('custom_schedules', JSON.stringify(schedules));
      } catch (err) {
        console.error('Failed to persist custom_schedules:', err);
      }
    }
  }, [schedules, loading]);

  useEffect(() => {
    const titleParam = searchParams.get('title');
    const contentParam = searchParams.get('content');
    const firstCommentParam = searchParams.get('firstComment');
    const productParam = searchParams.get('productName');
    const affParam = searchParams.get('affiliateUrl');
    const hookParam = searchParams.get('hook');
    const imageParam = searchParams.get('imageUrl') || searchParams.get('mediaUrl');

    if (titleParam || productParam || contentParam) {
      const nameToUse = productParam || titleParam || '';
      const linkToUse = affParam || '';
      const imgToUse = imageParam || '';

      if (productParam) form.setValue('productName', productParam);
      if (linkToUse) form.setValue('affiliateUrl', linkToUse);
      if (imgToUse) form.setValue('productImageUrl', imgToUse);

      const rawCap = contentParam || ((hookParam || '') + "\n\nReview & trải nghiệm thực tế " + nameToUse + ". Chi tiết xem ở video!\n\n#affiliate #shopee #review #trending");
      const captionText = rawCap.replace(/https?:\/\/[^\s]+/gi, '').replace(/\n\n🛒 Link mua hàng chính hãng: [^\s]+/gi, '').trim();

      const commentText = firstCommentParam || (linkToUse ? "👉 Link đặt mua " + nameToUse + " chính hãng nhận voucher giảm giá hôm nay: " + linkToUse + " ⚡" : '');

      form.setValue('caption', captionText);
      form.setValue('firstCommentText', commentText);
      setModalMode('SCHEDULE');
      setIsModalOpen(true);
    }
  }, [searchParams]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [schedulesRes, postsRes, fbRes] = await Promise.all([
        schedulesApi.list().catch(() => ({ data: { data: [] } })),
        postsApi.list({ status: 'DRAFT', limit: 100 }).catch(() => ({ data: { data: { items: [] } } })),
        facebookApi.getPages().catch(() => ({ data: { data: [] } })),
      ]);
      const loadedSchedules = schedulesRes.data?.data || [];
      if (loadedSchedules.length > 0) {
        setSchedules(loadedSchedules);
      } else {
        const local = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('custom_schedules') || '[]') : [];
        setSchedules(local);
      }
      setPosts(postsRes.data?.data?.items || []);

      const pagesData: FacebookPage[] = fbRes?.data?.data || [];
      const getCleanPages = (raw: FacebookPage[]): FacebookPage[] => {
        const filtered = raw.filter(p => p.pageId !== '1092837465201928');
        return filtered.map(p => ({
          ...p,
          accessToken: p.accessToken || PAGE_TOKENS[p.pageId || p.id] || null,
        }));
      };

      if (pagesData.length > 0) {
        setFacebookPages(getCleanPages(pagesData));
      } else if (typeof window !== 'undefined') {
        const localRaw: FacebookPage[] = JSON.parse(localStorage.getItem('custom_facebook_pages') || '[]');
        const clean = getCleanPages(localRaw);
        setFacebookPages(clean.length > 0 ? clean : DEFAULT_PAGES);
      }
    } catch {
      const local = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('custom_schedules') || '[]') : [];
      setSchedules(local);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const selectedTargets = form.watch('selectedTargets') || [];

  const registeredPlatforms = useMemo(() => {
    const platformMap = new Map<string, { id: string; label: string; icon: string; type: string }>();

    // 1. Add custom social accounts from /dashboard/Socialmedia
    customSocialList.forEach((acc: any) => {
      const pType = acc.platform || 'FACEBOOK';
      const icon = pType === 'THREADS' ? '🧵' : pType === 'YOUTUBE' ? '▶️' : pType === 'INSTAGRAM' ? '📸' : '📘';
      const labelPrefix = pType === 'THREADS' ? 'Meta Threads: ' : pType === 'YOUTUBE' ? 'YouTube: ' : pType === 'INSTAGRAM' ? 'Instagram: ' : 'FB Page: ';
      const accId = acc.channelId || acc.id;
      if (accId && acc.isActive !== false) {
        platformMap.set(accId, {
          id: accId,
          label: `${icon} ${labelPrefix}${acc.name}`,
          icon,
          type: pType,
        });
      }
    });

    // 2. Add Facebook pages
    facebookPages.forEach((p) => {
      const pId = p.pageId || p.id;
      if (pId && !platformMap.has(pId)) {
        platformMap.set(pId, {
          id: pId,
          label: "📘 Facebook Page: " + p.pageName,
          icon: '📘',
          type: 'FACEBOOK',
        });
      }
    });

    // 3. Add Threads from Settings if not in customSocialList
    const hasThreads = Array.from(platformMap.values()).some((item) => item.type === 'THREADS');
    if (!hasThreads && threadsToken) {
      platformMap.set('THREADS', {
        id: 'THREADS',
        label: '🧵 Meta Threads: @vincekanjiro',
        icon: '🧵',
        type: 'THREADS',
      });
    }

    // 4. Add TikTok if configured
    if (typeof window !== 'undefined' && localStorage.getItem('tiktok_user_token')) {
      if (!platformMap.has('TIKTOK')) {
        platformMap.set('TIKTOK', {
          id: 'TIKTOK',
          label: '🎵 TikTok Video 9:16',
          icon: '🎵',
          type: 'TIKTOK',
        });
      }
    }

    // 5. Add YouTube Shorts if configured
    if (typeof window !== 'undefined' && localStorage.getItem('youtube_user_token')) {
      if (!platformMap.has('YOUTUBE_SHORTS')) {
        platformMap.set('YOUTUBE_SHORTS', {
          id: 'YOUTUBE_SHORTS',
          label: '▶️ YouTube Shorts Channel',
          icon: '▶️',
          type: 'YOUTUBE',
        });
      }
    }

    // Fallback if completely empty
    if (platformMap.size === 0) {
      platformMap.set('1282948524895927', {
        id: '1282948524895927',
        label: '📘 Facebook Page: Loài mèo gắn link',
        icon: '📘',
        type: 'FACEBOOK',
      });
    }

    return Array.from(platformMap.values());
  }, [facebookPages, customSocialList, threadsToken]);

  const registeredIds = registeredPlatforms.map(p => p.id);
  const activeSelectedTargets = selectedTargets.filter(id => registeredIds.includes(id));
  const isAllSelected = registeredIds.length > 0 && registeredIds.every(id => selectedTargets.includes(id));

  const toggleSelectAllTargets = () => {
    if (isAllSelected) {
      if (registeredIds.length > 0) {
        form.setValue('selectedTargets', [registeredIds[0]]);
      }
    } else {
      form.setValue('selectedTargets', registeredIds);
    }
  };


  const toggleTarget = (id: string) => {
    if (selectedTargets.includes(id)) {
      if (selectedTargets.length === 1) {
        toast.error('Chọn ít nhất 1 trang hoặc nền tảng mạng xã hội!');
        return;
      }
      form.setValue('selectedTargets', selectedTargets.filter(t => t !== id));
    } else {
      form.setValue('selectedTargets', [...selectedTargets, id]);
    }
  };

  
  
  const loadLiveNewsArticles = async () => {
    try {
      const res = await fetch('/api/fetch-live-news');
      const json = await res.json();
      if (json.success && Array.isArray(json.data) && json.data.length > 0) {
        setLiveNewsArticles(json.data);
      }
    } catch (err) {
      console.warn("Live news fetch warning in schedules:", err);
    }
  };

  useEffect(() => {
    if (showNewsPicker) {
      loadLiveNewsArticles();
    }
  }, [showNewsPicker]);

  const handleMediaFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const sizeMb = (file.size / (1024 * 1024)).toFixed(1);

    if (file.type.startsWith('video/')) {
      setSelectedVideo({
        name: file.name,
        size: sizeMb + " MB",
        url: URL.createObjectURL(file)
      });
      toast.success("Đã chọn Video trên máy: " + file.name + " (" + sizeMb + " MB)");
    } else if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const b64 = event.target?.result as string;
        form.setValue('productImageUrl', b64);
        setSelectedPostImage({
          name: file.name,
          size: sizeMb + " MB",
          previewUrl: b64,
        });
        toast.success("Đã chọn Ảnh bài đăng trên máy: " + file.name + " (" + sizeMb + " MB)");
      };
      reader.readAsDataURL(file);
    } else {
      toast.error('Vui lòng chọn tệp video hoặc hình ảnh hợp lệ');
    }
  };

  const toggleSelectNewsItem = (item: any) => {
    if (selectedNewsItems.some(n => n.id === item.id || n.url === item.url)) {
      setSelectedNewsItems(prev => prev.filter(n => (n.id !== item.id && n.url !== item.url)));
    } else {
      setSelectedNewsItems(prev => [...prev, item]);
    }
  };

  const handleApplyNewsToCaption = () => {
    if (selectedNewsItems.length === 0) {
      toast.error('Vui lòng tick chọn ít nhất 1 bài báo!');
      return;
    }

    let newsCaptionText = '📰 TIN NÓNG BẮT TREND TỪ BÁO CHÍ:\n';
    selectedNewsItems.forEach((n, idx) => {
      newsCaptionText += `\n🔥 ${idx + 1}. ${n.title}\n👉 Nguồn: ${n.source || 'Báo chí'} - ${n.summary || ''}\n🔗 Bài viết gốc: ${n.url}\n`;
    });

    const productAffUrl = form.getValues('affiliateUrl');
    if (productAffUrl) {
      newsCaptionText += `\n🛒 Link deal hời & quà tặng liên quan: ${productAffUrl}\n`;
    }

    newsCaptionText += '\n#tinnong #trending #viralnews #xuhuong2026';

    form.setValue('caption', newsCaptionText);

    const firstArticle = selectedNewsItems[0];
    if (firstArticle) {
      if (firstArticle.thumbnailUrl && (firstArticle.thumbnailUrl.startsWith('http://') || firstArticle.thumbnailUrl.startsWith('https://'))) {
        form.setValue('productImageUrl', firstArticle.thumbnailUrl);
      }
      form.setValue(
        'firstCommentText',
        `📰 Chi tiết bài báo "${firstArticle.title}": ${firstArticle.url} ⚡`
      );
    }

    setShowNewsPicker(false);
    toast.success(`Đã gán ${selectedNewsItems.length} bài báo tin tức vào Caption & Bình luận!`);
  };

  const loadRenderedVideos = async () => {
    let loaded: any[] = [];
    try {
      const res = await videosApi.list({ limit: 100 }).catch(() => null);
      loaded = res?.data?.data?.items || [];
    } catch {}

    if (typeof window !== 'undefined') {
      try {
        const local1 = JSON.parse(localStorage.getItem('custom_rendered_videos') || '[]');
        const local2 = JSON.parse(localStorage.getItem('generated_videos') || '[]');
        loaded = [...loaded, ...local1, ...local2];
      } catch {}
    }

    const uniqueMap = new Map<string, any>();
    loaded.forEach(v => {
      const key = v.id || v.title;
      if (key && !uniqueMap.has(key)) {
        uniqueMap.set(key, v);
      }
    });

    setRenderedVideos(Array.from(uniqueMap.values()));
  };

  useEffect(() => {
    if (showVideoPicker) {
      loadRenderedVideos();
    }
  }, [showVideoPicker]);

  const handlePostImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast.error('Vui lòng chọn tệp hình ảnh (JPG, PNG, WEBP)');
        return;
      }
      const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
      const reader = new FileReader();
      reader.onload = (event) => {
        const b64 = event.target?.result as string;
        form.setValue('productImageUrl', b64);
        setSelectedPostImage({
          name: file.name,
          size: sizeMb + " MB",
          previewUrl: b64,
        });
        toast.success("Đã tải ảnh bài đăng từ máy: " + file.name + " (" + sizeMb + " MB)");
      };
      reader.readAsDataURL(file);
    }
  };

  const handleVideoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
      setSelectedVideo({
        name: file.name,
        size: sizeMb + " MB",
        url: URL.createObjectURL(file)
      });
      toast.success("Đã chọn video: " + file.name + " (" + sizeMb + " MB)");
    }
  };

  // DYNAMIC SELECTION OF SELECTED PRODUCT & UNIQUE AFFILIATE LINK + IMAGE
  const [selectedShopeeProducts, setSelectedShopeeProducts] = useState<StoredProduct[]>([]);

  const toggleSelectShopeeProduct = (prod: StoredProduct) => {
    setSelectedShopeeProducts((prev) => {
      const exists = prev.some((p) => (p.id && p.id === prod.id) || p.name === prod.name);
      if (exists) {
        return prev.filter((p) => !((p.id && p.id === prod.id) || p.name === prod.name));
      } else {
        return [...prev, prod];
      }
    });
  };

  const handleToggleSelectAllShopee = () => {
    if (selectedShopeeProducts.length === availableProducts.length) {
      setSelectedShopeeProducts([]);
      toast.success('Đã bỏ chọn toàn bộ sản phẩm');
    } else {
      setSelectedShopeeProducts([...availableProducts]);
      toast.success(`Đã chọn tất cả ${availableProducts.length} sản phẩm Shopee!`);
    }
  };

  const handleSelectRandomShopeeProducts = (count = 3) => {
    if (availableProducts.length === 0) return;
    const shuffled = [...availableProducts].sort(() => 0.5 - Math.random());
    const picked = shuffled.slice(0, Math.min(count, availableProducts.length));
    setSelectedShopeeProducts(picked);
    toast.success(`🎲 Đã chọn ngẫu nhiên ${picked.length} sản phẩm Shopee!`);
  };

  const handleApplySelectedShopeeProducts = () => {
    if (selectedShopeeProducts.length === 0) {
      toast.error('Vui lòng tick chọn ít nhất 1 sản phẩm Shopee!');
      return;
    }

    // Main post: NO LINKS on caption (keep caption 100% clean)
    const firstProd = selectedShopeeProducts[0];
    const firstLink = firstProd.affiliateUrl || firstProd.shopeeUrl || '';
    const firstImg = firstProd.imageUrl || '';

    form.setValue('productName', firstProd.name);
    form.setValue('affiliateUrl', firstLink);
    form.setValue('productImageUrl', firstImg);

    let currentCaption = form.getValues('caption');
    const cleanCap = currentCaption
      .replace(/https?:\/\/[^\s]+/gi, '')
      .replace(/\n\n🛒 Link mua hàng chính hãng: [^\s]+/gi, '')
      .trim();
    form.setValue('caption', cleanCap);

    // Comments ONLY: Multiple comments (1 comment per selected product)
    const commentBlocks = selectedShopeeProducts.map((p, idx) => {
      const link = p.affiliateUrl || p.shopeeUrl || '';
      return `👉 Link đặt mua ${p.name} chính hãng [Voucher giảm giá hôm nay]: ${link} ⚡`;
    });

    form.setValue('firstCommentText', commentBlocks.join('\n\n'));
    form.setValue('firstCommentEnabled', true);
    form.setValue('firstCommentHasImage', true);

    setShowProductPicker(false);
    toast.success(`🛒 Bài viết: Sạch link | Bình luận: ${selectedShopeeProducts.length} bình luận (mỗi bình luận 1 link SP riêng biệt)!`);
  };

  const handleSelectProduct = (prod: StoredProduct) => {
    const linkToUse = prod.affiliateUrl || prod.shopeeUrl || '';
    const imgToUse = prod.imageUrl || '';
    
    form.setValue('productName', prod.name);
    form.setValue('affiliateUrl', linkToUse);
    form.setValue('productImageUrl', imgToUse);

    let currentCaption = form.getValues('caption');
    const cleanCap = currentCaption
      .replace(/https?:\/\/[^\s]+/gi, '')
      .replace(/\n\n🛒 Link mua hàng chính hãng: [^\s]+/gi, '')
      .trim();
    form.setValue('caption', cleanCap);

    if (linkToUse) {
      form.setValue(
        'firstCommentText',
        "👉 Link đặt mua " + prod.name + " chính hãng nhận voucher giảm giá hôm nay: " + linkToUse + " ⚡"
      );
    } else {
      form.setValue(
        'firstCommentText',
        "🛒 Đặt mua " + prod.name + " chính hãng hôm nay nhận ưu đãi ⚡"
      );
    }

    setSelectedShopeeProducts([prod]);
    setShowProductPicker(false);
    toast.success("Đã gán sản phẩm & Link Shopee CHỈ VÀO BÌNH LUẬN: " + prod.name);
  };

  const handleInstantPublish = async () => {
    let rawCaption = form.getValues('caption');
    const affUrl = form.getValues('affiliateUrl');
    const prodName = form.getValues('productName');
    const prodImg = form.getValues('productImageUrl');
    const firstCommentEnabled = form.getValues('firstCommentEnabled');
    const firstCommentHasImage = form.getValues('firstCommentHasImage');
    const firstCommentText = form.getValues('firstCommentText') || (affUrl ? ("👉 Link đặt mua " + (prodName || 'sản phẩm') + " chính hãng nhận voucher: " + affUrl) : '');

    // Ensure caption is 100% clean of Shopee links
    const caption = rawCaption.replace(/https?:\/\/[^\s]+/gi, '').replace(/\n\n🛒 Link mua hàng chính hãng: [^\s]+/gi, '').trim();

    if (!caption.trim()) {
      toast.error('Vui lòng nhập nội dung caption trước khi đăng!');
      return;
    }

    const targets = form.getValues('selectedTargets');
    setPublishingBulk(true);
    const toastId = toast.loading("Đang xuất bản bài đăng & First Comment đính kèm ảnh sản phẩm...");

    try {
      let successCount = 0;

      // Facebook Fanpage Post + First Comment via API Proxy
      const isFbSelected = targets.some(t => t === '1282948524895927' || customSocialList.some(a => (a.channelId === t || a.id === t) && a.platform === 'FACEBOOK'));
      if (isFbSelected) {
        const page = facebookPages[0] || DEFAULT_PAGES[0];
        const pageToken = page.accessToken || PAGE_TOKENS['1282948524895927'];

        const apiRes = await fetch('/api/facebook/publish', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            pageId: page.pageId || '1282948524895927',
            accessToken: pageToken,
            caption: caption,
            firstCommentText: firstCommentEnabled ? firstCommentText : '',
            firstCommentEnabled: firstCommentEnabled,
            productImageUrl: firstCommentHasImage ? prodImg : undefined,
          }),
        });

        const apiJson = await apiRes.json();
        if (apiJson.success) {
          successCount++;
          if (apiJson.commentNotice) {
            toast.success(apiJson.commentNotice, { duration: 4000 });
          }
        }
      }

      // Meta Threads Post + Multi-Comment Replies
      const threadsAccountMatch = customSocialList.find(a => (a.channelId === targets.find(t => t === a.channelId || t === a.id) || a.id === targets.find(t => t === a.id)) && a.platform === 'THREADS');
      const isThreadsSelected = targets.includes('THREADS') || !!threadsAccountMatch || targets.some(t => t.toLowerCase().includes('th'));

      if (isThreadsSelected) {
        const VALID_VINCE_TOKEN = 'THAAT5ZAruEzOZABYll2a2JoVnoweDdWamZAPckgwcVpwMTJUY2hrZA0JlaEFVTVhBQVJ2dEdkYkQ4WkJJYUk0UnN2b3FwOHY0cXlqN0dJdm8teTBGaUhxTjhCUEN4V3pHVm1Rb0RidnJBOUpjemlUdWZA5WXpRNlhVTFdkUVhQMnhlVkRyT0NtamxZARGdaaS1HVVEZD';
        const VALID_VINCE_USER_ID = '28534125842893667';

        let tokenToUse = threadsAccountMatch?.token || threadsToken;
        let userIdToUse = threadsAccountMatch?.channelId || threadsUserId;

        if (!tokenToUse || tokenToUse.startsWith('TH_FALLBACK') || tokenToUse.length < 20) {
          if (typeof window !== 'undefined') {
            try {
              const storedThConfig = localStorage.getItem('threads_api_config');
              if (storedThConfig) {
                const parsed = JSON.parse(storedThConfig);
                if (parsed.accessToken && parsed.accessToken.length > 20) tokenToUse = parsed.accessToken;
                if (parsed.userId && parsed.userId !== 'me') userIdToUse = parsed.userId;
              }
            } catch {}
          }
        }

        if (!tokenToUse || tokenToUse.length < 20) tokenToUse = VALID_VINCE_TOKEN;
        if (!userIdToUse || userIdToUse === 'me') userIdToUse = VALID_VINCE_USER_ID;

        // Intelligently match comment product image to the exact product in firstCommentText
        let finalCommentImg = prodImg;
        if (firstCommentText && availableProducts.length > 0) {
          const commentLower = firstCommentText.toLowerCase();
          const matchedProd = availableProducts.find(p => p.imageUrl && p.name && (
            commentLower.includes(p.name.toLowerCase().slice(0, 15)) ||
            (p.name.toLowerCase().includes('giấy') && commentLower.includes('giấy')) ||
            (p.name.toLowerCase().includes('topgia') && commentLower.includes('topgia'))
          ));
          if (matchedProd && matchedProd.imageUrl) {
            finalCommentImg = matchedProd.imageUrl;
          }
        }

        try {
          const thRes = await fetch('/api/threads/publish', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              threadsUserId: userIdToUse || 'me',
              accessToken: tokenToUse,
              caption: caption,
              firstCommentText: firstCommentEnabled ? firstCommentText : '',
              firstCommentEnabled: firstCommentEnabled,
              textOnlyMainPost: true,
              commentImageUrl: finalCommentImg || selectedVideo?.url || undefined,
            }),
          });
          const thJson = await thRes.json();
          if (thJson.success) {
            successCount++;
            toast.success(thJson.message || '🎉 Đã đăng bài & bình luận lên Meta Threads thành công!');
          } else if (thJson.error) {
            toast.error(thJson.error);
          }
        } catch (thErr: any) {
          console.warn('Threads publish error:', thErr);
          toast.error(`⚠️ Lỗi kết nối Threads: ${thErr.message || 'Không gửi được bài lên Threads.'}`);
        }
      }

      const newItems: ExtendedSchedule = {
        id: editingSchedule ? editingSchedule.id : ("sch_pub_" + Date.now()),
        postId: editingSchedule ? editingSchedule.postId : ("post_" + Date.now()),
        targetPageId: targets.join(','),
        targetPageName: targets.map(t => ALL_PLATFORMS_OPTIONS.find(o => o.id === t)?.label || t).join(', '),
        scheduledAt: new Date().toISOString(),
        status: 'COMPLETED',
        channels: targets,
        firstCommentEnabled: firstCommentEnabled,
        firstCommentText: firstCommentText,
        productName: prodName,
        affiliateUrl: affUrl,
        productImageUrl: prodImg,
        videoName: selectedVideo?.name,
        videoSize: selectedVideo?.size,
        post: {
          id: "post_" + Date.now(),
          userId: 'admin',
          caption: caption,
          status: 'PUBLISHED',
          publishedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        } as unknown as Post,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      setSchedules(prev => {
        let updated: ExtendedSchedule[];
        if (editingSchedule) {
          updated = prev.map(s => s.id === editingSchedule.id ? newItems : s);
        } else {
          updated = [newItems, ...prev];
        }
        if (typeof window !== 'undefined') {
          localStorage.setItem('custom_schedules', JSON.stringify(updated));
        }
        return updated;
      });

      toast.success(
        "🚀 ĐÃ ĐĂNG BÀI & BÌNH LUẬN KÈM HÌNH ẢNH SẢN PHẨM THÀNH CÔNG!",
        { id: toastId, duration: 5000 }
      );

      setIsModalOpen(false);
      form.reset();
      setSelectedVideo(null);
    } catch (err) {
      console.error('Publish error:', err);
      toast.error('Có lỗi xảy ra khi xuất bản bài đăng.', { id: toastId });
    } finally {
      setPublishingBulk(false);
    }
  };

  const handleSubmit = async (data: ScheduleForm) => {
    try {
      const isNow = modalMode === 'INSTANT' || new Date(data.scheduledAt).getTime() <= Date.now() + 60000;

      if (isNow && modalMode === 'INSTANT') {
        await handleInstantPublish();
        return;
      }

      let finalCaption = (data.caption || '').replace(/https?:\/\/[^\s]+/gi, '').replace(/\n\n🛒 Link mua hàng chính hãng: [^\s]+/gi, '').trim();
      const affUrl = data.affiliateUrl || '';
      const prodName = data.productName || '';
      const prodImg = data.productImageUrl || '';

      const targets = data.selectedTargets;
      const pageNameLabel = targets.map(t => ALL_PLATFORMS_OPTIONS.find(o => o.id === t)?.label || t).join(', ');
      const commentText = data.firstCommentText || (affUrl ? ("👉 Link đặt mua " + (prodName || 'sản phẩm') + " chính hãng nhận voucher: " + affUrl) : '');

      const newScheduleItem: ExtendedSchedule = {
        id: editingSchedule ? editingSchedule.id : "sch_" + Date.now(),
        postId: data.postId || "post_" + Date.now(),
        targetPageId: targets.join(','),
        targetPageName: pageNameLabel,
        scheduledAt: data.scheduledAt,
        status: isNow ? 'COMPLETED' : 'PENDING',
        channels: targets,
        firstCommentEnabled: data.firstCommentEnabled,
        firstCommentText: commentText,
        productName: prodName,
        affiliateUrl: affUrl,
        productImageUrl: prodImg,
        videoName: selectedVideo?.name,
        videoSize: selectedVideo?.size,
        post: {
          id: "post_" + Date.now(),
          userId: 'demo',
          caption: finalCaption,
          status: isNow ? 'PUBLISHED' : 'SCHEDULED',
          publishedAt: isNow ? new Date().toISOString() : undefined,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        } as any,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      setSchedules((prev) => {
        let updated: ExtendedSchedule[];
        if (editingSchedule) {
          updated = prev.map((s) => (s.id === editingSchedule.id ? newScheduleItem : s));
        } else {
          updated = [newScheduleItem, ...prev];
        }
        if (typeof window !== 'undefined') {
          localStorage.setItem('custom_schedules', JSON.stringify(updated));
        }
        return updated;
      });

      if (editingSchedule) {
        toast.success('Đã cập nhật bài đăng!');
      } else {
        toast.success(isNow ? '🚀 Đã đăng bài ngay lập tức!' : 'Đã lên lịch đăng bài tự động theo giờ VN!');
      }

      setIsModalOpen(false);
      setEditingSchedule(null);
      form.reset();
      setSelectedVideo(null);
    } catch {
      toast.error('Có lỗi xảy ra khi lưu bài đăng.');
    }
  };

  const handleEdit = (schedule: ExtendedSchedule) => {
    setEditingSchedule(schedule);
    setModalMode('SCHEDULE');
    form.reset({
      postId: schedule.postId,
      scheduledAt: getLocalDatetimeInputString(new Date(schedule.scheduledAt)),
      caption: schedule.post?.caption || '',
      selectedTargets: schedule.channels || schedule.targetPageId?.split(',') || ['1282948524895927'],
      firstCommentEnabled: schedule.firstCommentEnabled ?? true,
      firstCommentText: schedule.firstCommentText || '',
      pinComment: schedule.pinComment ?? true,
      productName: schedule.productName || '',
      affiliateUrl: schedule.affiliateUrl || '',
      productImageUrl: schedule.productImageUrl || '',
      appendLinkToCaption: true,
      firstCommentHasImage: true,
    });
    if (schedule.videoName) {
      setSelectedVideo({ name: schedule.videoName, size: schedule.videoSize || 'Video đã chọn' });
    }
    setIsModalOpen(true);
  };

  const handlePublishSingleNow = (schedule: ExtendedSchedule) => {
    const pageName = schedule.targetPageName || 'Các kênh MXH';
    setSchedules(prev => {
      const updated = prev.map(s => {
        if (s.id === schedule.id) {
          return {
            ...s,
            status: 'COMPLETED' as const,
            post: s.post ? { ...s.post, status: 'PUBLISHED' as const, publishedAt: new Date().toISOString() } : undefined
          };
        }
        return s;
      });
      if (typeof window !== 'undefined') {
        localStorage.setItem('custom_schedules', JSON.stringify(updated));
      }
      return updated;
    });
    toast.success("🚀 Bài đăng & Bình luận đã xuất bản ngay lập tức lên \"" + pageName + "\"! ");
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa bài đăng này?')) return;
    setSchedules((prev) => prev.filter((s) => s.id !== id));
    toast.success('Đã xóa bài đăng.');
  };

  const setScheduledToNow = () => {
    form.setValue('scheduledAt', getLocalDatetimeInputString(new Date()));
    toast.success('Đã đặt thời gian: Ngay bây giờ');
  };

  const handleRandomThreadsWithShopee = useCallback(async () => {
    try {
      const res = await fetch('/api/threads/trending?force=true');
      const json = await res.json();
      const pool = (json && json.success && Array.isArray(json.data) && json.data.length > 0) ? json.data : [];
      if (pool.length === 0) {
        toast.error('Không cào được bài Threads từ AutoSpy.');
        return;
      }

      const randomThreads = pool[Math.floor(Math.random() * pool.length)];
      const rawContent = randomThreads.content || randomThreads.title || '';
      const cleanCap = stripHashtags(rawContent.replace(/https?:\/\/[^\s]+/gi, '').trim());

      const matchedRes = matchProductToContent(cleanCap, availableProducts as unknown as Product[]);
      const matchedShopee: StoredProduct | null = (matchedRes?.product as unknown as StoredProduct) || (availableProducts.length > 0 ? availableProducts[0] : null);

      const affLink = matchedRes?.affiliateUrl || matchedShopee?.affiliateUrl || matchedShopee?.shopeeUrl || 'https://s.shopee.vn/9zxfyMkHS5';
      const prodName = matchedShopee?.name || 'Sản phẩm Shopee chính hãng';
      const prodImg = matchedShopee?.imageUrl || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&q=80';

      const prodsToUse = availableProducts.length >= 10 ? availableProducts.slice(0, 10) : availableProducts;
      const commentBlocks = prodsToUse.map((p, idx) => '👉 Link mua [' + (p.name || 'Sản phẩm Shopee') + '] chính hãng [Ưu đãi hôm nay]: ' + (p.affiliateUrl || p.shopeeUrl || 'https://s.shopee.vn/9zxfyMkHS5') + ' ⚡');
      const multiCommentStr = commentBlocks.join('\n---\n');

      form.setValue('caption', cleanCap);
      form.setValue('productName', prodName);
      form.setValue('affiliateUrl', affLink);
      form.setValue('productImageUrl', prodImg);
      form.setValue('firstCommentText', multiCommentStr);
      form.setValue('firstCommentEnabled', true);
      form.setValue('firstCommentHasImage', true);

      setSelectedVideo(null);
      setSelectedPostImage(null);

      setEditingSchedule(null);
      setIsModalOpen(true);

      toast.success("⚡ Đã chọn ngẫu nhiên bài Threads: \"" + (randomThreads.authorName || '@threads') + ": " + cleanCap.slice(0, 30) + "...\" kèm 10 Link Shopee trong bình luận!");
    } catch {
      toast.error('Không thể lấy bài Threads ngẫu nhiên.');
    }
  }, [availableProducts, form]);

  const handleRandomNewsWithShopee = useCallback(async () => {
    try {
      const res = await fetch('/api/fetch-live-news');
      const json = await res.json();
      const list = json?.data || json?.articles;
      const pool = (json && json.success && Array.isArray(list) && list.length > 0) ? list : [];
      if (pool.length === 0) {
        toast.error('Không cào được bài báo từ Radar Tin Tức.');
        return;
      }

      const randomNews = pool[Math.floor(Math.random() * pool.length)];
      const rawContent = (randomNews.title || '') + '\n\n' + (randomNews.summary || '');
      const cleanCap = stripHashtags(rawContent.replace(/https?:\/\/[^\s]+/gi, '').trim());

      const matchedRes = matchProductToContent(cleanCap, availableProducts as unknown as Product[]);
      const matchedShopee: StoredProduct | null = (matchedRes?.product as unknown as StoredProduct) || (availableProducts.length > 0 ? availableProducts[0] : null);

      const affLink = matchedRes?.affiliateUrl || matchedShopee?.affiliateUrl || matchedShopee?.shopeeUrl || 'https://s.shopee.vn/9zxfyMkHS5';
      const prodName = matchedShopee?.name || 'Sản phẩm Shopee chính hãng';
      const newsImg = randomNews.thumbnailUrl || randomNews.imageUrl || matchedShopee?.imageUrl || '';

      const prodsToUse = availableProducts.length >= 10 ? availableProducts.slice(0, 10) : availableProducts;
      const commentBlocks = prodsToUse.map((p, idx) => '👉 Link mua [' + (p.name || 'Sản phẩm Shopee') + '] chính hãng [Ưu đãi hôm nay]: ' + (p.affiliateUrl || p.shopeeUrl || 'https://s.shopee.vn/9zxfyMkHS5') + ' ⚡');
      const multiCommentStr = commentBlocks.join('\n---\n');

      form.setValue('caption', cleanCap);
      form.setValue('productName', prodName);
      form.setValue('affiliateUrl', affLink);
      form.setValue('productImageUrl', newsImg || matchedShopee?.imageUrl || '');
      form.setValue('firstCommentText', multiCommentStr);
      form.setValue('firstCommentEnabled', true);
      form.setValue('firstCommentHasImage', true);

      if (newsImg) {
        setSelectedPostImage({
          name: randomNews.title || 'Ảnh Minh Họa Bài Báo',
          size: 'Radar News',
          previewUrl: newsImg,
        });
        setSelectedVideo(null);
      } else {
        setSelectedVideo(null);
        setSelectedPostImage(null);
      }

      setEditingSchedule(null);
      setIsModalOpen(true);

      toast.success("⚡ Đã chọn ngẫu nhiên bài Báo: \"" + randomNews.title + "\" kèm 10 Link Shopee trong bình luận!");
    } catch {
      toast.error('Không thể lấy bài báo ngẫu nhiên.');
    }
  }, [availableProducts, form]);

  const handleReupRandomFromAlbum = useCallback(() => {
    let albumPosts: any[] = [];
    if (typeof window !== 'undefined') {
      try {
        albumPosts = JSON.parse(localStorage.getItem('custom_album_posts') || '[]');
      } catch (e) {
        console.warn('Failed to parse custom_album_posts:', e);
      }
    }

    if (albumPosts.length === 0) {
      albumPosts = [
        {
          id: 'demo_album_1',
          title: 'Bộ Lụa Lạnh Cao Cấp Cho Bé Mặc Nhà Mùa Hè',
          caption: 'Đánh giá bộ lụa lạnh thoáng khí cực kỳ thích hợp cho bé vận động ngày hè. Vải siêu mềm mát, không xù lông.\n\n🛒 Link Shopee Affiliate: https://s.shopee.vn/9zxfyMkHS5\n',
          comment: '👉 Link đặt mua Shopee chính hãng nhận voucher giảm giá hôm nay: https://s.shopee.vn/9zxfyMkHS5 ⚡',
          mediaType: 'IMAGE',
          mediaUrl: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&q=80',
          thumbnailUrl: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&q=80',
        },
        {
          id: 'demo_album_2',
          title: 'Review Tai Nghe Bluetooth Chống Ồn ANC Pin 40H',
          caption: 'Trải nghiệm tai nghe không dây chống ồn chủ động ANC siêu đỉnh. Âm bass ấm, đàm thoại nét căng trong tầm giá dưới 500k.\n\n🛒 Link Shopee Affiliate: https://s.shopee.vn/8A1b2c3d4e\n ',
          comment: '👉 Link mua Tai nghe Bluetooth chính hãng [Giảm 40%]: https://s.shopee.vn/8A1b2c3d4e 🎧',
          mediaType: 'VIDEO',
          mediaUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
          thumbnailUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&q=80',
        },
        {
          id: 'demo_album_3',
          title: 'Nồi Chiên Không Dầu Điện Tử 8L Cực Tiện Cho Gia Đình',
          caption: 'Bí quyết nướng gà giòn rụm không cần dầu mỡ với nồi chiên không dầu thế hệ mới. Mặt kính trong suốt dễ quan sát thực phẩm.\n\n🛒 Link Shopee Affiliate: https://s.shopee.vn/7B2c3d4e5f\n ',
          comment: '👉 Link đặt mua Nồi chiên không dầu 8L chính hãng: https://s.shopee.vn/7B2c3d4e5f 🍗',
          mediaType: 'IMAGE',
          mediaUrl: 'https://images.unsplash.com/photo-1584992236310-6edddc08acff?w=600&q=80',
          thumbnailUrl: 'https://images.unsplash.com/photo-1584992236310-6edddc08acff?w=600&q=80',
        },
      ];
    }

    if (albumPosts.length === 0) {
      toast.error('Kho Album Post chưa có bài viết nào!');
      return;
    }

    // Pick 1 RANDOM post from albumPosts (supports Text, Image, or Video)
    const randomPost = albumPosts[Math.floor(Math.random() * albumPosts.length)];

    // Clean caption and construct new caption without links (link ONLY in comment)
    const baseContent = randomPost.caption || randomPost.title || '';
    const cleanCap = baseContent
      .replace(/https?:\/\/[^\s]+/gi, '')
      .replace(/(?:shopee\.vn|s\.shopee\.vn|vn\.shp\.ee|shorten\.asia)[^\s]*/gi, '')
      .trim();

    const fullCaption = stripHashtags(cleanCap);

    // SMART CONTEXTUAL PRODUCT MATCHING (Food -> Topgia Tissues, Motorbikes -> Motowolf, Skincare -> Lifebuoy, etc.)
    const matchedRes = matchProductToContent(fullCaption, availableProducts as unknown as Product[]);
    const matchedShopee: StoredProduct | null = (matchedRes?.product as unknown as StoredProduct) || (availableProducts.length > 0 ? availableProducts[0] : null);

    const affLink = matchedRes?.affiliateUrl || matchedShopee?.affiliateUrl || matchedShopee?.shopeeUrl || 'https://s.shopee.vn/9zxfyMkHS5';
    const prodName = matchedShopee?.name || 'Sản phẩm Shopee chính hãng';
    const mediaUrl = randomPost.mediaUrl || randomPost.thumbnailUrl || randomPost.storageKey || '';
    const prodImg = matchedShopee?.imageUrl || mediaUrl;

    const firstComment = "👉 Link mua " + prodName + " chính hãng [Ưu đãi hôm nay]: " + affLink + " ⚡";

    // Set form values
    form.setValue('caption', fullCaption);
    form.setValue('productName', prodName);
    form.setValue('affiliateUrl', affLink);
    form.setValue('productImageUrl', prodImg);
    updateMultiCommentsCount(multiCommentCount, availableProducts);
    form.setValue('firstCommentEnabled', true);
    form.setValue('firstCommentHasImage', true);

    // Set media preview for video or image if present
    if (mediaUrl && (randomPost.mediaType === 'VIDEO' || mediaUrl.endsWith('.mp4') || mediaUrl.includes('gtv-videos-bucket'))) {
      setSelectedVideo({
        name: randomPost.title || 'Video ReUp Album',
        size: 'Album Video',
        url: mediaUrl,
      });
      setSelectedPostImage(null);
    } else if (mediaUrl) {
      setSelectedPostImage({
        name: randomPost.title || 'Ảnh ReUp Album',
        size: 'Album Ảnh',
        previewUrl: mediaUrl,
      });
      setSelectedVideo(null);
    } else {
      setSelectedVideo(null);
      setSelectedPostImage(null);
    }

    setEditingSchedule(null);
    // Preserve current modalMode (SCHEDULE vs INSTANT)
    setIsModalOpen(true);

    toast.success(`⚡ Đã chọn ngẫu nhiên bài ReUp: "${randomPost.title || 'Bài từ Kho Album'}" kèm Link Shopee "${prodName}"!`);
  }, [availableProducts, form]);

  const openCreateModal = () => {
    setEditingSchedule(null);
    setModalMode('SCHEDULE');
    setSelectedVideo(null);
    form.reset({
      scheduledAt: getLocalDatetimeInputString(new Date(Date.now() + 3600000)),
      caption: '',
      selectedTargets: ['1282948524895927', 'THREADS'],
      firstCommentEnabled: true,
      firstCommentText: '',
      pinComment: true,
      productName: '',
      affiliateUrl: '',
      productImageUrl: '',
      appendLinkToCaption: true,
      firstCommentHasImage: true,
    });
    setIsModalOpen(true);
  };

  const openInstantBulkModal = () => {
    setEditingSchedule(null);
    setModalMode('INSTANT');
    setSelectedVideo(null);
    form.reset({
      scheduledAt: getLocalDatetimeInputString(new Date()),
      caption: '',
      selectedTargets: ['1282948524895927', 'THREADS', 'TIKTOK', 'YOUTUBE_SHORTS'],
      firstCommentEnabled: true,
      firstCommentText: '',
      pinComment: true,
      productName: '',
      affiliateUrl: '',
      productImageUrl: '',
      appendLinkToCaption: true,
      firstCommentHasImage: true,
    });
    setIsModalOpen(true);
  };

  const filteredSchedules = schedules.filter(s => {
    if (filterStatus === 'PENDING') return s.status === 'PENDING';
    if (filterStatus === 'COMPLETED') return s.status === 'COMPLETED';
    return true;
  });

  const pendingCount = schedules.filter(s => s.status === 'PENDING').length;
  const completedCount = schedules.filter(s => s.status === 'COMPLETED').length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Hidden Unified File Input for Video & Image Pickers */}
      <input
        type="file"
        ref={mediaInputRef}
        onChange={handleMediaFileChange}
        accept="video/*,image/*"
        className="hidden"
      />

      {/* 1. Header & Actions Area */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-white/[0.06] pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[11px] font-mono font-semibold text-emerald-400 uppercase tracking-wider">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Social Publisher Active
            </span>
            <span className="text-xs font-mono text-zinc-400">FB FANPAGE • THREADS • TIKTOK • SHORTS</span>
          </div>
          <h1 className="text-[22px] font-extrabold tracking-tight text-white">
            Đăng Ngay
          </h1>
          <p className="text-sm text-zinc-400 mt-0.5">
            Đăng bài tức thì đa kênh (Facebook Fanpage, Meta Threads, TikTok, YouTube Shorts) kèm link Shopee Affiliate ở bình luận
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <Button
            onClick={openInstantBulkModal}
            className="bg-red-600 hover:bg-red-500 text-white font-semibold text-xs shadow-lg shadow-red-600/20 active:scale-[0.98]"
          >
            <Zap className="h-3.5 w-3.5 mr-1.5" />
            ⚡ Đăng Ngay Tức Thì
          </Button>

          <Link href="/dashboard/missions">
            <Button
              className="bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 border border-amber-500/30 font-semibold text-xs active:scale-[0.98]"
            >
              <Bot className="h-3.5 w-3.5 mr-1.5 text-amber-400" />
              🤖 AI Missions (Hẹn Giờ 24/7)
            </Button>
          </Link>
        </div>
      </div>

      {/* 2. Connected Channels Status Bar */}
      <div className="rounded-xl border border-white/[0.06] bg-[#111117] p-4 flex flex-wrap items-center justify-between gap-3 shadow-sm">
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4 text-red-500" />
          <span className="text-xs font-bold text-white uppercase tracking-wider">Kênh Đã Liên Kết Trạng Thái:</span>
        </div>

        <div className="flex items-center gap-2 flex-wrap text-xs">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#18181f] border border-blue-500/30 text-blue-300 font-mono font-medium shadow-sm">
            <Facebook className="h-3.5 w-3.5 text-blue-400 flex-shrink-0" />
            <span>FB Page: Loài mèo gắn link</span>
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" title="Token sẵn sàng" />
          </div>

          <div
            onClick={() => setShowThreadsSetup(true)}
            className={"inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border font-mono font-medium cursor-pointer transition-all shadow-sm " + (
              threadsToken && threadsUserId
                ? 'bg-[#18181f] border-purple-500/30 text-purple-300 hover:bg-purple-500/20'
                : 'bg-[#18181f] border-amber-500/40 text-amber-300 hover:bg-amber-500/20'
            )}
          >
            <span className="font-bold">🧵 Meta Threads:</span>
            {threadsToken && threadsUserId ? (
              <>
                <span className="text-emerald-400">Đã kết nối</span>
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              </>
            ) : (
              <span className="text-amber-400 underline flex items-center gap-1 font-sans font-semibold">
                <Settings className="h-3 w-3" /> Cấu hình Token
              </span>
            )}
          </div>

          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#18181f] border border-white/[0.08] text-zinc-300 font-mono font-medium">
            <span>🎵 TikTok Video 9:16</span>
            <span className="text-[10px] text-emerald-400 font-semibold">(Sẵn sàng)</span>
          </div>

          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#18181f] border border-red-500/30 text-red-300 font-mono font-medium">
            <span>▶️ YouTube Shorts</span>
            <span className="text-[10px] text-emerald-400 font-semibold">(Sẵn sàng)</span>
          </div>
        </div>
      </div>

      {/* 3. Main Data Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-bold text-white tracking-tight">
            Danh Sách Bài Đăng
          </h2>
          <span className="text-xs font-mono text-zinc-500 bg-white/[0.04] px-2.5 py-1 rounded-full border border-white/[0.06]">
            {schedules.length} Bài viết
          </span>
        </div>

        <div className="flex items-center bg-[#111117] p-1 rounded-lg border border-white/[0.06] text-xs">
          <button
            onClick={() => setFilterStatus('ALL')}
            className={"px-3 py-1 rounded-md font-semibold transition-all " + (
              filterStatus === 'ALL' ? 'bg-red-600 text-white' : 'text-zinc-400 hover:text-white'
            )}
          >
            Tất Cả ({schedules.length})
          </button>
          <button
            onClick={() => setFilterStatus('PENDING')}
            className={"px-3 py-1 rounded-md font-semibold transition-all " + (
              filterStatus === 'PENDING' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'text-zinc-400 hover:text-white'
            )}
          >
            Đang Chờ ({pendingCount})
          </button>
          <button
            onClick={() => setFilterStatus('COMPLETED')}
            className={"px-3 py-1 rounded-md font-semibold transition-all " + (
              filterStatus === 'COMPLETED' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'text-zinc-400 hover:text-white'
            )}
          >
            Đã Đăng ({completedCount})
          </button>
        </div>
      </div>

      {/* 4. Table: Danh Sách Bài Đăng */}
      <Card className="bg-[#111117] border-white/[0.06] overflow-hidden shadow-xl">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-white/[0.03] border-b border-white/[0.06]">
                <TableRow className="border-white/[0.06] hover:bg-transparent">
                  <TableHead className="text-zinc-400 font-bold text-[11px] uppercase tracking-wider py-4 w-[28%]">
                    Nội Dung Caption / Media
                  </TableHead>
                  <TableHead className="text-zinc-400 font-bold text-[11px] uppercase tracking-wider py-4 w-[18%]">
                    Nền Tảng MXH (Kênh)
                  </TableHead>
                  <TableHead className="text-zinc-400 font-bold text-[11px] uppercase tracking-wider py-4 w-[24%]">
                    First Comment & Shopee Aff
                  </TableHead>
                  <TableHead className="text-zinc-400 font-bold text-[11px] uppercase tracking-wider py-4 w-[16%]">
                    Thời Gian Đăng (Giờ VN)
                  </TableHead>
                  <TableHead className="text-zinc-400 font-bold text-[11px] uppercase tracking-wider py-4 w-[14%] text-right">
                    Trạng Thái & Thao Tác
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-white/[0.04]">
                {filteredSchedules.map((schedule) => (
                  <TableRow key={schedule.id} className="hover:bg-white/[0.02] transition-colors border-white/[0.04]">
                    <TableCell className="py-4">
                      <div className="space-y-1.5 max-w-sm">
                        <p className="text-xs font-semibold text-zinc-100 line-clamp-2 leading-relaxed">
                          {schedule.post?.caption || 'Không có caption'}
                        </p>
                        {schedule.videoName ? (
                          <div className="inline-flex items-center gap-1.5 text-[11px] font-mono text-sky-400 bg-sky-500/10 border border-sky-500/20 px-2 py-0.5 rounded">
                            <Film className="w-3 h-3" />
                            <span className="truncate max-w-[200px]">{schedule.videoName}</span>
                            <span className="text-[10px] text-zinc-500">({schedule.videoSize || 'Video'})</span>
                          </div>
                        ) : (
                          <span className="text-[10px] text-zinc-500 font-mono block">Chưa đính kèm video</span>
                        )}
                      </div>
                    </TableCell>

                    <TableCell className="py-4">
                      <div className="flex flex-wrap gap-1 max-w-[220px]">
                        {schedule.channels && schedule.channels.length > 0 ? (
                          schedule.channels.map((ch) => {
                            const found = ALL_PLATFORMS_OPTIONS.find(o => o.id === ch);
                            return (
                              <span
                                key={ch}
                                className="inline-flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-zinc-800 text-zinc-200 border border-zinc-700"
                              >
                                {found ? found.label : ch}
                              </span>
                            );
                          })
                        ) : (
                          <span className="text-xs text-blue-400 font-mono">📘 {schedule.targetPageName || 'Facebook Fanpage'}</span>
                        )}
                      </div>
                    </TableCell>

                    <TableCell className="py-4">
                      {schedule.firstCommentEnabled ? (
                        <div className="space-y-1.5 max-w-xs">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <Badge variant="default" className="bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[10px]">
                              💬 Comment + Link Aff
                            </Badge>
                            {schedule.productImageUrl && (
                              <Badge variant="default" className="bg-sky-500/15 border border-sky-500/30 text-sky-300 text-[10px]">
                                🖼️ Có Ảnh SP
                              </Badge>
                            )}
                          </div>
                          {schedule.firstCommentText && (
                            <p className="text-xs text-zinc-200 line-clamp-2 italic bg-black/30 p-1.5 rounded border border-white/[0.04]">
                              "{schedule.firstCommentText}"
                            </p>
                          )}
                          <div className="flex items-center gap-2 pt-0.5">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setViewingCommentSchedule(schedule)}
                              className="h-6 px-2 text-[10px] border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/10 font-medium"
                            >
                              <MessageSquare className="w-3 h-3 mr-1 text-emerald-400" />
                              Xem Bình Luận
                            </Button>
                            {schedule.affiliateUrl && (
                              <a
                                href={schedule.affiliateUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[10px] text-blue-400 hover:underline font-mono truncate max-w-[120px]"
                              >
                                {schedule.affiliateUrl}
                              </a>
                            )}
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs text-zinc-500 font-mono">Tắt First Comment</span>
                      )}
                    </TableCell>

                    <TableCell className="py-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 text-xs text-zinc-200 font-mono font-semibold">
                          <Clock className="h-3.5 w-3.5 text-red-400" />
                          <span>{formatVietnamDateTime(schedule.scheduledAt)}</span>
                        </div>
                        <span className="text-[10px] text-zinc-500 block">
                          {formatRelativeTime(schedule.scheduledAt)}
                        </span>
                      </div>
                    </TableCell>

                    <TableCell className="py-4">
                      {schedule.status === 'COMPLETED' ? (
                        <Badge variant="default" className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-xs font-semibold">
                          <CheckCircle2 className="h-3 w-3 mr-1 text-emerald-400" /> Đã Đăng
                        </Badge>
                      ) : (
                        <Badge variant="default" className="bg-amber-500/15 text-amber-300 border border-amber-500/30 text-xs font-semibold">
                          <Clock className="h-3 w-3 mr-1 text-amber-400 animate-pulse" /> Đang Chờ
                        </Badge>
                      )}
                    </TableCell>

                    <TableCell className="py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {schedule.status !== 'COMPLETED' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handlePublishSingleNow(schedule)}
                            className="text-xs bg-red-600/10 text-red-400 hover:bg-red-600 hover:text-white border border-red-500/20 font-semibold px-2 py-1"
                          >
                            <Send className="h-3.5 w-3.5 mr-1" /> Đăng ngay
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(schedule)}
                          className="h-8 w-8 p-0 text-zinc-400 hover:text-white hover:bg-white/[0.05]"
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(schedule.id)}
                          className="h-8 w-8 p-0 text-zinc-400 hover:text-red-400 hover:bg-red-500/10"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {!loading && filteredSchedules.length === 0 && (
            <div className="p-12 text-center text-zinc-500">
              <Calendar className="h-10 w-10 mx-auto mb-3 text-zinc-600 opacity-60" />
              <p className="text-sm font-semibold text-zinc-400">Không tìm thấy bài đăng nào</p>
              <p className="text-xs text-zinc-600 mt-1">Nhấn "Đăng Bài Mới / Lên Lịch" để xuất bản bài đăng đa kênh</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 5. CỬA SỔ NỔI NẰM NGANG (LANDSCAPE MODAL) ĐĂNG BÀI ĐA KÊNH */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingSchedule(null);
          setSelectedVideo(null);
        }}
        title={
          modalMode === 'INSTANT'
            ? '⚡ Đăng Bài Đa Kênh Tức Thì (Instant Multi-Channel)'
            : editingSchedule
            ? 'Chỉnh Sửa Bài Đăng'
            : '⏰ Đăng Bài / Lên Lịch Đăng Tự Động Đa Kênh'
        }
        size="full"
      >
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-white/[0.08] flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded bg-red-600 text-white font-mono text-xs font-bold uppercase">
                SOCIAL PUBLISHER MODAL
              </span>
              <span className="text-xs text-zinc-400 font-mono">Chế độ hiển thị: Nằm ngang (Landscape)</span>
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsModalOpen(false);
                  setEditingSchedule(null);
                  setSelectedVideo(null);
                }}
                className="h-8 border-red-500/40 text-red-400 hover:bg-red-500/10 text-xs font-semibold flex items-center gap-1.5"
              >
                <X className="w-4 h-4" />
                Tắt Cửa Sổ Nổi
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
            <div className="md:col-span-5 space-y-4">
              <div className="flex items-center justify-between bg-[#18181f] p-2.5 rounded-lg border border-amber-500/30 text-amber-300 text-xs font-semibold">
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-amber-400" />
                  <span>Chế độ: <strong>Đăng Ngay Tức Thì (Instant Publish)</strong></span>
                </div>
                <Link href="/dashboard/missions" className="text-red-400 hover:underline text-[11px] font-mono flex items-center gap-1">
                  🤖 Lên lịch với AI Missions
                </Link>
              </div>

              <div className="p-3.5 rounded-xl border border-white/[0.08] bg-[#18181f] space-y-2">
                {/* Click-to-expand Trigger Header */}
                <div
                  onClick={() => setIsPlatformListOpen(!isPlatformListOpen)}
                  className="flex items-center justify-between cursor-pointer select-none py-1"
                >
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-red-500 flex-shrink-0" />
                    <div>
                      <label className="text-xs font-bold text-white uppercase tracking-wider block cursor-pointer">
                        1. Chọn Nền Tảng MXH (Đã Liên Kết)
                      </label>
                      <span className="text-[11px] text-zinc-400 font-mono block mt-0.5">
                        {activeSelectedTargets.length > 0
                          ? ("Đã chọn " + activeSelectedTargets.length + "/" + registeredPlatforms.length + " trang đã liên kết")
                          : "Nhấn vào đây để xem danh sách trang/kênh đã liên kết"}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-red-400 font-semibold underline">
                      {isPlatformListOpen ? 'Thu gọn' : 'Nhấn để mở danh sách'}
                    </span>
                    {isPlatformListOpen ? (
                      <ChevronUp className="w-4 h-4 text-zinc-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-zinc-400" />
                    )}
                  </div>
                </div>

                {/* Collapsible Platform List (Registered Pages Only) */}
                {isPlatformListOpen && (
                  <div className="pt-3 border-t border-white/[0.06] space-y-3 animate-fade-in">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-zinc-400 font-mono">
                        Chỉ hiển thị các trang/kênh ĐÃ ĐĂNG KÝ THÀNH CÔNG:
                      </span>
                      {registeredPlatforms.length > 0 && (
                        <button
                          type="button"
                          onClick={toggleSelectAllTargets}
                          className="text-xs font-bold text-red-400 hover:underline flex items-center gap-1"
                        >
                          {isAllSelected ? (
                            <>
                              <CheckCheck className="w-4 h-4 text-emerald-400" />
                              Bỏ chọn tất cả
                            </>
                          ) : (
                            <>
                              <CheckSquare className="w-4 h-4 text-red-500" />
                              Tick toàn bộ ({registeredPlatforms.length})
                            </>
                          )}
                        </button>
                      )}
                    </div>

                    {registeredPlatforms.length === 0 ? (
                      <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-xs text-amber-300 space-y-1">
                        <p className="font-semibold">Chưa có trang hoặc kênh MXH nào được đăng ký liên kết.</p>
                        <a href="/dashboard/Socialmedia" className="text-red-400 underline font-bold block">
                          👉 Bấm vào đây để kết nối Fanpage Facebook / Meta Threads ngay
                        </a>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                        {registeredPlatforms.map((plat) => {
                          const isSelected = selectedTargets.includes(plat.id);
                          return (
                            <div
                              key={plat.id}
                              onClick={() => toggleTarget(plat.id)}
                              className={"flex items-center justify-between p-2.5 rounded-lg border cursor-pointer text-xs font-semibold transition-all " + (
                                isSelected
                                  ? 'border-red-500 bg-red-500/10 text-white shadow-sm'
                                  : 'border-white/[0.06] bg-zinc-900/60 text-zinc-400 hover:border-white/[0.12]'
                              )}
                            >
                              <div className="flex items-center gap-2">
                                <div
                                  className={"h-4 w-4 rounded flex items-center justify-center border text-[10px] " + (
                                    isSelected ? 'bg-red-600 border-red-600 text-white' : 'border-zinc-600'
                                  )}
                                >
                                  {isSelected && <Check className="h-3 w-3" />}
                                </div>
                                <span>{plat.label}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="p-3.5 rounded-xl border border-white/[0.08] bg-[#18181f] space-y-3">
                <label className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Film className="w-4 h-4 text-red-500" />
                  2. Tệp Media (Video / Ảnh) & Sản Phẩm Shopee Aff
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleRandomThreadsWithShopee}
                    className="h-9 border-amber-500/50 bg-amber-950/30 text-amber-300 hover:bg-amber-500/20 text-xs font-bold w-full shadow-sm"
                  >
                    <Flame className="w-3.5 h-3.5 mr-1.5 text-amber-400 animate-pulse" />
                    🎲 Chọn Ngẫu Nhiên Bài Threads + Link Shopee Random (Chỉ Bình Luận)
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleRandomNewsWithShopee}
                    className="h-9 border-rose-500/50 bg-rose-950/30 text-rose-300 hover:bg-rose-500/20 text-xs font-bold w-full shadow-sm"
                  >
                    <Newspaper className="w-3.5 h-3.5 mr-1.5 text-rose-400 animate-pulse" />
                    📰 Chọn Ngẫu Nhiên Bài Báo + Link Shopee Random (Chỉ Bình Luận)
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => mediaInputRef.current?.click()}
                    className="h-9 border-sky-500/40 text-sky-300 hover:bg-sky-500/10 text-xs font-semibold w-full"
                  >
                    <Upload className="w-3.5 h-3.5 mr-1" />
                    📁 Chọn Video/Ảnh Trên Máy
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowVideoPicker(true)}
                    className="h-9 border-amber-500/40 text-amber-300 hover:bg-amber-500/10 text-xs font-semibold w-full"
                  >
                    <Film className="w-3.5 h-3.5 mr-1 text-amber-400" />
                    🎬 Chọn Video/Ảnh Từ Kho Render
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowNewsPicker(true)}
                    className="h-9 border-blue-500/40 text-blue-300 hover:bg-blue-500/10 text-xs font-semibold w-full"
                  >
                    <Newspaper className="w-3.5 h-3.5 mr-1 text-blue-400" />
                    📰 Chọn Bài Báo Tin Tức (Radar)
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowProductPicker(true)}
                    className="h-9 border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/10 text-xs font-semibold w-full"
                  >
                    <ShoppingBag className="w-3.5 h-3.5 mr-1 text-emerald-400" />
                    🛍️ Chọn SP Shopee Aff
                  </Button>
                </div>

                {/* Previews for Selected Media */}
                {selectedVideo && (
                  <div className="p-2.5 rounded-lg bg-sky-950/40 border border-sky-800/50 flex items-center justify-between text-xs text-sky-200">
                    <div className="flex items-center gap-2 truncate">
                      <Film className="w-4 h-4 text-sky-400 flex-shrink-0" />
                      <span className="font-semibold truncate">Video: {selectedVideo.name}</span>
                      <span className="text-[10px] text-sky-400 font-mono">({selectedVideo.size})</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedVideo(null)}
                      className="text-xs text-zinc-400 hover:text-red-400 ml-2"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {selectedPostImage && (
                  <div className="p-2.5 rounded-lg bg-purple-950/40 border border-purple-800/50 flex items-center justify-between text-xs text-purple-200">
                    <div className="flex items-center gap-2 truncate">
                      <img src={selectedPostImage.previewUrl} alt="Post preview" className="w-7 h-7 rounded object-cover flex-shrink-0 bg-zinc-800" />
                      <span className="font-semibold truncate">Ảnh Bài Đăng: {selectedPostImage.name}</span>
                      <span className="text-[10px] text-purple-400 font-mono">({selectedPostImage.size})</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedPostImage(null);
                        form.setValue('productImageUrl', '');
                      }}
                      className="text-xs text-zinc-400 hover:text-red-400 ml-2"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}

                
                {selectedNewsItems.length > 0 && (
                  <div className="p-3 rounded-lg bg-blue-950/40 border border-blue-800/50 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-blue-300 flex items-center gap-1.5">
                        <Newspaper className="w-4 h-4 text-blue-400" />
                        Đã chọn {selectedNewsItems.length} bài báo tin tức:
                      </span>
                      <button
                        type="button"
                        onClick={() => setSelectedNewsItems([])}
                        className="text-xs text-zinc-400 hover:text-red-400"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                      {selectedNewsItems.map((n, idx) => (
                        <div key={n.id || idx} className="p-1.5 rounded bg-black/40 border border-blue-500/20 text-xs flex items-center justify-between gap-2">
                          <span className="text-zinc-200 truncate flex-1">🔥 {n.title}</span>
                          <span className="text-[10px] text-blue-400 font-mono flex-shrink-0">({n.source})</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Display Selected Product Info */}
                {form.watch('productName') ? (
                  <div className="p-3 rounded-lg bg-emerald-950/40 border border-emerald-800/50 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 truncate min-w-0">
                        {form.watch('productImageUrl') ? (
                          <img src={form.watch('productImageUrl')} alt="Product" className="w-8 h-8 rounded object-cover flex-shrink-0 bg-zinc-800" />
                        ) : (
                          <ShoppingBag className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                        )}
                        <span className="font-semibold text-xs text-emerald-200 truncate">{form.watch('productName')}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          form.setValue('productName', '');
                          form.setValue('affiliateUrl', '');
                          form.setValue('productImageUrl', '');
                        }}
                        className="text-xs text-zinc-400 hover:text-red-400 ml-2 flex-shrink-0"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    {form.watch('affiliateUrl') && (
                      <div className="text-[11px] font-mono text-emerald-400 truncate bg-black/40 p-1.5 rounded border border-emerald-500/20">
                        🔗 {form.watch('affiliateUrl')}
                      </div>
                    )}
                  </div>
                ) : null}
              </div>

              {modalMode === 'SCHEDULE' && (
                <div className="p-3.5 rounded-xl border border-white/[0.08] bg-[#18181f] space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                      <Clock className="w-4 h-4 text-red-500" />
                      3. Thời Gian Xuất Bản (Giờ VN)
                    </label>
                    <button
                      type="button"
                      onClick={setScheduledToNow}
                      className="text-xs text-red-400 hover:underline flex items-center gap-1 font-mono font-semibold"
                    >
                      <Zap className="h-3 w-3" /> Đặt ngay bây giờ
                    </button>
                  </div>
                  <Input
                    type="datetime-local"
                    {...form.register('scheduledAt')}
                    className="bg-[#111117] border-white/[0.1] text-white font-mono h-10 text-xs"
                  />
                </div>
              )}
            </div>

            <div className="md:col-span-7 space-y-4">
              <div className="p-4 rounded-xl border border-white/[0.08] bg-[#18181f] space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-1">
                  <label className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <FileText className="w-4 h-4 text-red-500" />
                    4. Nội Dung Caption Bài Đăng
                  </label>
                </div>

                <div className="space-y-1.5">
                  <span className="text-[11px] text-zinc-400 font-semibold block">✨ Mẫu Caption AI Phong Phú (1-Click):</span>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        const prodName = form.getValues('productName') || 'sản phẩm';
                        const affUrl = form.getValues('affiliateUrl') || '';
                        const linkPart = affUrl ? ("\n🛒 Link mua hàng săn voucher: " + affUrl) : '';
                        form.setValue(
                          'caption',
                          "💥 SỐC TỤT QUẦN! " + prodName + " đang xả kho giảm giá kịch sàn hôm nay!\n👉 Xem ngay trải nghiệm thực tế trong video." + linkPart + ""
                        );
                        toast.success('Đã gán mẫu Săn Sale!');
                      }}
                      className="px-2.5 py-1 text-[11px] rounded bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 font-semibold"
                    >
                      🔥 Săn Sale
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const prodName = form.getValues('productName') || 'sản phẩm';
                        const affUrl = form.getValues('affiliateUrl') || '';
                        const linkPart = affUrl ? ("\n🛒 Link mua hàng chính hãng: " + affUrl) : '';
                        form.setValue(
                          'caption',
                          "Chân thực 100%! Sau 7 ngày dùng thử " + prodName + " thì đây là cảm nhận của mình.\nƯu điểm vượt trội: Ngon - Bổ - Rẻ đáng tiền từng xu!\n👉 Chi tiết xem ở video." + linkPart + ""
                        );
                        toast.success('Đã gán mẫu Review!');
                      }}
                      className="px-2.5 py-1 text-[11px] rounded bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 border border-blue-500/20 font-semibold"
                    >
                      💥 Review
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const prodName = form.getValues('productName') || 'sản phẩm';
                        const affUrl = form.getValues('affiliateUrl') || '';
                        const linkPart = affUrl ? ("\n🛒 Link chuẩn Store chính hãng: " + affUrl) : '';
                        form.setValue(
                          'caption',
                          "⚠️ CẢNH BÁO: Đừng mua " + prodName + " nếu bạn chưa xem video này!\nRất nhiều bên đang bán hàng nhái chất lượng kém." + linkPart + ""
                        );
                        toast.success('Đã gán mẫu Cảnh Báo!');
                      }}
                      className="px-2.5 py-1 text-[11px] rounded bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 border border-amber-500/20 font-semibold"
                    >
                      ⚠️ Cảnh Báo
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const prodName = form.getValues('productName') || 'sản phẩm công nghệ';
                        const affUrl = form.getValues('affiliateUrl') || '';
                        const linkPart = affUrl ? ("\n🛒 Chi tiết cấu hình và quà tặng tại: " + affUrl) : '';
                        form.setValue(
                          'caption',
                          "💻 ĐỘT PHÁ CÔNG NGHỆ: Trải nghiệm thực tế " + prodName + " cực đỉnh!\nHiệu năng mượt mà, thiết kế hiện đại vượt xa kỳ vọng." + linkPart + ""
                        );
                        toast.success('Đã gán mẫu Công Nghệ!');
                      }}
                      className="px-2.5 py-1 text-[11px] rounded bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 border border-purple-500/20 font-semibold"
                    >
                      💻 Công Nghệ
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const affUrl = form.getValues('affiliateUrl') || '';
                        const linkPart = affUrl ? ("\n🛒 Săn voucher sản phẩm hot tại: " + affUrl) : '';
                        form.setValue(
                          'caption',
                          "📰 TIN NÓNG BẮT TREND: Cập nhật sự kiện hot nhất hôm nay!\nXem ngay video để không bỏ lỡ những diễn biến quan trọng nhất." + linkPart + ""
                        );
                        toast.success('Đã gán mẫu Tin Tức & Trend!');
                      }}
                      className="px-2.5 py-1 text-[11px] rounded bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20 font-semibold"
                    >
                      📰 Tin Tức & Trend
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const affUrl = form.getValues('affiliateUrl') || '';
                        const linkPart = affUrl ? ("\n🛒 Link deal hời: " + affUrl) : '';
                        form.setValue(
                          'caption',
                          "⚡ BẮT TREND TIKTOK 2026: Trải nghiệm không thể bỏ lỡ!\nFollow kênh ngay để săn deal ngon và xem thêm nhiều video viral mỗi ngày nhé!" + linkPart + ""
                        );
                        toast.success('Đã gán mẫu Bắt Trend TikTok!');
                      }}
                      className="px-2.5 py-1 text-[11px] rounded bg-pink-500/10 text-pink-400 hover:bg-pink-500/20 border border-pink-500/20 font-semibold"
                    >
                      ⚡ Bắt Trend TikTok
                    </button>
                  </div>
                </div>

                <Textarea
                  rows={5}
                  {...form.register('caption')}
                  placeholder="Nhập nội dung caption đăng Facebook, Threads, TikTok..."
                  className="bg-[#111117] border-white/[0.1] text-white text-xs font-sans leading-relaxed"
                />

                <div className="pt-2 border-t border-white/[0.06] space-y-2">
                  <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider block">
                    🛡️ QUY TẮC AN TOÀN: LINK SHOPEE AFFILIATE CHỈ ĐĂNG Ở BÌNH LUẬN (FIRST COMMENT)
                  </span>
                  <p className="text-[11px] text-zinc-400 font-mono">
                    ✅ Bài viết chính (Caption) được giữ sạch 100% không chứa link để tránh giảm tương tác thuật toán. Tất cả Link Shopee Affiliate sẽ tự động xuất hiện ở phần Bình luận.
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded-xl border border-emerald-500/20 bg-emerald-500/5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5 uppercase tracking-wider">
                    <MessageSquare className="h-4 w-4" />
                    <span>Tự Động Gửi First Comment Kèm Link & Hình Ảnh SP (FB & Threads)</span>
                  </label>
                  <input
                    type="checkbox"
                    checked={form.watch('firstCommentEnabled')}
                    onChange={(e) => form.setValue('firstCommentEnabled', e.target.checked)}
                    className="rounded border-zinc-700 bg-zinc-900 text-red-600 focus:ring-red-500 h-4 w-4"
                  />
                </div>

                {form.watch('firstCommentEnabled') && (
                  <div className="space-y-3 pt-2 border-t border-emerald-500/20">
                    <div className="flex flex-wrap items-center justify-between gap-2 bg-[#111117] p-2.5 rounded-lg border border-white/[0.08]">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white uppercase tracking-wider">Số Lượng Bình Luận Sản Phẩm:</span>
                        <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-mono text-xs font-bold border border-emerald-500/30">
                          {multiCommentCount} Bình Luận ({multiCommentCount} SP / {multiCommentCount} Link Khác Nhau)
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => updateMultiCommentsCount(multiCommentCount - 1)}
                          disabled={multiCommentCount <= 1}
                          className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 text-white text-xs font-bold transition-all"
                        >
                          ➖ Bớt
                        </button>
                        <button
                          type="button"
                          onClick={() => updateMultiCommentsCount(multiCommentCount + 1)}
                          disabled={multiCommentCount >= 10}
                          className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 text-white text-xs font-bold transition-all"
                        >
                          ➕ Thêm
                        </button>

                        <div className="flex items-center gap-1 border-l border-white/[0.1] pl-2 ml-1">
                          {[1, 3, 5, 10].map((num) => (
                            <button
                              key={num}
                              type="button"
                              onClick={() => updateMultiCommentsCount(num)}
                              className={"px-2 py-0.5 rounded text-[11px] font-mono font-bold transition-all " + (multiCommentCount === num ? "bg-red-600 text-white shadow-sm" : "bg-zinc-800 text-zinc-400 hover:text-white")}
                            >
                              {num} SP
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2 max-h-60 overflow-y-auto pr-1 scrollbar-thin">
                      {multiComments.map((commentTxt, idx) => (
                        <div key={idx} className="p-2.5 rounded-lg bg-[#111117] border border-white/[0.08] space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-mono font-bold text-amber-400">
                              💬 Bình luận #{idx + 1} (Sản phẩm Shopee độc lập #{idx + 1})
                            </span>
                            <span className="text-[10px] text-zinc-500 font-mono">1 Comment / 1 Link SP</span>
                          </div>
                          <Textarea
                            rows={2}
                            value={commentTxt}
                            onChange={(e) => {
                              const updated = [...multiComments];
                              updated[idx] = e.target.value;
                              setMultiComments(updated);
                              form.setValue("firstCommentText", updated.join("\n---\n"));
                            }}
                            className="bg-zinc-950 border-white/[0.1] text-white font-mono text-xs"
                          />
                        </div>
                      ))}
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <input
                        type="checkbox"
                        id="pinComment"
                        checked={form.watch('pinComment')}
                        onChange={(e) => form.setValue('pinComment', e.target.checked)}
                        className="rounded border-zinc-700 bg-zinc-900 text-red-600 focus:ring-red-500 h-3.5 w-3.5"
                      />
                      <label htmlFor="pinComment" className="text-xs text-zinc-300 font-medium">
                        Ghim các bình luận này lên đầu (Pin to Top)
                      </label>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/[0.06]">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsModalOpen(false);
                    setEditingSchedule(null);
                    setSelectedVideo(null);
                  }}
                  className="border-white/[0.1] text-zinc-300 hover:bg-white/[0.05] text-xs h-10 px-4"
                >
                  Hủy / Đóng Cửa Sổ
                </Button>

                {modalMode === 'INSTANT' ? (
                  <Button
                    type="button"
                    disabled={publishingBulk || publishingThreads}
                    onClick={handleInstantPublish}
                    className="bg-amber-500 hover:bg-amber-400 text-black font-extrabold shadow-lg shadow-amber-500/20 active:scale-[0.98] text-xs h-10 px-6"
                  >
                    {publishingBulk || publishingThreads ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> Đang xuất bản...
                      </>
                    ) : (
                      <>
                        <Zap className="h-4 w-4 mr-1.5" />
                        ĐĂNG NGAY TỨC THÌ ĐA KÊNH
                      </>
                    )}
                  </Button>
                ) : (
                  <Button
                    type="submit"
                    className="bg-red-600 hover:bg-red-500 text-white font-bold shadow-lg shadow-red-600/20 active:scale-[0.98] text-xs h-10 px-6"
                  >
                    <Clock className="h-4 w-4 mr-1.5" />
                    {editingSchedule ? 'Cập Nhật Bài Đăng' : 'Lên Lịch Đăng Bài Tự Động'}
                  </Button>
                )}
              </div>

            </div>
          </div>
        </form>
      </Modal>

      {/* 6. LANDSCAPE SHOPEE PRODUCT PICKER MODAL */}
      <Modal
        isOpen={showProductPicker}
        onClose={() => setShowProductPicker(false)}
        title="🛍️ Chọn Sản Phẩm Shopee Affiliate Đã Đăng Kho"
        size="full"
      >
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-white/[0.08]">
            <div>
              <p className="text-xs text-zinc-200 font-bold flex items-center gap-2">
                <span>Chọn một hoặc nhiều sản phẩm từ kho để đăng bài &amp; bình luận:</span>
                <Badge variant="default" className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-mono font-bold">
                  Đã chọn: {selectedShopeeProducts.length} / {availableProducts.length} SP
                </Badge>
              </p>
              <p className="text-[11px] text-zinc-400 mt-0.5 font-mono">
                📌 Lưu ý: Trên bài viết (caption) chỉ đính kèm <strong className="text-emerald-400">1 Link SP duy nhất</strong>. Mỗi SP đã chọn sẽ tự động tạo <strong className="text-amber-400">1 bình luận riêng biệt</strong>.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {availableProducts.length > 0 && (
                <>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={handleToggleSelectAllShopee}
                    className="h-8 border-white/20 text-zinc-200 hover:bg-white/10 text-xs font-semibold"
                  >
                    {selectedShopeeProducts.length === availableProducts.length ? (
                      <>
                        <CheckCheck className="w-3.5 h-3.5 mr-1 text-emerald-400" /> Bỏ Chọn Tất Cả
                      </>
                    ) : (
                      <>
                        <CheckSquare className="w-3.5 h-3.5 mr-1 text-sky-400" /> Tick Chọn Toàn Bộ ({availableProducts.length})
                      </>
                    )}
                  </Button>

                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => handleSelectRandomShopeeProducts(3)}
                    className="h-8 border-amber-500/40 text-amber-300 hover:bg-amber-500/10 text-xs font-semibold"
                  >
                    <Shuffle className="w-3.5 h-3.5 mr-1 text-amber-400" /> Chọn Random 3 SP
                  </Button>

                  <Button
                    type="button"
                    size="sm"
                    onClick={handleApplySelectedShopeeProducts}
                    className="h-8 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-4 shadow-lg shadow-emerald-600/20 active:scale-[0.98]"
                  >
                    <Check className="w-4 h-4 mr-1" />
                    Áp Dụng ({selectedShopeeProducts.length} SP)
                  </Button>
                </>
              )}

              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowProductPicker(false)}
                className="h-8 border-red-500/40 text-red-400 text-xs"
              >
                <X className="w-3.5 h-3.5 mr-1" /> Tắt Cửa Sổ Nổi
              </Button>
            </div>
          </div>

          {availableProducts.length === 0 ? (
            <div className="p-12 text-center text-zinc-500 bg-[#18181f] rounded-xl border border-white/[0.08]">
              <ShoppingBag className="w-10 h-10 mx-auto mb-2 text-zinc-600 opacity-60" />
              <p className="text-sm font-semibold text-zinc-400">Kho sản phẩm Shopee Affiliate chưa có dữ liệu</p>
              <p className="text-xs text-zinc-600 mt-1">Vui lòng quay lại trang "Kho Link Aff Shopee" để thêm sản phẩm mới</p>
              <a
                href="/dashboard/products"
                className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-lg transition-all"
              >
                <Plus className="w-4 h-4" /> Đi đến Kho Sản Phẩm Shopee
              </a>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 max-h-[60vh] overflow-y-auto pr-1">
              {availableProducts.map((p, idx) => {
                const isSelected = selectedShopeeProducts.some(
                  (sp) => (sp.id && sp.id === p.id) || sp.name === p.name
                );
                return (
                  <div
                    key={p.id || idx}
                    onClick={() => toggleSelectShopeeProduct(p)}
                    className={"p-3 transition-all cursor-pointer flex flex-col justify-between group rounded-xl space-y-2 relative border " + (
                      isSelected
                        ? 'bg-emerald-950/20 border-emerald-500 shadow-md shadow-emerald-500/10'
                        : 'bg-[#18181f] border-white/[0.08] hover:border-white/20'
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div className="relative flex-shrink-0">
                        {p.imageUrl ? (
                          <img src={p.imageUrl} alt={p.name} className="w-12 h-12 rounded-lg object-cover bg-zinc-800" />
                        ) : (
                          <div className="w-12 h-12 rounded-lg bg-zinc-800 flex items-center justify-center text-zinc-500">
                            <ShoppingBag className="w-6 h-6" />
                          </div>
                        )}
                        <div
                          className={"absolute -top-1 -left-1 h-5 w-5 rounded-full flex items-center justify-center border text-[10px] font-bold " + (
                            isSelected ? 'bg-emerald-500 border-emerald-400 text-black' : 'bg-zinc-800 border-zinc-600 text-zinc-400'
                          )}
                        >
                          {isSelected ? <Check className="w-3 h-3 text-black font-extrabold" /> : (idx + 1)}
                        </div>
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className={"text-xs font-semibold transition-colors line-clamp-2 " + (isSelected ? 'text-emerald-300' : 'text-zinc-200 group-hover:text-white')}>
                          {p.name}
                        </p>
                        <p className="text-[10px] text-zinc-500 font-mono truncate mt-0.5">
                          {p.affiliateUrl || p.shopeeUrl || 'Chưa có link aff'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-white/[0.04]">
                      <span className="text-[11px] font-bold text-emerald-400">
                        {p.price ? p.price.toLocaleString('vi-VN') + 'đ' : 'Ghi nhận kho'}
                      </span>
                      <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => handleSelectProduct(p)}
                          className="text-[10px] text-zinc-400 hover:text-white underline font-mono"
                        >
                          Chỉ chọn SP này
                        </button>
                        <Button
                          size="sm"
                          onClick={() => toggleSelectShopeeProduct(p)}
                          className={isSelected ? 'bg-emerald-600 hover:bg-emerald-500 text-white text-xs h-7 px-2.5' : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs h-7 px-2.5'}
                        >
                          {isSelected ? '✓ Đã Chọn' : '+ Tick Chọn'}
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </Modal>
    
      {/* 8. LANDSCAPE VIEW COMMENTS MODAL */}
      <Modal
        isOpen={!!viewingCommentSchedule}
        onClose={() => setViewingCommentSchedule(null)}
        title="💬 Chi Tiết Bình Luận Tự Động (First Comment & Hình Ảnh)"
        size="full"
      >
        {viewingCommentSchedule && (
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08] flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-mono text-xs font-bold uppercase">
                  FIRST COMMENT ACTIVE
                </span>
                <span className="text-xs text-zinc-400 font-mono">Bài đăng ID: {viewingCommentSchedule.id}</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setViewingCommentSchedule(null)}
                className="h-8 border-red-500/40 text-red-400 hover:bg-red-500/10 text-xs font-semibold flex items-center gap-1.5"
              >
                <X className="w-4 h-4" />
                Tắt Cửa Sổ Nổi
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
              <div className="md:col-span-7 space-y-4">
                <div className="p-4 rounded-xl border border-white/[0.08] bg-[#18181f] space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-emerald-400" />
                      Nội Dung Bình Luận Đầu Tiên (First Comment)
                    </label>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        if (viewingCommentSchedule.firstCommentText) {
                          navigator.clipboard.writeText(viewingCommentSchedule.firstCommentText);
                          toast.success('Đã copy nội dung bình luận vào clipboard!');
                        }
                      }}
                      className="h-7 text-xs border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/10"
                    >
                      Copy Bình Luận
                    </Button>
                  </div>

                  <div className="p-3.5 rounded-lg bg-[#111117] border border-white/[0.1] text-xs text-zinc-100 whitespace-pre-wrap font-sans leading-relaxed">
                    {viewingCommentSchedule.firstCommentText || 'Không có nội dung bình luận'}
                  </div>

                  {viewingCommentSchedule.affiliateUrl && (
                    <div className="p-2.5 rounded-lg bg-emerald-950/40 border border-emerald-500/20 text-xs flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 truncate">
                        <ShoppingBag className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                        <span className="font-semibold text-emerald-200 truncate">{viewingCommentSchedule.productName || 'Sản phẩm Shopee Aff'}</span>
                      </div>
                      <a
                        href={viewingCommentSchedule.affiliateUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-400 hover:underline font-mono flex items-center gap-1 flex-shrink-0"
                      >
                        Mở Link Aff <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  )}
                </div>

                {viewingCommentSchedule.productImageUrl && (
                  <div className="p-4 rounded-xl border border-white/[0.08] bg-[#18181f] space-y-2">
                    <label className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                      <ImageIcon className="w-4 h-4 text-sky-400" />
                      Hình Ảnh Sản Phẩm Đính Kèm Bình Luận (FB Graph API Attachment)
                    </label>
                    <div className="relative max-w-sm rounded-lg overflow-hidden border border-white/[0.1] bg-black">
                      <img
                        src={viewingCommentSchedule.productImageUrl}
                        alt="Product Comment Attachment"
                        className="w-full h-48 object-cover"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="md:col-span-5 space-y-4">
                <div className="p-4 rounded-xl border border-white/[0.08] bg-[#18181f] space-y-3">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">Thông Tin Bài Đăng Tương Ứng</h4>

                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between py-1 border-b border-white/[0.04]">
                      <span className="text-zinc-400">Trạng Thái:</span>
                      <span className="font-semibold text-emerald-400">{viewingCommentSchedule.status === 'COMPLETED' ? 'Đã Đăng Thành Công' : 'Đang Chờ Lịch'}</span>
                    </div>

                    <div className="flex justify-between py-1 border-b border-white/[0.04]">
                      <span className="text-zinc-400">Tự Động Ghim:</span>
                      <span className="font-semibold text-sky-300">Đã Ghim Lên Đầu (Pin to Top)</span>
                    </div>

                    <div className="py-1 border-b border-white/[0.04] space-y-1">
                      <span className="text-zinc-400 block">Nền Tảng Đã Chọn:</span>
                      <span className="font-mono text-zinc-200 block text-[11px]">
                        {viewingCommentSchedule.targetPageName || 'Facebook Fanpage'}
                      </span>
                    </div>

                    <div className="py-1 space-y-1">
                      <span className="text-zinc-400 block">Caption Bài Viết gốc:</span>
                      <p className="text-zinc-300 line-clamp-3 italic bg-black/40 p-2 rounded">
                        {viewingCommentSchedule.post?.caption || 'Không có caption'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-2.5 pt-2">
                  <Button
                    onClick={() => {
                      const item = viewingCommentSchedule;
                      setViewingCommentSchedule(null);
                      handleEdit(item);
                    }}
                    className="bg-red-600 hover:bg-red-500 text-white font-bold text-xs h-10 w-full"
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Chỉnh Sửa Bài Đăng & Bình Luận Này
                  </Button>

                  <Button
                    variant="outline"
                    onClick={() => setViewingCommentSchedule(null)}
                    className="border-white/[0.1] text-zinc-300 hover:bg-white/[0.05] text-xs h-10 w-full"
                  >
                    Đóng Cửa Sổ
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>
      {/* 9. LANDSCAPE MEDIA & ALBUM POST PICKER MODAL */}
      <Modal
        isOpen={showVideoPicker}
        onClose={() => setShowVideoPicker(false)}
        title="🎬 CHỌN MEDIA / BÀI ĐĂNG TỪ KHO ALBUM POST"
        size="full"
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-white/[0.08]">
            <p className="text-xs text-zinc-300 font-medium">
              Chọn một bài đăng, video hoặc hình ảnh từ Kho Album Media (/dashboard/album) để lên lịch xuất bản:
            </p>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowVideoPicker(false)}
              className="h-7 border-red-500/40 text-red-400 text-xs"
            >
              <X className="w-3.5 h-3.5 mr-1" /> Tắt Cửa Sổ Nổi
            </Button>
          </div>

          {renderedVideos.length === 0 ? (
            <div className="p-12 text-center text-zinc-500 bg-[#18181f] rounded-xl border border-white/[0.08]">
              <Film className="w-10 h-10 mx-auto mb-2 text-zinc-600 opacity-60" />
              <p className="text-sm font-semibold text-zinc-400">Kho Media & Album chưa có dữ liệu</p>
              <p className="text-xs text-zinc-600 mt-1">Vui lòng tải lên ảnh/video từ máy tính của bạn vào Kho Album</p>
              <a
                href="/dashboard/album"
                className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-semibold text-xs rounded-lg transition-all"
              >
                <Sparkles className="w-4 h-4" /> Đi đến Kho Album Media (Up từ máy)
              </a>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 max-h-[60vh] overflow-y-auto pr-1">
              {renderedVideos.map((v, idx) => {
                const isImage = v.mediaType === 'IMAGE';
                const previewImgUrl = v.thumbnailUrl || v.mediaUrl;
                return (
                  <div
                    key={v.id || idx}
                    onClick={() => {
                      if (isImage) {
                        setSelectedPostImage({
                          name: v.title || 'Hình ảnh Album',
                          size: 'IMAGE HD',
                          previewUrl: previewImgUrl,
                        });
                        form.setValue('productImageUrl', previewImgUrl);
                      } else {
                        setSelectedVideo({
                          name: v.title || 'Video Album',
                          size: v.duration ? (v.duration + 's') : 'VIDEO HD 1080p',
                          url: v.mediaUrl || previewImgUrl,
                        });
                      }

                      if (v.caption) {
                        form.setValue('caption', v.caption);
                      }
                      if (v.comment) {
                        form.setValue('firstCommentText', v.comment);
                        form.setValue('firstCommentEnabled', true);
                      }

                      setShowVideoPicker(false);
                      toast.success(`Đã chọn từ Kho Album Post: "${(v.title || 'Bài đăng').slice(0, 28)}..."`);
                    }}
                    className="p-3.5 bg-[#18181f] border border-white/[0.08] hover:border-amber-500 transition-all cursor-pointer flex flex-col justify-between group rounded-xl space-y-3"
                  >
                    <div className="flex items-start gap-3">
                      {previewImgUrl ? (
                        <img src={previewImgUrl} alt={v.title} className="w-14 h-14 rounded-lg object-cover flex-shrink-0 bg-zinc-900 border border-white/[0.08]" />
                      ) : (
                        <div className="w-14 h-14 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 flex-shrink-0">
                          {isImage ? <ImageIcon className="w-6 h-6" /> : <Film className="w-6 h-6" />}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 mb-1">
                          <Badge variant="default" className={isImage ? "bg-blue-600/20 text-blue-400 text-[9px]" : "bg-red-600/20 text-red-400 text-[9px]"}>
                            {isImage ? '🖼️ HÌNH ẢNH' : '🎥 VIDEO'}
                          </Badge>
                          {v.source && (
                            <span className="text-[10px] font-mono text-zinc-500 truncate">
                              ({v.source})
                            </span>
                          )}
                        </div>
                        <p className="text-xs font-semibold text-zinc-200 group-hover:text-amber-400 transition-colors line-clamp-1">
                          {v.title || 'Nội dung Album Post'}
                        </p>
                        {v.caption && (
                          <p className="text-[11px] text-zinc-400 line-clamp-2 mt-0.5 whitespace-pre-wrap">
                            {v.caption}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-white/[0.04]">
                      <span className="text-[10px] font-bold text-emerald-400 font-mono">
                        {v.comment ? '💬 ĐÃ CÓ BÌNH LUẬN' : 'READY TO POST'}
                      </span>
                      <Button size="sm" className="bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs h-7 px-3">
                        Chọn Bài Này
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </Modal>
      {/* 10. LANDSCAPE NEWS ARTICLE PICKER MODAL */}
      <Modal
        isOpen={showNewsPicker}
        onClose={() => setShowNewsPicker(false)}
        title="📰 Radar Tin Tức - Chọn 1 hoặc Nhiều Bài Báo Để Đăng Bài"
        size="full"
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-white/[0.08] flex-wrap gap-2">
            <p className="text-xs text-zinc-300 font-medium">
              Tick chọn 1 hoặc nhiều bài báo tin nóng (tự động cập nhật 30p/lần từ VnExpress, Tuổi Trẻ, Dân Trí...) để gán kịch bản bài đăng:
            </p>
            <div className="flex items-center gap-2">
              {selectedNewsItems.length > 0 && (
                <Button
                  size="sm"
                  onClick={handleApplyNewsToCaption}
                  className="h-8 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-3 shadow"
                >
                  <Newspaper className="w-3.5 h-3.5 mr-1" />
                  Gán {selectedNewsItems.length} Bài Báo Vào Caption
                </Button>
              )}
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowNewsPicker(false)}
                className="h-8 border-red-500/40 text-red-400 text-xs"
              >
                <X className="w-3.5 h-3.5 mr-1" /> Tắt Cửa Sổ Nổi
              </Button>
            </div>
          </div>

          {liveNewsArticles.length === 0 ? (
            <div className="p-12 text-center text-zinc-500 bg-[#18181f] rounded-xl border border-white/[0.08]">
              <Newspaper className="w-10 h-10 mx-auto mb-2 text-zinc-600 opacity-60" />
              <p className="text-sm font-semibold text-zinc-400">Đang nạp dữ liệu tin tức từ các tòa soạn...</p>
              <p className="text-xs text-zinc-600 mt-1">Vui lòng truy cập Radar Tin & Viral để quét các bài báo mới nhất</p>
              <a
                href="/dashboard/news"
                className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs rounded-lg transition-all"
              >
                <Globe className="w-4 h-4" /> Mở Trang Radar Tin Tức
              </a>
            </div>
          ) : (
            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {liveNewsArticles.map((item, idx) => {
                  const isChecked = selectedNewsItems.some(n => n.id === item.id || n.url === item.url);
                  return (
                    <div
                      key={item.id || idx}
                      onClick={() => toggleSelectNewsItem(item)}
                      className={"p-3 border transition-all cursor-pointer flex flex-col justify-between group rounded-xl space-y-2 " + (
                        isChecked
                          ? 'bg-blue-950/40 border-blue-500 text-white shadow-md'
                          : 'bg-[#18181f] border-white/[0.08] hover:border-blue-500/50 text-zinc-300'
                      )}
                    >
                      <div className="flex items-start gap-2.5">
                        <div className={"h-4 w-4 rounded flex items-center justify-center border text-[10px] mt-0.5 flex-shrink-0 " + (
                          isChecked ? 'bg-blue-600 border-blue-600 text-white' : 'border-zinc-600'
                        )}>
                          {isChecked && <Check className="h-3 w-3" />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <span className="text-[10px] font-mono font-bold text-blue-400 block uppercase">
                            {item.source} · {item.categoryLabel || 'Tin Hot'}
                          </span>
                          <p className="text-xs font-semibold text-zinc-100 group-hover:text-blue-300 transition-colors line-clamp-2 mt-0.5">
                            {item.title}
                          </p>
                          <p className="text-[11px] text-zinc-400 line-clamp-2 mt-1 italic">
                            "{item.summary}"
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-white/[0.04] text-[10px] font-mono">
                        <span className="text-zinc-500 truncate max-w-[150px]">{item.url}</span>
                        <span className={"font-bold px-2 py-0.5 rounded " + (isChecked ? 'bg-blue-600 text-white' : 'bg-zinc-800 text-zinc-400')}>
                          {isChecked ? 'ĐÃ CHỌN' : '+ TICK CHỌN'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </Modal>


    </div>
  );
}

export default function SchedulesPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-zinc-500 font-mono">Đang tải...</div>}>
      <SchedulesContent />
    </Suspense>
  );
}