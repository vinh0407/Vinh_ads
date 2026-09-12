import { ConflictException } from '@nestjs/common';
import { UsersService } from './users.service';

describe('UsersService', () => {
  it('returns conflict when changing an email to one already in use', async () => {
    const prisma = {
      user: {
        findUnique: jest
          .fn()
          .mockResolvedValueOnce({ id: 'user-1', email: 'old@example.com' })
          .mockResolvedValueOnce({ id: 'user-2', email: 'used@example.com' }),
        update: jest.fn(),
      },
    } as any;
    const service = new UsersService(prisma);

    await expect(
      service.updateProfile('user-1', { email: 'used@example.com' }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.user.update).not.toHaveBeenCalled();
  });
});
