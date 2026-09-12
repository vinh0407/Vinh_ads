import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const accessToken = searchParams.get('access_token') || searchParams.get('token');
    const threadId = searchParams.get('thread_id');
    const type = searchParams.get('type') || 'account'; // 'account' | 'post' | 'quota'

    if (!accessToken || !accessToken.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: 'Thiếu access_token Meta Threads. Vui lòng cấu hình token trong Settings.',
          demoMode: true,
          data: {
            views: 12850,
            likes: 1940,
            replies: 280,
            reposts: 95,
            quotes: 42,
            followers_count: 5320,
            quota_usage: 12,
            quota_total: 250,
          },
        },
        { status: 200 }
      );
    }

    const cleanToken = accessToken.trim();

    // 1. Quota Limit Check
    if (type === 'quota') {
      const url = `https://graph.threads.net/v1.0/me/threads_publishing_limit?fields=quota_usage,config&access_token=${cleanToken}`;
      const res = await fetch(url);
      const json = await res.json();
      if (!res.ok || json.error) {
        return NextResponse.json({ success: false, error: json.error?.message || 'Lỗi kiểm tra quota.', raw: json }, { status: 400 });
      }
      return NextResponse.json({ success: true, data: json.data });
    }

    // 2. Post Insights
    if (type === 'post') {
      if (!threadId) {
        return NextResponse.json({ success: false, error: 'Thiếu thread_id để lấy chỉ số bài viết.' }, { status: 400 });
      }
      const metrics = 'views,likes,replies,reposts,quotes';
      const url = `https://graph.threads.net/v1.0/${threadId}/insights?metric=${metrics}&access_token=${cleanToken}`;
      const res = await fetch(url);
      const json = await res.json();
      if (!res.ok || json.error) {
        return NextResponse.json({ success: false, error: json.error?.message || 'Lỗi lấy chỉ số bài viết.', raw: json }, { status: 400 });
      }
      return NextResponse.json({ success: true, data: json.data });
    }

    // 3. Account Insights (Default)
    const metrics = 'views,likes,replies,reposts,quotes,followers_count';
    const url = `https://graph.threads.net/v1.0/me/threads_insights?metric=${metrics}&access_token=${cleanToken}`;
    const res = await fetch(url);
    const json = await res.json();

    if (!res.ok || json.error) {
      return NextResponse.json({ success: false, error: json.error?.message || 'Lỗi lấy chỉ số tài khoản Threads.', raw: json }, { status: 400 });
    }

    return NextResponse.json({ success: true, data: json.data });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Lỗi server khi gọi Threads Insights API.' },
      { status: 500 }
    );
  }
}
