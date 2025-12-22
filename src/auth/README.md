# Auth Module - Cấu Trúc

## 📁 Cấu Trúc Thư Mục

```
auth/
├── auth.controller.ts      # Controller xử lý login, profile
├── auth.service.ts         # Service xử lý authentication logic
├── auth.module.ts          # Module configuration
├── constants.ts            # JWT constants (secret key)
│
├── guards/                 # Authentication & Authorization Guards
│   └── roles.guard.ts     # Guard kiểm tra quyền truy cập theo role
│
├── strategies/             # Passport Strategies
│   ├── jwt.strategy.ts    # JWT authentication strategy
│   └── local.strategy.ts  # Local (username/password) strategy
│
└── decorators/             # Custom Decorators
    └── roles.decorator.ts  # @Roles() decorator để đánh dấu endpoint cần role nào
```

## 🔐 Cách Sử Dụng

### 1. Bảo vệ Endpoint với Role

```typescript
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('example')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class ExampleController {
  @Get()
  @Roles('STORE_MANAGER', 'ADMIN')
  getData() {
    // Chỉ STORE_MANAGER hoặc ADMIN mới truy cập được
  }
}
```

### 2. Login

```typescript
POST /auth/login
Body: { username: "admin", password: "password" }
Response: { access_token: "...", user: {...} }
```

### 3. Lấy Profile

```typescript
GET /auth/profile
Headers: Authorization: Bearer <token>
Response: { userId: 1, username: "admin", role: "ADMIN" }
```

## 📝 File .spec.ts là gì?

File `.spec.ts` là **test files** (Jest unit tests). Nếu bạn không cần test, có thể xóa chúng:
- `auth.controller.spec.ts`
- `auth.service.spec.ts`

Chúng không ảnh hưởng đến code chạy, chỉ dùng để test.

