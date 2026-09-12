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
import { Video as VideoIcon, Mail, Lock, User, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";

const registerSchema = z
  .object({
    name: z.string().min(2, "Tên phải có ít nhất 2 ký tự"),
    email: z.string().email("Email không hợp lệ"),
    password: z
      .string()
      .min(8, "Mật khẩu phải có ít nhất 8 ký tự")
      .regex(/[A-Z]/, "Mật khẩu phải có ít nhất 1 chữ hoa")
      .regex(/[a-z]/, "Mật khẩu phải có ít nhất 1 chữ thường")
      .regex(/[0-9]/, "Mật khẩu phải có ít nhất 1 số"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Mật khẩu xác nhận không khớp",
    path: ["confirmPassword"],
  });

type RegisterForm = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const router = useRouter();
  const { register } = useAuth();
  const [loading, setLoading] = useState(false);

  const form = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: "", email: "", password: "", confirmPassword: "" },
  });

  const onSubmit = async (data: RegisterForm) => {
    setLoading(true);
    try {
      await register(data.email, data.password, data.name);
      toast.success("Đăng ký thành công");
      router.push("/dashboard");
      router.refresh();
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, "Đăng ký thất bại"));
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
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">Tạo tài khoản</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2">
            Đăng ký để bắt đầu sử dụng Auto Content Hub
          </p>
        </div>

        <Card>
          <CardHeader className="text-center">
            <CardTitle>Đăng ký miễn phí</CardTitle>
            <CardDescription>
              Tạo tài khoản để bắt đầu tự động hóa đăng video
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <Input
                label="Họ tên"
                {...form.register("name")}
                placeholder="Nguyễn Văn A"
                error={form.formState.errors.name?.message}
              />
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
                helperText="Ít nhất 8 ký tự, có chữ hoa, chữ thường và số"
              />
              <Input
                label="Xác nhận mật khẩu"
                type="password"
                {...form.register("confirmPassword")}
                placeholder="••••••••"
                error={form.formState.errors.confirmPassword?.message}
              />
              <Button type="submit" className="w-full" disabled={loading}>
                <VideoIcon className="h-4 w-4 mr-2" />
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Tạo tài khoản"
                )}
              </Button>
            </form>
            <div className="mt-6 text-center">
              <p className="text-sm text-gray-500">
                Đã có tài khoản?{" "}
                <Link
                  href="/login"
                  className="text-primary-600 font-medium hover:underline"
                >
                  Đăng nhập ngay
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
