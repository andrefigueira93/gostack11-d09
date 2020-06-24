/* eslint-disable no-param-reassign */
import { inject, injectable } from 'tsyringe';

import AppError from '@shared/errors/AppError';

import IProductsRepository from '@modules/products/repositories/IProductsRepository';
import ICustomersRepository from '@modules/customers/repositories/ICustomersRepository';
import Order from '../infra/typeorm/entities/Order';
import IOrdersRepository from '../repositories/IOrdersRepository';

interface IProduct {
  id: string;
  quantity: number;
}

interface IRequest {
  customer_id: string;
  products: IProduct[];
}

@injectable()
class CreateOrderService {
  constructor(
    @inject('OrdersRepository')
    private ordersRepository: IOrdersRepository,
    @inject('ProductsRepository')
    private productsRepository: IProductsRepository,
    @inject('CustomersRepository')
    private customersRepository: ICustomersRepository,
  ) {}

  public async execute({ customer_id, products }: IRequest): Promise<Order> {
    const customer = await this.customersRepository.findById(customer_id);

    if (!customer) {
      throw new AppError('Customer does not exists');
    }

    const productsList = await this.productsRepository.findAllById(
      products.map(product => ({ id: product.id })),
    );

    if (productsList.length !== products.length) {
      throw new AppError('Invalid Products');
    }

    const stock = products.filter(product => {
      const stockedProduct = productsList.find(
        findProduct => findProduct.id === product.id,
      );

      return (
        stockedProduct &&
        stockedProduct.id === product.id &&
        stockedProduct.quantity - product.quantity < 0
      );
    });

    if (stock.length > 0) {
      throw new AppError('Some of ordered products are out of stock');
    }

    const requestedProducts = productsList.map(requestedProduct => {
      const productIndex = products.findIndex(
        product => product.id === requestedProduct.id,
      );

      return {
        product_id: requestedProduct.id,
        price: requestedProduct.price,
        quantity: products[productIndex].quantity,
      };
    });

    const order = await this.ordersRepository.create({
      customer,
      products: requestedProducts,
    });

    const requestedProductsNewQuantity = productsList.map(storedProduct => {
      const productIndex = products.findIndex(
        product => product.id === storedProduct.id,
      );

      storedProduct.quantity -= products[productIndex].quantity;

      return storedProduct;
    });

    await this.productsRepository.updateQuantity(requestedProductsNewQuantity);

    return order;
  }
}

export default CreateOrderService;
