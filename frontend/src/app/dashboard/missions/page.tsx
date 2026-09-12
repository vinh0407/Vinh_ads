'use client';

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
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';

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
}

const DEFAULT_PRESETS: AutoPresetItem[] = [
  {
    id: 'preset_th',
    name: '🚀 Auto Threads ReUp (Threads Only)',
    desc: 'Chỉ đăng Meta Threads + N bình luận Shopee độc lập + Rải giờ random.',
    type: 'THREADS_ONLY',
    icon: 'threads',
  },
  {
    id: 'preset_fb',
    name: '🚀 Auto Facebook Media (FB Fanpage Only)',
    desc: '9 bài 9 Ảnh/Video khác nhau + 9 bình luận Shopee/bài.',
    type: 'FACEBOOK_ONLY',
    icon: 'facebook',
  },
  {
    id: 'preset_all',
    name: '⚡ All-In-One Full Auto-Pilot',
    desc: 'Khởi chạy đồng thời cả Threads ReUp & Facebook Media cùng lúc.',
    type: 'ALL_IN_ONE',
    icon: 'all',
  },
];

const DEFAULT_CONNECTED_PAGES = [
  { id: 'src_fb_1', name: 'Shopee Việt Nam Official', platform: 'FACEBOOK', handle: '@shopeevn' },
  { id: 'src_fb_2', name: 'Cộng Đồng Tinh Tế', platform: 'FACEBOOK', handle: '@tinhte' },
  { id: 'src_fb_3', name: 'Kênh 14 Official Page', platform: 'FACEBOOK', handle: '@kenh14official' },
  { id: 'src_th_1', name: 'Thảo Tâm Story', platform: 'THREADS', handle: '@thaotam.story' },
  { id: 'src_th_2', name: 'Schannel Official', platform: 'THREADS', handle: '@schannelvn' },
  { id: 'src_th_3', name: 'GenZ Chữa Lành', platform: 'THREADS', handle: '@genz.chualanh' },
];

