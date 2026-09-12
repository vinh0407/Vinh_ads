'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { usersApi, analyticsApi } from '@/lib/api';
import { AnalyticsOverview } from '@/types';
import { formatNumber, formatCurrency, cn } from '@/lib/utils';
import {
  Video,
  Package,
  Send,
  Facebook,
  TrendingUp,
  Eye,
  Heart,
  MessageSquare,
  Share2,
  MousePointerClick,
} from 'lucide-react';

const statCards = [
  { name: 'Tổng Video', icon: Video, color: 'bg-blue-500', key: 'videos' },
  { name: 'Sản phẩm', icon: Package, color: 'bg-green-500', key: 'products' },
  { name: 'Bài đăng', icon: Send, color: 'bg-purple-500', key: 'posts' },
  { name: 'Facebook Pages', icon: Facebook, color: 'bg-blue-600', key: 'pages' },
];

const metricCards = [
  { name: 'Lượt xem', icon: Eye, color: 'text-blue-600', key: 'views' },
  { name: 'Lượt thích', icon: Heart, color: 'text-red-600', key: 'likes' },
  { name: 'Bình luận', icon: MessageSquare, color: 'text-green-600', key: 'comments' },
  { name: 'Chia sẻ', icon: Share2, color: 'text-purple-600', key: 'shares' },
  { name: 'Click Affiliate', icon: MousePointerClick, color: 'text-orange-600', key: 'affiliateClicks' },
];

export default function DashboardPage() {
  const [stats, setStats] = useState<any>({});
  const [analytics, setAnalytics] = useState<AnalyticsOverview | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, analyticsRes] = await Promise.all([
          usersApi.getStats(),
          analyticsApi.overview(),
        ]);
        setStats(statsRes.data.data);
        setAnalytics(analyticsRes.data.data);
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500">Tổng quan hệ thống Auto Content Hub</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <Card key={stat.key}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">{stat.name}</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">
                    {formatNumber(stats[stat.key] || 0)}
                  </p>
                </div>
                <div className={cn('p-3 rounded-full', stat.color)}>
                  <stat.icon className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {analytics && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          {metricCards.map((metric) => (
            <Card key={metric.key}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500">{metric.name}</p>
                    <p className="text-3xl font-bold text-gray-900 mt-1">
                      {formatNumber(analytics.totals[metric.key as keyof typeof analytics.totals] || 0)}
                    </p>
                  </div>
                  <div className={cn('p-3 rounded-full bg-gray-100', metric.color)}>
                    <metric.icon className="h-6 w-6" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Hoạt động gần đây</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center space-x-4 p-3 bg-gray-50 rounded-lg">
                <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                  <Send className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Bài đăng mới được xuất bản</p>
                  <p className="text-xs text-gray-500">Video Review Tai nghe XYZ - Page Công Nghệ</p>
                </div>
                <span className="ml-auto text-xs text-gray-400">5 phút trước</span>
              </div>
              <div className="flex items-center space-x-4 p-3 bg-gray-50 rounded-lg">
                <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                  <Video className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Video mới được import</p>
                  <p className="text-xs text-gray-500">Review iPhone 15 Pro Max</p>
                </div>
                <span className="ml-auto text-xs text-gray-400">15 phút trước</span>
              </div>
              <div className="flex items-center space-x-4 p-3 bg-gray-50 rounded-lg">
                <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
                  <Package className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Sản phẩm mới được thêm</p>
                  <p className="text-xs text-gray-500">Tai nghe Bluetooth ABC - 299.000đ</p>
                </div>
                <span className="ml-auto text-xs text-gray-400">1 giờ trước</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Thao tác nhanh</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2">
              <a href="/dashboard/videos?action=import" className="flex items-center space-x-3 p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                <div className="h-12 w-12 rounded-lg bg-blue-100 flex items-center justify-center">
                  <Video className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">Import Video mới</p>
                  <p className="text-sm text-gray-500">Tải video từ nguồn</p>
                </div>
              </a>
              <a href="/dashboard/products/new" className="flex items-center space-x-3 p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                <div className="h-12 w-12 rounded-lg bg-green-100 flex items-center justify-center">
                  <Package className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">Thêm sản phẩm</p>
                  <p className="text-sm text-gray-500">Tạo sản phẩm mới</p>
                </div>
              </a>
              <a href="/dashboard/posts/new" className="flex items-center space-x-3 p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                <div className="h-12 w-12 rounded-lg bg-purple-100 flex items-center justify-center">
                  <Send className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">Tạo bài đăng</p>
                  <p className="text-sm text-gray-500">Đăng video lên Facebook</p>
                </div>
              </a>
              <a href="/dashboard/sources/new" className="flex items-center space-x-3 p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                <div className="h-12 w-12 rounded-lg bg-orange-100 flex items-center justify-center">
                  <Facebook className="h-6 w-6 text-orange-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">Thêm nguồn</p>
                  <p className="text-sm text-gray-500">Kết nối Facebook Page</p>
                </div>
              </a>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}