'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table';
import { Modal } from '@/components/ui/Modal';
import { templatesApi } from '@/lib/api';
import { CaptionTemplate, CommentTemplate } from '@/types';
import { Plus, Edit, Trash2, Copy, FileText } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Textarea } from '@/components/ui/Textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';

const templateSchema = z.object({
  name: z.string().min(1, 'Tên template là bắt buộc'),
  content: z.string().min(1, 'Nội dung là bắt buộc'),
  isDefault: z.boolean().default(false),
});

type TemplateForm = z.infer<typeof templateSchema>;

export default function TemplatesPage() {
  const [captions, setCaptions] = useState<CaptionTemplate[]>([]);
  const [comments, setComments] = useState<CommentTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<CaptionTemplate | CommentTemplate | null>(null);
  const [templateType, setTemplateType] = useState<string>('caption');

  const form = useForm<TemplateForm>({
    resolver: zodResolver(templateSchema),
    defaultValues: { name: '', content: '', isDefault: false },
  });

  const fetchTemplates = async () => {
    try {
      const [captionsRes, commentsRes] = await Promise.all([
        templatesApi.listCaptions(),
        templatesApi.listComments(),
      ]);
      setCaptions(captionsRes.data.data);
      setComments(commentsRes.data.data);
    } catch (error) {
      console.error('Failed to fetch templates:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const handleSubmit = async (data: TemplateForm) => {
    try {
      if (templateType === 'caption') {
        if (editingTemplate) {
          await templatesApi.updateCaption(editingTemplate.id, data);
        } else {
          await templatesApi.createCaption(data);
        }
      } else {
        if (editingTemplate) {
          await templatesApi.updateComment(editingTemplate.id, data);
        } else {
          await templatesApi.createComment(data);
        }
      }
      setIsModalOpen(false);
      setEditingTemplate(null);
      form.reset({ isDefault: false });
      fetchTemplates();
    } catch (error) {
      console.error('Failed to save template:', error);
    }
  };

  const handleEdit = (template: CaptionTemplate | CommentTemplate) => {
    setEditingTemplate(template);
    form.reset({ name: template.name, content: template.content, isDefault: template.isDefault });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string, type: 'caption' | 'comment') => {
    if (!confirm('Bạn có chắc chắn muốn xóa template này?')) return;
    try {
      if (type === 'caption') {
        await templatesApi.deleteCaption(id);
      } else {
        await templatesApi.deleteComment(id);
      }
      fetchTemplates();
    } catch (error) {
      console.error('Failed to delete template:', error);
    }
  };

  const handleCopy = async (id: string, type: 'caption' | 'comment') => {
    try {
      const variables = {
        product_name: 'Tên sản phẩm mẫu',
        price: '299.000đ',
        affiliate_url: 'https://affiliate.link',
      };
      const res = await templatesApi.renderCaption(id, variables);
      navigator.clipboard.writeText(res.data.data);
      alert('Đã copy nội dung đã render!');
    } catch (error) {
      console.error('Failed to copy template:', error);
    }
  };

  const openModal = (type: 'caption' | 'comment') => {
    setTemplateType(type);
    setEditingTemplate(null);
    form.reset({ isDefault: false });
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Template Caption & Comment</h1>
          <p className="text-gray-500">Tạo mẫu nội dung tự động cho bài đăng</p>
        </div>
        <div className="flex space-x-2">
          <Button onClick={() => openModal('caption')}>
            <Plus className="h-4 w-4 mr-2" />
            Caption
          </Button>
          <Button variant="outline" onClick={() => openModal('comment')}>
            <Plus className="h-4 w-4 mr-2" />
            Comment
          </Button>
        </div>
      </div>

      <Tabs defaultValue="caption" onValueChange={setTemplateType}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="caption">Caption ({captions.length})</TabsTrigger>
          <TabsTrigger value="comment">Comment ({comments.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="caption">
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tên</TableHead>
                      <TableHead>Nội dung</TableHead>
                      <TableHead>Mặc định</TableHead>
                      <TableHead>Ngày tạo</TableHead>
                      <TableHead className="text-right">Thao tác</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {captions.map((template) => (
                      <TableRow key={template.id}>
                        <TableCell className="font-medium">{template.name}</TableCell>
                        <TableCell className="max-w-md">
                          <p className="text-sm text-gray-500 line-clamp-2">{template.content}</p>
                        </TableCell>
                        <TableCell>
                          {template.isDefault && <Badge variant="success">Mặc định</Badge>}
                        </TableCell>
                        <TableCell>{formatRelativeTime(template.createdAt)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end space-x-2">
                            <Button variant="ghost" size="sm" onClick={() => handleCopy(template.id, 'caption')}>
                              <Copy className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleEdit(template)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleDelete(template.id, 'caption')}>
                              <Trash2 className="h-4 w-4 text-red-600" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {captions.length === 0 && (
                <div className="p-12 text-center text-gray-500">
                  <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>Chưa có template caption nào</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="comment">
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tên</TableHead>
                      <TableHead>Nội dung</TableHead>
                      <TableHead>Mặc định</TableHead>
                      <TableHead>Ngày tạo</TableHead>
                      <TableHead className="text-right">Thao tác</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {comments.map((template) => (
                      <TableRow key={template.id}>
                        <TableCell className="font-medium">{template.name}</TableCell>
                        <TableCell className="max-w-md">
                          <p className="text-sm text-gray-500 line-clamp-2">{template.content}</p>
                        </TableCell>
                        <TableCell>
                          {template.isDefault && <Badge variant="success">Mặc định</Badge>}
                        </TableCell>
                        <TableCell>{formatRelativeTime(template.createdAt)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end space-x-2">
                            <Button variant="ghost" size="sm" onClick={() => handleCopy(template.id, 'comment')}>
                              <Copy className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleEdit(template)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleDelete(template.id, 'comment')}>
                              <Trash2 className="h-4 w-4 text-red-600" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {comments.length === 0 && (
                <div className="p-12 text-center text-gray-500">
                  <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>Chưa có template comment nào</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Modal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); setEditingTemplate(null); form.reset({ isDefault: false }); }} title={`${templateType === 'caption' ? 'Caption' : 'Comment'} ${editingTemplate ? 'Chỉnh sửa' : 'Tạo mới'}`}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          <Input label="Tên template" {...form.register('name')} placeholder="Template mặc định" error={form.formState.errors.name?.message} />
          <Textarea label="Nội dung" {...form.register('content')} placeholder="Sử dụng {product_name}, {price}, {affiliate_url}..." rows={6} error={form.formState.errors.content?.message} />
          <p className="text-sm text-gray-500">
            Biến có sẵn: <code className="bg-gray-100 px-1 rounded">{templateType === 'caption' ? '{product_name}, {price}, {affiliate_url}' : '{affiliate_url}'}</code>
          </p>
          <div className="flex items-center space-x-2">
            <input type="checkbox" id="isDefault" {...form.register('isDefault')} className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
            <label htmlFor="isDefault" className="text-sm text-gray-700">Đặt làm mặc định</label>
          </div>
          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={() => { setIsModalOpen(false); setEditingTemplate(null); }}>Hủy</Button>
            <Button type="submit">Lưu</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

import { formatRelativeTime } from '@/lib/utils';