import { PrismaClient, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

const prisma = new PrismaClient();

function parseArgs(): { email?: string; password?: string; name?: string } {
  const args = process.argv.slice(2);
  const result: { email?: string; password?: string; name?: string } = {};

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--email' && args[i + 1]) {
      result.email = args[i + 1];
      i++;
    } else if (args[i] === '--password' && args[i + 1]) {
      result.password = args[i + 1];
      i++;
    } else if (args[i] === '--name' && args[i + 1]) {
      result.name = args[i + 1];
      i++;
    }
  }

  return result;
}

async function createAdmin() {
  console.log('👤 Khởi tạo tài khoản Quản trị viên (Admin) cho hệ thống thực tế...\n');

  const args = parseArgs();
  const email = args.email || process.env.ADMIN_EMAIL || 'admin@autocontenthub.vn';
  const password = args.password || process.env.ADMIN_PASSWORD || crypto.randomBytes(6).toString('hex') + '@2026';
  const name = args.name || process.env.ADMIN_NAME || 'System Administrator';

  try {
    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.user.upsert({
      where: { email },
      update: {
        name,
        passwordHash,
        status: UserStatus.ACTIVE,
      },
      create: {
        email,
        passwordHash,
        name,
        status: UserStatus.ACTIVE,
      },
    });

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

    console.log('====================================================');
    console.log('🎉 TẠO TÀI KHOẢN ADMIN THỰC TẾ THÀNH CÔNG!');
    console.log('====================================================');
    console.log(`• Tên hiển thị : ${name}`);
    console.log(`• Email        : ${email}`);
    console.log(`• Mật khẩu     : ${password}`);
    console.log('----------------------------------------------------');
    console.log('🌐 Đăng nhập tại: http://localhost:3001/login');
    console.log('⚠️  Lưu ý: Hãy lưu lại mật khẩu này ở nơi an toàn!');
    console.log('====================================================\n');
  } catch (error) {
    console.error('❌ Lỗi khi khởi tạo tài khoản Admin:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

createAdmin();
