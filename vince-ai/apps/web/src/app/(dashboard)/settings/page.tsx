'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { usersApi, authApi } from '@/lib/api';
import { User } from '@/types';
import { User as UserIcon, Mail, Lock, Bell, Shield, Palette, Save, Loader2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/lib/auth';
import toast from 'react-hot-toast';

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
  const [activeTab, setActiveTab] = useState<'profile' | 'password' | 'settings'>('profile');
  const [loading, setLoading] = useState(false);

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
  }, [user]);

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
                <div className="h-20 w-20 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden">
                  {user?.avatarUrl ? (
                    <img src={user.avatarUrl} alt={user.name} className="h-full w-full object-cover" />
                  ) : (
                    <UserIcon className="h-10 w-10 text-gray-400" />
                  )}
                </div>
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
    </div>
  );
}