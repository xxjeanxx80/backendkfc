# Backend Source Code Structure

## 📁 Cấu Trúc Tổng Quan

```
src/
├── main.ts                    # Entry point của ứng dụng
├── app.module.ts              # Root module
├── app.controller.ts          # Root controller (health check)
├── app.service.ts            # Root service
│
├── auth/                      # Authentication & Authorization
│   ├── auth.controller.ts
│   ├── auth.service.ts
│   ├── auth.module.ts
│   ├── constants.ts
│   ├── guards/               # Authorization guards
│   ├── strategies/           # Passport strategies
│   └── decorators/           # Custom decorators
│
├── common/                    # Shared code across modules
│   └── filters/              # Exception filters
│
└── [modules]/                 # Business modules (xem bên dưới)
```

## 🏗️ Cấu Trúc Module Chuẩn

Mỗi business module nên có cấu trúc như sau:

```
[module-name]/
├── [module-name].controller.ts    # API endpoints
├── [module-name].service.ts       # Business logic
├── [module-name].module.ts        # Module configuration
├── dto/                           # Data Transfer Objects
│   ├── create-[module].dto.ts
│   └── update-[module].dto.ts
└── entities/                      # Database entities
    └── [entity].entity.ts
```

## 📦 Danh Sách Modules

### Core Modules
- **auth** - Authentication & Authorization
- **users** - User management
- **roles** - Role management
- **stores** - Store management

### Inventory Modules
- **items** - Item master data
- **inventory-batches** - Inventory batch tracking
- **inventory-transactions** - Inventory transaction history
- **goods-receipts** - Goods receipt notes (GRN)

### Procurement Modules
- **suppliers** - Supplier management
- **supplier-items** - Supplier-item mapping & pricing
- **procurement** - Purchase orders
- **stock-requests** - Stock replenishment requests

### Sales & Reporting
- **sales** - Sales transactions
- **reports** - Reporting & analytics

### Common
- **common** - Shared utilities (filters, guards, etc.)

## 🔍 Module Details

### ✅ Modules Có Cấu Trúc Đầy Đủ
- ✅ users
- ✅ roles
- ✅ stores
- ✅ items
- ✅ suppliers
- ✅ inventory-batches
- ✅ inventory-transactions
- ✅ goods-receipts
- ✅ procurement
- ✅ stock-requests
- ✅ sales

### ⚠️ Modules Đặc Biệt
- **supplier-items**: Module phụ, chỉ có service (không có controller riêng)
- **reports**: Module aggregation, không có entities (chỉ query từ modules khác)

## 📝 Naming Conventions

- **Files**: kebab-case (vd: `goods-receipts.service.ts`)
- **Classes**: PascalCase (vd: `GoodsReceiptsService`)
- **Variables**: camelCase (vd: `createGoodsReceiptDto`)
- **Constants**: UPPER_SNAKE_CASE (vd: `JWT_SECRET`)

## 🚀 Best Practices

1. **Mỗi module độc lập**: Module chỉ import những gì cần thiết
2. **DTO validation**: Sử dụng class-validator cho tất cả DTOs
3. **Error handling**: Sử dụng AllExceptionsFilter trong common/
4. **Authorization**: Sử dụng @Roles() decorator và RolesGuard
5. **Logging**: Sử dụng Logger từ @nestjs/common

## 🔐 Authentication Flow

1. User login → `POST /auth/login` → Returns JWT token
2. Include token in header: `Authorization: Bearer <token>`
3. JwtStrategy validates token → Adds user info to request
4. RolesGuard checks user role → Allows/denies access

## 📚 Thêm Module Mới

1. Tạo thư mục module
2. Tạo các file: controller, service, module
3. Tạo thư mục dto/ và entities/
4. Import module vào `app.module.ts`
5. Thêm routes vào controller với proper guards

