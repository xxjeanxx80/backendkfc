# Sửa lỗi Build trên Render

## Vấn đề
```
sh: 1: nest: not found
==> Build failed
```

## Nguyên nhân
`@nestjs/cli` chỉ có trong `devDependencies` và có thể không được cài đặt đúng cách trên Render.

## Giải pháp

### Cách 1: Đảm bảo devDependencies được cài đặt (Khuyến nghị)

Trong Render Dashboard → Settings → Build & Deploy:

**Build Command:**
```bash
npm ci && npm run build
```

Hoặc nếu vẫn lỗi, thử:
```bash
npm install --include=dev && npm run build
```

### Cách 2: Sử dụng TypeScript compiler trực tiếp

Nếu cách 1 không work, thay đổi build command thành:

**Build Command:**
```bash
npm install && npm run build:prod
```

Script `build:prod` đã được thêm vào `package.json` và sử dụng TypeScript compiler trực tiếp, không cần NestJS CLI.

### Cách 3: Di chuyển @nestjs/cli vào dependencies (Không khuyến nghị)

Nếu các cách trên không work, có thể di chuyển `@nestjs/cli` và `typescript` vào `dependencies`, nhưng điều này sẽ làm tăng kích thước production bundle không cần thiết.

## Cấu hình trên Render Dashboard

1. Vào **Settings** → **Build & Deploy**
2. **Build Command**: `npm ci && npm run build`
3. **Start Command**: `npm run start:prod`
4. **Node Version**: Chọn Node 18 hoặc 20

## Kiểm tra

Sau khi deploy, kiểm tra logs để đảm bảo:
- ✅ `npm ci` hoặc `npm install` chạy thành công
- ✅ `npm run build` hoặc `npm run build:prod` chạy thành công
- ✅ `dist/` folder được tạo với các file compiled
- ✅ `npm run start:prod` khởi động ứng dụng thành công

## Troubleshooting

### Nếu vẫn lỗi "nest: not found"

1. Kiểm tra Node version (nên dùng Node 18+)
2. Thử build command: `npm install --include=dev && npm run build`
3. Hoặc dùng: `npm run build:prod` (không cần nest CLI)

### Nếu lỗi TypeScript

Đảm bảo `typescript` được cài đặt trong `devDependencies` (đã có).

### Nếu lỗi "Cannot find module"

Kiểm tra `tsconfig.build.json` có đúng không và `outDir` được set thành `dist`.

