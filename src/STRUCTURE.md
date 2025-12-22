# Cấu Trúc Thư Mục Backend - Chi Tiết

## 🎯 Nguyên Tắc Tổ Chức

1. **Mỗi module là một feature độc lập**
2. **Cấu trúc nhất quán** giữa các modules
3. **Shared code** nằm trong `common/`
4. **Không có file test** (.spec.ts) trong production code

## 📂 Cấu Trúc Chi Tiết

### Root Level
```
src/
├── main.ts                 # Bootstrap application
├── app.module.ts          # Root module - imports tất cả modules
├── app.controller.ts      # Health check endpoints
└── app.service.ts         # Root service
```

### Auth Module
```
auth/
├── auth.controller.ts      # Login, profile endpoints
├── auth.service.ts         # Authentication logic
├── auth.module.ts          # Module config
├── constants.ts            # JWT secret
├── guards/                 # Authorization
│   └── roles.guard.ts
├── strategies/             # Passport strategies
│   ├── jwt.strategy.ts
│   └── local.strategy.ts
└── decorators/             # Custom decorators
    └── roles.decorator.ts
```

### Common Module
```
common/
└── filters/
    └── all-exceptions.filter.ts  # Global exception handler
```

### Business Modules (Ví dụ: goods-receipts)
```
goods-receipts/
├── goods-receipts.controller.ts  # API endpoints
├── goods-receipts.service.ts     # Business logic
├── goods-receipts.module.ts       # Module config
├── dto/                           # Request/Response DTOs
│   ├── create-goods-receipt.dto.ts
│   └── update-goods-receipt.dto.ts
└── entities/                      # Database entities
    └── goods-receipt.entity.ts
```

## 📊 Module Categories

### 1. Core (Quản lý hệ thống)
- `auth` - Authentication
- `users` - Người dùng
- `roles` - Vai trò
- `stores` - Cửa hàng

### 2. Inventory (Quản lý tồn kho)
- `items` - Sản phẩm
- `inventory-batches` - Lô hàng
- `inventory-transactions` - Giao dịch tồn kho
- `goods-receipts` - Phiếu nhập kho

### 3. Procurement (Thu mua)
- `suppliers` - Nhà cung cấp
- `supplier-items` - Mapping nhà cung cấp - sản phẩm
- `procurement` - Đơn đặt hàng
- `stock-requests` - Yêu cầu bổ sung hàng

### 4. Sales & Analytics
- `sales` - Bán hàng
- `reports` - Báo cáo

## 🔄 Import Patterns

### Import từ module khác
```typescript
import { SomeService } from '../other-module/other-module.service';
```

### Import từ common
```typescript
import { AllExceptionsFilter } from '../common/filters/all-exceptions.filter';
```

### Import auth guards/decorators
```typescript
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
```

## ✅ Checklist Khi Tạo Module Mới

- [ ] Tạo thư mục module
- [ ] Tạo controller với proper guards
- [ ] Tạo service với business logic
- [ ] Tạo module file
- [ ] Tạo DTOs với validation
- [ ] Tạo entities với TypeORM decorators
- [ ] Import module vào app.module.ts
- [ ] Thêm Swagger tags (@ApiTags)
- [ ] Thêm proper error handling
- [ ] Thêm logging

## 🚫 Những Gì KHÔNG Nên Làm

- ❌ Không tạo file .spec.ts trong src/
- ❌ Không import trực tiếp từ node_modules trong service
- ❌ Không hardcode values, dùng constants hoặc config
- ❌ Không bỏ qua validation trong DTOs
- ❌ Không quên thêm guards cho protected endpoints

