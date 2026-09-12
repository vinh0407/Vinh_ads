import { ProductsController } from './products.controller';
import { AffiliateNetwork } from '@prisma/client';

describe('ProductsController (Product Ownership Routing)', () => {
  let controller: ProductsController;
  let productsService: any;

  beforeEach(() => {
    productsService = {
      create: jest.fn().mockResolvedValue({ id: 'prod-1' }),
      findAll: jest.fn().mockResolvedValue([{ id: 'prod-1' }]),
      findOne: jest.fn().mockResolvedValue({ id: 'prod-1' }),
      update: jest.fn().mockResolvedValue({ id: 'prod-1' }),
      delete: jest.fn().mockResolvedValue(undefined),
      addAffiliateLink: jest.fn().mockResolvedValue({ id: 'aff-1' }),
    };
    controller = new ProductsController(productsService);
  });

  it('delegates product creation with current user ID', async () => {
    // ARRANGE
    const userId = 'user-123';
    const dto = { name: 'Item', price: 10 as any, shopeeUrl: 'http://url' };

    // ACT
    const result = await controller.create(userId, dto as any);

    // ASSERT
    expect(productsService.create).toHaveBeenCalledWith('user-123', dto);
    expect(result).toEqual({ id: 'prod-1' });
  });

  it('delegates findAll scoped to current user', async () => {
    // ARRANGE
    const userId = 'user-123';

    // ACT
    const result = await controller.findAll(userId);

    // ASSERT
    expect(productsService.findAll).toHaveBeenCalledWith('user-123');
    expect(result).toHaveLength(1);
  });

  it('delegates findOne scoped to current user and product ID', async () => {
    // ARRANGE
    const userId = 'user-123';

    // ACT
    const result = await controller.findOne(userId, 'prod-1');

    // ASSERT
    expect(productsService.findOne).toHaveBeenCalledWith('user-123', 'prod-1');
    expect(result).toEqual({ id: 'prod-1' });
  });

  it('delegates update with current user ID', async () => {
    // ARRANGE
    const userId = 'user-123';
    const dto = { name: 'New Name' };

    // ACT
    const result = await controller.update(userId, 'prod-1', dto as any);

    // ASSERT
    expect(productsService.update).toHaveBeenCalledWith('user-123', 'prod-1', dto);
    expect(result).toEqual({ id: 'prod-1' });
  });

  it('delegates delete with current user ID', async () => {
    // ARRANGE
    const userId = 'user-123';

    // ACT
    await controller.delete(userId, 'prod-1');

    // ASSERT
    expect(productsService.delete).toHaveBeenCalledWith('user-123', 'prod-1');
  });

  it('delegates addAffiliateLink with current user ID and affiliate params', async () => {
    // ARRANGE
    const userId = 'user-123';
    const body = {
      network: AffiliateNetwork.SHOPEE,
      originalUrl: 'http://orig',
      affiliateUrl: 'http://aff',
    };

    // ACT
    const result = await controller.addAffiliateLink(userId, 'prod-1', body as any);

    // ASSERT
    expect(productsService.addAffiliateLink).toHaveBeenCalledWith(
      'user-123',
      'prod-1',
      AffiliateNetwork.SHOPEE,
      'http://orig',
      'http://aff',
    );
    expect(result).toEqual({ id: 'aff-1' });
  });
});
