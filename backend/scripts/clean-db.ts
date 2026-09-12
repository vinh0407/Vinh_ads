import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function cleanDatabase() {
  console.log('🧹 Bắt đầu dọn dẹp toàn bộ dữ liệu thử nghiệm trong cơ sở dữ liệu...');

  try {
    // Thứ tự xóa tôn trọng khóa ngoại (foreign keys)
    const steps = [
      { name: 'Chỉ số bài đăng (PostMetric)', op: () => prisma.postMetric.deleteMany() },
      { name: 'Sản phẩm gán bài đăng (PostProduct)', op: () => prisma.postProduct.deleteMany() },
      { name: 'Lịch đăng hẹn giờ (Schedule)', op: () => prisma.schedule.deleteMany() },
      { name: 'Bài đăng (Post)', op: () => prisma.post.deleteMany() },
      { name: 'Link tiếp thị liên kết (AffiliateLink)', op: () => prisma.affiliateLink.deleteMany() },
      { name: 'Sản phẩm (Product)', op: () => prisma.product.deleteMany() },
      { name: 'Hàng đợi xử lý video (VideoProcessingJob)', op: () => prisma.videoProcessingJob.deleteMany() },
      { name: 'Video đã nhập/render (Video)', op: () => prisma.video.deleteMany() },
      { name: 'Kênh nguồn theo dõi (SourcePage)', op: () => prisma.sourcePage.deleteMany() },
      { name: 'Fanpage Facebook kết nối (FacebookPage)', op: () => prisma.facebookPage.deleteMany() },
      { name: 'Mẫu Caption (CaptionTemplate)', op: () => prisma.captionTemplate.deleteMany() },
      { name: 'Mẫu Comment (CommentTemplate)', op: () => prisma.commentTemplate.deleteMany() },
      { name: 'Thông báo hệ thống (Notification)', op: () => prisma.notification.deleteMany() },
      { name: 'Nhật ký hoạt động (ActivityLog)', op: () => prisma.activityLog.deleteMany() },
      { name: 'Cấu hình người dùng (UserSettings)', op: () => prisma.userSettings.deleteMany() },
      { name: 'Tài khoản người dùng (User)', op: () => prisma.user.deleteMany() },
    ];

    for (const step of steps) {
      const res = await step.op();
      console.log(`  ✓ Đã xóa ${res.count} dòng từ ${step.name}`);
    }

    console.log('\n✨ Dọn dẹp hoàn tất! Toàn bộ cơ sở dữ liệu đã sạch 100%, sẵn sàng cho dữ liệu thực tế.');
  } catch (error) {
    console.error('❌ Lỗi khi dọn dẹp cơ sở dữ liệu:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

cleanDatabase();
