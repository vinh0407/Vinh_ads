'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { analyticsApi } from '@/lib/api';
import { AnalyticsOverview } from '@/types';
import { formatNumber, formatCurrency, formatRelativeTime } from '@/lib/utils';
import { BarChart3, TrendingUp, Eye, Heart, MessageSquare, Share2, MousePointerClick, DollarSign, Package, Users, Facebook } from 'lucide-react';

const metricCards = [
  { name: 'Lượt xem', icon: Eye, color: 'bg-blue-100 text-blue-600', key: 'views' },
  { name: 'Lượt thích', icon: Heart, color: 'bg-red-100 text-red-600', key: 'likes' },
  { name: 'Bình luận', icon: MessageSquare, color: 'bg-green-100 text-green-600', key: 'comments' },
  { name: 'Chia sẻ', icon: Share2, color: 'bg-purple-100 text-purple-600', key: 'shares' },
  { name: 'Click Affiliate', icon: MousePointerClick, color: 'bg-orange-100 text-orange-600', key: 'affiliateClicks' },
];

export default function AnalyticsPage() {
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [postAnalytics, setPostAnalytics] = useState<any>(null);
  const [productAnalytics, setProductAnalytics] = useState<any>(null);
  const [pageAnalytics, setPageAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>('overview');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [overviewRes, postsRes, productsRes, pagesRes] = await Promise.all([
        analyticsApi.overview(),
        analyticsApi.posts(),
        analyticsApi.products(),
        analyticsApi.pages(),
      ]);
      setOverview(overviewRes.data.data);
      setPostAnalytics(postsRes.data.data);
      setProductAnalytics(productsRes.data.data);
      setPageAnalytics(pagesRes.data.data);
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
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
        <h1 className="text-2xl font-bold text-gray-900">Phân tích & Báo cáo</h1>
        <p className="text-gray-500">Theo dõi hiệu suất video, sản phẩm và doanh thu affiliate</p>
      </div>

      {overview && (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Tổng Video</p>
                    <p className="text-3xl font-bold text-gray-900 mt-1">{formatNumber(overview.counts.videos)}</p>
                  </div>
                  <div className="p-3 rounded-full bg-blue-100 text-blue-600">
                    <BarChart3 className="h-6 w-6" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Tổng Sản phẩm</p>
                    <p className="text-3xl font-bold text-gray-900 mt-1">{formatNumber(overview.counts.products)}</p>
                  </div>
                  <div className="p-3 rounded-full bg-green-100 text-green-600">
                    <Package className="h-6 w-6" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Tổng Bài đăng</p>
                    <p className="text-3xl font-bold text-gray-900 mt-1">{formatNumber(overview.counts.posts)}</p>
                  </div>
                  <div className="p-3 rounded-full bg-purple-100 text-purple-600">
                    <Facebook className="h-6 w-6" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Facebook Pages</p>
                    <p className="text-3xl font-bold text-gray-900 mt-1">{formatNumber(overview.counts.pages)}</p>
                  </div>
                  <div className="p-3 rounded-full bg-blue-600 text-white">
                    <Users className="h-6 w-6" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            {metricCards.map((metric) => (
              <Card key={metric.key}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-500">{metric.name}</p>
                      <p className="text-3xl font-bold text-gray-900 mt-1">
                        {formatNumber(overview.totals[metric.key as keyof typeof overview.totals] || 0)}
                      </p>
                    </div>
                    <div className={cn('p-3 rounded-full', metric.color)}>
                      <metric.icon className="h-6 w-6" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Tổng quan</TabsTrigger>
          <TabsTrigger value="posts">Bài đăng</TabsTrigger>
          <TabsTrigger value="products">Sản phẩm</TabsTrigger>
          <TabsTrigger value="pages">Pages</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          {overview && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Chỉ số tổng hợp</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-500">CTR trung bình</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {overview.totals.views > 0
                          ? ((overview.totals.affiliateClicks / overview.totals.views) * 100).toFixed(2) + '%'
                          : '0%'}
                      </p>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-500">Engagement rate</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {overview.totals.views > 0
                          ? (((overview.totals.likes + overview.totals.comments + overview.totals.shares) / overview.totals.views) * 100).toFixed(2) + '%'
                          : '0%'}
                      </p>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-500">Doanh thu ước tính</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {overview.totals.affiliateClicks > 0
                          ? formatCurrency(overview.totals.affiliateClicks * 5000)
                          : '0đ'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="posts">
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Video</TableHead>
                      <TableHead>Lượt xem</TableHead>
                      <TableHead>Lượt thích</TableHead>
                      <TableHead>Bình luận</TableHead>
                      <TableHead>Chia sẻ</TableHead>
                      <TableHead>Click Affiliate</TableHead>
                      <TableHead>CTR</TableHead>
                      <TableHead>Ngày đăng</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {postAnalytics?.items?.map((post: any) => (
                      <TableRow key={post.id}>
                        <TableCell className="font-medium max-w-xs truncate">{post.video?.title || 'N/A'}</TableCell>
                        <TableCell>{formatNumber(post.metrics?.[0]?.views || 0)}</TableCell>
                        <TableCell>{formatNumber(post.metrics?.[0]?.likes || 0)}</TableCell>
                        <TableCell>{formatNumber(post.metrics?.[0]?.comments || 0)}</TableCell>
                        <TableCell>{formatNumber(post.metrics?.[0]?.shares || 0)}</TableCell>
                        <TableCell>{formatNumber(post.metrics?.[0]?.affiliateClicks || 0)}</TableCell>
                        <TableCell>
                          {post.metrics?.[0]?.views > 0
                            ? (((post.metrics[0].affiliateClicks / post.metrics[0].views) * 100).toFixed(2) + '%')
                            : '0%'}
                        </TableCell>
                        <TableCell>{post.publishedAt ? formatRelativeTime(post.publishedAt) : 'Chưa đăng'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="products">
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Sản phẩm</TableHead>
                      <TableHead>Giá</TableHead>
                      <TableHead>Network</TableHead>
                      <TableHead>Clicks</TableHead>
                      <TableHead>Conversions</TableHead>
                      <TableHead>CTR</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {productAnalytics?.map((product: any) => {
                      const totalClicks = product.affiliateLinks?.reduce((sum: number, link: any) => sum + link.clickCount, 0) || 0;
                      const totalConversions = product.affiliateLinks?.reduce((sum: number, link: any) => sum + link.conversionCount, 0) || 0;
                      return (
                        <TableRow key={product.id}>
                          <TableCell className="font-medium">{product.name}</TableCell>
                          <TableCell>{formatCurrency(product.price, product.currency)}</TableCell>
                          <TableCell>
                            {product.affiliateLinks?.map((link: any) => (
                              <Badge key={link.id} variant="info" className="mr-1">{link.network}</Badge>
                            ))}
                          </TableCell>
                          <TableCell>{totalClicks}</TableCell>
                          <TableCell>{totalConversions}</TableCell>
                          <TableCell>{totalClicks > 0 ? ((totalConversions / totalClicks) * 100).toFixed(2) + '%' : '0%'}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pages">
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Page</TableHead>
                      <TableHead>Followers</TableHead>
                      <TableHead>Engagement</TableHead>
                      <TableHead>Bài đăng</TableHead>
                      <TableHead>Trạng thái</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pageAnalytics?.map((page: any) => (
                      <TableRow key={page.id}>
                        <TableCell className="font-medium">{page.pageName}</TableCell>
                        <TableCell>{formatNumber(page.pageMetrics?.[0]?.followers || 0)}</TableCell>
                        <TableCell>{formatNumber(page.pageMetrics?.[0]?.engagement || 0)}</TableCell>
                        <TableCell>{page.posts?.length || 0}</TableCell>
                        <TableCell>
                          <Badge variant={page.status === 'ACTIVE' ? 'success' : 'secondary'}>{page.status}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

import { cn } from '@/lib/utils';