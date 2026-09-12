'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import type { FacebookPage } from '@/types';
import {
  Facebook,
  Plus,
  Copy,
  ExternalLink,
  Trash2,
  CheckCircle,
  Video,
  Instagram,
  Globe,
  Calendar,
  Share2,
  Info,
} from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';

interface SocialAccount {
  id: string;
  name: string;
  platform: 'FACEBOOK' | 'YOUTUBE' | 'THREADS' | 'INSTAGRAM';
  channelId: string;
  url: string;
  avatarUrl?: string | null;
  category?: string;
  token?: string;
  isActive: boolean;
  createdAt: string;
}

const DEFAULT_ACCOUNTS: SocialAccount[] = [
  {
    id: 'soc_fb_1282948524895927',
    name: 'Loài mèo gắn link',
    platform: 'FACEBOOK',
    channelId: '1282948524895927',
    url: 'https://www.facebook.com/1282948524895927',
    avatarUrl: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=100&h=100&fit=crop',
    category: 'Shopee Affiliate / Review Deals',
    isActive: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'soc_th_28534125842893667',
    name: '@vincekanjiro (Meta Threads)',
    platform: 'THREADS',
    channelId: '28534125842893667',
    url: 'https://www.threads.net/@vincekanjiro',
    avatarUrl: 'https://instagram.fsgn5-10.fna.fbcdn.net/v/t51.89012-19/573323465_1219825463302212_7278921664109726296_n.jpg?stp=dst-jpg_s206x206_tt6&_nc_cat=1&ig_cache_key=YW5vbnltb3VzX3Byb2ZpbGVfcGlj.3-ccb7-5&ccb=7-5&_nc_sid=30ff31&efg=eyJ2ZW5jb2RlX3RhZyI6InByb2ZpbGVfcGlj.3-ccb7-5',
    category: 'Meta Threads Account',
    token: 'THAAT5ZAruEzOZABYll2a2JoVnoweDdWamZAPckgwcVpwMTJUY2hrZA0JlaEFVTVhBQVJ2dEdkYkQ4WkJJYUk0UnN2b3FwOHY0cXlqN0dJdm8teTBGaUhxTjhCUEN4V3pHVm1Rb0RidnJBOUpjemlUdWZA5WXpRNlhVTFdkUVhQMnhlVkRyT0NtamxZARGdaaS1HVVEZD',
    isActive: true,
    createdAt: new Date().toISOString(),
  },
];

