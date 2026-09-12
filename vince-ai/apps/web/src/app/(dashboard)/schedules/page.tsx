'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table';
import { Modal } from '@/components/ui/Modal';
import { schedulesApi, postsApi } from '@/lib/api';
import { Schedule, Post, PostStatus } from '@/types';
import { formatRelativeTime } from '@/lib/utils';
import { Plus, Edit, Trash2, Calendar, Clock, X, Check } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const scheduleSchema = z.object({
  postId: z.string().min(1, 'Bài đăng là bắt buộc'),
  scheduledAt: z.string().min(1, 'Thời gian đăng là bắt buộc'),
});

type ScheduleForm = z.infer<typeof scheduleSchema>;

export default function SchedulesPage() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);

  const form = useForm<ScheduleForm>({
    resolver: zodResolver(scheduleSchema),
    defaultValues: { postId: '', scheduledAt: '' },
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [schedulesRes, postsRes] = await Promise.all([
        schedulesApi.list(),
        postsApi.list({ status: 'DRAFT', limit: 100 }),
      ]);
      setSchedules(schedulesRes.data.data);
      setPosts(postsRes.data.data.items);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSubmit = async (data: ScheduleForm) => {
    try {
      if (editingSchedule) {
        await schedulesApi.update(editingSchedule.id, data.scheduledAt);
      } else {
        await schedulesApi.create(data);
      }
      setIsModalOpen(false);
      setEditingSchedule(null);
      form.reset();
      fetchData();
    } catch (error) {
      console.error('Failed to save schedule:', error);
    }
  };

  const handleEdit = (schedule: Schedule) => {
    setEditingSchedule(schedule);
    form.reset({
      postId: schedule.postId,
      scheduledAt: new Date(schedule.scheduledAt).toISOString().slice(0, 16),
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa lịch đăng này?')) return;
    try {
      await schedulesApi.delete(id);
      fetchData();
    } catch (error) {
      console.error('Failed to delete schedule:', error);
    }
  };

  const openModal = () => {
    setEditingSchedule(null);
    form.reset();
    setIsModalOpen(true);
  };

  const getStatusBadge = (status: string, postStatus?: string) => {
    if (postStatus === 'PUBLISHED') return <Badge variant="success">Đã đăng</Badge>;
    if (postStatus === 'CANCELLED') return <Badge variant="secondary">Đã hủy</Badge>;
    if (postStatus === 'FAILED') return <Badge variant="danger">Lỗi</Badge>;
    switch (status) {
      case 'PENDING': return <Badge variant="default">Chờ</Badge>;
      case 'PROCESSING': return <Badge variant="info">Đang xử lý</Badge>;
      case 'COMPLETED': return <Badge variant="success">Hoàn thành</Badge>;
      case 'FAILED': return <Badge variant="danger">Lỗi</Badge>;
      default: return <Badge variant="default">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Lịch đăng bài</h1>
          <p className="text-gray-500">Quản lý lịch đăng tự động</p>
        </div>
        <Button onClick={openModal}>
          <Plus className="h-4 w-4 mr-2" />
          Tạo lịch mới
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Bài đăng</TableHead>
                  <TableHead>Thời gian đăng</TableHead>
                  <TableHead>Trạng thái lịch</TableHead>
                  <TableHead>Trạng thái bài</TableHead>
                  <TableHead className="text-right">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {schedules.map((schedule) => (
                  <TableRow key={schedule.id}>
                    <TableCell>
                      <p className="font-medium text-gray-900 max-w-xs truncate">{schedule.post?.caption || 'N/A'}</p>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        <span>{formatRelativeTime(schedule.scheduledAt)}</span>
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(schedule.status)}</TableCell>
                    <TableCell>
                      <Badge className={getPostStatusColor(schedule.post?.status || 'DRAFT')}>
                        {schedule.post?.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <Button variant="ghost" size="sm" onClick={() => handleEdit(schedule)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(schedule.id)}>
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {schedules.length === 0 && (
            <div className="p-12 text-center text-gray-500">
              <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>Chưa có lịch đăng nào</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Modal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); setEditingSchedule(null); form.reset(); }} title={editingSchedule ? 'Chỉnh sửa lịch' : 'Tạo lịch đăng mới'}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          <Select
            label="Bài đăng"
            value={form.watch('postId')}
            onChange={(e) => form.setValue('postId', e.target.value)}
            options={posts.map(p => ({ value: p.id, label: p.caption.slice(0, 50) + '...' }))}
            placeholder="Chọn bài đăng"
            error={form.formState.errors.postId?.message}
          />
          <Input
            label="Thời gian đăng"
            type="datetime-local"
            {...form.register('scheduledAt')}
            error={form.formState.errors.scheduledAt?.message}
          />
          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={() => { setIsModalOpen(false); setEditingSchedule(null); }}>Hủy</Button>
            <Button type="submit">{editingSchedule ? 'Cập nhật' : 'Tạo lịch'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}