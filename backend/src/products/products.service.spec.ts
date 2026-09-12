import { NotFoundException } from '@nestjs/common';
import { ProductsService } from './products.service';
import { AffiliateNetwork } from '@prisma/client';

describe('ProductsService (Product Ownership & Cross-Tenant Isolation)', () => {
  let service: ProductsService;
  let prisma: any;

  beforeEach(() => {
    prisma = {
      product: {
        create: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      affiliateLink: {
        create: jest.fn(),
      },
    };
    service = new ProductsService(prisma);
  });

  describe('create product', () => {
    it('creates product attached to the authenticated user', async () => {
      // ARRANGE
      const userId = 'user-owner';
      const dto = {
        name: 'Wireless Earbuds',
        description: 'Noise cancelling',
        shopeeUrl: 'https://shopee.vn/product-1',
        price: 49.99 as any,
      };
      prisma.product.create.mockResolvedValue({
        id: 'prod-1',
        userId,
        ...dto,
        affiliateLinks: [],
      });

      // ACT
      const result = await service.create(userId, dto as any);

      // ASSERT
      expect(prisma.product.create).toHaveBeenCalledWith({
        data: { userId, ...dto, price: dto.price },
        include: { affiliateLinks: true },
      });
      expect(result.id).toBe('prod-1');
    });
  });

  describe('find products (user isolation)', () => {
    it('queries only products belonging to the requesting user', async () => {
      // ARRANGE
      const userId = 'user-owner';
      prisma.product.findMany.mockResolvedValue([{ id: 'prod-1', userId }]);

      // ACT
      const result = await service.findAll(userId);

      // ASSERT
      expect(prisma.product.findMany).toHaveBeenCalledWith({
        where: { userId },
        include: { affiliateLinks: true },
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toHaveLength(1);
    });

    it('returns product when requested by its owner', async () => {
      // ARRANGE
      const userId = 'user-owner';
      const product = { id: 'prod-1', userId, name: 'Item' };
      prisma.product.findFirst.mockResolvedValue(product);

      // ACT
      const result = await service.findOne(userId, 'prod-1');

      // ASSERT
      expect(prisma.product.findFirst).toHaveBeenCalledWith({
        where: { id: 'prod-1', userId },
        include: { affiliateLinks: true },
      });
      expect(result).toEqual(product);
    });

    it('rejects access and throws NotFoundException when product belongs to another user', async () => {
      // ARRANGE: another user trying to read this product
      prisma.product.findFirst.mockResolvedValue(null);

      // ACT & ASSERT
      await expect(service.findOne('attacker-user', 'victim-prod')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update product ownership', () => {
    it('updates product when requested by owner', async () => {
      // ARRANGE
      const userId = 'user-owner';
      prisma.product.findFirst.mockResolvedValue({ id: 'prod-1', userId });
      prisma.product.update.mockResolvedValue({ id: 'prod-1', name: 'Updated Name' });

      // ACT
      const result = await service.update(userId, 'prod-1', { name: 'Updated Name' } as any);

      // ASSERT
      expect(prisma.product.update).toHaveBeenCalledWith({
        where: { id: 'prod-1' },
        data: expect.objectContaining({ name: 'Updated Name' }),
        include: { affiliateLinks: true },
      });
      expect(result.name).toBe('Updated Name');
    });

    it('prevents another user from updating a product they do not own', async () => {
      // ARRANGE
      prisma.product.findFirst.mockResolvedValue(null);

      // ACT & ASSERT
      await expect(
        service.update('attacker-user', 'victim-prod', { name: 'Hacked' } as any),
      ).rejects.toThrow(NotFoundException);
      expect(prisma.product.update).not.toHaveBeenCalled();
    });
  });

  describe('delete product ownership', () => {
    it('deletes product when requested by owner', async () => {
      // ARRANGE
      const userId = 'user-owner';
      prisma.product.findFirst.mockResolvedValue({ id: 'prod-1', userId });
      prisma.product.delete.mockResolvedValue({ id: 'prod-1' });

      // ACT
      await service.delete(userId, 'prod-1');

      // ASSERT
      expect(prisma.product.delete).toHaveBeenCalledWith({ where: { id: 'prod-1' } });
    });

    it('prevents another user from deleting a product they do not own', async () => {
      // ARRANGE
      prisma.product.findFirst.mockResolvedValue(null);

      // ACT & ASSERT
      await expect(service.delete('attacker-user', 'victim-prod')).rejects.toThrow(
        NotFoundException,
      );
      expect(prisma.product.delete).not.toHaveBeenCalled();
    });
  });

  describe('affiliate links ownership', () => {
    it('creates affiliate link when product belongs to requesting user', async () => {
      // ARRANGE
      const userId = 'user-owner';
      prisma.product.findFirst.mockResolvedValue({ id: 'prod-1', userId });
      prisma.affiliateLink.create.mockResolvedValue({ id: 'aff-1', productId: 'prod-1' });

      // ACT
      const result = await service.addAffiliateLink(
        userId,
        'prod-1',
        AffiliateNetwork.SHOPEE,
        'https://shopee.vn/orig',
        'https://affiliate.shopee/link',
      );

      // ASSERT
      expect(prisma.affiliateLink.create).toHaveBeenCalledWith({
        data: {
          productId: 'prod-1',
          network: AffiliateNetwork.SHOPEE,
          originalUrl: 'https://shopee.vn/orig',
          affiliateUrl: 'https://affiliate.shopee/link',
        },
      });
      expect(result.id).toBe('aff-1');
    });

    it('rejects adding affiliate link to another user product', async () => {
      // ARRANGE
      prisma.product.findFirst.mockResolvedValue(null);

      // ACT & ASSERT
      await expect(
        service.addAffiliateLink(
          'attacker-user',
          'victim-prod',
          AffiliateNetwork.SHOPEE,
          'https://shopee.vn/orig',
          'https://affiliate.shopee/link',
        ),
      ).rejects.toThrow(NotFoundException);
      expect(prisma.affiliateLink.create).not.toHaveBeenCalled();
    });
  });
});
