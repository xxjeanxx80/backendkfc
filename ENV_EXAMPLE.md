# Environment Variables Example

## Database Configuration (từ Railway MySQL)

```bash
DB_HOST=mysql.railway.internal
DB_PORT=3306
DB_USERNAME=root
DB_PASSWORD=your-password-from-railway
DB_DATABASE=railway
```

**Lưu ý**: Khi deploy trên Render, bạn cần dùng **Public Endpoint** của Railway MySQL thay vì `mysql.railway.internal`.

## Application Configuration

```bash
PORT=3001
NODE_ENV=production
JWT_SECRET=your-super-secret-jwt-key-min-32-characters-long
FRONTEND_URL=https://your-frontend.vercel.app
```

## Railway MySQL Variables Mapping

Railway cung cấp các biến sau, bạn cần map sang tên biến mà backend sử dụng:

| Railway Variable | Backend Variable | Mô tả |
|-----------------|------------------|-------|
| `MYSQLHOST` | `DB_HOST` | Host của MySQL database |
| `MYSQLPORT` | `DB_PORT` | Port của MySQL (thường là 3306) |
| `MYSQLUSER` | `DB_USERNAME` | Username để kết nối database |
| `MYSQLPASSWORD` | `DB_PASSWORD` | Password để kết nối database |
| `MYSQLDATABASE` | `DB_DATABASE` | Tên database |

## Cách lấy Public Endpoint từ Railway

1. Vào Railway Dashboard
2. Chọn MySQL service
3. Vào tab "Connect" hoặc "Public Networking"
4. Copy **Public Endpoint** (sẽ có dạng: `mysql.railway.app:3306` hoặc IP address)
5. Sử dụng endpoint này cho `DB_HOST` trên Render

## Generate JWT Secret

Để tạo JWT secret mạnh, bạn có thể dùng:

```bash
# Linux/Mac
openssl rand -base64 32

# Hoặc Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Hoặc sử dụng online tool: https://www.grc.com/passwords.htm

