import { NextResponse } from 'next/server';

const FALLBACK_THREADS_USER_ID = 'me';
const FALLBACK_THREADS_TOKEN = 'TH_FALLBACK_TOKEN_DEMO';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      threadsUserId = FALLBACK_THREADS_USER_ID,
      accessToken,
      caption,
      firstCommentText,
      firstCommentEnabled = true,
      mediaUrl,
    } = body;

    if (!caption || !caption.trim()) {
      return NextResponse.json(
        { success: false, error: 'Nội dung bài đăng Threads (caption) không được để trống.' },
        { status: 400 }
      );
    }

    const tokenToUse = (accessToken && accessToken.trim()) ? accessToken.trim() : FALLBACK_THREADS_TOKEN;
    const targetUserId = (threadsUserId && threadsUserId.trim()) ? threadsUserId.trim() : FALLBACK_THREADS_USER_ID;

    // Check if real token is provided
    const isRealToken = tokenToUse && !tokenToUse.startsWith('TH_FALLBACK');

    if (!isRealToken) {
      // Return simulated success for demo mode if token not set
      return NextResponse.json({
        success: true,
        message: '⚡ [Chế độ Demo/Mặc định] Đã mô phỏng đăng bài Threads thành công!',
        data: {
          threadId: `demo_thread_${Date.now()}`,
          commentId: firstCommentText ? `demo_thread_comment_${Date.now()}` : null,
          status: 'PUBLISHED_DEMO',
        },
      });
    }

    // --- REAL META THREADS GRAPH API PUBLISHING ---
    // Step 1: Create Container
    const containerParams = new URLSearchParams();
    containerParams.append('text', caption.trim());
    containerParams.append('access_token', tokenToUse);

    if (mediaUrl && (mediaUrl.startsWith('http://') || mediaUrl.startsWith('https://'))) {
      if (mediaUrl.match(/\.(mp4|mov|webm)(\?.*)?$/i)) {
        containerParams.append('media_type', 'VIDEO');
        containerParams.append('video_url', mediaUrl);
      } else {
        containerParams.append('media_type', 'IMAGE');
        containerParams.append('image_url', mediaUrl);
      }
    } else {
      containerParams.append('media_type', 'TEXT');
    }

    const containerRes = await fetch(`https://graph.threads.net/v1.0/${targetUserId}/threads`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: containerParams,
    });

    const containerJson = await containerRes.json();

    if (!containerRes.ok || containerJson.error) {
      const err = containerJson.error || {};
      return NextResponse.json(
        {
          success: false,
          error: `🔑 Lỗi Meta Threads API: ${err.message || 'Token Threads không hợp lệ hoặc thiếu quyền threads_content_publish.'}`,
          rawError: err,
        },
        { status: 400 }
      );
    }

    const containerId = containerJson.id;

    // Step 2: Publish Container
    const publishParams = new URLSearchParams();
    publishParams.append('creation_id', containerId);
    publishParams.append('access_token', tokenToUse);

    const publishRes = await fetch(`https://graph.threads.net/v1.0/${targetUserId}/threads_publish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: publishParams,
    });

    const publishJson = await publishRes.json();

    if (!publishRes.ok || publishJson.error) {
      const err = publishJson.error || {};
      return NextResponse.json(
        { success: false, error: `⚠️ Lỗi xuất bản Threads: ${err.message}`, rawError: err },
        { status: 400 }
      );
    }

    const threadId = publishJson.id;

    // Step 3: First comments reply (multi-comment support)
    let commentId: string | null = null;
    let publishedCommentCount = 0;
    if (firstCommentEnabled && firstCommentText && firstCommentText.trim()) {
      try {
        const commentBlocks = firstCommentText.trim().split(/\n\n+/).filter((c: string) => c.trim());

        for (let idx = 0; idx < commentBlocks.length; idx++) {
          const commentText = commentBlocks[idx].trim();
          const replyContainerParams = new URLSearchParams();
          replyContainerParams.append('media_type', 'TEXT');
          replyContainerParams.append('text', commentText);
          replyContainerParams.append('reply_to_id', threadId);
          replyContainerParams.append('access_token', tokenToUse);

          const replyContainerRes = await fetch(`https://graph.threads.net/v1.0/${targetUserId}/threads`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: replyContainerParams,
          });
          const replyContainerJson = await replyContainerRes.json();

          if (replyContainerRes.ok && replyContainerJson.id) {
            const replyPublishParams = new URLSearchParams();
            replyPublishParams.append('creation_id', replyContainerJson.id);
            replyPublishParams.append('access_token', tokenToUse);

            const replyPubRes = await fetch(`https://graph.threads.net/v1.0/${targetUserId}/threads_publish`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
              body: replyPublishParams,
            });
            const replyPubJson = await replyPubRes.json();
            if (replyPubRes.ok && replyPubJson.id) {
              if (!commentId) commentId = replyPubJson.id;
              publishedCommentCount++;
            }
          }
        }
      } catch (commentErr) {
        console.error('Threads first comment publish error:', commentErr);
      }
    }

    return NextResponse.json({
      success: true,
      message: '🎉 Bài viết & Bình luận Shopee đã được xuất bản lên Meta Threads thành công!',
      data: {
        threadId,
        commentId,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Lỗi server khi gửi API tới Threads.' },
      { status: 500 }
    );
  }
}
