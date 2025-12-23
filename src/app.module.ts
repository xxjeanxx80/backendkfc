import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { SuppliersModule } from './suppliers/suppliers.module';
import { ProcurementModule } from './procurement/procurement.module';
import { StoresModule } from './stores/stores.module';
import { RolesModule } from './roles/roles.module';
import { ItemsModule } from './items/items.module';
import { InventoryBatchesModule } from './inventory-batches/inventory-batches.module';
import { InventoryTransactionsModule } from './inventory-transactions/inventory-transactions.module';
import { GoodsReceiptsModule } from './goods-receipts/goods-receipts.module';
import { SupplierItemsModule } from './supplier-items/supplier-items.module';
import { StockRequestsModule } from './stock-requests/stock-requests.module';
import { SalesModule } from './sales/sales.module';
import { ReportsModule } from './reports/reports.module';
import { NotificationsModule } from './notifications/notifications.module';
import { TasksModule } from './tasks/tasks.module';
import { AdminModule } from './admin/admin.module';
import { TemperatureModule } from './temperature/temperature.module';
// Import all entities explicitly
import { User } from './users/entities/user.entity';
import { Role } from './roles/entities/role.entity';
import { Store } from './stores/entities/store.entity';
import { Item } from './items/entities/item.entity';
import { Supplier } from './suppliers/entities/supplier.entity';
import { PurchaseOrder, PurchaseOrderItem } from './procurement/entities/procurement.entity';
import { InventoryBatch } from './inventory-batches/entities/inventory-batch.entity';
import { InventoryTransaction } from './inventory-transactions/entities/inventory-transaction.entity';
import { GoodsReceipt, GoodsReceiptItem } from './goods-receipts/entities/goods-receipt.entity';
import { SupplierItem } from './supplier-items/entities/supplier-item.entity';
import { StockRequest } from './stock-requests/entities/stock-request.entity';
import { SalesTransaction } from './sales/entities/sales-transaction.entity';
import { TemperatureLog } from './temperature/entities/temperature-log.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'mysql',
        host: configService.get<string>('DB_HOST') || 'localhost',
        port: configService.get<number>('DB_PORT') || 3306,
        username: configService.get<string>('DB_USERNAME') || 'root',
        password: configService.get<string>('DB_PASSWORD') || '',
        database: configService.get<string>('DB_DATABASE') || 'kfc_scm',
        entities: [
          User,
          Role,
          Store,
          Item,
          Supplier,
          PurchaseOrder,
          PurchaseOrderItem,
          InventoryBatch,
          InventoryTransaction,
          GoodsReceipt,
          GoodsReceiptItem,
          SupplierItem,
          StockRequest,
          SalesTransaction,
          TemperatureLog,
        ],
        synchronize: false,
        logging: ['error', 'warn'],
        retryAttempts: 3,
        retryDelay: 2000,
      }),
      inject: [ConfigService],
    }),
    AuthModule,
    UsersModule,
    SuppliersModule,
    ProcurementModule,
    StoresModule,
    RolesModule,
    ItemsModule,
    InventoryBatchesModule,
    InventoryTransactionsModule,
    GoodsReceiptsModule,
    SupplierItemsModule,
    StockRequestsModule,
    SalesModule,
    ReportsModule,
    NotificationsModule,
    TasksModule,
    AdminModule,
    TemperatureModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
