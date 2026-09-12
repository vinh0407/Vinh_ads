'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { Thumbnail } from '@/components/ui/Thumbnail';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table';
import { Modal } from '@/components/ui/Modal';
import { Textarea } from '@/components/ui/Textarea';
import { videosApi, productsApi } from '@/lib/api';
import type { Video, Product } from '@/types';
import { formatRelativeTime, getVideoStatusColor, formatNumber } from '@/lib/utils';
import {
  Search,
  Upload,
  Eye,
  Trash2,
  Video as VideoIcon,
  Image as ImageIcon,
  FileVideo,
  FileImage,
  X,
  Loader2,
  Sparkles,
  ShoppingBag,
  Send,
  Calendar,
  Shuffle,
  Radio,
  Copy,
  Check,
  ExternalLink,
  Plus,
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';

export interface AlbumItem {
  id: string;
  title: string;
  caption: string;
  comment: string;
  mediaType: 'VIDEO' | 'IMAGE';
  mediaUrl: string;
  thumbnailUrl?: string;
  source: 'UPLOAD' | 'SCRAPED_TIKTOK' | 'SCRAPED_FACEBOOK' | 'SCRAPED_YOUTUBE';
  status: string;
  duration?: number;
  fileSize?: number;
  shopeeProduct?: {
    name: string;
    affiliateUrl: string;
    price?: number;
  };
  createdAt: string;
}

const albumSchema = z.object({
  title: z.string().min(1, 'Tiêu đề là bắt buộc'),
  caption: z.string().optional(),
  comment: z.string().optional(),
  mediaType: z.enum(['VIDEO', 'IMAGE']).default('VIDEO'),
});

type AlbumForm = z.infer<typeof albumSchema>;

const INITIAL_ALBUM_POSTS: AlbumItem[] = [];

function stripLinksFromText(text: string): string {
  if (!text) return '';
  return text.replace(/https?:\/\/[^\s]+|(?:shopee\.vn|s\.shopee\.vn|vn\.shp\.ee|shorten\.asia|tiktok\.com|facebook\.com|fb\.watch|bit\.ly|tinyurl\.com)[^\s]*/gi, '').replace(/\s{2,}/g, ' ').trim();
}

export default function AlbumPostPage() {
  const router = useRouter();
  const [items, setItems] = useState<AlbumItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({ search: '', mediaType: '', source: '' });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<AlbumItem | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);
  const [fileType, setFileType] = useState<'VIDEO' | 'IMAGE'>('VIDEO');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [previewMediaItem, setPreviewMediaItem] = useState<AlbumItem | null>(null);
  const [shopeeProducts, setShopeeProducts] = useState<Product[]>([]);

  const form = useForm<AlbumForm>({
    resolver: zodResolver(albumSchema),
    defaultValues: { title: '', caption: '', comment: '', mediaType: 'VIDEO' },
  });

  const handleClearAll = () => {
    if (!confirm('Bạn có chắc chắn muốn xóa toàn bộ bài viết trong Kho Album Post?')) return;
    setItems([]);
    setTotal(0);
    if (typeof window !== 'undefined') {
      localStorage.setItem('custom_album_posts', JSON.stringify([]));
    }
    toast.success('Đã xóa toàn bộ bài viết cũ trong kho!');
  };

  const fetchProducts = useCallback(async () => {
    try {
      let apiProds: Product[] = [];
      try {
        const res = await productsApi.list();
        apiProds = res.data?.data || [];
      } catch (err) {
        console.warn('Backend products offline, using local store:', err);
      }
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

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      let localItems: AlbumItem[] = [];
      if (typeof window !== 'undefined') {
        localItems = JSON.parse(localStorage.getItem('custom_album_posts') || '[]');
      }

      let apiVideos: Video[] = [];
      try {
        const res = await videosApi.list({ page: 1, limit: 50 });
        apiVideos = res.data?.data?.items || [];
      } catch (e) {
        console.warn('API video fetch error:', e);
      }

      const apiConverted: AlbumItem[] = apiVideos.map((v) => ({
        id: v.id,
        title: v.title,
        caption: stripLinksFromText(v.description || ''),
        comment: '',
        mediaType: 'VIDEO',
        mediaUrl: v.storageKey || v.thumbnailUrl || '',
        thumbnailUrl: v.thumbnailUrl || undefined,
        source: 'UPLOAD',
        status: v.status || 'READY',
        duration: v.duration || undefined,
        fileSize: v.fileSize || undefined,
        createdAt: v.createdAt || new Date().toISOString(),
      }));

      const mergedMap = new Map<string, AlbumItem>();
      [...localItems, ...apiConverted].forEach((item) => {
        if (!mergedMap.has(item.id)) {
          mergedMap.set(item.id, item);
        }
      });

      const mergedList = Array.from(mergedMap.values());
      setItems(mergedList);
      setTotal(mergedList.length);
    } catch (error) {
      console.error('Failed to fetch album posts:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
    fetchItems();
  }, [fetchProducts, fetchItems]);

  const resetModalState = () => {
    setIsModalOpen(false);
    setEditingItem(null);
    setSelectedFile(null);
    setFilePreviewUrl(null);
    setErrorMessage(null);
    setIsSubmitting(false);
    form.reset();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setErrorMessage(null);

      const isImg = file.type.startsWith('image/');
      const detectedType = isImg ? 'IMAGE' : 'VIDEO';
      setFileType(detectedType);
      form.setValue('mediaType', detectedType);

      const currentTitle = form.getValues('title');
      if (!currentTitle) {
        const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '');
        form.setValue('title', nameWithoutExt);
      }

      const reader = new FileReader();
      reader.onload = (evt) => {
        setFilePreviewUrl(evt.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const getRandomShopeeProduct = (): Product | null => {
    if (shopeeProducts.length === 0) return null;
    const randomIndex = Math.floor(Math.random() * shopeeProducts.length);
    return shopeeProducts[randomIndex];
  };

  const handleApplyRandomShopeeLinkToForm = () => {
    const randomProd = getRandomShopeeProduct();
    if (!randomProd) {
      toast.error('Kho sản phẩm Shopee đang trống! Hãy thêm sản phẩm tại /dashboard/products');
      return;
    }

    const affUrl = randomProd.affiliateLinks?.[0]?.affiliateUrl || randomProd.shopeeUrl;
    const curCaption = stripLinksFromText(form.getValues('caption') || '');

    const newCaption = `${curCaption}\n\n🛒 Mua sản phẩm Shopee chính hãng tại: ${affUrl}\n#ShopeeAffiliate #${randomProd.name.replace(/\s+/g, '')}`;
    const newComment = `👉 Link đặt mua Shopee chính hãng [Ưu đãi hôm nay]: ${affUrl}`;

    form.setValue('caption', newCaption);
    form.setValue('comment', newComment);

    toast.success(`🎯 Đã chọn ngẫu nhiên sản phẩm: "${randomProd.name.slice(0, 30)}..."`);
  };

  const handleQuickApplyRandomShopeeToItem = (item: AlbumItem) => {
    const randomProd = getRandomShopeeProduct();
    if (!randomProd) {
      toast.error('Kho sản phẩm Shopee đang trống! Hãy thêm sản phẩm tại /dashboard/products');
      return;
    }

    const affUrl = randomProd.affiliateLinks?.[0]?.affiliateUrl || randomProd.shopeeUrl;
    const cleanCap = stripLinksFromText(item.caption || item.title);

    const updatedItem: AlbumItem = {
      ...item,
      caption: `${cleanCap}\n#ShopeeAffiliate #${randomProd.name.replace(/\s+/g, '')}`,
      comment: `👉 Link mua Shopee chính hãng: ${affUrl}`,
      shopeeProduct: {
        name: randomProd.name,
        affiliateUrl: affUrl,
        price: randomProd.price,
      },
    };

    setItems((prev) => prev.map((i) => (i.id === item.id ? updatedItem : i)));

    if (typeof window !== 'undefined') {
      const stored: AlbumItem[] = JSON.parse(localStorage.getItem('custom_album_posts') || '[]');
      const updated = stored.map((i) => (i.id === item.id ? updatedItem : i));
      if (!stored.some((i) => i.id === item.id)) {
        updated.unshift(updatedItem);
      }
      localStorage.setItem('custom_album_posts', JSON.stringify(updated));
    }

    toast.success(`🎲 Đã gắn ngẫu nhiên SP Shopee: "${randomProd.name.slice(0, 25)}..."`);
  };

  const handleSubmit = async (data: AlbumForm) => {
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      const cleanCaption = stripLinksFromText(data.caption || '');

      let mediaUrl = editingItem?.mediaUrl || '';
      let thumbnailUrl = editingItem?.thumbnailUrl || '';

      if (selectedFile && filePreviewUrl) {
        mediaUrl = filePreviewUrl;
        if (fileType === 'IMAGE') {
          thumbnailUrl = filePreviewUrl;
        }
      }

      const newItem: AlbumItem = {
        id: editingItem ? editingItem.id : `album_${Date.now()}`,
        title: data.title,
        caption: cleanCaption,
        comment: data.comment || '',
        mediaType: fileType,
        mediaUrl: mediaUrl || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=500&q=80',
        thumbnailUrl: thumbnailUrl || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=500&q=80',
        source: editingItem?.source || 'UPLOAD',
        status: 'READY',
        createdAt: new Date().toISOString(),
      };

      setItems((prev) => {
        if (editingItem) {
          return prev.map((i) => (i.id === editingItem.id ? newItem : i));
        }
        return [newItem, ...prev];
      });

      if (typeof window !== 'undefined') {
        const stored: AlbumItem[] = JSON.parse(localStorage.getItem('custom_album_posts') || '[]');
        const updated = editingItem
          ? stored.map((i) => (i.id === editingItem.id ? newItem : i))
          : [newItem, ...stored];
        localStorage.setItem('custom_album_posts', JSON.stringify(updated));
      }

      toast.success(editingItem ? 'Đã cập nhật bài đăng Album!' : 'Đã tải lên nội dung mới!');
      resetModalState();
    } catch (error: any) {
      console.error('Failed to save album item:', error);
      setErrorMessage(error.message || 'Có lỗi xảy ra khi lưu. Vui lòng thử lại.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (item: AlbumItem) => {
    setEditingItem(item);
    setSelectedFile(null);
    setFilePreviewUrl(item.mediaUrl);
    setFileType(item.mediaType);
    setErrorMessage(null);
    form.reset({
      title: item.title,
      caption: item.caption,
      comment: item.comment,
      mediaType: item.mediaType,
    });
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa bài đăng này khỏi kho Album?')) return;
    setItems((prev) => prev.filter((i) => i.id !== id));
    if (typeof window !== 'undefined') {
      const stored: AlbumItem[] = JSON.parse(localStorage.getItem('custom_album_posts') || '[]');
      const updated = stored.filter((i) => i.id !== id);
      localStorage.setItem('custom_album_posts', JSON.stringify(updated));
    }
    toast.success('Đã xóa tệp khỏi kho Album Post!');
  };

  const handleSendToSchedule = (item: AlbumItem) => {
    const query = new URLSearchParams({
      title: item.title,
      content: item.caption || item.title,
      firstComment: item.comment || '',
      mediaUrl: item.mediaUrl,
    });
    router.push(`/dashboard/schedules?${query.toString()}`);
  };

  const filteredItems = items.filter((item) => {
    if (filters.search && !item.title.toLowerCase().includes(filters.search.toLowerCase())) {
      return false;
    }
    if (filters.mediaType && item.mediaType !== filters.mediaType) {
      return false;
    }
    if (filters.source && item.source !== filters.source) {
      return false;
    }
    return true;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.06] pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="default" className="bg-red-600 text-white font-mono text-[10px] tracking-wider uppercase">
              MEDIA & ALBUM VAULT
            </Badge>
            <span className="text-xs font-mono text-zinc-400">
              {filteredItems.length} TỆP (ẢNH & VIDEO)
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Kho Media & Bài Đăng Album Post
          </h1>
          <p className="text-sm text-zinc-400">
            Lưu trữ video, hình ảnh và bài viết cào từ TikTok/Fanpage (đã lọc link), tự động random link Shopee Aff vào caption & bình luận
          </p>
        </div>

        <div className="flex items-center gap-2">
          {items.length > 0 && (
            <Button
              variant="outline"
              onClick={handleClearAll}
              className="border-rose-900/60 hover:bg-rose-950/40 text-rose-400 text-xs font-semibold"
            >
              <Trash2 className="h-4 w-4 mr-1.5" />
              Xóa Toàn Bộ Bài Cũ ({items.length})
            </Button>
          )}
          <Button
            onClick={() => {
              resetModalState();
              setIsModalOpen(true);
            }}
            className="bg-red-600 hover:bg-red-500 active:scale-[0.98] text-white font-semibold text-xs px-4"
          >
            <Upload className="h-4 w-4 mr-2" />
            Upload (Ảnh / Video)
          </Button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <Card className="bg-[#111117] border-white/[0.06]">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
              <Input
                placeholder="Tìm kiếm theo tiêu đề hoặc nội dung..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                className="pl-10 bg-white/[0.03] border-white/[0.08] text-xs text-white"
              />
            </div>
            <Select
              value={filters.mediaType}
              onChange={(e) => setFilters({ ...filters, mediaType: e.target.value })}
              options={[
                { value: '', label: '🎬 Tất cả loại Media' },
                { value: 'VIDEO', label: '🎥 Video MP4/MOV' },
                { value: 'IMAGE', label: '🖼️ Hình Ảnh JPG/PNG' },
              ]}
              className="bg-white/[0.03] border-white/[0.08] text-xs"
            />
            <Select
              value={filters.source}
              onChange={(e) => setFilters({ ...filters, source: e.target.value })}
              options={[
                { value: '', label: '🌐 Tất cả nguồn gốc' },
                { value: 'UPLOAD', label: '📁 Tải lên từ máy' },
                { value: 'SCRAPED_TIKTOK', label: '🎵 Cào từ TikTok' },
                { value: 'SCRAPED_FACEBOOK', label: '📘 Cào từ Fanpage' },
              ]}
              className="bg-white/[0.03] border-white/[0.08] text-xs"
            />
          </div>
        </CardContent>
      </Card>

      {/* Table view of Album Post items */}
      <Card className="bg-[#111117] border-white/[0.06] overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-white/[0.02]">
                <TableRow className="border-b border-white/[0.06]">
                  <TableHead className="text-zinc-400 font-mono text-[11px] uppercase">Media</TableHead>
                  <TableHead className="text-zinc-400 font-mono text-[11px] uppercase">Loại & Nguồn</TableHead>
                  <TableHead className="text-zinc-400 font-mono text-[11px] uppercase">Tiêu đề & Caption (Đã lọc link)</TableHead>
                  <TableHead className="text-zinc-400 font-mono text-[11px] uppercase">Bình luận đính kèm</TableHead>
                  <TableHead className="text-zinc-400 font-mono text-[11px] uppercase text-right">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.map((item) => (
                  <TableRow key={item.id} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                    <TableCell>
                      <div
                        className="relative cursor-pointer group"
                        onClick={() => setPreviewMediaItem(item)}
                      >
                        {item.mediaType === 'IMAGE' ? (
                          <div className="h-14 w-14 rounded-lg bg-zinc-900 overflow-hidden border border-white/[0.08] flex items-center justify-center">
                            <img src={item.mediaUrl} alt={item.title} className="w-full h-full object-cover" />
                          </div>
                        ) : (
                          <Thumbnail
                            src={item.thumbnailUrl || item.mediaUrl}
                            alt={item.title}
                            fallbackIcon={<VideoIcon className="h-6 w-6 text-red-500" />}
                            size="md"
                          />
                        )}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity rounded-lg">
                          <Eye className="h-4 w-4 text-white" />
                        </div>
                      </div>
                    </TableCell>

                    <TableCell>
                      <div className="space-y-1">
                        <Badge
                          variant="default"
                          className={
                            item.mediaType === 'IMAGE'
                              ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30 text-[10px]'
                              : 'bg-red-600/20 text-red-400 border border-red-500/30 text-[10px]'
                          }
                        >
                          {item.mediaType === 'IMAGE' ? (
                            <span className="flex items-center gap-1"><ImageIcon className="h-3 w-3" /> HÌNH ẢNH</span>
                          ) : (
                            <span className="flex items-center gap-1"><VideoIcon className="h-3 w-3" /> VIDEO</span>
                          )}
                        </Badge>
                        <p className="text-[10px] font-mono text-zinc-500">
                          {item.source === 'UPLOAD' ? '📁 Máy tính' : `🌐 ${item.source}`}
                        </p>
                      </div>
                    </TableCell>

                    <TableCell className="max-w-md">
                      <p className="font-semibold text-sm text-zinc-100 line-clamp-1">{item.title}</p>
                      {item.caption ? (
                        <p className="text-xs text-zinc-400 line-clamp-2 mt-0.5 whitespace-pre-wrap">{item.caption}</p>
                      ) : (
                        <span className="text-xs text-zinc-600 italic">Chưa có caption</span>
                      )}
                      {item.shopeeProduct && (
                        <div className="mt-1 flex items-center gap-1 text-[10px] text-emerald-400 font-mono">
                          <ShoppingBag className="h-3 w-3" />
                          <span>Đã gắn: {item.shopeeProduct.name.slice(0, 30)}...</span>
                        </div>
                      )}
                    </TableCell>

                    <TableCell className="max-w-xs">
                      {item.comment ? (
                        <p className="text-xs text-emerald-400 font-mono line-clamp-2 bg-emerald-950/20 p-1.5 rounded border border-emerald-900/40">
                          {item.comment}
                        </p>
                      ) : (
                        <span className="text-xs text-zinc-600 italic">Chưa có bình luận</span>
                      )}
                    </TableCell>

                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleQuickApplyRandomShopeeToItem(item)}
                          className="h-8 text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 text-xs px-2"
                          title="Gắn ngẫu nhiên 1 link Shopee Affiliate từ kho"
                        >
                          <Shuffle className="h-3.5 w-3.5 mr-1" />
                          Random Shopee
                        </Button>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(item)}
                          className="h-8 text-zinc-400 hover:text-white"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </Button>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(item.id)}
                          className="h-8 text-zinc-500 hover:text-red-400"
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

          {filteredItems.length === 0 && !loading && (
            <div className="p-12 text-center text-zinc-500 space-y-3">
              <VideoIcon className="h-12 w-12 mx-auto text-zinc-700" />
              <p className="text-sm font-semibold text-zinc-400">Kho Album Post chưa có nội dung nào</p>
              <p className="text-xs max-w-sm mx-auto text-zinc-600">
                Hãy bấm nút <strong>Upload (Ảnh/Video)</strong> hoặc sang phần <strong>AutoSpy</strong> để lưu bài viết cào vào đây!
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Modal
        isOpen={isModalOpen}
        onClose={resetModalState}
        title={editingItem ? 'Chỉnh Sửa Bài Đăng Album' : 'Tải Lên Media (Ảnh & Video) Mới'}
      >
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          {errorMessage && (
            <div className="p-3 bg-red-950/80 text-red-300 text-xs rounded-lg border border-red-800">
              {errorMessage}
            </div>
          )}

          {!editingItem && (
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">
                Chọn tệp (Hỗ trợ cả Video & Hình ảnh)
              </label>
              {!selectedFile ? (
                <label className="border-2 border-dashed border-zinc-700 rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer hover:border-red-500 hover:bg-white/[0.02] transition-colors">
                  <Upload className="h-8 w-8 text-zinc-500 mb-2" />
                  <span className="text-xs font-semibold text-zinc-200">Bấm để chọn tệp từ máy tính</span>
                  <span className="text-[11px] text-zinc-500 mt-1">Video (MP4, MOV, WebM) hoặc Ảnh (JPG, PNG, WEBP)</span>
                  <input
                    type="file"
                    accept="video/*,image/*,.mp4,.mov,.webm,.avi,.jpg,.jpeg,.png,.webp,.gif"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                </label>
              ) : (
                <div className="flex items-center justify-between p-3 bg-white/[0.03] border border-white/[0.08] rounded-xl">
                  <div className="flex items-center gap-3 min-w-0">
                    {fileType === 'IMAGE' ? (
                      <FileImage className="h-6 w-6 text-blue-400 flex-shrink-0" />
                    ) : (
                      <FileVideo className="h-6 w-6 text-red-500 flex-shrink-0" />
                    )}
                    <div className="truncate">
                      <p className="text-xs font-semibold text-white truncate">{selectedFile.name}</p>
                      <p className="text-[10px] text-zinc-500">{(selectedFile.size / (1024 * 1024)).toFixed(2)} MB</p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedFile(null);
                      setFilePreviewUrl(null);
                    }}
                    disabled={isSubmitting}
                  >
                    <X className="h-4 w-4 text-zinc-400" />
                  </Button>
                </div>
              )}
            </div>
          )}

          <Input
            label="Tiêu đề bài đăng"
            {...form.register('title')}
            placeholder="VD: Đánh giá bộ lụa lạnh cao cấp cho bé"
            error={form.formState.errors.title?.message}
            disabled={isSubmitting}
            className="bg-white/[0.03] border-white/[0.08] text-xs text-white"
          />

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-zinc-300">
                Nội dung Bài đăng (Caption - Đã tự động loại bỏ link rác)
              </label>
              <button
                type="button"
                onClick={handleApplyRandomShopeeLinkToForm}
                className="text-[11px] font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20"
              >
                <Shuffle className="h-3 w-3" />
                Random Link Shopee Aff
              </button>
            </div>
            <Textarea
              {...form.register('caption')}
              placeholder="Nhập nội dung bài viết..."
              rows={4}
              disabled={isSubmitting}
              className="bg-white/[0.03] border-white/[0.08] text-xs text-white"
            />
          </div>

          <Textarea
            label="Nội dung Bình luận đầu tiên (First Comment)"
            {...form.register('comment')}
            placeholder="Tự động dán link Shopee Affiliate vào bình luận..."
            rows={2}
            disabled={isSubmitting}
            className="bg-white/[0.03] border-white/[0.08] text-xs text-emerald-400 font-mono"
          />

          <div className="flex justify-end gap-2 pt-4 border-t border-white/[0.06]">
            <Button
              type="button"
              variant="outline"
              onClick={resetModalState}
              disabled={isSubmitting}
              className="text-xs"
            >
              Hủy
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-red-600 hover:bg-red-500 text-white font-semibold text-xs px-4"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Đang lưu...
                </>
              ) : (
                'Lưu Vào Kho Album'
              )}
            </Button>
          </div>
        </form>
      </Modal>

      {previewMediaItem && (
        <Modal
          isOpen={Boolean(previewMediaItem)}
          onClose={() => setPreviewMediaItem(null)}
          title={`Xem Trước // ${previewMediaItem.title}`}
        >
          <div className="space-y-4">
            <div className="rounded-xl overflow-hidden bg-black border border-white/[0.08] flex items-center justify-center max-h-[400px]">
              {previewMediaItem.mediaType === 'IMAGE' ? (
                <img
                  src={previewMediaItem.mediaUrl}
                  alt={previewMediaItem.title}
                  className="max-h-[380px] w-auto object-contain"
                />
              ) : (
                <video
                  src={previewMediaItem.mediaUrl}
                  controls
                  className="max-h-[380px] w-full object-contain"
                />
              )}
            </div>

            <div className="p-3 bg-white/[0.02] border border-white/[0.06] rounded-lg space-y-2">
              <h4 className="text-sm font-bold text-white">{previewMediaItem.title}</h4>
              {previewMediaItem.caption && (
                <p className="text-xs text-zinc-300 whitespace-pre-wrap">{previewMediaItem.caption}</p>
              )}
              {previewMediaItem.comment && (
                <div className="p-2 bg-emerald-950/30 rounded border border-emerald-900/40 text-xs font-mono text-emerald-400">
                  💬 Bình luận đính kèm: {previewMediaItem.comment}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPreviewMediaItem(null)}
              >
                Đóng
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  const item = previewMediaItem;
                  setPreviewMediaItem(null);
                  handleSendToSchedule(item);
                }}
                className="bg-red-600 hover:bg-red-500 text-white font-semibold text-xs"
              >
                <Calendar className="h-4 w-4 mr-1.5" />
                Dùng Để Đăng Bài Ngay
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
