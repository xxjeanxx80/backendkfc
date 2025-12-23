# Hướng dẫn Start Backend

## Lỗi hiện tại
- Frontend không thể kết nối đến backend: `ERR_CONNECTION_REFUSED`
- Backend chưa được start hoặc đã crash

## Cách Start Backend

### Cách 1: Development Mode (Khuyến nghị cho development)
```bash
cd backend
npm run start:dev
```

Backend sẽ chạy ở: `http://localhost:3001`
- Tự động reload khi code thay đổi
- Hiển thị logs chi tiết

### Cách 2: Production Mode (Sau khi build)
```bash
cd backend
npm run build
npm run start:prod
```

### Cách 3: Start thông thường
```bash
cd backend
npm start
```

## Kiểm tra Backend đã chạy

1. Mở browser và truy cập: `http://localhost:3001`
   - Nếu thấy "Hello World!" → Backend đã chạy thành công

2. Kiểm tra API docs: `http://localhost:3001/api/docs`
   - Nếu thấy Swagger UI → Backend đã chạy thành công

3. Kiểm tra health check: `http://localhost:3001/health/db`
   - Nếu thấy `{"status":"UP"}` → Database connection OK

## Troubleshooting

### Lỗi: Port 3001 đã được sử dụng
```bash
# Tìm process đang dùng port 3001
netstat -ano | findstr :3001

# Kill process (thay PID bằng process ID thực tế)
taskkill /PID <PID> /F
```

### Lỗi: Database connection failed
- Kiểm tra file `.env` hoặc environment variables
- Đảm bảo MySQL đang chạy
- Kiểm tra credentials trong `.env`

### Lỗi: Module not found
```bash
cd backend
npm install
```

## Environment Variables cần thiết

Tạo file `.env` trong thư mục `backend`:

```env
DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=root
DB_PASSWORD=your_password
DB_DATABASE=kfc
NODE_ENV=development
PORT=3001
JWT_SECRET=your-secret-key
FRONTEND_URL=http://localhost:5173
```

## Sau khi start backend

1. Backend sẽ hiển thị logs trong terminal
2. Tìm dòng: `[Nest] ... Listening on: http://[::]:3001`
3. Mở frontend và thử login lại

