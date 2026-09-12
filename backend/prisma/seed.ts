import { PrismaClient, UserStatus, Platform, SourceStatus, VideoStatus, AffiliateNetwork } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create demo user
  const passwordHash = await bcrypt.hash('demo123456', 12);
  
  const user = await prisma.user.upsert({
    where: { email: 'demo@example.com' },
    update: {},
    create: {
      email: 'demo@example.com',
      passwordHash,
      name: 'Demo User',
      status: UserStatus.ACTIVE,
    },
  });

  console.log('✅ Created demo user:', user.email);

  // Create user settings
  await prisma.userSettings.upsert({
    where: { userId: user.id },
    update: {},
    create: {
      userId: user.id,
      autoSync: true,
      defaultSyncInterval: 1800,
      notificationEnabled: true,
    },
  });

  // Create demo source page
  const sourcePage = await prisma.sourcePage.upsert({
    where: { 
      userId_platformPageId: { 
        userId: user.id, 
        platformPageId: 'demo-page-123' 
      } 
    },
    update: {},
    create: {
      userId: user.id,
      platform: Platform.FACEBOOK,
      platformPageId: 'demo-page-123',
      pageName: 'Demo Tech Page',
      pageUrl: 'https://facebook.com/demo.tech',
      syncEnabled: true,
      syncInterval: 1800,
      status: SourceStatus.ACTIVE,
    },
  });

  console.log('✅ Created demo source page:', sourcePage.pageName);

  // Create demo product
  const product = await prisma.product.upsert({
    where: { id: 'demo-product-1' },
    update: {},
    create: {
      id: 'demo-product-1',
      userId: user.id,
      name: 'Bluetooth Headphones XYZ',
      description: 'High quality wireless headphones',
      shopeeUrl: 'https://shopee.vn/product/123',
      imageUrl: 'https://example.com/headphones.jpg',
      price: 299000,
      currency: 'VND',
      category: 'Electronics',
      status: 'ACTIVE',
    },
  });

  await prisma.affiliateLink.upsert({
    where: { id: 'demo-affiliate-1' },
    update: {},
    create: {
      id: 'demo-affiliate-1',
      productId: product.id,
      network: AffiliateNetwork.SHOPEE,
      originalUrl: 'https://shopee.vn/product/123',
      affiliateUrl: 'https://shopee.vn/affiliate/xyz123',
    },
  });

  console.log('✅ Created demo product:', product.name);

  // Create demo caption template
  await prisma.captionTemplate.upsert({
    where: { id: 'demo-caption-1' },
    update: {},
    create: {
      id: 'demo-caption-1',
      userId: user.id,
      name: 'Default Caption',
      content: '🔥 {product_name}\n\nSản phẩm đang được quan tâm nhiều.\n\n👉 Xem sản phẩm:\n{affiliate_url}',
      isDefault: true,
    },
  });

  // Create demo comment template
  await prisma.commentTemplate.upsert({
    where: { id: 'demo-comment-1' },
    update: {},
    create: {
      id: 'demo-comment-1',
      userId: user.id,
      name: 'Default Comment',
      content: '🛒 Link sản phẩm:\n{affiliate_url}',
      isDefault: true,
    },
  });

  console.log('✅ Created demo templates');

  console.log('🎉 Seeding completed!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });