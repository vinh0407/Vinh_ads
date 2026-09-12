import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { AddAffiliateLinkDto } from './dto/add-affiliate-link.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('products')
@UseGuards(JwtAuthGuard)
export class ProductsController {
  constructor(private productsService: ProductsService) {}

  @Post()
  async create(
    @CurrentUser('id') userId: string,
    @Body() createProductDto: CreateProductDto,
  ) {
    return this.productsService.create(userId, createProductDto);
  }

  @Get()
  async findAll(@CurrentUser('id') userId: string) {
    return this.productsService.findAll(userId);
  }

  @Get(':id')
  async findOne(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.productsService.findOne(userId, id);
  }

  @Patch(':id')
  async update(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() updateProductDto: UpdateProductDto,
  ) {
    return this.productsService.update(userId, id, updateProductDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@CurrentUser('id') userId: string, @Param('id') id: string) {
    await this.productsService.delete(userId, id);
  }

  @Post(':id/affiliate-links')
  async addAffiliateLink(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body()
    body: AddAffiliateLinkDto,
  ) {
    return this.productsService.addAffiliateLink(
      userId,
      id,
      body.network,
      body.originalUrl,
      body.affiliateUrl,
    );
  }

  @Post('scrape-shopee')
  async scrapeShopee(
    @Body() body: { url: string; customSubId?: string },
  ) {
    return this.productsService.scrapeShopeeProduct(body.url, body.customSubId);
  }
}
