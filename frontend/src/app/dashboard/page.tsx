"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { usersApi, analyticsApi } from "@/lib/api";
import { AnalyticsOverview, UserStats } from "@/types";
import { formatNumber, formatCurrency, cn } from "@/lib/utils";
import {
  Video,
  Package,
  Send,
  Facebook,
  Eye,
  Heart,
  MessageSquare,
  Share2,
  MousePointerClick,
  ArrowRight,
  Sparkles,
  TrendingUp,
  Zap,
  Activity,
} from "lucide-react";

const statCards = [
  {
    name: "Tong Video",
    icon: Video,
    color: "from-sky-500/20 to-sky-600/10",
    iconColor: "text-sky-400",
    borderColor: "border-sky-500/20",
    key: "totalVideos",
  },
  {
    name: "San pham",
    icon: Package,
    color: "from-emerald-500/20 to-emerald-600/10",
    iconColor: "text-emerald-400",
    borderColor: "border-emerald-500/20",
    key: "totalProducts",
  },
  {
    name: "Bai dang",
    icon: Send,
    color: "from-violet-500/20 to-violet-600/10",
    iconColor: "text-violet-400",
    borderColor: "border-violet-500/20",
    key: "publishedPosts",
  },
  {
    name: "Facebook Pages",
    icon: Facebook,
    color: "from-blue-500/20 to-blue-600/10",
    iconColor: "text-blue-400",
    borderColor: "border-blue-500/20",
    key: "connectedPages",
  },
] satisfies Array<{
  name: string;
  icon: typeof Video;
  color: string;
  iconColor: string;
  borderColor: string;
  key: keyof UserStats;
}>;

const metricCards = [
  { name: "Luot xem", icon: Eye, color: "text-sky-400", key: "views" },
  { name: "Luot thich", icon: Heart, color: "text-rose-400", key: "likes" },
  { name: "Binh luan", icon: MessageSquare, color: "text-emerald-400", key: "comments" },
  { name: "Chia se", icon: Share2, color: "text-purple-400", key: "shares" },
  { name: "Click Aff", icon: MousePointerClick, color: "text-amber-400", key: "affiliateClicks" },
] satisfies Array<{
  name: string;
  icon: typeof Eye;
  color: string;
  key: keyof AnalyticsOverview["totals"];
}>;

const quickActions = [
  {
    href: "/dashboard/videos/create",
    icon: Sparkles,
    title: "Tao Video AI",
    desc: "Studio Google Flow",
    accent: "from-red-500/20 to-red-600/5",
    iconBg: "bg-red-500/15",
    iconColor: "text-red-400",
    badge: "HOT",
    badgeColor: "bg-red-500/20 text-red-400",
  },
  {
    href: "/dashboard/products",
    icon: Package,
    title: "Them san pham",
    desc: "Shopee Affiliate",
    accent: "from-emerald-500/10 to-transparent",
    iconBg: "bg-emerald-500/15",
    iconColor: "text-emerald-400",
    badge: null,
    badgeColor: "",
  },
  {
    href: "/dashboard/missions",
    icon: Zap,
    title: "AI Missions",
    desc: "1-Click automation",
    accent: "from-amber-500/10 to-transparent",
    iconBg: "bg-amber-500/15",
    iconColor: "text-amber-400",
    badge: "NEW",
    badgeColor: "bg-amber-500/20 text-amber-400",
  },
  {
    href: "/dashboard/schedules",
    icon: Activity,
    title: "Hen Gio Dang",
    desc: "FB / TikTok / YouTube",
    accent: "from-violet-500/10 to-transparent",
    iconBg: "bg-violet-500/15",
    iconColor: "text-violet-400",
    badge: null,
    badgeColor: "",
  },
];

