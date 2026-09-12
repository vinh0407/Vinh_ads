import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, appId, appSecret, code, redirectUri, accessToken } = body;

    if (action === 'exchange_code') {
      if (!appId || !appSecret || !code || !redirectUri) {
        return NextResponse.json(
          { success: false, error: 'Thiếu thông tin appId, appSecret, code hoặc redirectUri.' },
          { status: 400 }
        );
      }

      const params = new URLSearchParams();
      params.append('client_id', appId);
      params.append('client_secret', appSecret);
      params.append('code', code);
      params.append('grant_type', 'authorization_code');
      params.append('redirect_uri', redirectUri);

      const res = await fetch('https://graph.threads.net/oauth/access_token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params,
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        return NextResponse.json(
          { success: false, error: data.error?.message || 'Lỗi đổi Code lấy Access Token.', raw: data },
          { status: 400 }
        );
      }

      return NextResponse.json({
        success: true,
        message: 'Đổi Code lấy Access Token thành công!',
        accessToken: data.access_token,
        userId: data.user_id,
      });
    }

    if (action === 'get_long_lived_token') {
      const tokenToExchange = accessToken || body.shortLivedToken;
      if (!appSecret || !tokenToExchange) {
        return NextResponse.json(
          { success: false, error: 'Thiếu appSecret hoặc accessToken để đổi Long-Lived Token.' },
          { status: 400 }
        );
      }

      const url = `https://graph.threads.net/access_token?grant_type=th_exchange_token&client_secret=${encodeURIComponent(
        appSecret
      )}&access_token=${encodeURIComponent(tokenToExchange)}`;

      const res = await fetch(url, { method: 'GET' });
      const data = await res.json();

      if (!res.ok || data.error) {
        return NextResponse.json(
          { success: false, error: data.error?.message || 'Lỗi lấy Long-Lived Token.', raw: data },
          { status: 400 }
        );
      }

      return NextResponse.json({
        success: true,
        message: '🎉 Lấy Long-Lived Access Token thành công (Thời hạn 60 ngày)!',
        accessToken: data.access_token,
        tokenType: data.token_type,
        expiresIn: data.expires_in,
      });
    }

    if (action === 'refresh_token') {
      if (!accessToken) {
        return NextResponse.json(
          { success: false, error: 'Thiếu accessToken để gia hạn.' },
          { status: 400 }
        );
      }

      const url = `https://graph.threads.net/refresh_access_token?grant_type=th_refresh_token&access_token=${encodeURIComponent(
        accessToken
      )}`;

      const res = await fetch(url, { method: 'GET' });
      const data = await res.json();

      if (!res.ok || data.error) {
        return NextResponse.json(
          { success: false, error: data.error?.message || 'Lỗi làm mới Access Token.', raw: data },
          { status: 400 }
        );
      }

      return NextResponse.json({
        success: true,
        message: '⚡ Gia hạn Threads Access Token thành công!',
        accessToken: data.access_token,
        tokenType: data.token_type,
        expiresIn: data.expires_in,
      });
    }

    return NextResponse.json({ success: false, error: 'Hành động không hợp lệ (action).' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Lỗi server xử lý OAuth Threads.' },
      { status: 500 }
    );
  }
}