export default function SocialMediaPage() {
  const [accounts, setAccounts] = useState<SocialAccount[]>(DEFAULT_ACCOUNTS);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'FACEBOOK' | 'YOUTUBE' | 'THREADS' | 'INSTAGRAM'>('ALL');

  // Modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [platform, setPlatform] = useState<'FACEBOOK' | 'YOUTUBE' | 'THREADS' | 'INSTAGRAM'>('FACEBOOK');
  const [name, setName] = useState('');
  const [channelIdOrUrl, setChannelIdOrUrl] = useState('');
  const [category, setCategory] = useState('Shopee Affiliate / Review Deals');
  const [token, setToken] = useState('');

  const loadAccounts = () => {
    setLoading(true);
    try {
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem('custom_social_accounts');
        if (stored) {
          let parsed: SocialAccount[] = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            // Clean up any legacy or unwanted Threads accounts and ensure @vincekanjiro is the only Threads account
            parsed = parsed.filter(a => a.platform !== 'THREADS' || a.channelId === '28534125842893667' || a.name.includes('vincekanjiro'));
            const hasVince = parsed.some(a => a.channelId === '28534125842893667' || a.name.includes('vincekanjiro'));
            if (!hasVince) {
              const vinceAccount = DEFAULT_ACCOUNTS.find(a => a.platform === 'THREADS');
              if (vinceAccount) parsed.push(vinceAccount);
            }
            localStorage.setItem('custom_social_accounts', JSON.stringify(parsed));
            setAccounts(parsed);
            setLoading(false);
            return;
          }
        }

        // Migration from custom_facebook_pages if available
        const fbPagesRaw = localStorage.getItem('custom_facebook_pages');
        if (fbPagesRaw) {
          const fbPages: FacebookPage[] = JSON.parse(fbPagesRaw);
          const cleanFb = fbPages.map((p) => ({
            id: p.id || `soc_fb_${p.pageId}`,
            name: p.pageName,
            platform: 'FACEBOOK' as const,
            channelId: p.pageId || p.id,
            url: p.pageUrl || `https://facebook.com/${p.pageId}`,
            avatarUrl: p.avatarUrl,
            category: 'Facebook Fanpage',
            token: p.accessToken || undefined,
            isActive: true,
            createdAt: p.createdAt || new Date().toISOString(),
          }));
          const merged = Array.from(new Map([...DEFAULT_ACCOUNTS, ...cleanFb].map(a => [a.channelId, a])).values());
          localStorage.setItem('custom_social_accounts', JSON.stringify(merged));
          setAccounts(merged);
          setLoading(false);
          return;
        }

        localStorage.setItem('custom_social_accounts', JSON.stringify(DEFAULT_ACCOUNTS));
        setAccounts(DEFAULT_ACCOUNTS);
      }
    } catch (e) {
      console.warn('Error loading social accounts:', e);
      setAccounts(DEFAULT_ACCOUNTS);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAccounts();
  }, []);

  const saveAccounts = (newAccounts: SocialAccount[]) => {
    setAccounts(newAccounts);
    if (typeof window !== 'undefined') {
      localStorage.setItem('custom_social_accounts', JSON.stringify(newAccounts));
    }
  };

  const handleAddAccount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Vui lòng nhập tên trang / kênh mạng xã hội.');
      return;
    }

    let rawInput = channelIdOrUrl.trim();
    let computedUrl = rawInput;
    let cleanId = rawInput;

    if (platform === 'FACEBOOK') {
      if (!computedUrl.startsWith('http')) computedUrl = `https://www.facebook.com/${rawInput || Date.now()}`;
    } else if (platform === 'YOUTUBE') {
      if (!computedUrl.startsWith('http')) computedUrl = `https://www.youtube.com/@${rawInput || 'channel'}`;
    } else if (platform === 'THREADS') {
      if (!computedUrl.startsWith('http')) computedUrl = `https://www.threads.net/@${rawInput || 'user'}`;
    } else if (platform === 'INSTAGRAM') {
      if (!computedUrl.startsWith('http')) computedUrl = `https://www.instagram.com/${rawInput || 'user'}`;
    }

    if (rawInput.includes('/')) {
      const parts = rawInput.split('/').filter(Boolean);
      cleanId = parts[parts.length - 1] || `${Date.now()}`;
    } else if (!cleanId) {
      cleanId = `${Date.now()}`;
    }

    const newAccount: SocialAccount = {
      id: `soc_${platform.toLowerCase()}_${Date.now()}`,
      name: name.trim(),
      platform: platform,
      channelId: cleanId,
      url: computedUrl,
      avatarUrl: `https://api.dicebear.com/7.x/shapes/svg?seed=${encodeURIComponent(name.trim())}`,
      category: category.trim(),
      token: token.trim() || undefined,
      isActive: true,
      createdAt: new Date().toISOString(),
    };

    const updated = [newAccount, ...accounts];
    saveAccounts(updated);

    if (platform === 'THREADS' && token.trim()) {
      localStorage.setItem('threads_api_config', JSON.stringify({
        accessToken: token.trim(),
        userId: cleanId || 'me',
        updatedAt: new Date().toISOString(),
      }));
    }

    toast.success(`🎉 Đã thêm thành công kênh ${platform}: "${newAccount.name}"!`);

    // Reset & close
    setName('');
    setChannelIdOrUrl('');
    setToken('');
    setIsAddModalOpen(false);
  };

  const handleDeleteAccount = (id: string, nameLabel: string) => {
    if (!confirm(`Bạn có chắc chắn muốn ngắt kết nối trang/kênh "${nameLabel}"?`)) return;
    const updated = accounts.filter(a => a.id !== id);
    saveAccounts(updated);
    toast.success(`Đã xóa kênh "${nameLabel}".`);
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`Đã sao chép ${label}!`);
  };

  const filteredAccounts = accounts.filter((a) => {
    if (activeFilter === 'ALL') return true;
    return a.platform === activeFilter;
  });

  const getPlatformBadge = (p: SocialAccount['platform']) => {
    switch (p) {
      case 'FACEBOOK':
        return { label: 'Facebook Fanpage / Reels', bg: 'bg-blue-500/10 border-blue-500/30 text-blue-400', icon: Facebook };
      case 'YOUTUBE':
        return { label: 'YouTube (Video & Shorts)', bg: 'bg-red-500/10 border-red-500/30 text-red-400', icon: Video };
      case 'THREADS':
        return { label: 'Meta Threads', bg: 'bg-purple-500/10 border-purple-500/30 text-purple-400', icon: Share2 };
      case 'INSTAGRAM':
        return { label: 'Instagram Business', bg: 'bg-pink-500/10 border-pink-500/30 text-pink-400', icon: Instagram };
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* 1. Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.06] pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[11px] font-mono font-semibold text-emerald-400 uppercase tracking-wider">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Social Multi-Channel System
            </span>
            <span className="text-xs font-mono text-zinc-400">FACEBOOK • YOUTUBE • THREADS • INSTAGRAM</span>
          </div>
          <h1 className="text-[22px] font-extrabold tracking-tight text-white">
            Quản Lý Trang Mạng Xã Hội
          </h1>
          <p className="text-sm text-zinc-400 mt-0.5">
            Quản lý tập trung các trang Fanpage Facebook, kênh YouTube (Video & Shorts), Threads & Instagram để tự động xuất bản
          </p>
        </div>

        <div>
          <Button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="bg-red-600 hover:bg-red-500 text-white font-bold shadow-lg shadow-red-600/20 active:scale-[0.98] text-xs px-4 py-2 flex items-center gap-1.5"
          >
            <Plus className="h-4 w-4" />
            Thêm Trang Mạng Xã Hội
          </Button>
        </div>
      </div>

      {/* 2. Overview Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="p-4 bg-[#111117] border border-white/[0.06]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-400">Facebook Fanpage</span>
            <Facebook className="h-4 w-4 text-blue-400" />
          </div>
          <p className="text-xl font-black font-mono text-white mt-1">
            {accounts.filter((a) => a.platform === 'FACEBOOK').length} Trang
          </p>
          <p className="text-[11px] text-zinc-500">Đăng Reels & ghim comment</p>
        </Card>

        <Card className="p-4 bg-[#111117] border border-white/[0.06]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-400">YouTube Channels</span>
            <Video className="h-4 w-4 text-red-400" />
          </div>
          <p className="text-xl font-black font-mono text-white mt-1">
            {accounts.filter((a) => a.platform === 'YOUTUBE').length} Kênh
          </p>
          <p className="text-[11px] text-zinc-500">Hỗ trợ Video dài & Shorts</p>
        </Card>

        <Card className="p-4 bg-[#111117] border border-white/[0.06]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-400">Meta Threads</span>
            <Share2 className="h-4 w-4 text-purple-400" />
          </div>
          <p className="text-xl font-black font-mono text-white mt-1">
            {accounts.filter((a) => a.platform === 'THREADS').length} Tài Khoản
          </p>
          <p className="text-[11px] text-zinc-500">Threads Graph Container API</p>
        </Card>

        <Card className="p-4 bg-[#111117] border border-white/[0.06]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-400">Instagram</span>
            <Instagram className="h-4 w-4 text-pink-400" />
          </div>
          <p className="text-xl font-black font-mono text-white mt-1">
            {accounts.filter((a) => a.platform === 'INSTAGRAM').length} Tài Khoản
          </p>
          <p className="text-[11px] text-zinc-500">Instagram Business / Creator</p>
        </Card>
      </div>

      {/* 3. Account List Header & Filter Tabs */}
      <Card className="bg-[#111117] border border-white/[0.06] shadow-xl">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/[0.06] bg-white/[0.01] flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4 text-zinc-400" />
            <span className="text-xs font-bold text-zinc-200 uppercase tracking-wider">
              Danh Sách Kênh Mạng Xã Hội Đã Kết Nối ({filteredAccounts.length})
            </span>
          </div>

          <div className="flex items-center gap-1 bg-[#18181f] p-1 rounded-lg border border-white/[0.06]">
            {(['ALL', 'FACEBOOK', 'YOUTUBE', 'THREADS', 'INSTAGRAM'] as const).map((p) => (
              <button
                key={p}
                onClick={() => setActiveFilter(p)}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                  activeFilter === p
                    ? 'bg-red-600 text-white shadow'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                {p === 'ALL' ? 'Tất Cả' : p}
              </button>
            ))}
          </div>
        </div>

        <CardContent className="p-5">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500" />
            </div>
          ) : filteredAccounts.length === 0 ? (
            <div className="text-center py-12 px-4 border border-dashed border-white/[0.08] rounded-xl bg-white/[0.01]">
              <Globe className="h-12 w-12 text-zinc-600 mx-auto mb-3 opacity-60" />
              <h3 className="text-base font-semibold text-zinc-300 mb-1">Chưa có kênh nào trong mục này</h3>
              <p className="text-xs text-zinc-500 max-w-md mx-auto mb-5">
                Nhấn "Thêm Trang Mạng Xã Hội" để kết nối ngay Fanpage Facebook, YouTube Video/Shorts, Threads hoặc Instagram.
              </p>
              <Button
                onClick={() => setIsAddModalOpen(true)}
                className="bg-red-600 hover:bg-red-500 text-white font-bold text-xs"
              >
                <Plus className="h-4 w-4 mr-1.5" />
                Thêm Trang Ngay
              </Button>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredAccounts.map((acc) => {
                const badgeInfo = getPlatformBadge(acc.platform);
                const PlatformIcon = badgeInfo.icon;

                return (
                  <div
                    key={acc.id}
                    className="border border-white/[0.06] rounded-xl p-4 bg-[#18181f] hover:border-white/[0.12] transition-all flex flex-col justify-between"
                  >
                    <div>
                      {/* Card Header */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <Avatar
                            src={acc.avatarUrl || null}
                            fallback={acc.name}
                            size="lg"
                            className="border border-white/[0.1]"
                          />
                          <div className="min-w-0">
                            <h4 className="font-bold text-white truncate text-sm" title={acc.name}>
                              {acc.name}
                            </h4>
                            <div className="flex items-center gap-1 mt-0.5">
                              <span className="text-[11px] font-mono text-zinc-500 truncate max-w-[130px]">
                                ID: {acc.channelId}
                              </span>
                              <button
                                type="button"
                                onClick={() => copyToClipboard(acc.channelId, 'ID')}
                                className="text-zinc-500 hover:text-white"
                                title="Sao chép ID"
                              >
                                <Copy className="h-3 w-3" />
                              </button>
                            </div>
                          </div>
                        </div>

                        <Badge className={`text-[10px] font-mono border px-2 py-0.5 ${badgeInfo.bg}`}>
                          <PlatformIcon className="h-3 w-3 mr-1 inline" />
                          {acc.platform}
                        </Badge>
                      </div>

                      {/* Details */}
                      <div className="mt-4 pt-3 border-t border-white/[0.04] space-y-1.5 text-xs text-zinc-400">
                        <div className="flex items-center justify-between">
                          <span className="text-zinc-500">Danh mục:</span>
                          <span className="text-zinc-200 font-medium">{acc.category || 'Mạng xã hội'}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-zinc-500">Trạng thái:</span>
                          <span className="text-emerald-400 font-semibold flex items-center gap-1">
                            <CheckCircle className="h-3 w-3" /> Sẵn sàng xuất bản
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Card Actions Footer */}
                    <div className="mt-5 pt-3 border-t border-white/[0.04] flex items-center justify-between gap-2">
                      <a
                        href={acc.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center text-xs font-medium text-blue-400 hover:underline"
                      >
                        <ExternalLink className="h-3.5 w-3.5 mr-1" />
                        Mở Kênh
                      </a>

                      <div className="flex items-center gap-1.5">
                        <Link href="/dashboard/schedules">
                          <Button variant="outline" size="sm" className="h-8 text-xs border-white/[0.1] text-zinc-300 hover:bg-white/[0.05]">
                            <Calendar className="h-3.5 w-3.5 mr-1 text-amber-400" />
                            Lên lịch
                          </Button>
                        </Link>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteAccount(acc.id, acc.name)}
                          className="h-8 w-8 p-0 text-zinc-500 hover:text-red-400 hover:bg-red-500/10"
                          title="Ngắt kết nối"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 4. Modal: Thêm Trang Mạng Xã Hội */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Thêm Trang Mạng Xã Hội"
        description="Kết nối các nền tảng Facebook Fanpage, YouTube (Video & Shorts), Threads hoặc Instagram vào hệ thống tự động."
        size="lg"
      >
        <form onSubmit={handleAddAccount} className="space-y-4 pt-2">
          {/* Nền Tảng Selector */}
          <div>
            <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2">
              1. Chọn Nền Tảng Mạng Xã Hội <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: 'FACEBOOK', label: 'FB Fanpage', icon: Facebook, color: 'border-blue-500 bg-blue-500/10 text-white' },
                { id: 'YOUTUBE', label: 'YouTube (Video/Shorts)', icon: Video, color: 'border-red-500 bg-red-500/10 text-white' },
                { id: 'THREADS', label: 'Meta Threads', icon: Share2, color: 'border-purple-500 bg-purple-500/10 text-white' },
                { id: 'INSTAGRAM', label: 'Instagram', icon: Instagram, color: 'border-pink-500 bg-pink-500/10 text-white' },
              ].map((item) => {
                const isSelected = platform === item.id;
                const Icon = item.icon;

                return (
                  <div
                    key={item.id}
                    onClick={() => setPlatform(item.id as any)}
                    className={`flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer text-xs font-semibold transition-all ${
                      isSelected
                        ? item.color
                        : 'border-white/[0.08] bg-[#18181f] text-zinc-400 hover:border-white/[0.15]'
                    }`}
                  >
                    <Icon className="h-4 w-4 flex-shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1">
              2. Tên Trang / Tên Kênh <span className="text-red-500">*</span>
            </label>
            <Input
              type="text"
              required
              placeholder="VD: Loài mèo gắn link hoặc Vinh Review Deals"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-[#18181f] border-white/[0.1] text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1">
              3. Link Trang / Kênh hoặc ID
            </label>
            <Input
              type="text"
              placeholder="VD: https://facebook.com/1282948524895927 hoặc @mychannel"
              value={channelIdOrUrl}
              onChange={(e) => setChannelIdOrUrl(e.target.value)}
              className="bg-[#18181f] border-white/[0.1] text-white font-mono text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1">
              4. Danh Mục / Chủ Đề Kênh
            </label>
            <Input
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="VD: Shopee Affiliate, Review Công Nghệ, Thời Trang"
              className="bg-[#18181f] border-white/[0.1] text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1">
              5. Access Token / API Key <span className="text-zinc-500 font-normal">(Tùy chọn)</span>
            </label>
            <Input
              type="password"
              placeholder="Dán token nếu muốn tự động hóa API direct..."
              value={token}
              onChange={(e) => setToken(e.target.value)}
              className="bg-[#18181f] border-white/[0.1] text-white font-mono text-xs"
            />
          </div>

          <div className="p-3 bg-blue-500/10 rounded-lg border border-blue-500/20 flex items-start gap-2 text-xs text-blue-300">
            <Info className="h-4 w-4 text-blue-400 shrink-0 mt-0.5" />
            <div>
              Trang sau khi kết nối sẽ lập tức được lưu và hiển thị trong danh sách lựa chọn của trang{' '}
              <strong className="text-white">Lên Lịch Đăng Đa Kênh</strong> để xuất bản tự động!
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/[0.06]">
            <Button type="button" variant="outline" onClick={() => setIsAddModalOpen(false)} className="border-white/[0.1] text-zinc-300 hover:bg-white/[0.05]">
              Hủy
            </Button>
            <Button type="submit" className="bg-red-600 hover:bg-red-500 text-white font-bold">
              <CheckCircle className="h-4 w-4 mr-1.5" />
              Lưu & Kết Nối Trang Mạng Xã Hội
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}