# Hướng dẫn Deploy Backend lên Render

## 📋 Yêu cầu trước khi deploy

1. ✅ Database MySQL đã được setup trên Railway
2. ✅ Đã có thông tin kết nối database từ Railway

## 🔧 Cấu hình Environment Variables trên Render

### 1. Database Variables (từ Railway)

Render sẽ tự động map các biến từ Railway, nhưng bạn cần map lại tên biến:

| Railway Variable | Render Variable | Giá trị từ Railway |
|-----------------|-----------------|-------------------|
| `MYSQLHOST` | `DB_HOST` | `mysql.railway.internal` |
| `MYSQLPORT` | `DB_PORT` | `3306` |
| `MYSQLUSER` | `DB_USERNAME` | `root` |
| `MYSQLPASSWORD` | `DB_PASSWORD` | `PiUevUgayNAqiNxNH1tNwSLdPiYKgPvG` |
| `MYSQLDATABASE` | `DB_DATABASE` | `railway` |

**Lưu ý**: Railway sử dụng `mysql.railway.internal` cho internal connection, nhưng khi deploy trên Render, bạn có thể cần dùng public endpoint của Railway.

### 2. Application Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `PORT` | Port để chạy ứng dụng (Render tự động set) | `10000` |
| `JWT_SECRET` | Secret key cho JWT token | `your-super-secret-jwt-key-change-this` |
| `NODE_ENV` | Môi trường | `production` |

### 3. CORS Configuration

Cần thêm domain của frontend vào CORS:

| Variable | Description | Example |
|----------|-------------|---------|
| `FRONTEND_URL` | URL của frontend (Vercel) | `https://your-frontend.vercel.app` |

## 🚀 Các bước deploy trên Render

### Bước 1: Tạo Web Service trên Render

1. Đăng nhập vào [Render Dashboard](https://dashboard.render.com)
2. Click "New +" → "Web Service"
3. Connect repository từ GitHub
4. Cấu hình:
   - **Name**: `kfc-backend` (hoặc tên bạn muốn)
   - **Region**: Chọn region gần nhất
   - **Branch**: `main` (hoặc branch bạn muốn deploy)
   - **Root Directory**: `backend` (nếu repo có cả frontend và backend)
   - **Runtime**: `Node`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm run start:prod`

### Bước 2: Cấu hình Environment Variables

Trong phần "Environment" của service, thêm các biến sau:

```bash
# Database (từ Railway)
DB_HOST=mysql.railway.internal
DB_PORT=3306
DB_USERNAME=root
DB_PASSWORD=PiUevUgayNAqiNxNH1tNwSLdPiYKgPvG
DB_DATABASE=railway

# Application
JWT_SECRET=your-super-secret-jwt-key-change-this-to-random-string
NODE_ENV=production

# CORS (thay bằng URL frontend thực tế của bạn)
FRONTEND_URL=https://your-frontend.vercel.app
```

**⚠️ QUAN TRỌNG**: 
- Thay `your-super-secret-jwt-key-change-this-to-random-string` bằng một chuỗi ngẫu nhiên mạnh
- Thay `https://your-frontend.vercel.app` bằng URL frontend thực tế của bạn

### Bước 3: Cấu hình Database Connection

**Vấn đề**: Railway cung cấp `mysql.railway.internal` cho internal connection, nhưng Render và Railway không cùng network.

**Giải pháp**: Sử dụng Public Endpoint của Railway:

1. Vào Railway Dashboard → MySQL service
2. Tìm "Public Networking" hoặc "Connect" tab
3. Copy **Public Endpoint** (sẽ có dạng: `mysql.railway.app:3306` hoặc IP address)
4. Cập nhật `DB_HOST` trên Render với public endpoint này

Hoặc nếu Railway có cung cấp connection string:
- Parse từ `MYSQL_URL`: `mysql://root:password@host:port/database`
- Extract các giá trị và set vào các biến tương ứng

### Bước 4: Deploy

1. Click "Create Web Service"
2. Render sẽ tự động build và deploy
3. Kiểm tra logs để đảm bảo không có lỗi
4. Kiểm tra health check: `https://your-backend.onrender.com/health/db`

## 🔍 Kiểm tra sau khi deploy

### 1. Health Check
```bash
curl https://your-backend.onrender.com/health/db
```

Kết quả mong đợi:
```json
{
  "status": "UP",
  "durationMs": 123
}
```

### 2. API Documentation
Truy cập: `https://your-backend.onrender.com/api/docs`

### 3. Test API Endpoint
```bash
curl https://your-backend.onrender.com/
```

Kết quả mong đợi: `Hello World!`

## ⚠️ Lưu ý quan trọng

### 1. Database Connection

**Vấn đề**: Railway và Render không cùng network, nên không thể dùng `mysql.railway.internal`.

**Giải pháp**:
- Sử dụng **Public Endpoint** của Railway MySQL
- Hoặc deploy cả backend và database trên cùng một platform (Render hoặc Railway)

### 2. CORS Configuration

File `main.ts` hiện chỉ cho phép localhost. Cần cập nhật để cho phép domain của frontend:

```typescript
origin: [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:3000',
  process.env.FRONTEND_URL, // Thêm dòng này
].filter(Boolean), // Loại bỏ undefined
```

### 3. JWT Secret

**QUAN TRỌNG**: Phải set `JWT_SECRET` trong environment variables, không được hardcode trong code.

### 4. Port

Render tự động set `PORT` environment variable, code đã sử dụng `process.env.PORT ?? 3001`.

### 5. Database Migration

Database schema đã được tạo từ file SQL. Đảm bảo:
- Database đã được tạo trên Railway
- Tables đã được tạo từ `backend/database/kfc.sql`
- `synchronize: false` trong `app.module.ts` (đã đúng)

## 🐛 Troubleshooting

### Lỗi: Cannot connect to database
- Kiểm tra `DB_HOST` có đúng public endpoint của Railway không
- Kiểm tra firewall rules trên Railway có cho phép connection từ Render không
- Kiểm tra `DB_PASSWORD` có đúng không

### Lỗi: CORS error
- Kiểm tra `FRONTEND_URL` đã được set đúng chưa
- Kiểm tra `main.ts` đã được cập nhật để dùng `FRONTEND_URL` chưa

### Lỗi: JWT secret missing
- Kiểm tra `JWT_SECRET` đã được set trong Render environment variables
- Kiểm tra `auth/constants.ts` có dùng `process.env.JWT_SECRET` không

### Build failed
- Kiểm tra Node.js version (Render hỗ trợ Node 18+)
- Kiểm tra `package.json` có đầy đủ dependencies không
- Xem build logs trên Render để biết lỗi cụ thể

## 📝 Checklist

- [ ] Database MySQL đã được setup trên Railway
- [ ] Đã có public endpoint của Railway MySQL
- [ ] Environment variables đã được set trên Render
- [ ] CORS đã được cấu hình để cho phép frontend domain
- [ ] JWT_SECRET đã được set (không dùng giá trị mặc định)
- [ ] Database schema đã được tạo từ SQL file
- [ ] Health check endpoint hoạt động
- [ ] API documentation có thể truy cập được

## 🎯 Kết luận

Backend **ĐÃ SẴN SÀNG** để deploy lên Render với điều kiện:
1. ✅ Code đã được chuẩn bị đầy đủ
2. ⚠️ Cần cập nhật CORS để cho phép frontend domain
3. ⚠️ Cần sử dụng public endpoint của Railway MySQL
4. ⚠️ Cần set JWT_SECRET trong environment variables