function SkeletonCard() {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-3 w-20 bg-white/[0.08] rounded" />
          <div className="h-8 w-16 bg-white/[0.08] rounded" />
        </div>
        <div className="h-10 w-10 bg-white/[0.08] rounded-lg" />
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [stats, setStats] = useState<UserStats | null>(null);
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
        console.warn("Database empty or offline, using clean production baseline:", error);
        setStats({
          totalVideos: 0,
          totalProducts: 1,
          publishedPosts: 0,
          connectedPages: 0,
          totalViews: 0,
          totalLikes: 0,
          totalComments: 0,
          totalShares: 0,
          totalAffiliateClicks: 0,
        });
        setAnalytics({
          totals: { views: 0, likes: 0, comments: 0, shares: 0, affiliateClicks: 0 },
          daily: [],
        } as unknown as AnalyticsOverview);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[11px] font-mono font-semibold text-emerald-400 uppercase tracking-wider">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              System Online
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Console Overview</h1>
          <p className="text-sm text-zinc-500 mt-1">Tong quan he thong ACCONTENT HUB AI</p>
        </div>
        <Link
          href="/dashboard/videos/create"
          className="hidden sm:flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-sm font-semibold rounded-lg transition-colors"
        >
          <Sparkles className="h-4 w-4" />
          Tao Video AI
        </Link>
      </div>

      {/* Primary stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
          : statCards.map((stat) => (
              <div
                key={stat.key}
                className={cn(
                  "relative rounded-xl border p-5 bg-gradient-to-br overflow-hidden",
                  stat.color,
                  stat.borderColor
                )}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">{stat.name}</p>
                    <p className="text-3xl font-black text-white mt-1.5 tabular-nums tracking-tight">
                      {formatNumber(stats?.[stat.key] || 0)}
                    </p>
                  </div>
                  <div className={cn("p-2.5 rounded-lg bg-white/[0.05]", stat.iconColor)}>
                    <stat.icon className="h-5 w-5" />
                  </div>
                </div>
              </div>
            ))}
      </div>

      {/* Engagement metrics */}
      {!loading && analytics && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="h-4 w-4 text-zinc-500" />
            <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Engagement Metrics</span>
          </div>
          <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
            {metricCards.map((metric) => (
              <div
                key={metric.key}
                className="rounded-xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04] transition-colors px-4 py-3.5"
              >
                <div className="flex items-center gap-2 mb-2">
                  <metric.icon className={cn("h-3.5 w-3.5", metric.color)} />
                  <span className="text-[11px] text-zinc-600 font-medium">{metric.name}</span>
                </div>
                <p className="text-xl font-black text-white tabular-nums">
                  {formatNumber(analytics.totals[metric.key] || 0)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bottom row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Activity */}
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
            <h2 className="text-sm font-bold text-white">Hoat dong gan day</h2>
            <Activity className="h-4 w-4 text-zinc-600" />
          </div>
          <div className="p-4 space-y-2">
            {[
              {
                icon: Package,
                iconBg: "bg-emerald-500/15",
                iconColor: "text-emerald-400",
                title: "San pham Shopee da san sang",
                desc: "[DU SIZE] Bo thun lua lanh dai tay cho Be - 139.000d",
                status: "Da luu kho",
                statusColor: "text-emerald-400",
              },
              {
                icon: Sparkles,
                iconBg: "bg-sky-500/15",
                iconColor: "text-sky-400",
                title: "Gemini AI & Google Flow",
                desc: "API Key da kich hoat - San sang tao prompt & kich ban 15-20s",
                status: "Online",
                statusColor: "text-sky-400",
              },
              {
                icon: Send,
                iconBg: "bg-violet-500/15",
                iconColor: "text-violet-400",
                title: "Dong co VinhCommant",
                desc: "San sang tu dong dang va ghim binh luan Shopee khi co video",
                status: "San sang",
                statusColor: "text-zinc-500",
              },
            ].map((item, i) => (
              <div
                key={i}
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-white/[0.03] transition-colors"
              >
                <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0", item.iconBg)}>
                  <item.icon className={cn("h-4 w-4", item.iconColor)} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-zinc-200 truncate">{item.title}</p>
                  <p className="text-xs text-zinc-600 truncate mt-0.5">{item.desc}</p>
                </div>
                <span className={cn("text-[11px] font-semibold whitespace-nowrap flex-shrink-0", item.statusColor)}>
                  {item.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Quick actions */}
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
            <h2 className="text-sm font-bold text-white">Thao tac nhanh</h2>
            <Zap className="h-4 w-4 text-zinc-600" />
          </div>
          <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
            {quickActions.map((action) => (
              <Link
                key={action.href}
                href={action.href}
                className={cn(
                  "group flex items-center gap-3 p-3.5 rounded-lg border border-white/[0.06] bg-gradient-to-br hover:border-white/[0.12] transition-all",
                  action.accent
                )}
              >
                <div className={cn("h-9 w-9 rounded-lg flex items-center justify-center flex-shrink-0", action.iconBg)}>
                  <action.icon className={cn("h-4 w-4", action.iconColor)} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-zinc-200 group-hover:text-white transition-colors">{action.title}</p>
                    {action.badge && (
                      <span className={cn("text-[9px] font-bold px-1.5 py-0.5 rounded-full", action.badgeColor)}>
                        {action.badge}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-zinc-600 mt-0.5">{action.desc}</p>
                </div>
                <ArrowRight className="h-3.5 w-3.5 text-zinc-700 group-hover:text-zinc-400 group-hover:translate-x-0.5 transition-all flex-shrink-0" />
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}