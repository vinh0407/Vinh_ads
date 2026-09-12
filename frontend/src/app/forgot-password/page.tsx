'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Mail, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setStatus('error');
      setErrorMessage('Vui lòng nhập địa chỉ email.');
      return;
    }

    setStatus('loading');
    setErrorMessage('');

    setTimeout(() => {
      setStatus('success');
    }, 800);
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4 transition-colors">
      <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-xl shadow-lg border border-slate-200 dark:border-slate-800 p-8 space-y-6">
        <div className="space-y-2 text-center">
          <div className="w-12 h-12 bg-rose-100 dark:bg-rose-950/40 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <Mail className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Khôi phục mật khẩu
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Nhập email của bạn để nhận hướng dẫn đặt lại mật khẩu tài khoản
          </p>
        </div>

        {status === 'success' ? (
          <div className="space-y-6">
            <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-lg flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-emerald-800 dark:text-emerald-200">
                <p className="font-semibold">Đã gửi hướng dẫn!</p>
                <p className="mt-1">
                  Nếu email <span className="font-medium">{email}</span> tồn tại trong hệ thống, bạn sẽ nhận được liên kết đặt lại mật khẩu trong vài phút.
                </p>
              </div>
            </div>

            <div className="pt-2">
              <Link href="/login" className="block">
                <Button variant="outline" className="w-full">
                  <ArrowLeft className="w-4 h-4 mr-2" /> Quay lại đăng nhập
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {status === 'error' && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 rounded-lg flex items-center gap-2 text-sm text-rose-700 dark:text-rose-300">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Email
              </label>
              <Input
                id="email"
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>

            <Button type="submit" className="w-full" disabled={status === 'loading'}>
              {status === 'loading' ? 'Đang gửi...' : 'Gửi liên kết khôi phục'}
            </Button>

            <div className="text-center pt-2">
              <Link
                href="/login"
                className="inline-flex items-center text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
              >
                <ArrowLeft className="w-4 h-4 mr-1.5" /> Quay lại đăng nhập
              </Link>
            </div>
          </form>
        )}
      </div>
    </main>
  );
}