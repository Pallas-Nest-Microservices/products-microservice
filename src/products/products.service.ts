import {
  HttpStatus,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { PaginationDto } from 'src/common';
import { RpcException } from '@nestjs/microservices';

@Injectable()
export class ProductsService extends PrismaClient implements OnModuleInit {
  private readonly logger = new Logger('ProductsService');

  onModuleInit() {
    this.$connect();
    this.logger.log('Connected to the database');
  }
  create(createProductDto: CreateProductDto) {
    return this.product.create({
      data: createProductDto,
    });
  }

  async findAll({ limit, page }: PaginationDto) {
    const products = await this.product.findMany({
      take: limit,
      skip: limit * (page - 1),
      where: { available: true },
    });

    const total = await this.product.count({ where: { available: true } });
    const totalPages = Math.ceil(total / limit);

    return {
      data: products,
      meta: { limit, page, totalPages, total },
    };
  }

  async findOne(id: number) {
    const product = await this.product.findUnique({
      where: { id, available: true },
    });

    if (!product)
      throw new RpcException({
        message: `Product with id ${id} not found`,
        status: HttpStatus.BAD_REQUEST,
      });

    return product;
  }

  async update(updateProductDto: UpdateProductDto) {
    await this.findOne(updateProductDto.id);

    return this.product.update({
      where: { id: updateProductDto.id },
      data: updateProductDto,
    });
  }

  async remove(id: number) {
    await this.findOne(id);

    return this.product.update({ where: { id }, data: { available: false } });
  }

  async validateProducts(ids: number[]) {
    ids = Array.from(new Set(ids));

    const products = await this.product.findMany({
      where: { id: { in: ids } },
    });

    if (products.length !== ids.length) {
      throw new RpcException({
        message: 'Some products were not found',
        status: HttpStatus.BAD_REQUEST,
      });
    }

    return products;
  }
}
