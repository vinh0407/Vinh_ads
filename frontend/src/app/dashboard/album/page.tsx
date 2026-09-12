'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { safeSetLocalStorage, formatRelativeTime } from '@/lib/utils';
import {
  Upload,
  Image as ImageIcon,
  Video,
  Trash2,
  Send,
  Copy,
  Plus,
  Filter,
  Search,
  CheckCircle2,
  Sparkles,
  Play,
  Film,
  FileUp,
} from 'lucide-react';
import toast from 'react-hot-toast';

export interface UploadedMediaItem {
  id: string;
  fileName: string;
  fileSizeStr: string;
  mediaType: 'IMAGE' | 'VIDEO';
  mediaUrl: string;
  uploadedAt: string;
}

export default function AlbumPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [mediaList, setMediaList] = useState<UploadedMediaItem[]>([]);
  const [filterType, setFilterType] = useState<'ALL' | 'IMAGE' | 'VIDEO'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [previewMedia, setPreviewMedia] = useState<UploadedMediaItem | null>(null);

  // Load user uploaded media from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('custom_uploaded_user_media');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          // Filter out sample media if present in storage
          const userOnly = parsed.filter((item: any) => item && !item.id?.startsWith('sample_media_'));
          setMediaList(userOnly);
          safeSetLocalStorage('custom_uploaded_user_media', userOnly, 50);
          return;
        }
      }
      setMediaList([]);
      safeSetLocalStorage('custom_uploaded_user_media', [], 50);
    } catch (err) {
      setMediaList([]);
    }
  }, []);

  const updateMediaList = (newList: UploadedMediaItem[]) => {
    setMediaList(newList);
    safeSetLocalStorage('custom_uploaded_user_media', newList, 50);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    const newItems: UploadedMediaItem[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const isVideo = file.type.startsWith('video/') || file.name.endsWith('.mp4') || file.name.endsWith('.mov') || file.name.endsWith('.webm');
      const isImage = file.type.startsWith('image/') || file.name.endsWith('.png') || file.name.endsWith('.jpg') || file.name.endsWith('.jpeg') || file.name.endsWith('.webp');

      if (!isImage && !isVideo) {
        toast.error('File "' + file.name + '" không hợp lệ. Vui lòng chọn ảnh hoặc video!');
        continue;
      }

      const sizeInMB = file.size / (1024 * 1024);
      const sizeStr = sizeInMB >= 1 ? sizeInMB.toFixed(1) + ' MB' : Math.round(file.size / 1024) + ' KB';

      const readDataUrl = (f: File): Promise<string> => {
        return new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = (event) => {
            resolve((event.target?.result as string) || '');
          };
          reader.onerror = () => resolve('');
          reader.readAsDataURL(f);
        });
      };

      try {
        let mediaUrl = await readDataUrl(file);
        if (!mediaUrl) {
          mediaUrl = URL.createObjectURL(file);
        }

        const item: UploadedMediaItem = {
          id: 'up_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
          fileName: file.name,
          fileSizeStr: sizeStr,
          mediaType: isVideo ? 'VIDEO' : 'IMAGE',
          mediaUrl,
          uploadedAt: new Date().toISOString(),
        };

        newItems.push(item);
      } catch (err) {
        toast.error('Không thể đọc file "' + file.name + '"');
      }
    }

    if (newItems.length > 0) {
      const updated = [...newItems, ...mediaList];
      updateMediaList(updated);
      toast.success('⚡ Đã tải lên thành công ' + newItems.length + ' media vào Kho Album!');
    }

    setIsUploading(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDeleteMedia = (id: string, fileName: string) => {
    if (confirm('Bạn có chắc muốn xóa file "' + fileName + '" khỏi Kho Album?')) {
      const updated = mediaList.filter((item) => item.id !== id);
      updateMediaList(updated);
      toast.success('Đã xóa file "' + fileName + '"!');
      if (previewMedia?.id === id) {
        setPreviewMedia(null);
      }
    }
  };

  const handleCopyLink = (url: string) => {
    navigator.clipboard.writeText(url);
    toast.success('📋 Đã sao chép đường dẫn Media!');
  };

  const handleSendToUpload = (item: UploadedMediaItem) => {
    const query = new URLSearchParams({
      mediaUrl: item.mediaUrl,
      mediaType: item.mediaType,
      title: '[Tải lên] ' + item.fileName,
    });
    router.push('/dashboard/upload?' + query.toString());
  };

  const filteredList = mediaList.filter((item) => {
    const matchesType = filterType === 'ALL' || item.mediaType === filterType;
    const matchesSearch = item.fileName.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesType && matchesSearch;
  });

  const imageCount = mediaList.filter((m) => m.mediaType === 'IMAGE').length;
  const videoCount = mediaList.filter((m) => m.mediaType === 'VIDEO').length;

  return (
    <div className="space-y-6 pb-12">
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*,video/*"
        className="hidden"
        onChange={handleFileUpload}
      />

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2 border-b border-white/[0.06]">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-[11px] font-mono font-semibold text-violet-400 uppercase tracking-wider">
              <Film className="h-3 w-3" />
              Kho Media Cá Nhân
            </span>
          </div>
          <h1 className="text-[22px] font-extrabold tracking-tight text-white">Kho Album Media (Up từ máy)</h1>
          <p className="text-sm text-zinc-400 mt-0.5">
            Lưu trữ hình ảnh & video tải lên từ máy tính cá nhân — Sẵn sàng chọn để Đăng Ngay
          </p>
        </div>

        <Button
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="bg-red-600 hover:bg-red-500 text-white font-semibold flex items-center gap-2 shadow-lg shadow-red-600/20 active:scale-[0.98] transition-all"
        >
          <Upload className="h-4 w-4" />
          {isUploading ? 'Đang tải lên...' : 'Tải Ảnh / Video Từ Máy'}
        </Button>
      </div>

      <div
        onClick={() => fileInputRef.current?.click()}
        className="group cursor-pointer rounded-2xl border-2 border-dashed border-white/[0.12] hover:border-red-500/50 bg-[#111117] hover:bg-white/[0.02] p-8 text-center transition-all duration-200"
      >
        <div className="flex flex-col items-center justify-center gap-3">
          <div className="h-14 w-14 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 group-hover:scale-110 transition-transform">
            <FileUp className="h-7 w-7" />
          </div>
          <div>
            <p className="text-base font-bold text-white group-hover:text-red-400 transition-colors">
              Bấm vào đây hoặc kéo thả Ảnh / Video từ máy tính của bạn
            </p>
            <p className="text-xs text-zinc-500 mt-1 font-mono">
              Hỗ trợ JPG, PNG, WEBP, GIF, MP4, MOV, WEBM · Tối đa 50 file lưu kho an toàn
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 p-1 bg-[#111117] border border-white/[0.06] rounded-xl">
          <button
            onClick={() => setFilterType('ALL')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              filterType === 'ALL'
                ? 'bg-red-600 text-white shadow-sm'
                : 'text-zinc-400 hover:text-white hover:bg-white/[0.04]'
            }`}
          >
            Tất cả ({mediaList.length})
          </button>
          <button
            onClick={() => setFilterType('IMAGE')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
              filterType === 'IMAGE'
                ? 'bg-red-600 text-white shadow-sm'
                : 'text-zinc-400 hover:text-white hover:bg-white/[0.04]'
            }`}
          >
            <ImageIcon className="h-3.5 w-3.5" />
            Hình Ảnh ({imageCount})
          </button>
          <button
            onClick={() => setFilterType('VIDEO')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
              filterType === 'VIDEO'
                ? 'bg-red-600 text-white shadow-sm'
                : 'text-zinc-400 hover:text-white hover:bg-white/[0.04]'
            }`}
          >
            <Video className="h-3.5 w-3.5" />
            Video ({videoCount})
          </button>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm theo tên file..."
            className="w-full pl-9 pr-3 py-1.5 bg-[#111117] border border-white/[0.06] rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-red-500 transition-colors"
          />
        </div>
      </div>

      {filteredList.length === 0 ? (
        <div className="rounded-2xl border border-white/[0.06] bg-[#111117] p-12 text-center">
          <ImageIcon className="h-10 w-10 text-zinc-600 mx-auto mb-3" />
          <p className="text-sm font-semibold text-zinc-300">Chưa có media nào trong danh sách</p>
          <p className="text-xs text-zinc-500 mt-1">Hãy bấm nút "Tải Ảnh / Video Từ Máy" ở trên để lưu vào kho!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredList.map((item) => (
            <div
              key={item.id}
              className="group relative rounded-xl border border-white/[0.06] bg-[#111117] overflow-hidden hover:border-white/[0.15] transition-all flex flex-col justify-between"
            >
              <div
                className="relative aspect-video bg-black/40 overflow-hidden cursor-pointer"
                onClick={() => setPreviewMedia(item)}
              >
                {item.mediaType === 'VIDEO' ? (
                  <div className="relative w-full h-full flex items-center justify-center bg-zinc-950">
                    <video
                      src={item.mediaUrl}
                      className="w-full h-full object-cover opacity-80 group-hover:scale-105 transition-transform duration-300"
                      muted
                      playsInline
                    />
                    <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                      <div className="h-10 w-10 rounded-full bg-red-600/90 text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                        <Play className="h-5 w-5 fill-white ml-0.5" />
                      </div>
                    </div>
                  </div>
                ) : (
                  <img
                    src={item.mediaUrl}
                    alt={item.fileName}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                )}

                <div className="absolute top-2 left-2 z-10">
                  <Badge
                    variant={item.mediaType === 'VIDEO' ? 'danger' : 'secondary'}
                    className="text-[10px] font-mono px-2 py-0.5 flex items-center gap-1 shadow-md"
                  >
                    {item.mediaType === 'VIDEO' ? <Video className="h-3 w-3" /> : <ImageIcon className="h-3 w-3" />}
                    {item.mediaType}
                  </Badge>
                </div>

                <div className="absolute bottom-2 right-2 z-10 bg-black/70 backdrop-blur-md px-2 py-0.5 rounded text-[10px] font-mono text-zinc-300">
                  {item.fileSizeStr}
                </div>
              </div>

              <div className="p-3.5 space-y-3">
                <div>
                  <p className="text-xs font-bold text-white truncate" title={item.fileName}>
                    {item.fileName}
                  </p>
                  <p className="text-[11px] text-zinc-500 mt-0.5">
                    {formatRelativeTime(item.uploadedAt)}
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-1.5 pt-1 border-t border-white/[0.04]">
                  <Button
                    onClick={() => handleSendToUpload(item)}
                    size="sm"
                    className="col-span-2 bg-red-600 hover:bg-red-500 text-white text-[11px] font-semibold py-1 h-8 flex items-center justify-center gap-1"
                  >
                    <Send className="h-3 w-3" />
                    Đăng Ngay
                  </Button>

                  <Button
                    onClick={() => handleDeleteMedia(item.id, item.fileName)}
                    size="sm"
                    variant="ghost"
                    className="text-zinc-400 hover:text-red-400 hover:bg-red-500/10 py-1 h-8 flex items-center justify-center"
                    title="Xóa media"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {previewMedia && (
        <Modal
          isOpen={!!previewMedia}
          onClose={() => setPreviewMedia(null)}
          title={'Chi tiết Media: ' + previewMedia.fileName}
        >
          <div className="space-y-4">
            <div className="rounded-xl overflow-hidden bg-black flex items-center justify-center max-h-[450px]">
              {previewMedia.mediaType === 'VIDEO' ? (
                <video src={previewMedia.mediaUrl} controls autoPlay className="max-h-[450px] w-full" />
              ) : (
                <img src={previewMedia.mediaUrl} alt={previewMedia.fileName} className="max-h-[450px] object-contain" />
              )}
            </div>

            <div className="flex items-center justify-between text-xs text-zinc-400 border-t border-white/[0.06] pt-3">
              <div>
                <p className="font-semibold text-white">{previewMedia.fileName}</p>
                <p className="text-[11px] text-zinc-500 mt-0.5">Dung lượng: {previewMedia.fileSizeStr}</p>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  onClick={() => handleCopyLink(previewMedia.mediaUrl)}
                  variant="ghost"
                  size="sm"
                  className="text-xs flex items-center gap-1.5"
                >
                  <Copy className="h-3.5 w-3.5" />
                  Copy Link
                </Button>
                <Button
                  onClick={() => handleSendToUpload(previewMedia)}
                  size="sm"
                  className="bg-red-600 hover:bg-red-500 text-white text-xs font-semibold flex items-center gap-1.5"
                >
                  <Send className="h-3.5 w-3.5" />
                  Chuyển Sang Đăng Ngay
                </Button>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
