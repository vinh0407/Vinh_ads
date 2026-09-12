'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table';
import { Modal } from '@/components/ui/Modal';
import { sourcesApi } from '@/lib/api';
import { SourcePage, SourceStatus } from '@/types';
import { formatRelativeTime, getSourceStatusColor } from '@/lib/utils';
import { Plus, RefreshCw, Edit, Trash2, ExternalLink, Wifi, WifiOff } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const sourceSchema = z.object({
  platform: z.enum(['FACEBOOK', 'YOUTUBE', 'TIKTOK', 'INSTAGRAM']),
  platformPageId: z.string().min(1, 'ID Page là bắt buộc'),
  pageName: z.string().min(1, 'Tên Page là bắt buộc'),
  pageUrl: z.string().url('URL không hợp lệ'),
  avatarUrl: z.string().url().optional().or(z.literal('')),
  syncEnabled: z.boolean().default(true),
  syncInterval: z.number().min(60).max(86400).default(1800),
});

type SourceForm = z.infer<typeof sourceSchema>;

export default function SourcesPage() {
  const [sources, setSources] = useState<SourcePage[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSource, setEditingSource] = useState<SourcePage | null>(null);
  const [syncingId, setSyncingId] = useState<string | null>(null);

  const form = useForm<SourceForm>({
    resolver: zodResolver(sourceSchema),
    defaultValues: {
      platform: 'FACEBOOK',
      syncEnabled: true,
      syncInterval: 1800,
    },
  });

  const fetchSources = async () => {
    try {
      const res = await sourcesApi.list();
      setSources(res.data.data);
    } catch (error) {
      console.error('Failed to fetch sources:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSources();
  }, []);

  const handleSubmit = async (data: SourceForm) => {
    try {
      if (editingSource) {
        await sourcesApi.update(editingSource.id, data);
      } else {
        await sourcesApi.create(data);
      }
      setIsModalOpen(false);
      setEditingSource(null);
      form.reset({ platform: 'FACEBOOK', syncEnabled: true, syncInterval: 1800 });
      fetchSources();
    } catch (error) {
      console.error('Failed to save source:', error);
    }
  };

  const handleEdit = (source: SourcePage) => {
    setEditingSource(source);
    form.reset({
      platform: source.platform,
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
    if (!confirm('Bạn có chắc chắn muốn xóa nguồn này?')) return;
    try {
      await sourcesApi.delete(id);
      fetchSources();
    } catch (error) {
      console.error('Failed to delete source:', error);
    }
  };

  const handleSync = async (id: string) => {
    setSyncingId(id);
    try {
      await sourcesApi.sync(id);
      fetchSources();
    } catch (error) {
      console.error('Failed to sync source:', error);
    } finally {
      setSyncingId(null);
    }
  };

  const handleToggle = async (source: SourcePage) => {
    try {
      await sourcesApi.toggle(source.id);
      fetchSources();
    } catch (error) {
      console.error('Failed to toggle source:', error);
    }
  };

  const openModal = () => {
    setEditingSource(null);
    form.reset({ platform: 'FACEBOOK', syncEnabled: true, syncInterval: 1800 });
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Nguồn Video</h1>
          <p className="text-gray-500">Quản lý các nguồn nội dung được phép sử dụng</p>
        </div>
        <Button onClick={openModal}>
          <Plus className="h-4 w-4 mr-2" />
          Thêm nguồn
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Page</TableHead>
                  <TableHead>Platform</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead>Sync</TableHead>
                  <TableHead>Lần sync cuối</TableHead>
                  <TableHead className="text-right">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sources.map((source) => (
                  <TableRow key={source.id}>
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden">
                          {source.avatarUrl ? (
                            <img src={source.avatarUrl} alt={source.pageName} className="h-full w-full object-cover" />
                          ) : (
                            <span className="text-gray-500 font-medium">
                              {source.pageName.charAt(0).toUpperCase()}
                            </span>
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{source.pageName}</p>
                          <p className="text-sm text-gray-500">{source.platformPageId}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="info">{source.platform}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={getSourceStatusColor(source.status)}>
                        {source.status === 'ACTIVE' ? 'Hoạt động' : source.status === 'INACTIVE' ? 'Tạm dừng' : 'Lỗi'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Badge variant={source.syncEnabled ? 'success' : 'secondary'}>
                          {source.syncEnabled ? 'Bật' : 'Tắt'}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggle(source)}
                          disabled={syncingId === source.id}
                        >
                          {syncingId === source.id ? (
                            <RefreshCw className="h-4 w-4 animate-spin" />
                          ) : (
                            <RefreshCw className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>
                      {source.lastSyncedAt ? formatRelativeTime(source.lastSyncedAt) : 'Chưa sync'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <Button variant="ghost" size="sm" onClick={() => handleEdit(source)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(source.id)}>
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                        <a href={source.pageUrl} target="_blank" rel="noopener noreferrer">
                          <Button variant="ghost" size="sm">
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        </a>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Modal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); setEditingSource(null); form.reset({ platform: 'FACEBOOK', syncEnabled: true, syncInterval: 1800 }); }} title={editingSource ? 'Chỉnh sửa nguồn' : 'Thêm nguồn mới'}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Select
              label="Platform"
              {...form.register('platform')}
              options={[
                { value: 'FACEBOOK', label: 'Facebook' },
                { value: 'YOUTUBE', label: 'YouTube' },
                { value: 'TIKTOK', label: 'TikTok' },
                { value: 'INSTAGRAM', label: 'Instagram' },
              ]}
              placeholder="Chọn platform"
            />
            <Input label="Page ID" {...form.register('platformPageId')} placeholder="123456789" error={form.formState.errors.platformPageId?.message} />
            <Input label="Tên Page" {...form.register('pageName')} placeholder="Tech News" error={form.formState.errors.pageName?.message} />
            <Input label="URL Page" type="url" {...form.register('pageUrl')} placeholder="https://facebook.com/technews" error={form.formState.errors.pageUrl?.message} />
            <Input label="Avatar URL (tùy chọn)" type="url" {...form.register('avatarUrl')} placeholder="https://example.com/avatar.jpg" />
            <Input label="Khoảng cách sync (giây)" type="number" {...form.register('syncInterval', { valueAsNumber: true })} placeholder="1800" error={form.formState.errors.syncInterval?.message} />
          </div>
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="syncEnabled"
              {...form.register('syncEnabled')}
              className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            <label htmlFor="syncEnabled" className="text-sm text-gray-700">Bật tự động sync</label>
          </div>
          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={() => { setIsModalOpen(false); setEditingSource(null); }}>Hủy</Button>
            <Button type="submit">{editingSource ? 'Cập nhật' : 'Tạo mới'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}