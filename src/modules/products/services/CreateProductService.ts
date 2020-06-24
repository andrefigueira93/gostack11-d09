import { inject, injectable } from 'tsyringe';

import AppError from '@shared/errors/AppError';

import { isNumber } from 'util';
import Product from '../infra/typeorm/entities/Product';
import IProductsRepository from '../repositories/IProductsRepository';

interface IRequest {
  name: string;
  price: number;
  quantity: number;
}

@injectable()
class CreateProductService {
  constructor(
    @inject('ProductsRepository')
    private productsRepository: IProductsRepository,
  ) {}

  public async execute({ name, price, quantity }: IRequest): Promise<Product> {
    if (!isNumber(price)) {
      throw new AppError('Invalid Price!');
    }

    if (await this.productsRepository.findByName(name)) {
      throw new AppError('This product already exists!');
    }

    return this.productsRepository.create({
      name,
      price,
      quantity,
    });
  }
}

export default CreateProductService;
