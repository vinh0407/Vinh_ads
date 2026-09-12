'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table';
import { Modal } from '@/components/ui/Modal';
import { productsApi } from '@/lib/api';
import { Product } from '@/types';
import { formatCurrency, formatRelativeTime } from '@/lib/utils';
import { Plus, Edit, Trash2, Link2, Package } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Textarea } from '@/components/ui/Textarea';

const productSchema = z.object({
  name: z.string().min(1, 'Tên sản phẩm là bắt buộc'),
  description: z.string().optional(),
  shopeeUrl: z.string().url('URL Shopee không hợp lệ'),
  imageUrl: z.string().url().optional().or(z.literal('')),
  price: z.number().min(0, 'Giá phải lớn hơn 0'),
  currency: z.string().default('VND'),
  category: z.string().optional(),
});

type ProductForm = z.infer<typeof productSchema>;

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [showAffiliateModal, setShowAffiliateModal] = useState<Product | null>(null);
  const [affiliateNetwork, setAffiliateNetwork] = useState('SHOPEE');
  const [affiliateOriginalUrl, setAffiliateOriginalUrl] = useState('');
  const [affiliateUrl, setAffiliateUrl] = useState('');

  const form = useForm<ProductForm>({
    resolver: zodResolver(productSchema),
    defaultValues: { name: '', price: 0, currency: 'VND', shopeeUrl: '' },
  });

  const fetchProducts = async () => {
    try {
      const res = await productsApi.list();
      setProducts(res.data.data);
    } catch (error) {
      console.error('Failed to fetch products:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleSubmit = async (data: ProductForm) => {
    try {
      if (editingProduct) {
        await productsApi.update(editingProduct.id, data);
      } else {
        await productsApi.create(data);
      }
      setIsModalOpen(false);
      setEditingProduct(null);
      form.reset({ currency: 'VND' });
      fetchProducts();
    } catch (error) {
      console.error('Failed to save product:', error);
    }
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    form.reset({
      name: product.name,
      description: product.description || '',
      shopeeUrl: product.shopeeUrl,
      imageUrl: product.imageUrl || '',
      price: product.price,
      currency: product.currency,
      category: product.category || '',
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa sản phẩm này?')) return;
    try {
      await productsApi.delete(id);
      fetchProducts();
    } catch (error) {
      console.error('Failed to delete product:', error);
    }
  };

  const handleAddAffiliate = async (product: Product) => {
    setShowAffiliateModal(product);
    setAffiliateOriginalUrl(product.shopeeUrl);
  };

  const handleSaveAffiliate = async () => {
    if (!showAffiliateModal) return;
    try {
      await productsApi.addAffiliateLink(showAffiliateModal.id, { network: affiliateNetwork as any, originalUrl: affiliateOriginalUrl, affiliateUrl });
      setShowAffiliateModal(null);
      setAffiliateOriginalUrl('');
      setAffiliateUrl('');
      fetchProducts();
    } catch (error) {
      console.error('Failed to add affiliate link:', error);
    }
  };

  const openModal = () => {
    setEditingProduct(null);
    form.reset({ currency: 'VND' });
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sản phẩm Shopee</h1>
          <p className="text-gray-500">Quản lý sản phẩm và link affiliate</p>
        </div>
        <Button onClick={openModal}>
          <Plus className="h-4 w-4 mr-2" />
          Thêm sản phẩm
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Hình ảnh</TableHead>
                  <TableHead>Tên sản phẩm</TableHead>
                  <TableHead>Giá</TableHead>
                  <TableHead>Danh mục</TableHead>
                  <TableHead>Affiliate Links</TableHead>
                  <TableHead className="text-right">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell>
                      {product.imageUrl ? (
                        <img src={product.imageUrl} alt={product.name} className="h-16 w-16 rounded object-cover" />
                      ) : (
                        <div className="h-16 w-16 rounded bg-gray-100 flex items-center justify-center">
                          <Package className="h-8 w-8 text-gray-400" />
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <p className="font-medium text-gray-900">{product.name}</p>
                      {product.description && <p className="text-sm text-gray-500 line-clamp-1">{product.description}</p>}
                    </TableCell>
                    <TableCell>{formatCurrency(product.price, product.currency)}</TableCell>
                    <TableCell>{product.category || '-'}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {product.affiliateLinks.map((link) => (
                          <Badge key={link.id} variant="info" className="text-xs">
                            {link.network}: {link.clickCount} clicks
                          </Badge>
                        ))}
                        {product.affiliateLinks.length === 0 && <span className="text-gray-400 text-sm">Chưa có link</span>}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <Button variant="ghost" size="sm" onClick={() => handleEdit(product)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleAddAffiliate(product)}>
                          <Link2 className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(product.id)}>
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Modal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); setEditingProduct(null); form.reset({ currency: 'VND' }); }} title={editingProduct ? 'Chỉnh sửa sản phẩm' : 'Thêm sản phẩm mới'}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Input label="Tên sản phẩm" {...form.register('name')} placeholder="Tai nghe Bluetooth XYZ" error={form.formState.errors.name?.message} />
            <Input label="URL Shopee" type="url" {...form.register('shopeeUrl')} placeholder="https://shopee.vn/product/123" error={form.formState.errors.shopeeUrl?.message} />
            <Input label="Hình ảnh URL" type="url" {...form.register('imageUrl')} placeholder="https://example.com/image.jpg" />
            <Input label="Giá" type="number" {...form.register('price', { valueAsNumber: true })} placeholder="299000" error={form.formState.errors.price?.message} />
            <Input label="Tiền tệ" {...form.register('currency')} placeholder="VND" />
            <Input label="Danh mục" {...form.register('category')} placeholder="Điện tử" />
          </div>
          <Textarea label="Mô tả" {...form.register('description')} placeholder="Mô tả sản phẩm" rows={3} />
          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={() => { setIsModalOpen(false); setEditingProduct(null); }}>Hủy</Button>
            <Button type="submit">{editingProduct ? 'Cập nhật' : 'Tạo mới'}</Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={!!showAffiliateModal} onClose={() => setShowAffiliateModal(null)} title={`Thêm link Affiliate: ${showAffiliateModal?.name}`}>
        <div className="space-y-4">
          <Select
            label="Mạng lưới"
            value={affiliateNetwork}
            onChange={(e) => setAffiliateNetwork(e.target.value)}
            options={[
              { value: 'SHOPEE', label: 'Shopee' },
              { value: 'LAZADA', label: 'Lazada' },
              { value: 'TIKTOK', label: 'TikTok Shop' },
              { value: 'TIKI', label: 'Tiki' },
              { value: 'SENDO', label: 'Sendo' },
            ]}
            placeholder="Chọn mạng lưới"
          />
          <Input label="URL gốc" type="url" value={affiliateOriginalUrl} onChange={(e) => setAffiliateOriginalUrl(e.target.value)} placeholder="https://shopee.vn/product/123" />
          <Input label="Affiliate URL" type="url" value={affiliateUrl} onChange={(e) => setAffiliateUrl(e.target.value)} placeholder="https://shopee.vn/affiliate/xyz" />
          <div className="flex justify-end space-x-2 pt-4">
            <Button variant="outline" onClick={() => setShowAffiliateModal(null)}>Hủy</Button>
            <Button onClick={handleSaveAffiliate}>Lưu</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}