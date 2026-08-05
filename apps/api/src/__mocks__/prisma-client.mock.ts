export class PrismaClient {
  constructor(..._args: any[]) {}
  $connect = jest.fn();
  $disconnect = jest.fn();
  $transaction = jest.fn();
  user = {
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  };
}