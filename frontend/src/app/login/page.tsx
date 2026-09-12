"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/Card";
import { getApiErrorMessage } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Video as VideoIcon, Mail, Lock, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";

const loginSchema = z.object({
  email: z.string().email("Email không hợp lệ"),
  password: z.string().min(1, "Mật khẩu là bắt buộc"),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const { login, loginAsDemo } = useAuth();
  const [loading, setLoading] = useState(false);

  const form = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "vinh@gmail.com", password: "123456" },
  });

  const onSubmit = async (data: LoginForm) => {
    setLoading(true);
    try {
      await login(data.email, data.password);
      toast.success("Đăng nhập thành công");
      router.push("/dashboard");
      router.refresh();
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, "Đăng nhập thất bại"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center space-x-2 mb-6">
            <div className="h-10 w-10 rounded-lg bg-primary-600 flex items-center justify-center">
              <VideoIcon className="h-6 w-6 text-white" />
            </div>
            <span className="text-2xl font-bold text-slate-900 dark:text-slate-100">AutoHub</span>
          </Link>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">Đăng nhập</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2">
            Nhập thông tin để truy cập dashboard
          </p>
        </div>

        <Card>
          <CardHeader className="text-center">
            <CardTitle>Chào mừng trở lại</CardTitle>
            <CardDescription>
              Đăng nhập để tiếp tục sử dụng Auto Content Hub
            </CardDescription>
            <div className="mt-3 p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 text-left">
              <p className="text-xs font-mono font-semibold text-emerald-700 dark:text-emerald-400 mb-1">
                🔑 Tài khoản Quản trị Admin:
              </p>
              <div className="text-xs font-mono text-zinc-600 dark:text-zinc-300 space-y-0.5">
                <div>Email: <span className="font-bold text-zinc-900 dark:text-white">vinh@gmail.com</span></div>
                <div>Mật khẩu: <span className="font-bold text-zinc-900 dark:text-white">123456</span></div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <Input
                label="Email"
                type="email"
                {...form.register("email")}
                placeholder="user@example.com"
                error={form.formState.errors.email?.message}
              />
              <Input
                label="Mật khẩu"
                type="password"
                {...form.register("password")}
                placeholder="••••••••"
                error={form.formState.errors.password?.message}
              />
              <div className="flex items-center justify-between">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="text-sm text-slate-600 dark:text-slate-300">
                    Ghi nhớ đăng nhập
                  </span>
                </label>
                <Link
                  href="/forgot-password"
                  className="text-sm text-primary-600 hover:underline"
                >
                  Quên mật khẩu?
                </Link>
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                <VideoIcon className="h-4 w-4 mr-2" />
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Đăng nhập"
                )}
              </Button>

              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-slate-200 dark:border-slate-800" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white dark:bg-slate-900 px-2 text-slate-500">Hoặc</span>
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                className="w-full border-primary-500/30 text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-950/40"
                onClick={() => {
                  loginAsDemo();
                  toast.success("Đang vào giao diện Demo Content Hub!");
                  router.push("/dashboard");
                }}
              >
                ⚡ Khám phá ngay bản Demo (1-Click Demo)
              </Button>
            </form>
            <div className="mt-6 text-center">
              <p className="text-sm text-gray-500">
                Chưa có tài khoản?{" "}
                <Link
                  href="/register"
                  className="text-primary-600 font-medium hover:underline"
                >
                  Đăng ký ngay
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