const DEFAULT_9_SHOPEE_PRODUCTS = [
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

const DEFAULT_MEDIA_ITEMS = [
  { id: 'm1', title: 'Outfit thu đông dạo phố Hàn Quốc', mediaType: 'IMAGE', url: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=600&q=80' },
  { id: 'm2', title: 'Nồi chiên không dầu 5.5L tiện lợi', mediaType: 'IMAGE', url: 'https://images.unsplash.com/photo-1584992236310-6edddc08acff?w=600&q=80' },
  { id: 'm3', title: 'Góc làm việc decor phòng trọ chill', mediaType: 'IMAGE', url: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=600&q=80' },
  { id: 'm4', title: 'Tai nghe Bluetooth không dây bass trâu', mediaType: 'IMAGE', url: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&q=80' },
  { id: 'm5', title: 'Bảng quản lý tài chính cá nhân', mediaType: 'IMAGE', url: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=600&q=80' },
  { id: 'm6', title: 'Son kem lì Hàn Quốc màu đỏ đất', mediaType: 'IMAGE', url: 'https://images.unsplash.com/photo-1586495777744-4413f21062fa?w=600&q=80' },
  { id: 'm7', title: 'Bộ skincare làm sạch sâu da mụn', mediaType: 'IMAGE', url: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=600&q=80' },
  { id: 'm8', title: 'Góc trà chiều đọc sách cuối tuần', mediaType: 'IMAGE', url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=600&q=80' },
  { id: 'm9', title: 'Đồ gia dụng thông minh căn hộ', mediaType: 'IMAGE', url: 'https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?w=600&q=80' },
];

export default function MissionsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [missions, setMissions] = useState<MissionExecution[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // PRESETS DROPDOWN STATE (Cho phép sửa, xóa, đặt tên tool auto)
  const [presets, setPresets] = useState<AutoPresetItem[]>(DEFAULT_PRESETS);
  const [isPresetModalOpen, setIsPresetModalOpen] = useState(false);
  const [editingPreset, setEditingPreset] = useState<AutoPresetItem | null>(null);
  const [presetToolName, setPresetToolName] = useState('');
  const [presetToolDesc, setPresetToolDesc] = useState('');
  const [presetToolType, setPresetToolType] = useState<AutoPresetItem['type']>('THREADS_ONLY');

  const [isCustomModalOpen, setIsCustomModalOpen] = useState(false);
  const [editingMission, setEditingMission] = useState<MissionExecution | null>(null);
  const [filterPlatform, setFilterPlatform] = useState<'ALL' | 'THREADS' | 'FACEBOOK'>('ALL');

  // Custom Auto Mission Form State
  const [customPostCount, setCustomPostCount] = useState(9);
  const [selectedChannelIds, setSelectedChannelIds] = useState<string[]>(
    DEFAULT_CONNECTED_PAGES.map((p) => p.id)
  );
  const [customShopeeMode, setCustomShopeeMode] = useState<'RANDOM_ALL' | 'CUSTOM_LINKS'>('RANDOM_ALL');
  const [selectedShopeeIds, setSelectedShopeeIds] = useState<string[]>(
    DEFAULT_9_SHOPEE_PRODUCTS.map((p) => p.id)
  );
  const [customMediaMode, setCustomMediaMode] = useState<'RANDOM_POOL' | 'CUSTOM_IMAGES'>('RANDOM_POOL');
  const [selectedMediaIds, setSelectedMediaIds] = useState<string[]>(
    DEFAULT_MEDIA_ITEMS.map((m) => m.id)
  );
  const [customStartHour, setCustomStartHour] = useState('08:00');
  const [customEndHour, setCustomEndHour] = useState('22:00');
  const [customEnableJitter, setCustomEnableJitter] = useState(true);

  // Edit Mission Form State
  const [editGoalText, setEditGoalText] = useState('');
  const [editTargetThreads, setEditTargetThreads] = useState(true);
  const [editTargetFacebook, setEditTargetFacebook] = useState(true);

  // DRAG AND DROP PIPELINE STEPS
  const [pipelineSteps, setPipelineSteps] = useState<PipelineStep[]>([
    { id: 'step_text', name: '1. Giai Đoạn Text: Lấy/Tạo Văn Bản Bài Viết (Caption)', desc: 'Tự động cào từ Sources hoặc tạo bài theo câu lệnh AI', enabled: true, category: 'TEXT' },
    { id: 'step_media', name: '2. Giai Đoạn Media: Xoay Vòng Hình Ảnh/Video Random', desc: 'Chọn ngẫu nhiên tệp ảnh/video khác nhau cho từng bài', enabled: true, category: 'MEDIA' },
    { id: 'step_link', name: '3. Giai Đoạn Link: Lọc Link Rác & Ghép Link Shopee Affiliate', desc: 'Lọc bỏ link quảng cáo rác, gắn link Shopee Affiliate của bạn', enabled: true, category: 'LINK' },
    { id: 'step_comment', name: '4. Giai Đoạn Comment: Tự Tách N Bình Luận (1 Comment/1 Link SP)', desc: 'Mỗi sản phẩm Shopee được tách thành 1 bình luận độc lập', enabled: true, category: 'COMMENT' },
    { id: 'step_time', name: '5. Giai Đoạn Time: Phân Bổ Giờ Đăng & Sai Số Random Time', desc: 'Rải mốc giờ ngẫu nhiên trong ngày tránh bị thuật toán chặn', enabled: true, category: 'TIME' },
    { id: 'step_publish', name: '6. Giai Đoạn Xuất Bản: Đăng Lên Meta Threads / FB Fanpage', desc: 'Đẩy bài vào hàng chờ xuất bản tự động trên hệ thống', enabled: true, category: 'PUBLISH' },
  ]);

  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  // Load saved presets from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('custom_auto_presets');
        if (saved) {
          setPresets(JSON.parse(saved));
        }
      } catch {}
    }
  }, []);

  const savePresetsToStorage = (updated: AutoPresetItem[]) => {
    setPresets(updated);
    if (typeof window !== 'undefined') {
      localStorage.setItem('custom_auto_presets', JSON.stringify(updated));
    }
  };

  // OPEN MODAL TO CREATE NEW AUTO TOOL
  const handleOpenCreatePresetModal = () => {
    setEditingPreset(null);
    setPresetToolName('✨ Tool Auto Mới ' + (presets.length + 1));
    setPresetToolDesc('Tự động hóa đăng bài & bình luận link Shopee Affiliate tùy chỉnh.');
    setPresetToolType('THREADS_ONLY');
    setIsPresetModalOpen(true);
  };

  // OPEN MODAL TO EDIT PRESET TOOL NAME / DESC
  const handleOpenEditPresetModal = (preset: AutoPresetItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingPreset(preset);
    setPresetToolName(preset.name);
    setPresetToolDesc(preset.desc);
    setPresetToolType(preset.type);
    setIsPresetModalOpen(true);
  };

  // DELETE PRESET TOOL FROM DROPDOWN MENU LIST
  const handleDeletePreset = (presetId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Bạn có chắc muốn xóa Tool Auto này khỏi danh sách xổ xuống?')) return;
    const updated = presets.filter((p) => p.id !== presetId);
    savePresetsToStorage(updated);
    toast.success('Đã xóa Tool Auto khỏi danh sách!');
  };

  // SAVE PRESET TOOL NAME & CONFIG
  const handleSavePresetTool = () => {
    if (!presetToolName.trim()) {
      toast.error('Vui lòng nhập Tên Tool Auto!');
      return;
    }

    if (editingPreset) {
      const updated = presets.map((p) =>
        p.id === editingPreset.id
          ? {
              ...p,
              name: presetToolName.trim(),
              desc: presetToolDesc.trim(),
              type: presetToolType,
            }
          : p
      );
      savePresetsToStorage(updated);
      toast.success('⚡ Đã cập nhật Tên & Cấu hình Tool Auto!');
    } else {
      const newPresetItem: AutoPresetItem = {
        id: 'preset_' + Date.now(),
        name: presetToolName.trim(),
        desc: presetToolDesc.trim(),
        type: presetToolType,
        icon: presetToolType === 'THREADS_ONLY' ? 'threads' : presetToolType === 'FACEBOOK_ONLY' ? 'facebook' : 'all',
      };
      const updated = [...presets, newPresetItem];
      savePresetsToStorage(updated);
      toast.success('✨ Đã tạo Tool Auto mới thành công!');
    }

    setIsPresetModalOpen(false);
  };

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

  // RUN PRESET MISSION
  const handleRunPresetMission = async (preset: AutoPresetItem) => {
    setIsDropdownOpen(false);
    setLoading(true);

    try {
      const presetType = preset.type;
      const times = generateRandomScheduleTimes(9);
      let prods: any[] = [];
      if (typeof window !== 'undefined') {
        try {
          prods = JSON.parse(localStorage.getItem('custom_affiliate_products') || '[]');
        } catch {}
      }
      if (!prods || prods.length === 0) prods = DEFAULT_9_SHOPEE_PRODUCTS;

      const commentBlocks = prods.map((p, idx) => {
        const affLink = p.affiliateLinks?.[0]?.affiliateUrl || p.shopeeUrl || p.url || 'https://s.shopee.vn/9zxfyMkHS5';
        const pName = p.name || 'Sản phẩm Shopee';
        return '🛍️ [SP #' + (idx + 1) + '] ' + pName + ' - Link ưu đãi: ' + affLink;
      });
      const multiCommentText = commentBlocks.join('\n\n');

      const newAlbumItems: any[] = [];

      if (presetType === 'THREADS_ONLY' || presetType === 'ALL_IN_ONE') {
        let threadsPosts: any[] = [];
        try {
          const res = await fetch('/api/threads/trending?force=true');
          const json = await res.json();
          if (json.success && Array.isArray(json.data)) threadsPosts = json.data;
        } catch {}
        if (threadsPosts.length === 0) threadsPosts = DEFAULT_9_SHOPEE_PRODUCTS;

        threadsPosts.slice(0, 9).forEach((tPost, i) => {
          const cleanCap = stripLinks(tPost.content || tPost.caption || '');
          newAlbumItems.push({
            id: 'auto_th_' + Date.now() + '_' + (i + 1),
            title: '[' + preset.name + ' #' + (i + 1) + '] ' + cleanCap.slice(0, 40) + '...',
            caption: cleanCap + '\n#ThreadsHot #ShopeeAffiliate',
            comment: multiCommentText,
            firstCommentText: multiCommentText,
            mediaType: 'TEXT',
            mediaUrl: '',
            thumbnailUrl: '',
            platforms: ['THREADS'],
            scheduledAt: times[i % times.length],
            status: 'SCHEDULED',
            createdAt: new Date().toISOString(),
          });
        });
      }

      if (presetType === 'FACEBOOK_ONLY' || presetType === 'ALL_IN_ONE') {
        DEFAULT_9_SHOPEE_PRODUCTS.forEach((sample, i) => {
          newAlbumItems.push({
            id: 'auto_fb_' + Date.now() + '_' + (i + 1),
            title: '[' + preset.name + ' #' + (i + 1) + '] ' + sample.name,
            caption: '[Review Hot #' + (i + 1) + '] ' + sample.name + ' chính hãng chất lượng cao. Khám phá chi tiết ngay!\n#FacebookViral #ShopeeAffiliate',
            comment: multiCommentText,
            firstCommentText: multiCommentText,
            mediaType: 'IMAGE',
            mediaUrl: DEFAULT_MEDIA_ITEMS[i % DEFAULT_MEDIA_ITEMS.length].url,
            thumbnailUrl: DEFAULT_MEDIA_ITEMS[i % DEFAULT_MEDIA_ITEMS.length].url,
            platforms: ['FACEBOOK'],
            scheduledAt: times[i % times.length],
            status: 'SCHEDULED',
            createdAt: new Date().toISOString(),
          });
        });
      }

      const existingAlbum: any[] = JSON.parse(localStorage.getItem('custom_album_posts') || '[]');
      localStorage.setItem('custom_album_posts', JSON.stringify([...newAlbumItems, ...existingAlbum]));

      const newMission: MissionExecution = {
        id: 'mission_' + presetType.toLowerCase() + '_' + Date.now(),
        goal: preset.name + ': Đăng ' + newAlbumItems.length + ' bài kèm ' + commentBlocks.length + ' bình luận Shopee',
        type: presetType,
        status: 'COMPLETED',
        postsCreated: newAlbumItems.length,
        scheduledTimes: times.map((t) => t.split('T')[1].slice(0, 5)),
        steps: [
          { id: '1', agent: 'TOOL_LAUNCHER', title: 'Khởi chạy Tool Auto: "' + preset.name + '"', status: 'DONE' },
          { id: '2', agent: 'MEDIA_AGENT', title: 'Xoay vòng tệp hình ảnh/video random', status: 'DONE' },
          { id: '3', agent: 'MULTI_COMMENT', title: 'Gán ' + commentBlocks.length + ' bình luận Shopee (1 Comment/1 Link SP)', status: 'DONE' },
          { id: '4', agent: 'RANDOM_SCHEDULER', title: 'Rải mốc giờ ngẫu nhiên trong ngày', status: 'DONE' },
          { id: '5', agent: 'PUBLISHER', title: 'Hoàn tất đẩy bài vào Hàng Đợi Lên Lịch', status: 'DONE' },
        ],
        createdAt: new Date().toISOString(),
      };

      setMissions((prev) => {
        const updated = [newMission, ...prev];
        localStorage.setItem('custom_missions', JSON.stringify(updated));
        return updated;
      });

      toast.success('🚀 KHỞI CHẠY THÀNH CÔNG: "' + preset.name + '"!');
    } catch (e) {
      toast.error('Lỗi khi kích hoạt Tool Auto.');
    } finally {
      setLoading(false);
    }
  };

  // RUN CUSTOM AUTO MISSION BUILDER
  const handleRunCustomAutoMission = () => {
    if (selectedChannelIds.length === 0) {
      toast.error('Vui lòng tích chọn ít nhất 1 Trang/Kênh trong danh sách!');
      return;
    }

    setLoading(true);
    setIsCustomModalOpen(false);

    try {
      const times = generateRandomScheduleTimes(
        customPostCount,
        customStartHour,
        customEndHour,
        customEnableJitter
      );

      const selectedChannels = DEFAULT_CONNECTED_PAGES.filter((p) => selectedChannelIds.includes(p.id));
      const hasThreads = selectedChannels.some((c) => c.platform === 'THREADS');
      const hasFacebook = selectedChannels.some((c) => c.platform === 'FACEBOOK');

      const pickedProducts = DEFAULT_9_SHOPEE_PRODUCTS.filter((p) => selectedShopeeIds.includes(p.id));
      const activeProducts = pickedProducts.length > 0 ? pickedProducts : DEFAULT_9_SHOPEE_PRODUCTS;

      const commentBlocks = activeProducts.map((p, idx) => '🛍️ [SP #' + (idx + 1) + '] ' + p.name + ': ' + p.url);
      const multiCommentText = commentBlocks.join('\n\n');

      const pickedMedia = DEFAULT_MEDIA_ITEMS.filter((m) => selectedMediaIds.includes(m.id));
      const activeMedia = pickedMedia.length > 0 ? pickedMedia : DEFAULT_MEDIA_ITEMS;

      const platforms: ('FACEBOOK' | 'THREADS')[] = [];
      if (hasThreads) platforms.push('THREADS');
      if (hasFacebook) platforms.push('FACEBOOK');

      const newAlbumItems: any[] = [];

      for (let i = 0; i < customPostCount; i++) {
        const timeISO = times[i % times.length];
        const mItem = activeMedia[i % activeMedia.length];

        newAlbumItems.push({
          id: 'custom_auto_' + Date.now() + '_' + (i + 1),
          title: '[Custom Auto #' + (i + 1) + '] ' + mItem.title,
          caption: '[Auto Custom Post #' + (i + 1) + '] ' + mItem.title + '. Thông tin thực tế & trải nghiệm chất lượng cao cho bạn.\n#AutoCustom #ShopeeAffiliate',
          comment: multiCommentText,
          firstCommentText: multiCommentText,
          mediaType: hasFacebook ? mItem.mediaType : 'TEXT',
          mediaUrl: hasFacebook ? mItem.url : '',
          thumbnailUrl: hasFacebook ? mItem.url : '',
          platforms,
          scheduledAt: timeISO,
          status: 'SCHEDULED',
          createdAt: new Date().toISOString(),
        });
      }

      const existingAlbum: any[] = JSON.parse(localStorage.getItem('custom_album_posts') || '[]');
      localStorage.setItem('custom_album_posts', JSON.stringify([...newAlbumItems, ...existingAlbum]));

      const newMission: MissionExecution = {
        id: 'mission_custom_' + Date.now(),
        goal: 'Auto Custom: Đăng ' + customPostCount + ' bài lên ' + selectedChannels.length + ' kênh/Trang đã chọn kèm ' + commentBlocks.length + ' bình luận Shopee',
        type: 'CUSTOM_AUTO',
        status: 'COMPLETED',
        postsCreated: customPostCount,
        scheduledTimes: times.map((t) => t.split('T')[1].slice(0, 5)),
        steps: [
          { id: '1', agent: 'CUSTOM_BUILDER', title: 'Đã chọn ' + selectedChannels.length + ' Trang kết nối (' + selectedChannels.map((c) => c.name).join(', ') + ')', status: 'DONE' },
          { id: '2', agent: 'SHOPEE_PARSER', title: 'Tích chọn ' + activeProducts.length + ' sản phẩm Shopee kho Affiliate', status: 'DONE' },
          { id: '3', agent: 'MEDIA_ROTATOR', title: 'Tích chọn ' + activeMedia.length + ' tệp Ảnh/Video kho Media', status: 'DONE' },
          { id: '4', agent: 'RANDOM_SCHEDULER', title: 'Phân bổ mốc giờ (' + customStartHour + ' - ' + customEndHour + ')', status: 'DONE' },
          { id: '5', agent: 'PUBLISHER', title: 'Hoàn tất đẩy ' + customPostCount + ' bài vào Hàng Đợi Lên Lịch', status: 'DONE' },
        ],
        createdAt: new Date().toISOString(),
      };

      setMissions((prev) => {
        const updated = [newMission, ...prev];
        localStorage.setItem('custom_missions', JSON.stringify(updated));
        return updated;
      });

      toast.success('⚡ ĐÃ KHỞI CHẠY MISSION TÙY CHỈNH! Đã tạo ' + customPostCount + ' bài đăng cho các Trang đã chọn!');
    } catch (e) {
      toast.error('Lỗi khi khởi chạy Mission tùy chỉnh.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteMission = (missionId: string) => {
    if (!confirm('Bạn có chắc muốn xóa nhiệm vụ này khỏi nhật ký?')) return;
    const updated = missions.filter((m) => m.id !== missionId);
    setMissions(updated);
    if (typeof window !== 'undefined') {
      localStorage.setItem('custom_missions', JSON.stringify(updated));
    }
    toast.success('Đã xóa nhiệm vụ khỏi danh sách!');
  };

  const handleDeletePlatformPostsOfMission = (mission: MissionExecution, platformToDelete: 'THREADS' | 'FACEBOOK') => {
    const platformLabel = platformToDelete === 'THREADS' ? 'Meta Threads' : 'Facebook Fanpage';
    if (!confirm('Bạn có chắc muốn xóa tất cả bài đăng trên kênh ' + platformLabel + ' của nhiệm vụ này?')) return;

    if (typeof window !== 'undefined') {
      const album: any[] = JSON.parse(localStorage.getItem('custom_album_posts') || '[]');
      const filteredAlbum = album.filter((item) => {
        if (!item.platforms) return true;
        return !item.platforms.includes(platformToDelete);
      });
      localStorage.setItem('custom_album_posts', JSON.stringify(filteredAlbum));
    }

    toast.success('Đã xóa sạch bài đăng ' + platformLabel + ' của nhiệm vụ này!');
  };

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

  const filteredMissions = missions.filter((m) => {
    if (filterPlatform === 'THREADS') return m.type === 'THREADS_ONLY' || m.type === 'ALL_IN_ONE';
    if (filterPlatform === 'FACEBOOK') return m.type === 'FACEBOOK_ONLY' || m.type === 'ALL_IN_ONE';
    return true;
  });

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
                          title="Sửa tên Tool Auto"
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

                {/* CREATE NEW AUTO TOOL PRESET */}
                <button
                  type="button"
                  onClick={() => {
                    setIsDropdownOpen(false);
                    handleOpenCreatePresetModal();
                  }}
                  className="w-full p-3 text-left bg-gradient-to-r from-amber-950/40 to-transparent hover:bg-amber-900/30 transition-colors flex items-center gap-2.5 text-amber-300 font-bold text-xs"
                >
                  <Plus className="w-4 h-4 text-amber-400" />
                  <span>➕ Tạo Tool Auto Mới &amp; Đặt Tên</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsDropdownOpen(false);
                    setIsCustomModalOpen(true);
                  }}
                  className="w-full p-3.5 text-left bg-gradient-to-r from-purple-950/40 to-transparent hover:bg-purple-900/30 transition-colors flex items-start gap-3 group"
                >
                  <div className="p-2 rounded-lg bg-purple-500/20 text-purple-300 mt-0.5">
                    <Wrench className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-purple-300 group-hover:text-purple-200">
                      ⚡ Thêm Tính Năng Auto Tùy Chỉnh (Custom Builder)
                    </p>
                    <p className="text-[11px] text-purple-400/80 mt-0.5">
                      Tùy chỉnh số bài, tích chọn Trang, kho sản phẩm Shopee &amp; kho Media.
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

      {/* DRAG AND DROP PIPELINE CONFIG */}
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

      {/* CREATE / EDIT AUTO PRESET TOOL MODAL */}
      <Modal
        isOpen={isPresetModalOpen}
        onClose={() => setIsPresetModalOpen(false)}
        title={editingPreset ? '✏️ CHỈNH SỬA TÊN TOOL AUTO' : '➕ TẠO TOOL AUTO MỚI & ĐẶT TÊN'}
        size="md"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1">
              Đặt Tên Tool Auto (Tool Name):
            </label>
            <input
              type="text"
              placeholder="VD: Tool Auto ReUp Mỹ Phẩm 9 Bài"
              value={presetToolName}
              onChange={(e) => setPresetToolName(e.target.value)}
              className="w-full h-10 px-3 rounded-lg border border-white/[0.1] bg-[#18181f] text-white text-xs focus:outline-none focus:border-amber-500 font-bold"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1">
              Mô Tả Ngắn Về Tool Auto Này:
            </label>
            <textarea
              rows={2}
              placeholder="VD: Đăng bài tự động lên Threads + gán 9 comment Shopee lốc giấy Top Gia..."
              value={presetToolDesc}
              onChange={(e) => setPresetToolDesc(e.target.value)}
              className="w-full p-2.5 rounded-lg border border-white/[0.1] bg-[#18181f] text-white text-xs focus:outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1">
              Nền Tảng Đăng Xuất Bản Tự Động:
            </label>
            <select
              value={presetToolType}
              onChange={(e) => setPresetToolType(e.target.value as any)}
              className="w-full h-9 px-3 rounded-lg border border-white/[0.1] bg-[#18181f] text-white text-xs focus:outline-none focus:border-amber-500"
            >
              <option value="THREADS_ONLY">🔥 Chỉ Đăng Meta Threads</option>
              <option value="FACEBOOK_ONLY">🟦 Chỉ Đăng Facebook Fanpage</option>
              <option value="ALL_IN_ONE">⚡ All-In-One (Đăng Cả Threads &amp; Facebook)</option>
            </select>
          </div>

          <div className="pt-3 flex items-center justify-end gap-2 border-t border-white/[0.08]">
            <Button
              variant="outline"
              onClick={() => setIsPresetModalOpen(false)}
              className="h-9 border-white/[0.1] text-zinc-400 hover:text-white text-xs"
            >
              Hủy Bỏ
            </Button>
            <Button
              onClick={handleSavePresetTool}
              className="h-9 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs px-5 shadow-lg shadow-amber-600/30 gap-1.5"
            >
              <Check className="w-4 h-4" /> LƯU TOOL AUTO NÀY
            </Button>
          </div>
        </div>
      </Modal>

      {/* CUSTOM AUTO MISSION BUILDER MODAL WITH VISUAL LIST PICKERS */}
      <Modal
        isOpen={isCustomModalOpen}
        onClose={() => setIsCustomModalOpen(false)}
        title="➕ THÊM TÍNH NĂNG AUTO TÙY CHỈNH (CUSTOM AUTO BUILDER)"
        size="lg"
      >
        <div className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
          {/* Section 1: Post Count & Connected Platforms List */}
          <div className="p-3.5 rounded-xl border border-white/[0.08] bg-[#18181f] space-y-3">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <Settings2 className="w-4 h-4 text-purple-400" />
              1. Cấu Hình Số Lượng Bài &amp; Tích Chọn Trang / Kênh Đang Có
            </h3>

            <div className="space-y-3">
              <div>
                <label className="block text-xs text-zinc-400 mb-1 font-medium">Số lượng bài viết xuất bản:</label>
                <input
                  type="number"
                  min={1}
                  max={30}
                  value={customPostCount}
                  onChange={(e) => setCustomPostCount(Number(e.target.value))}
                  className="w-full h-9 px-3 rounded-lg border border-white/[0.1] bg-[#111117] text-white text-xs focus:outline-none focus:border-purple-500"
                />
              </div>

              {/* CONNECTED PLATFORMS DROPDOWN LIST */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs text-zinc-300 font-semibold">
                    Danh sách Trang / Fanpage / Kênh đang có ({selectedChannelIds.length}/{DEFAULT_CONNECTED_PAGES.length} trang đã chọn):
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      if (selectedChannelIds.length === DEFAULT_CONNECTED_PAGES.length) {
                        setSelectedChannelIds([]);
                      } else {
                        setSelectedChannelIds(DEFAULT_CONNECTED_PAGES.map((p) => p.id));
                      }
                    }}
                    className="text-[11px] text-purple-400 hover:text-purple-300 font-medium"
                  >
                    {selectedChannelIds.length === DEFAULT_CONNECTED_PAGES.length ? 'Bỏ chọn tất cả' : 'Tích chọn tất cả'}
                  </button>
                </div>

                <div className="p-2 rounded-xl border border-white/[0.1] bg-[#111117] space-y-1.5 max-h-40 overflow-y-auto">
                  {DEFAULT_CONNECTED_PAGES.map((channel) => {
                    const isSelected = selectedChannelIds.includes(channel.id);
                    const isFb = channel.platform === 'FACEBOOK';
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
                          ) : (
                            <Flame className="w-4 h-4 text-amber-400 flex-shrink-0" />
                          )}
                          <span className="text-xs font-semibold">{channel.name}</span>
                          <span className="text-[10px] text-zinc-500 font-mono">{channel.handle}</span>
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

          {/* Section 2: Shopee Products Visual List Picker */}
          <div className="p-3.5 rounded-xl border border-white/[0.08] bg-[#18181f] space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <LinkIcon className="w-4 h-4 text-emerald-400" />
                2. Tích Chọn Danh Sách Sản Phẩm Trong Kho Shopee Affiliate ({selectedShopeeIds.length} SP đã tích)
              </h3>
              <button
                type="button"
                onClick={() => {
                  if (selectedShopeeIds.length === DEFAULT_9_SHOPEE_PRODUCTS.length) {
                    setSelectedShopeeIds([]);
                  } else {
                    setSelectedShopeeIds(DEFAULT_9_SHOPEE_PRODUCTS.map((p) => p.id));
                  }
                }}
                className="text-[11px] text-emerald-400 hover:text-emerald-300 font-medium"
              >
                {selectedShopeeIds.length === DEFAULT_9_SHOPEE_PRODUCTS.length ? 'Bỏ chọn tất cả' : 'Tích chọn tất cả Kho SP'}
              </button>
            </div>

            <div className="p-2 rounded-xl border border-white/[0.1] bg-[#111117] space-y-2 max-h-48 overflow-y-auto">
              {DEFAULT_9_SHOPEE_PRODUCTS.map((prod) => {
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

          {/* Section 3: Media Images/Videos Thumbnail Grid Picker */}
          <div className="p-3.5 rounded-xl border border-white/[0.08] bg-[#18181f] space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <ImageIcon className="w-4 h-4 text-sky-400" />
                3. Tích Chọn Danh Sách Hình Ảnh / Video Trong Kho Media ({selectedMediaIds.length} tệp đã tích)
              </h3>
              <button
                type="button"
                onClick={() => {
                  if (selectedMediaIds.length === DEFAULT_MEDIA_ITEMS.length) {
                    setSelectedMediaIds([]);
                  } else {
                    setSelectedMediaIds(DEFAULT_MEDIA_ITEMS.map((m) => m.id));
                  }
                }}
                className="text-[11px] text-sky-400 hover:text-sky-300 font-medium"
              >
                {selectedMediaIds.length === DEFAULT_MEDIA_ITEMS.length ? 'Bỏ chọn tất cả' : 'Tích chọn tất cả Kho Media'}
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-52 overflow-y-auto p-1">
              {DEFAULT_MEDIA_ITEMS.map((mItem) => {
                const isSelected = selectedMediaIds.includes(mItem.id);
                return (
                  <div
                    key={mItem.id}
                    onClick={() => toggleMediaSelection(mItem.id)}
                    className={'relative rounded-lg border p-1.5 cursor-pointer transition-all flex flex-col justify-between ' + (
                      isSelected
                        ? 'border-sky-500 bg-sky-950/20 text-white shadow-sm'
                        : 'border-white/[0.08] bg-[#111117] text-zinc-500 hover:border-white/[0.2]'
                    )}
                  >
                    <div className="relative aspect-video rounded overflow-hidden mb-1.5 bg-black">
                      <img src={mItem.url} alt="" className="w-full h-full object-cover" />
                      {isSelected ? (
                        <div className="absolute top-1 right-1 p-0.5 rounded bg-sky-600 text-white">
                          <Check className="w-3 h-3" />
                        </div>
                      ) : null}
                    </div>

                    <p className="text-[11px] font-semibold truncate text-zinc-200">{mItem.title}</p>
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
                  value={customStartHour}
                  onChange={(e) => setCustomStartHour(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg border border-white/[0.1] bg-[#111117] text-white text-xs focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-[11px] text-zinc-400 mb-1">Giờ kết thúc:</label>
                <input
                  type="time"
                  value={customEndHour}
                  onChange={(e) => setCustomEndHour(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg border border-white/[0.1] bg-[#111117] text-white text-xs focus:outline-none focus:border-purple-500"
                />
              </div>
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2 border-t border-white/[0.08]">
            <Button
              variant="outline"
              onClick={() => setIsCustomModalOpen(false)}
              className="h-9 border-white/[0.1] text-zinc-400 hover:text-white text-xs"
            >
              Hủy Bỏ
            </Button>
            <Button
              onClick={handleRunCustomAutoMission}
              className="h-9 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs px-5 shadow-lg shadow-purple-600/30 gap-1.5"
            >
              <Zap className="w-4 h-4" /> KÍCH HOẠT MISSION TÙY CHỈNH NÀY
            </Button>
          </div>
        </div>
      </Modal>

      {/* EDIT AUTO MISSION MODAL */}
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
