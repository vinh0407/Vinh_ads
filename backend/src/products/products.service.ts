import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { AffiliateNetwork } from '@prisma/client';

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, createProductDto: CreateProductDto) {
    return this.prisma.product.create({
      data: {
        userId,
        ...createProductDto,
        price: createProductDto.price,
      },
      include: { affiliateLinks: true },
    });
  }

  async findAll(userId: string) {
    return this.prisma.product.findMany({
      where: { userId },
      include: { affiliateLinks: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(userId: string, id: string) {
    const product = await this.prisma.product.findFirst({
      where: { id, userId },
      include: { affiliateLinks: true },
    });
    if (!product) throw new NotFoundException('Product not found');
    return product;
  }

  async update(userId: string, id: string, updateProductDto: UpdateProductDto) {
    await this.findOne(userId, id);
    return this.prisma.product.update({
      where: { id },
      data: {
        ...updateProductDto,
        price: updateProductDto.price,
      },
      include: { affiliateLinks: true },
    });
  }

  async delete(userId: string, id: string) {
    await this.findOne(userId, id);
    return this.prisma.product.delete({ where: { id } });
  }

  async addAffiliateLink(
    userId: string,
    productId: string,
    network: AffiliateNetwork,
    originalUrl: string,
    affiliateUrl: string,
  ) {
    await this.findOne(userId, productId);
    return this.prisma.affiliateLink.create({
      data: { productId, network, originalUrl, affiliateUrl },
    });
  }

  /**
   * Scrapes Shopee product details from URL and generates a customized affiliate tracking URL.
   */
  async scrapeShopeeProduct(rawUrl: string, customSubId?: string) {
    if (!rawUrl || !rawUrl.trim()) {
      throw new Error('Vui lòng cung cấp URL sản phẩm Shopee hợp lệ');
    }

    const cleanUrl = rawUrl.trim();
    let name = 'Sản phẩm Shopee';
    let description = '';
    let price = 150000;
    let imageUrl = '';
    let category = 'Gia dụng & Đời sống';

    // Parse URL slug for smart title extraction fallback
    try {
      const parsedUrl = new URL(cleanUrl);
      const pathname = parsedUrl.pathname;
      const slugMatch = pathname.match(/\/([^/]+)-i\.\d+\.\d+/);
      if (slugMatch && slugMatch[1]) {
        name = decodeURIComponent(slugMatch[1])
          .replace(/-/g, ' ')
          .replace(/\b\w/g, (l) => l.toUpperCase());
      }
    } catch {}

    try {
      const response = await fetch(cleanUrl, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          'Accept-Language': 'vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7',
          Accept:
            'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        },
      });

      if (response.ok) {
        const html = await response.text();
        const cheerio = require('cheerio');
        const $ = cheerio.load(html);

        // Extract OpenGraph tags
        const ogTitle = $('meta[property="og:title"]').attr('content');
        const ogImage = $('meta[property="og:image"]').attr('content');
        const ogDesc = $('meta[property="og:description"]').attr('content');
        const ogPrice =
          $('meta[property="product:price:amount"]').attr('content') ||
          $('meta[property="og:price:amount"]').attr('content');

        if (ogTitle && ogTitle.trim()) {
          name = ogTitle.replace(/\|\s*Shopee.*$/i, '').trim();
        }
        if (ogImage && ogImage.trim()) {
          imageUrl = ogImage.trim();
        }
        if (ogDesc && ogDesc.trim()) {
          description = ogDesc.trim();
        }
        if (ogPrice && !isNaN(Number(ogPrice))) {
          price = Number(ogPrice);
        } else {
          // Look for price patterns in HTML
          const priceMatch = html.match(/"price":\s*(\d+)/i) ||
            html.match(/(\d{2,3}(?:\.\d{3})+)\s*(?:₫|đ)/i);
          if (priceMatch && priceMatch[1]) {
            const rawP = priceMatch[1].replace(/\./g, '');
            if (!isNaN(Number(rawP))) {
              price = Number(rawP);
            }
          }
        }
      }
    } catch (fetchErr) {
      // Fallback stays active if blocked by captcha or network
    }

    const subId = customSubId?.trim() || 'ach_auto';
    const affiliateUrl = `https://s.shopee.vn/affiliate?url=${encodeURIComponent(cleanUrl)}&sub_id=${encodeURIComponent(subId)}`;

    return {
      name,
      description,
      price,
      currency: 'VND',
      imageUrl,
      shopeeUrl: cleanUrl,
      affiliateUrl,
      category,
    };
  }
}
