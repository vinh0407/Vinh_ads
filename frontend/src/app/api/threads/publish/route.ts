import { NextResponse } from 'next/server';

const FALLBACK_THREADS_USER_ID = '28534125842893667';
const FALLBACK_THREADS_TOKEN = 'THAAT5ZAruEzOZABYll2a2JoVnoweDdWamZAPckgwcVpwMTJUY2hrZA0JlaEFVTVhBQVJ2dEdkYkQ4WkJJYUk0UnN2b3FwOHY0cXlqN0dJdm8teTBGaUhxTjhCUEN4V3pHVm1Rb0RidnJBOUpjemlUdWZA5WXpRNlhVTFdkUVhQMnhlVkRyT0NtamxZARGdaaS1HVVEZD';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      threadsUserId,
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

    const tokenToUse = (accessToken && accessToken.trim() && accessToken.length > 20 && !accessToken.startsWith('TH_FALLBACK'))
      ? accessToken.trim()
      : FALLBACK_THREADS_TOKEN;
    const targetUserId = (threadsUserId && threadsUserId.trim() && threadsUserId !== 'me')
      ? threadsUserId.trim()
      : FALLBACK_THREADS_USER_ID;

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

    // Step 1: Create Main Thread Container (IMAGE if mediaUrl provided, else TEXT)
    const forceTextOnlyMainPost = body.textOnlyMainPost === true;
    const containerParams = new URLSearchParams();
    containerParams.append('text', caption.trim());
    containerParams.append('access_token', tokenToUse);
    containerParams.append('reply_control', body.replyControl || 'everyone');

    if (body.linkAttachment) {
      containerParams.append('link_attachment', body.linkAttachment);
    }
    if (body.topicTag) {
      containerParams.append('topic_tag', body.topicTag);
    }

    if (!forceTextOnlyMainPost && mediaUrl && (mediaUrl.startsWith('http://') || mediaUrl.startsWith('https://'))) {
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
      const msg = err.message || '';
      let friendlyError = `🔑 Lỗi Meta Threads API: ${msg || 'Token Threads không hợp lệ.'}`;

      if (msg.includes('Invalid OAuth access token') || msg.includes('Cannot parse access token')) {
        friendlyError = `🔑 Meta Access Token Không Hợp Lệ: Chuỗi Token Threads hiện tại bị sai hoặc hết hạn. Vui lòng vào [Cài Đặt Hệ Thống -> Threads API] để dán Access Token mới vừa lấy từ Meta Developer Generator!`;
      }

      return NextResponse.json(
        {
          success: false,
          error: friendlyError,
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
    let commentErrorMsg: string | null = null;

    if (firstCommentEnabled && firstCommentText && firstCommentText.trim()) {
      try {
        // Wait 1.5s for Meta Threads backend to register and index the newly published thread container
        await new Promise((resolve) => setTimeout(resolve, 1500));

        const rawCommentBlocks = firstCommentText.trim().split(/(?:\s*---\s*|\n\n+)/).filter((c: string) => c.trim());
        const commentBlocks: string[] = [];
        for (const block of rawCommentBlocks) {
          if (block.length <= 490) {
            commentBlocks.push(block);
          } else {
            commentBlocks.push(block.slice(0, 487) + '...');
          }
        }
        const commentMedia = body.commentImageUrl || body.productImageUrl || (forceTextOnlyMainPost ? mediaUrl : null);

        for (let idx = 0; idx < commentBlocks.length; idx++) {
          const commentText = commentBlocks[idx].trim();
          let creationId: string | null = null;

          // Attempt 1: Try with media if idx === 0 and commentMedia is valid HTTP URL
          if (idx === 0 && commentMedia && (commentMedia.startsWith('http://') || commentMedia.startsWith('https://'))) {
            try {
              const replyMediaParams = new URLSearchParams();
              if (commentMedia.match(/\.(mp4|mov|webm)(\?.*)?$/i)) {
                replyMediaParams.append('media_type', 'VIDEO');
                replyMediaParams.append('video_url', commentMedia);
              } else {
                replyMediaParams.append('media_type', 'IMAGE');
                replyMediaParams.append('image_url', commentMedia);
              }
              replyMediaParams.append('text', commentText);
              replyMediaParams.append('reply_to_id', threadId);
              replyMediaParams.append('access_token', tokenToUse);

              const mediaRes = await fetch(`https://graph.threads.net/v1.0/${targetUserId}/threads`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: replyMediaParams,
              });
              const mediaJson = await mediaRes.json();
              if (mediaRes.ok && mediaJson.id) {
                creationId = mediaJson.id;
              }
            } catch (mediaErr) {
              console.warn('Threads media reply creation failed, falling back to text-only:', mediaErr);
            }
          }

          // Attempt 2: Fallback to TEXT-only reply container if media creation skipped or failed
          if (!creationId) {
            const replyTextParams = new URLSearchParams();
            replyTextParams.append('media_type', 'TEXT');
            replyTextParams.append('text', commentText);
            replyTextParams.append('reply_to_id', threadId);
            replyTextParams.append('access_token', tokenToUse);

            const textRes = await fetch(`https://graph.threads.net/v1.0/${targetUserId}/threads`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
              body: replyTextParams,
            });
            const textJson = await textRes.json();
            if (textRes.ok && textJson.id) {
              creationId = textJson.id;
            } else if (textJson.error) {
              console.error(`Threads reply container error (Comment #${idx + 1}):`, textJson.error);
              commentErrorMsg = textJson.error.message || 'Lỗi tạo container bình luận Meta Threads';
            }
          }

          // Publish reply container if creationId acquired
          if (creationId) {
            const replyPublishParams = new URLSearchParams();
            replyPublishParams.append('creation_id', creationId);
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
            } else if (replyPubJson.error) {
              console.error(`Threads reply publish error (Comment #${idx + 1}):`, replyPubJson.error);
            }
          }

          // Delay 500ms between comments to prevent Meta Graph API rate limiting
          if (idx < commentBlocks.length - 1) {
            await new Promise((resolve) => setTimeout(resolve, 500));
          }
        }
      } catch (commentErr: any) {
        console.error('Threads first comment publish error:', commentErr);
        commentErrorMsg = commentErr.message || 'Lỗi trong quá trình đăng bình luận';
      }
    }

    const message = publishedCommentCount > 0
      ? `🎉 Bài viết & ${publishedCommentCount} bình luận Shopee đã được xuất bản lên Meta Threads thành công!`
      : (commentErrorMsg ? `⚠️ Bài viết đã đăng, nhưng bình luận gặp lỗi: ${commentErrorMsg}` : '🎉 Bài viết Threads đã được xuất bản thành công!');

    return NextResponse.json({
      success: true,
      message,
      data: {
        threadId,
        commentId,
        publishedCommentCount,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Lỗi server khi gửi API tới Threads.' },
      { status: 500 }
    );
  }
}
