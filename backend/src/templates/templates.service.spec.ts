import { NotFoundException } from '@nestjs/common';
import { TemplatesService } from './templates.service';

describe('TemplatesService (Templates & Variable Substitution)', () => {
  let service: TemplatesService;
  let prisma: any;

  beforeEach(() => {
    prisma = {
      captionTemplate: {
        create: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
        delete: jest.fn(),
      },
      commentTemplate: {
        create: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
        delete: jest.fn(),
      },
    };
    service = new TemplatesService(prisma);
  });

  describe('default template exclusivity', () => {
    it('unsets previous default templates when creating a new default caption template', async () => {
      // ARRANGE
      const userId = 'user-1';
      const dto = { name: 'Promo', content: 'Check this {item}!', isDefault: true };
      prisma.captionTemplate.create.mockResolvedValue({ id: 'tmpl-new', userId, ...dto });

      // ACT
      const result = await service.createCaption(userId, dto as any);

      // ASSERT
      expect(prisma.captionTemplate.updateMany).toHaveBeenCalledWith({
        where: { userId, isDefault: true },
        data: { isDefault: false },
      });
      expect(prisma.captionTemplate.create).toHaveBeenCalledWith({
        data: { userId, ...dto },
      });
      expect(result.id).toBe('tmpl-new');
    });

    it('unsets previous default templates when updating a caption template to be default', async () => {
      // ARRANGE
      const userId = 'user-1';
      prisma.captionTemplate.findFirst.mockResolvedValue({ id: 'tmpl-1', userId });
      prisma.captionTemplate.update.mockResolvedValue({ id: 'tmpl-1', isDefault: true });

      // ACT
      const result = await service.updateCaption(userId, 'tmpl-1', { isDefault: true } as any);

      // ASSERT
      expect(prisma.captionTemplate.updateMany).toHaveBeenCalledWith({
        where: { userId, isDefault: true },
        data: { isDefault: false },
      });
      expect(prisma.captionTemplate.update).toHaveBeenCalledWith({
        where: { id: 'tmpl-1' },
        data: { isDefault: true },
      });
      expect(result.isDefault).toBe(true);
    });
  });

  describe('template rendering & placeholder substitution', () => {
    it('substitutes multiple variables correctly', async () => {
      // ARRANGE
      const userId = 'user-1';
      prisma.captionTemplate.findFirst.mockResolvedValue({
        id: 'tmpl-1',
        userId,
        content: 'Get {product} for only {price} at {store}!',
      });

      // ACT
      const rendered = await service.renderCaption(userId, 'tmpl-1', {
        product: 'Sneakers',
        price: '500.000đ',
        store: 'Shopee',
      });

      // ASSERT
      expect(rendered).toBe('Get Sneakers for only 500.000đ at Shopee!');
    });

    it('safely preserves literal dollar signs ($) in replacement values', async () => {
      // ARRANGE: price contains $ and $$ which would corrupt standard regex string replace
      const userId = 'user-1';
      prisma.captionTemplate.findFirst.mockResolvedValue({
        id: 'tmpl-1',
        userId,
        content: 'Special deal: {product} for only {price}!',
      });

      // ACT
      const rendered = await service.renderCaption(userId, 'tmpl-1', {
        product: 'Watch',
        price: '$99.99 (save $$!)',
      });

      // ASSERT
      expect(rendered).toBe('Special deal: Watch for only $99.99 (save $$!)!');
    });

    it('safely handles variable names containing special characters without regex errors', async () => {
      // ARRANGE: variable name contains dot or brackets
      const userId = 'user-1';
      prisma.captionTemplate.findFirst.mockResolvedValue({
        id: 'tmpl-1',
        userId,
        content: 'Value: {product.price}',
      });

      // ACT
      const rendered = await service.renderCaption(userId, 'tmpl-1', {
        'product.price': '100 USD',
      });

      // ASSERT
      expect(rendered).toBe('Value: 100 USD');
    });

    it('rejects rendering when template belongs to another user', async () => {
      // ARRANGE
      prisma.captionTemplate.findFirst.mockResolvedValue(null);

      // ACT & ASSERT
      await expect(
        service.renderCaption('attacker-user', 'victim-template', {}),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('template ownership isolation', () => {
    it('rejects finding another user caption template', async () => {
      // ARRANGE
      prisma.captionTemplate.findFirst.mockResolvedValue(null);

      // ACT & ASSERT
      await expect(service.findOneCaption('user-1', 'other-tmpl')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('rejects deleting another user caption template', async () => {
      // ARRANGE
      prisma.captionTemplate.findFirst.mockResolvedValue(null);

      // ACT & ASSERT
      await expect(service.deleteCaption('user-1', 'other-tmpl')).rejects.toThrow(
        NotFoundException,
      );
      expect(prisma.captionTemplate.delete).not.toHaveBeenCalled();
    });
  });
});
