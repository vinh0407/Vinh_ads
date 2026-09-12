'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table';
import { Modal } from '@/components/ui/Modal';
import { videosApi } from '@/lib/api';
import { Video, VideoStatus } from '@/types';
import { formatRelativeTime, getVideoStatusColor, formatNumber } from '@/lib/utils';
import { Search, Filter, Upload, Eye, Archive, Trash2, Download } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { cn } from '@/lib/utils';
import { Textarea } from '@/components/ui/Textarea';

const videoSchema = z.object({
  title: z.string().min(1, 'Tiêu đề là bắt buộc'),
  description: z.string().optional(),
  sourceVideoId: z.string().optional(),
});

type VideoForm = z.infer<typeof videoSchema>;

export default function VideosPage() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({ status: '', search: '', sourceId: '' });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVideo, setEditingVideo] = useState<Video | null>(null);

  const form = useForm<VideoForm>({
    resolver: zodResolver(videoSchema),
    defaultValues: { title: '', description: '' },
  });

  const fetchVideos = async () => {
    setLoading(true);
    try {
      const res = await videosApi.list({ page, limit: 20, status: filters.status, sourceId: filters.sourceId });
      setVideos(res.data.data.items);
      setTotal(res.data.data.total);
    } catch (error) {
      console.error('Failed to fetch videos:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVideos();
  }, [page, filters.status, filters.sourceId]);

  const handleSubmit = async (data: VideoForm) => {
    try {
      if (editingVideo) {
        await videosApi.update(editingVideo.id, data);
      } else {
        await videosApi.create(data);
      }
      setIsModalOpen(false);
      setEditingVideo(null);
      form.reset();
      fetchVideos();
    } catch (error) {
      console.error('Failed to save video:', error);
    }
  };

  const handleEdit = (video: Video) => {
    setEditingVideo(video);
    form.reset({ title: video.title, description: video.description || '' });
    setIsModalOpen(true);
  };

  const handleArchive = async (id: string) => {
    if (!confirm('Bạn có chắc chắn muốn lưu trữ video này?')) return;
    try {
      await videosApi.archive(id);
      fetchVideos();
    } catch (error) {
      console.error('Failed to archive video:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa video này?')) return;
    try {
      await videosApi.delete(id);
      fetchVideos();
    } catch (error) {
      console.error('Failed to delete video:', error);
    }
  };

  const openModal = () => {
    setEditingVideo(null);
    form.reset();
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Thư viện Video</h1>
          <p className="text-gray-500">Quản lý các video đã import và sẵn sàng đăng</p>
        </div>
        <Button onClick={openModal}>
          <Upload className="h-4 w-4 mr-2" />
          Upload video
        </Button>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Tìm kiếm video..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                className="pl-10"
              />
            </div>
            <Select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              options={[
                { value: '', label: 'Tất cả trạng thái' },
                { value: 'DISCOVERED', label: 'Đã phát hiện' },
                { value: 'IMPORTING', label: 'Đang import' },
                { value: 'PROCESSING', label: 'Đang xử lý' },
                { value: 'READY', label: 'Sẵn sàng' },
                { value: 'SCHEDULED', label: 'Đã lên lịch' },
                { value: 'PUBLISHING', label: 'Đang đăng' },
                { value: 'PUBLISHED', label: 'Đã đăng' },
                { value: 'FAILED', label: 'Lỗi' },
                { value: 'ARCHIVED', label: 'Đã lưu trữ' },
              ]}
              placeholder="Lọc theo trạng thái"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Thumbnail</TableHead>
                  <TableHead>Tiêu đề</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead>Thời lượng</TableHead>
                  <TableHead>Kích thước</TableHead>
                  <TableHead>Ngày tạo</TableHead>
                  <TableHead className="text-right">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {videos.map((video) => (
                  <TableRow key={video.id}>
                    <TableCell>
                      {video.thumbnailUrl ? (
                        <img src={video.thumbnailUrl} alt={video.title} className="h-16 w-16 rounded object-cover" />
                      ) : (
                        <div className="h-16 w-16 rounded bg-gray-100 flex items-center justify-center">
                          <Video className="h-8 w-8 text-gray-400" />
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <p className="font-medium text-gray-900 max-w-xs truncate">{video.title}</p>
                      {video.description && <p className="text-sm text-gray-500 line-clamp-1">{video.description}</p>}
                    </TableCell>
                    <TableCell>
                      <Badge className={getVideoStatusColor(video.status)}>
                        {video.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{video.duration ? `${Math.floor(video.duration / 60)}:${String(video.duration % 60).padStart(2, '0')}` : '-'}</TableCell>
                    <TableCell>{video.fileSize ? formatNumber(video.fileSize) + ' bytes' : '-'}</TableCell>
                    <TableCell>{formatRelativeTime(video.createdAt)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <Button variant="ghost" size="sm" onClick={() => handleEdit(video)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        {video.status === 'READY' && (
                          <Button variant="ghost" size="sm" onClick={() => handleArchive(video.id)}>
                            <Archive className="h-4 w-4" />
                          </Button>
                        )}
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(video.id)}>
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {videos.length === 0 && (
            <div className="p-12 text-center text-gray-500">
              <Video className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>Chưa có video nào</p>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">Tổng cộng: {total} video</p>
        <div className="flex space-x-2">
          <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
            Trước
          </Button>
          <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={page * 20 >= total}>
            Sau
          </Button>
        </div>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); setEditingVideo(null); form.reset(); }} title={editingVideo ? 'Chỉnh sửa video' : 'Thêm video mới'}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          <Input label="Tiêu đề" {...form.register('title')} placeholder="Tiêu đề video" error={form.formState.errors.title?.message} />
          <Textarea label="Mô tả" {...form.register('description')} placeholder="Mô tả video" rows={3} />
          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={() => { setIsModalOpen(false); setEditingVideo(null); }}>Hủy</Button>
            <Button type="submit">{editingVideo ? 'Cập nhật' : 'Tạo mới'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}