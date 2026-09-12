'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { usersApi, authApi } from '@/lib/api';
import { User } from '@/types';
import { User as UserIcon, Mail, Lock, Bell, Shield, Palette, Save, Loader2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/lib/auth';
import toast from 'react-hot-toast';
import { cn } from '@/lib/utils';

const profileSchema = z.object({
  name: z.string().min(2, 'Tên phải có ít nhất 2 ký tự'),
  email: z.string().email('Email không hợp lệ'),
  avatarUrl: z.string().url().optional().or(z.literal('')),
});

const passwordSchema = z.object({
  currentPassword: z.string().min(1, 'Mật khẩu hiện tại là bắt buộc'),
  newPassword: z.string().min(8, 'Mật khẩu mới phải có ít nhất 8 ký tự'),
});

const settingsSchema = z.object({
  autoSync: z.boolean(),
  defaultSyncInterval: z.number().min(60).max(86400),
  notificationEnabled: z.boolean(),
});

type ProfileForm = z.infer<typeof profileSchema>;
type PasswordForm = z.infer<typeof passwordSchema>;
type SettingsForm = z.infer<typeof settingsSchema>;

export default function SettingsPage() {
  const { user, refreshUser } = useAuth();
  const [activeTab, setActiveTab] = useState<'profile' | 'password' | 'settings' | 'threads_api'>('profile');
  const [loading, setLoading] = useState(false);

  // Threads API config states
  const [threadsToken, setThreadsToken] = useState('');
  const [threadsUserId, setThreadsUserId] = useState('me');
  const [threadsAppId, setThreadsAppId] = useState('1400119534865638');
  const [threadsAppName, setThreadsAppName] = useState('VinceAuto');
  const [appSecret, setAppSecret] = useState('315562ec6ae4054483242438e1344f2b');
  const [exchangingToken, setExchangingToken] = useState(false);
  const [quotaInfo, setQuotaInfo] = useState<any>(null);

  const profileForm = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: '', email: '', avatarUrl: '' },
  });

  const passwordForm = useForm<PasswordForm>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { currentPassword: '', newPassword: '' },
  });

  const settingsForm = useForm<SettingsForm>({
    resolver: zodResolver(settingsSchema),
    defaultValues: { autoSync: true, defaultSyncInterval: 1800, notificationEnabled: true },
  });

  useEffect(() => {
    if (user) {
      profileForm.reset({ name: user.name, email: user.email, avatarUrl: user.avatarUrl || '' });
    }
    const fetchSettings = async () => {
      try {
        const res = await usersApi.getSettings();
        settingsForm.reset({
          autoSync: res.data.data.autoSync,
          defaultSyncInterval: res.data.data.defaultSyncInterval,
          notificationEnabled: res.data.data.notificationEnabled,
        });
      } catch (error) {
        console.error('Failed to fetch settings:', error);
      }
    };
    fetchSettings();

    if (typeof window !== 'undefined') {
      try {
        const VALID_TOKEN = 'THAAT5ZAruEzOZABYll2a2JoVnoweDdWamZAPckgwcVpwMTJUY2hrZA0JlaEFVTVhBQVJ2dEdkYkQ4WkJJYUk0UnN2b3FwOHY0cXlqN0dJdm8teTBGaUhxTjhCUEN4V3pHVm1Rb0RidnJBOUpjemlUdWZA5WXpRNlhVTFdkUVhQMnhlVkRyT0NtamxZARGdaaS1HVVEZD';
        const VALID_USER_ID = '28534125842893667';
        const storedConfig = localStorage.getItem('threads_api_config');

        let tokenToUse = VALID_TOKEN;
        let userIdToUse = VALID_USER_ID;

        if (storedConfig) {
          try {
            const parsed = JSON.parse(storedConfig);
            if (parsed.accessToken && parsed.accessToken.trim() && !parsed.accessToken.startsWith('TH_FALLBACK')) {
              tokenToUse = parsed.accessToken.trim();
            }
            if (parsed.userId && parsed.userId.trim() && parsed.userId !== 'me') {
              userIdToUse = parsed.userId.trim();
            }
            if (parsed.appId) setThreadsAppId(parsed.appId);
            if (parsed.appName) setThreadsAppName(parsed.appName);
            if (parsed.appSecret) setAppSecret(parsed.appSecret);
          } catch {}
        }

        setThreadsToken(tokenToUse);
        setThreadsUserId(userIdToUse);
        localStorage.setItem('threads_api_config', JSON.stringify({
          appId: threadsAppId || '1400119534865638',
          appName: threadsAppName || 'VinceAuto',
          appSecret: appSecret || '315562ec6ae4054483242438e1344f2b',
          accessToken: tokenToUse,
          userId: userIdToUse,
          username: 'vincekanjiro',
          updatedAt: new Date().toISOString(),
        }));
      } catch {}
    }
  }, [user, profileForm, settingsForm]);

  const handleSaveThreadsConfig = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('threads_api_config', JSON.stringify({
        accessToken: threadsToken,
        userId: threadsUserId,
        appId: threadsAppId,
        appName: threadsAppName,
        appSecret: appSecret,
        updatedAt: new Date().toISOString(),
      }));
    }
    toast.success('⚡ Cấu hình Meta Threads API thành công!');
  };

  const handleGetLongLivedToken = async () => {
    if (!threadsToken) {
      toast.error('Vui lòng nhập Short-Lived Access Token.');
      return;
    }
    if (!appSecret) {
      toast.error('Vui lòng nhập Threads App Secret.');
      return;
    }
    setExchangingToken(true);
    try {
      const res = await fetch('/api/threads/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'get_long_lived_token',
          appSecret: appSecret.trim(),
          accessToken: threadsToken.trim(),
        }),
      });
      const data = await res.json();
      if (data.success && data.accessToken) {
        setThreadsToken(data.accessToken);
        toast.success('🎉 Đã đổi thành công Long-Lived Access Token (Có thời hạn 60 ngày)!');
      } else {
        toast.error(data.error || 'Đổi token thất bại');
      }
    } catch {
      toast.error('Lỗi khi gọi API đổi Long-Lived Token');
    } finally {
      setExchangingToken(false);
    }
  };

  const handleRefreshToken = async () => {
    if (!threadsToken) {
      toast.error('Vui lòng nhập Access Token cần gia hạn.');
      return;
    }
    setExchangingToken(true);
    try {
      const res = await fetch('/api/threads/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'refresh_token',
          accessToken: threadsToken.trim(),
        }),
      });
      const data = await res.json();
      if (data.success && data.accessToken) {
        setThreadsToken(data.accessToken);
        toast.success('⚡ Đã gia hạn thành công Threads Access Token!');
      } else {
        toast.error(data.error || 'Gia hạn token thất bại');
      }
    } catch {
      toast.error('Lỗi khi gọi API gia hạn token');
    } finally {
      setExchangingToken(false);
    }
  };

  const handleCheckQuota = async () => {
    try {
      const res = await fetch(`/api/threads/insights?type=quota&access_token=${encodeURIComponent(threadsToken)}`);
      const data = await res.json();
      if (data.success) {
        setQuotaInfo(data.data);
        toast.success('Đã kiểm tra hạn ngạch bài đăng Threads (Quota)!');
      } else {
        toast.error(data.error || 'Không kiểm tra được hạn ngạch.');
      }
    } catch {
      toast.error('Lỗi gọi API Quota');
    }
  };

  const handleProfileSubmit = async (data: ProfileForm) => {
    setLoading(true);
    try {
      await usersApi.updateProfile(data);
      await refreshUser();
      toast.success('Cập nhật hồ sơ thành công');
    } catch (error) {
      toast.error('Cập nhật thất bại');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSubmit = async (data: PasswordForm) => {
    setLoading(true);
    try {
      await usersApi.changePassword(data);
      toast.success('Đổi mật khẩu thành công');
      passwordForm.reset();
    } catch (error) {
      toast.error('Đổi mật khẩu thất bại');
    } finally {
      setLoading(false);
    }
  };

  const handleSettingsSubmit = async (data: SettingsForm) => {
    setLoading(true);
    try {
      await usersApi.updateSettings(data);
      toast.success('Cập nhật cài đặt thành công');
    } catch (error) {
      toast.error('Cập nhật thất bại');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    if (!confirm('Bạn có chắc chắn muốn đăng xuất?')) return;
    await authApi.logout();
    window.location.href = '/login';
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Cài đặt</h1>
        <p className="text-gray-500">Quản lý tài khoản và tùy chọn ứng dụng</p>
      </div>

      <div className="border-b border-gray-200">
        <nav className="flex space-x-8" aria-label="Settings tabs">
          <button
            onClick={() => setActiveTab('profile')}
            className={cn(
              'py-4 px-1 border-b-2 font-medium text-sm transition-colors',
              activeTab === 'profile'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            )}
          >
            <UserIcon className="h-4 w-4 inline mr-1" /> Hồ sơ
          </button>
          <button
            onClick={() => setActiveTab('password')}
            className={cn(
              'py-4 px-1 border-b-2 font-medium text-sm transition-colors',
              activeTab === 'password'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            )}
          >
            <Lock className="h-4 w-4 inline mr-1" /> Mật khẩu
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={cn(
              'py-4 px-1 border-b-2 font-medium text-sm transition-colors',
              activeTab === 'settings'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            )}
          >
            <Shield className="h-4 w-4 inline mr-1" /> Cài đặt
          </button>
          <button
            onClick={() => setActiveTab('threads_api')}
            className={cn(
              'py-4 px-1 border-b-2 font-medium text-sm transition-colors',
              activeTab === 'threads_api'
                ? 'border-red-600 text-red-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            )}
          >
            <Shield className="h-4 w-4 inline mr-1" /> Threads API
          </button>
        </nav>
      </div>

      {activeTab === 'profile' && (
        <Card>
          <CardHeader>
            <CardTitle>Thông tin cá nhân</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={profileForm.handleSubmit(handleProfileSubmit)} className="space-y-4">
              <div className="flex items-center space-x-6">
                <Avatar
                  src={user?.avatarUrl || null}
                  fallback={user?.name || 'U'}
                  size="xl"
                  className="h-20 w-20 text-2xl"
                />
                <div>
                  <Input label="Avatar URL" type="url" {...profileForm.register('avatarUrl')} placeholder="https://example.com/avatar.jpg" />
                  <p className="text-sm text-gray-500 mt-1">Để trống để dùng chữ cái đầu tên</p>
                </div>
              </div>
              <Input label="Họ tên" {...profileForm.register('name')} error={profileForm.formState.errors.name?.message} />
              <Input label="Email" type="email" {...profileForm.register('email')} error={profileForm.formState.errors.email?.message} />
              <div className="flex justify-end">
                <Button type="submit" disabled={loading}>
                  <Save className="h-4 w-4 mr-2" />
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Lưu thay đổi'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {activeTab === 'password' && (
        <Card>
          <CardHeader>
            <CardTitle>Đổi mật khẩu</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={passwordForm.handleSubmit(handlePasswordSubmit)} className="space-y-4">
              <Input label="Mật khẩu hiện tại" type="password" {...passwordForm.register('currentPassword')} error={passwordForm.formState.errors.currentPassword?.message} />
              <Input label="Mật khẩu mới" type="password" {...passwordForm.register('newPassword')} error={passwordForm.formState.errors.newPassword?.message} />
              <p className="text-sm text-gray-500">Mật khẩu phải có ít nhất 8 ký tự, bao gồm chữ hoa, chữ thường và số</p>
              <div className="flex justify-end">
                <Button type="submit" disabled={loading}>
                  <Save className="h-4 w-4 mr-2" />
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Đổi mật khẩu'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {activeTab === 'settings' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Tự động hóa</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={settingsForm.handleSubmit(handleSettingsSubmit)} className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">Tự động sync video</p>
                    <p className="text-sm text-gray-500">Tự động kiểm tra và import video mới từ nguồn</p>
                  </div>
                  <input
                    type="checkbox"
                    id="autoSync"
                    {...settingsForm.register('autoSync')}
                    className="h-5 w-5 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                </div>
                <Input label="Khoảng cách sync mặc định (giây)" type="number" {...settingsForm.register('defaultSyncInterval', { valueAsNumber: true })} placeholder="1800" />
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">Thông báo</p>
                    <p className="text-sm text-gray-500">Nhận thông báo khi có video mới, bài đăng thành công/thất bại</p>
                  </div>
                  <input
                    type="checkbox"
                    id="notificationEnabled"
                    {...settingsForm.register('notificationEnabled')}
                    className="h-5 w-5 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                </div>
                <div className="flex justify-end">
                  <Button type="submit" disabled={loading}>
                    <Save className="h-4 w-4 mr-2" />
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Lưu cài đặt'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <Card className="border-red-200">
            <CardHeader>
              <CardTitle className="text-red-600 flex items-center space-x-2">
                <Shield className="h-5 w-5" />
                <span>Khu vực nguy hiểm</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between p-4 bg-red-50 rounded-lg">
                <div>
                  <p className="font-medium text-red-900">Đăng xuất khỏi tất cả thiết bị</p>
                  <p className="text-sm text-red-700">Hủy tất cả phiên đăng nhập hiện tại</p>
                </div>
                <Button variant="danger" onClick={handleLogout}>
                  Đăng xuất
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'threads_api' && (
        <div className="space-y-6">
          <Card className="bg-[#111117] border border-white/[0.06]">
            <CardHeader className="border-b border-white/[0.06] pb-3">
              <CardTitle className="text-white text-base font-bold flex items-center gap-2">
                <span>Cấu Hình Meta Threads Graph API</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              <div className="p-3.5 rounded-lg bg-red-950/20 border border-red-800/40 text-xs text-red-200 space-y-2">
                <p className="font-bold text-red-400 text-sm">
                  📌 Hướng dẫn gán API Meta Threads 4 bước đơn giản:
                </p>
                <ol className="list-decimal list-inside space-y-1 text-zinc-300">
                  <li>Truy cập <a href="https://developers.facebook.com/" target="_blank" rel="noreferrer" className="text-red-400 underline font-mono">Meta Developer Portal</a> và đăng nhập tài khoản Meta/Facebook của bạn.</li>
                  <li>Tạo một App mới và bật ứng dụng <strong>Threads API</strong>.</li>
                  <li>Vào mục <strong>User Access Token Generator</strong>, lấy Token có quyền: <code className="text-emerald-400 font-mono">threads_basic</code> và <code className="text-emerald-400 font-mono">threads_content_publish</code>.</li>
                  <li>Copy chuỗi Access Token (bắt đầu bằng <code className="text-amber-400 font-mono">TH...</code> hoặc <code className="text-amber-400 font-mono">EAA...</code>) dán vào ô bên dưới và bấm <strong>Lưu Cấu Hình Threads API</strong>.</li>
                </ol>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1">
                      Threads App Name
                    </label>
                    <Input
                      type="text"
                      value={threadsAppName}
                      onChange={(e) => setThreadsAppName(e.target.value)}
                      placeholder="VD: VinceAuto"
                      className="bg-[#0a0a0f] border-white/[0.1] text-white text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1">
                      Threads App ID
                    </label>
                    <Input
                      type="text"
                      value={threadsAppId}
                      onChange={(e) => setThreadsAppId(e.target.value)}
                      placeholder="VD: 1400119534865638"
                      className="bg-[#0a0a0f] border-white/[0.1] text-white text-xs font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    Threads User Access Token (Meta Long-Lived Token)
                  </label>
                  <Input
                    type="password"
                    value={threadsToken}
                    onChange={(e) => setThreadsToken(e.target.value)}
                    placeholder="Dán Threads Access Token (EAA... hoặc TH...)"
                    className="bg-[#0a0a0f] border-white/[0.1] text-white text-xs font-mono"
                  />
                  <p className="text-[11px] text-zinc-500 mt-1">
                    Token này dùng để tự động đăng bài viết và bình luận link Shopee Affiliate lên Threads cá nhân của bạn.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    Threads App Secret <span className="text-zinc-500 font-normal">(Cần thiết để đổi Long-Lived Token 60 ngày)</span>
                  </label>
                  <Input
                    type="password"
                    value={appSecret}
                    onChange={(e) => setAppSecret(e.target.value)}
                    placeholder="Nhập Threads App Secret từ Meta Developer Dashboard..."
                    className="bg-[#0a0a0f] border-white/[0.1] text-white text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    Threads User ID (Mặc định: "me")
                  </label>
                  <Input
                    type="text"
                    value={threadsUserId}
                    onChange={(e) => setThreadsUserId(e.target.value)}
                    placeholder="me (hoặc ID Threads cá nhân)"
                    className="bg-[#0a0a0f] border-white/[0.1] text-white text-xs font-mono"
                  />
                </div>

                {/* OAuth & Token Actions */}
                <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleGetLongLivedToken}
                      disabled={exchangingToken}
                      className="border-purple-500/30 text-purple-300 hover:bg-purple-500/10 text-xs h-8"
                    >
                      {exchangingToken ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : null}
                      🔑 Đổi sang Long-Lived Token (60 Ngày)
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleRefreshToken}
                      disabled={exchangingToken}
                      className="border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/10 text-xs h-8"
                    >
                      ⚡ Gia Hạn Token (Refresh)
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleCheckQuota}
                      className="border-sky-500/30 text-sky-300 hover:bg-sky-500/10 text-xs h-8"
                    >
                      📊 Kiểm Tra Hạn Ngạch (Quota)
                    </Button>
                  </div>

                  <a
                    href="https://developers.facebook.com/tools/debug/accesstoken/"
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-red-400 hover:underline font-mono"
                  >
                    🔍 Debug Token trong Meta Tool ↗
                  </a>
                </div>

                {/* Quota Information Display */}
                {quotaInfo && (
                  <div className="p-3 bg-sky-950/20 border border-sky-500/30 rounded-lg text-xs space-y-1">
                    <p className="font-bold text-sky-400">📊 Hạn Ngạch Đăng Bài Threads (Publishing Quota Limit):</p>
                    {Array.isArray(quotaInfo) ? (
                      quotaInfo.map((q: any, i: number) => (
                        <p key={i} className="text-zinc-300 font-mono">
                          Đã dùng: <strong className="text-white">{q.quota_usage}</strong> / {q.config?.quota_total || 250} bài (Cập nhật 24h)
                        </p>
                      ))
                    ) : (
                      <p className="text-zinc-300 font-mono">{JSON.stringify(quotaInfo)}</p>
                    )}
                  </div>
                )}

                <div className="flex justify-end pt-3 border-t border-white/[0.06]">
                  <Button
                    onClick={handleSaveThreadsConfig}
                    className="bg-red-600 hover:bg-red-500 text-white font-semibold text-xs px-5 active:scale-[0.98]"
                  >
                    <Save className="h-4 w-4 mr-1.5" />
                    Lưu Cấu Hình Threads API
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

