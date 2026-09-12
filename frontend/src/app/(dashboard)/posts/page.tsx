'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table';
import { Modal } from '@/components/ui/Modal';
import { postsApi, videosApi, productsApi, templatesApi, facebookApi } from '@/lib/api';
import { Post, PostStatus, Video, Product, CaptionTemplate, CommentTemplate, FacebookPage } from '@/types';
import { formatRelativeTime, getPostStatusColor } from '@/lib/utils';
import { Plus, Edit, Trash2, Send, Clock, Calendar, X } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Textarea } from '@/components/ui/Textarea';

const postSchema = z.object({
  videoId: z.string().min(1, 'Video là bắt buộc'),
  facebookPageId: z.string().min(1, 'Facebook Page là bắt buộc'),
  caption: z.string().min(1, 'Caption là bắt buộc'),
  firstComment: z.string().optional(),
  productIds: z.array(z.string()).optional(),
  scheduledAt: z.string().optional(),
});

type PostForm = z.infer<typeof postSchema>;

export default function PostsPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [videos, setVideos] = useState<Video[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [captions, setCaptions] = useState<CaptionTemplate[]>([]);
  const [comments, setComments] = useState<CommentTemplate[]>([]);
  const [pages, setPages] = useState<FacebookPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [selectedCaption, setSelectedCaption] = useState<string>('');
  const [selectedComment, setSelectedComment] = useState<string>('');

  const form = useForm<PostForm>({
    resolver: zodResolver(postSchema),
    defaultValues: { caption: '', firstComment: '', productIds: [] },
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [postsRes, videosRes, productsRes, captionsRes, commentsRes, pagesRes] = await Promise.all([
        postsApi.list(),
        videosApi.list({ status: 'READY', limit: 100 }),
        productsApi.list(),
        templatesApi.listCaptions(),
        templatesApi.listComments(),
        facebookApi.getPages(),
      ]);
      setPosts(postsRes.data.data.items);
      setVideos(videosRes.data.data.items);
      setProducts(productsRes.data.data);
      setCaptions(captionsRes.data.data);
      setComments(commentsRes.data.data);
      setPages(pagesRes.data.data);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (selectedCaption) {
      const template = captions.find(c => c.id === selectedCaption);
      if (template) {
        const firstProduct = selectedProducts[0];
        const product = products.find(p => p.id === firstProduct);
        const affiliateLink = product?.affiliateLinks[0]?.affiliateUrl || '';
        const rendered = template.content
          .replace(/{product_name}/g, product?.name || '{product_name}')
          .replace(/{price}/g, product ? `${product.price.toLocaleString()}đ` : '{price}')
          .replace(/{affiliate_url}/g, affiliateLink);
        form.setValue('caption', rendered);
      }
    }
    if (selectedComment) {
      const template = comments.find(c => c.id === selectedComment);
      if (template) {
        const firstProduct = selectedProducts[0];
        const product = products.find(p => p.id === firstProduct);
        const affiliateLink = product?.affiliateLinks[0]?.affiliateUrl || '';
        const rendered = template.content.replace(/{affiliate_url}/g, affiliateLink);
        form.setValue('firstComment', rendered);
      }
    }
  }, [selectedCaption, selectedComment, selectedProducts, captions, comments, products]);

  const handleSubmit = async (data: PostForm) => {
    try {
      if (editingPost) {
        await postsApi.update(editingPost.id, { ...data, productIds: selectedProducts });
      } else {
        await postsApi.create({ ...data, productIds: selectedProducts });
      }
      setIsModalOpen(false);
      setEditingPost(null);
      form.reset({ productIds: [] });
      setSelectedProducts([]);
      setSelectedCaption('');
      setSelectedComment('');
      fetchData();
    } catch (error) {
      console.error('Failed to save post:', error);
    }
  };

  const handleEdit = (post: Post) => {
    setEditingPost(post);
    form.reset({
      videoId: post.videoId,
      facebookPageId: post.facebookPageId,
      caption: post.caption,
      firstComment: post.firstComment || '',
      scheduledAt: post.scheduledAt || '',
    });
    setSelectedProducts(post.postProducts?.map(pp => pp.productId) || []);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa bài đăng này?')) return;
    try {
      await postsApi.delete(id);
      fetchData();
    } catch (error) {
      console.error('Failed to delete post:', error);
    }
  };

  const handlePublish = async (id: string) => {
    try {
      await postsApi.publish(id);
      fetchData();
    } catch (error) {
      console.error('Failed to publish post:', error);
    }
  };

  const handleCancel = async (id: string) => {
    try {
      await postsApi.cancel(id);
      fetchData();
    } catch (error) {
      console.error('Failed to cancel post:', error);
    }
  };

  const openModal = () => {
    setEditingPost(null);
    form.reset({ productIds: [] });
    setSelectedProducts([]);
    setSelectedCaption('');
    setSelectedComment('');
    setIsModalOpen(true);
  };

  const toggleProduct = (productId: string) => {
    setSelectedProducts(prev => prev.includes(productId) ? prev.filter(id => id !== productId) : [...prev, productId]);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tạo bài đăng</h1>
          <p className="text-gray-500">Kết hợp video, sản phẩm, caption để đăng lên Facebook</p>
        </div>
        <Button onClick={openModal}>
          <Plus className="h-4 w-4 mr-2" />
          Tạo bài đăng mới
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Video</TableHead>
                  <TableHead>Caption</TableHead>
                  <TableHead>Sản phẩm</TableHead>
                  <TableHead>Facebook Page</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead>Lịch đăng</TableHead>
                  <TableHead className="text-right">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {posts.map((post) => (
                  <TableRow key={post.id}>
                    <TableCell>
                      {post.video?.thumbnailUrl ? (
                        <img src={post.video.thumbnailUrl} alt={post.video.title} className="h-12 w-12 rounded object-cover" />
                      ) : (
                        <div className="h-12 w-12 rounded bg-gray-100" />
                      )}
                      <p className="text-sm font-medium mt-1 max-w-xs truncate">{post.video?.title}</p>
                    </TableCell>
                    <TableCell className="max-w-md">
                      <p className="text-sm text-gray-600 line-clamp-2">{post.caption}</p>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {post.postProducts?.map(pp => (
                          <Badge key={pp.productId} variant="info" className="text-xs">{pp.product.name}</Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>{post.facebookPage?.pageName}</TableCell>
                    <TableCell>
                      <Badge className={getPostStatusColor(post.status)}>{post.status}</Badge>
                    </TableCell>
                    <TableCell>
                      {post.scheduledAt ? (
                        <span className="flex items-center space-x-1 text-sm text-gray-600">
                          <Clock className="h-4 w-4" />
                          {formatRelativeTime(post.scheduledAt)}
                        </span>
                      ) : (
                        <span className="text-gray-400">Chưa lên lịch</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end space-x-2">
                        {post.status === 'DRAFT' && (
                          <Button variant="ghost" size="sm" onClick={() => handlePublish(post.id)}>
                            <Send className="h-4 w-4 mr-1" /> Đăng ngay
                          </Button>
                        )}
                        {post.status === 'SCHEDULED' && (
                          <Button variant="ghost" size="sm" onClick={() => handleCancel(post.id)}>
                            <X className="h-4 w-4 mr-1" /> Hủy lịch
                          </Button>
                        )}
                        <Button variant="ghost" size="sm" onClick={() => handleEdit(post)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(post.id)}>
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {posts.length === 0 && (
            <div className="p-12 text-center text-gray-500">
              <Send className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>Chưa có bài đăng nào</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Modal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); setEditingPost(null); form.reset({ productIds: [] }); setSelectedProducts([]); setSelectedCaption(''); setSelectedComment(''); }} title={editingPost ? 'Chỉnh sửa bài đăng' : 'Tạo bài đăng mới'} size="lg">
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Select
              label="Video"
              value={form.watch('videoId')}
              onChange={(e) => form.setValue('videoId', e.target.value)}
              options={videos.map(v => ({ value: v.id, label: v.title }))}
              placeholder="Chọn video"
              error={form.formState.errors.videoId?.message}
            />
            <Select
              label="Facebook Page"
              value={form.watch('facebookPageId')}
              onChange={(e) => form.setValue('facebookPageId', e.target.value)}
              options={pages.map(p => ({ value: p.id, label: p.pageName }))}
              placeholder="Chọn Page"
              error={form.formState.errors.facebookPageId?.message}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Chọn sản phẩm</label>
            <div className="border rounded-lg p-3 max-h-48 overflow-y-auto">
              {products.map(product => (
                <label key={product.id} className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedProducts.includes(product.id)}
                    onChange={() => toggleProduct(product.id)}
                    className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="text-sm">{product.name} - {product.price.toLocaleString()}đ</span>
                </label>
              ))}
            </div>
          </div>

          <Select
            label="Template Caption"
            value={selectedCaption}
            onChange={(e) => setSelectedCaption(e.target.value)}
            options={[{ value: '', label: 'Chọn template...' }, ...captions.map(c => ({ value: c.id, label: c.name }))]}
            placeholder="Chọn template caption (tự động fill)"
          />

          <Textarea label="Caption" {...form.register('caption')} placeholder="Caption bài đăng..." rows={4} error={form.formState.errors.caption?.message} />

          <Select
            label="Template Comment"
            value={selectedComment}
            onChange={(e) => setSelectedComment(e.target.value)}
            options={[{ value: '', label: 'Chọn template...' }, ...comments.map(c => ({ value: c.id, label: c.name }))]}
            placeholder="Chọn template comment (tự động fill)"
          />

          <Textarea label="First Comment" {...form.register('firstComment')} placeholder="Comment đầu tiên..." rows={2} />

          <div className="grid gap-4 md:grid-cols-2">
            <Input label="Lên lịch đăng (ISO 8601)" type="datetime-local" {...form.register('scheduledAt')} placeholder="2026-08-18T18:00:00" />
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={() => { setIsModalOpen(false); setEditingPost(null); form.reset({ productIds: [] }); setSelectedProducts([]); }}>Hủy</Button>
            <Button type="submit">{editingPost ? 'Cập nhật' : 'Tạo bài đăng'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}