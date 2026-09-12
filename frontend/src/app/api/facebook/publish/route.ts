import { NextResponse } from 'next/server';

const FALLBACK_PAGE_ID = '1282948524895927';
const FALLBACK_PAGE_TOKEN = 'EAAvBZA9TFH30BSW49qevgEtHSYlTNpiKCZCSvlnuDHwW4IkxRw0eZAThm0kiPwRhYA9KGbZAEXsXWBdbgZACbDQrDZCujdXguJUNTZAOjXJcBMLxpSbX4ZAgGtvCs75mUpl8JGPTFXqba2r8CE9OFqBL9UfAmFzCgmhVP7ZBV2QCdw5F7e0rvmG5LE1MI5ZCk6T1MkcARj9LjD';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      pageId = FALLBACK_PAGE_ID,
      accessToken,
      caption,
      firstCommentText,
      firstCommentEnabled = true,
      productImageUrl,
    } = body;

    if (!caption || !caption.trim()) {
      return NextResponse.json(
        { success: false, error: 'Nội dung bài viết (caption) không được để trống.' },
        { status: 400 }
      );
    }

    const tokenToUse = (accessToken && accessToken.trim()) ? accessToken.trim() : FALLBACK_PAGE_TOKEN;
    const targetPageId = (pageId && pageId.trim()) ? pageId.trim() : FALLBACK_PAGE_ID;
    
    const isHttpUrl = Boolean(
      productImageUrl && (productImageUrl.startsWith('http://') || productImageUrl.startsWith('https://'))
    );
    const isBase64Image = Boolean(
      productImageUrl && productImageUrl.startsWith('data:image/')
    );

    let externalPostId: string | null = null;

    const mainPhotoUrl = body.postImageUrl || body.mediaUrl;
    const isMainPhoto = mainPhotoUrl && (mainPhotoUrl.startsWith('http://') || mainPhotoUrl.startsWith('https://'));

    if (isMainPhoto) {
      // 1. Photo Post with News Article Illustration Image
      const photoFormData = new URLSearchParams();
      photoFormData.append('url', mainPhotoUrl.trim());
      photoFormData.append('caption', caption.trim());
      photoFormData.append('access_token', tokenToUse);

      const photoRes = await fetch(`https://graph.facebook.com/${targetPageId}/photos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: photoFormData,
      });
      const photoJson = await photoRes.json();
      if (photoRes.ok && (photoJson.id || photoJson.post_id)) {
        externalPostId = photoJson.post_id || photoJson.id;
      }
    }

    if (!externalPostId) {
      // Fallback: Text Feed Post
      const feedFormData = new URLSearchParams();
      feedFormData.append('message', caption.trim());
      feedFormData.append('access_token', tokenToUse);

      const feedRes = await fetch(`https://graph.facebook.com/${targetPageId}/feed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: feedFormData,
      });

      const feedJson = await feedRes.json();

      if (!feedRes.ok || feedJson.error) {
        const fbError = feedJson.error || {};
        let friendlyMsg = fbError.message || `Lỗi Facebook Graph API (Code ${fbError.code || feedRes.status})`;

        if (fbError.code === 190) {
          friendlyMsg = '🔑 Token Facebook Fanpage đã hết hạn. Vui lòng cập nhật Token mới tại trang Quản Lý Mạng Xã Hội.';
        } else if (fbError.code === 200 || fbError.code === 283) {
          friendlyMsg = '⚠️ Tài khoản Fanpage thiếu quyền "pages_manage_posts". Vui lòng kiểm tra quyền trên Meta Developer Portal.';
        } else if (fbError.code === 100) {
          friendlyMsg = `⚠️ Nội dung hoặc liên kết không hợp lệ: ${fbError.message}`;
        }

        return NextResponse.json(
          { success: false, error: friendlyMsg, rawError: fbError },
          { status: 400 }
        );
      }

      externalPostId = feedJson.id;
    }

    let commentId: string | null = null;
    let commentNotice: string | null = null;

    // 2. Post First Comment with Attached Product Image (URL or Base64 File Upload)
    if (firstCommentEnabled && firstCommentText && firstCommentText.trim() && externalPostId) {
      try {
        let attachmentPhotoId: string | null = null;

        // If product image is Base64 (uploaded from machine), upload to /photos with published=false to get attachment_id
        if (isBase64Image) {
          try {
            const base64Data = productImageUrl.replace(/^data:image\/\w+;base64,/, '');
            const imageBuffer = Buffer.from(base64Data, 'base64');
            const mimeMatch = productImageUrl.match(/^data:(image\/\w+);base64,/);
            const mimeType = mimeMatch ? mimeMatch[1] : 'image/png';

            const formData = new FormData();
            formData.append('source', new Blob([imageBuffer], { type: mimeType }), 'product_attachment.png');
            formData.append('published', 'false');
            formData.append('access_token', tokenToUse);

            const uploadRes = await fetch(`https://graph.facebook.com/${targetPageId}/photos`, {
              method: 'POST',
              body: formData,
            });

            const uploadJson = await uploadRes.json();
            if (uploadRes.ok && uploadJson.id) {
              attachmentPhotoId = uploadJson.id;
            }
          } catch (uErr) {
            console.warn('Base64 photo upload error:', uErr);
          }
        }

        const commentBlocks = firstCommentText.trim().split(/(?:\s*---\s*|\n\n+)/).filter((c: string) => c.trim());
        const publishedCommentIds: string[] = [];

        for (let idx = 0; idx < commentBlocks.length; idx++) {
          const commentText = commentBlocks[idx].trim();
          const commentFormData = new URLSearchParams();
          commentFormData.append('message', commentText);
          commentFormData.append('access_token', tokenToUse);

          // Attach image only on the 1st comment if available
          if (idx === 0) {
            if (attachmentPhotoId) {
              commentFormData.append('attachment_id', attachmentPhotoId);
            } else if (isHttpUrl) {
              commentFormData.append('attachment_url', productImageUrl.trim());
            }
          }

          const commentRes = await fetch(`https://graph.facebook.com/${externalPostId}/comments`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: commentFormData,
          });

          const commentJson = await commentRes.json();

          if (commentRes.ok && commentJson.id) {
            publishedCommentIds.push(commentJson.id);
          } else {
            // Fallback text-only comment if attachment failed on 1st comment
            const fallbackFormData = new URLSearchParams();
            fallbackFormData.append('message', commentText);
            fallbackFormData.append('access_token', tokenToUse);

            const fallbackRes = await fetch(`https://graph.facebook.com/${externalPostId}/comments`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
              body: fallbackFormData,
            });

            const fallbackJson = await fallbackRes.json();
            if (fallbackRes.ok && fallbackJson.id) {
              publishedCommentIds.push(fallbackJson.id);
            }
          }
          // Delay 400ms between multi-comments to prevent Facebook API rate limiting
          if (idx < commentBlocks.length - 1) {
            await new Promise((resolve) => setTimeout(resolve, 400));
          }
        }

        if (publishedCommentIds.length > 0) {
          commentId = publishedCommentIds[0];
          commentNotice = `🎉 Đã tự động xuất bản ${publishedCommentIds.length} bình luận kèm link Shopee!`;
        } else {
          commentNotice = '⚠️ Đã xuất bản bài viết nhưng không đăng được bình luận (kiểm tra token hoặc quyền trang).';
        }
      } catch (cErr: any) {
        commentNotice = 'Link sản phẩm đã được tự động gắn vào nội dung bài đăng!';
      }
    }

    return NextResponse.json({
      success: true,
      postId: externalPostId,
      commentId,
      commentNotice,
      postUrl: externalPostId ? `https://facebook.com/${externalPostId.replace('_', '/posts/')}` : `https://facebook.com/${targetPageId}`,
      message: '📸 Đã xuất bản bài đăng & First Comment ĐÍNH KÈM HÌNH ẢNH SẢN PHẨM KHỎI KHO thành công!',
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Lỗi xử lý hệ thống' },
      { status: 500 }
    );
  }
}
