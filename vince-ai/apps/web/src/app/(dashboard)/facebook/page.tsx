'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { facebookApi } from '@/lib/api';
import { FacebookPage } from '@/types';
import { Facebook, Link2, Shield, AlertCircle, CheckCircle } from 'lucide-react';

export default function FacebookPage() {
  const [pages, setPages] = useState<FacebookPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);

  const fetchPages = async () => {
    try {
      const res = await facebookApi.getPages();
      setPages(res.data.data);
    } catch (error) {
      console.error('Failed to fetch pages:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPages();
  }, []);

  const handleConnect = async () => {
    setConnecting(true);
    try {
      const res = await facebookApi.getConnectUrl();
      window.location.href = res.data.data.url;
    } catch (error) {
      console.error('Failed to get connect URL:', error);
      setConnecting(false);
    }
  };

  const handleDisconnect = async (id: string) => {
    if (!confirm('Bạn có chắc chắn muốn ngắt kết nối Page này?')) return;
    try {
      await facebookApi.disconnectPage(id);
      fetchPages();
    } catch (error) {
      console.error('Failed to disconnect page:', error);
    }
  };

  const handleViewPage = (page: FacebookPage) => {
    window.open(page.pageUrl, '_blank');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Facebook Pages</h1>
          <p className="text-gray-500">Quản lý kết nối Facebook Page để đăng bài</p>
        </div>
        <Button onClick={handleConnect} disabled={connecting}>
          <Facebook className="h-4 w-4 mr-2" />
          {connecting ? 'Đang kết nối...' : 'Kết nối Page mới'}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Các Page đã kết nối</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
            </div>
          ) : pages.length === 0 ? (
            <div className="text-center py-12">
              <Facebook className="h-16 w-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Chưa kết nối Page nào</h3>
              <p className="text-gray-500 mb-6">Kết nối Facebook Page để bắt đầu đăng bài tự động</p>
              <Button onClick={handleConnect}>
                <Facebook className="h-4 w-4 mr-2" />
                Kết nối Page ngay
              </Button>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {pages.map((page) => (
                <div key={page.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-center space-x-4">
                    <div className="h-16 w-16 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden">
                      {page.avatarUrl ? (
                        <img src={page.avatarUrl} alt={page.pageName} className="h-full w-full object-cover" />
                      ) : (
                        <Facebook className="h-8 w-8 text-gray-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-gray-900 truncate">{page.pageName}</h4>
                      <p className="text-sm text-gray-500 truncate">{page.pageId}</p>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Badge variant={page.status === 'ACTIVE' ? 'success' : 'secondary'}>
                        {page.status === 'ACTIVE' ? 'Đã kết nối' : 'Đã ngắt'}
                      </Badge>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button variant="ghost" size="sm" onClick={() => handleViewPage(page)}>
                        <Link2 className="h-4 w-4 mr-1" />
                        Xem
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDisconnect(page.id)}>
                        <AlertCircle className="h-4 w-4 mr-1 text-red-600" />
                        Ngắt kết nối
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Hướng dẫn kết nối</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-start space-x-4 p-4 bg-blue-50 rounded-lg">
              <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                <Shield className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h4 className="font-medium text-gray-900">Quyền cần thiết</h4>
                <p className="text-sm text-gray-500">
                  Ứng dụng cần quyền: pages_show_list, pages_read_engagement, pages_manage_posts, pages_manage_metadata
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-4 p-4 bg-green-50 rounded-lg">
              <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <h4 className="font-medium text-gray-900">Token bảo mật</h4>
                <p className="text-sm text-gray-500">
                  Access token được mã hóa và lưu trữ an toàn. Token sẽ tự động làm mới khi hết hạn.
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-4 p-4 bg-yellow-50 rounded-lg">
              <div className="h-10 w-10 rounded-full bg-yellow-100 flex items-center justify-center flex-shrink-0">
                <AlertCircle className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <h4 className="font-medium text-gray-900">Lưu ý</h4>
                <p className="text-sm text-gray-500">
                  Chỉ kết nối các Page bạn có quyền quản trị. Token hết hạn sau 60 ngày, hệ thống sẽ tự động yêu cầu kết nối lại.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}