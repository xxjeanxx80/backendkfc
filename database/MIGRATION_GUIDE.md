# Hướng Dẫn Migration Database

## 📋 Tổng Quan

File này hướng dẫn cách chạy migration để cập nhật database với các tính năng mới.

## 🗄️ Các Migration Hiện Tại

### Migration Mới Nhất: `migration_add_new_features.sql`

**Thêm các tính năng:**
1. **Cost Calculation** - Thêm fields tính giá vốn vào `sales_transactions`
2. **Unit Cost Tracking** - Thêm `unitCost` vào `inventory_batches`
3. **Safety Stock** - Thêm `safetyStock` và `leadTimeDays` vào `items`
4. **Indexes** - Thêm indexes để tối ưu performance

## 🚀 Cách Chạy Migration

### Bước 1: Backup Database

```bash
# Windows (PowerShell)
mysqldump -u root -p kfc_scm > backup_$(Get-Date -Format "yyyyMMdd").sql

# Linux/Mac
mysqldump -u root -p kfc_scm > backup_$(date +%Y%m%d).sql
```

### Bước 2: Chạy Migration

**Cách 1: Sử dụng Node.js script (Khuyến nghị)**

```bash
cd backend/database
node run_new_migration.js
```

Script này sẽ:
- Tự động đọc file `.env` để lấy database config
- Chạy migration SQL
- Verify các columns và indexes đã được tạo
- Hiển thị kết quả chi tiết

**Cách 2: Chạy SQL trực tiếp**

```bash
mysql -u root -p kfc_scm < backend/database/migration_add_new_features.sql
```

**Cách 3: Chạy từng lệnh trong MySQL client**

```sql
USE kfc_scm;

-- 1. Add cost price fields to sales_transactions
ALTER TABLE `sales_transactions`
ADD COLUMN `costPrice` DECIMAL(15,2) NULL AFTER `totalAmount`,
ADD COLUMN `totalCost` DECIMAL(15,2) NULL AFTER `costPrice`,
ADD COLUMN `grossProfit` DECIMAL(15,2) NULL AFTER `totalCost`;

-- 2. Add unit cost to inventory_batches
ALTER TABLE `inventory_batches`
ADD COLUMN `unitCost` DECIMAL(15,2) NULL AFTER `temperature`;

-- 3. Add safety stock and lead time to items
ALTER TABLE `items`
ADD COLUMN `safetyStock` DECIMAL(10,2) NULL AFTER `maxStockLevel`,
ADD COLUMN `leadTimeDays` INT NULL AFTER `safetyStock`;

-- 4. Create indexes for performance
CREATE INDEX `IDX_sales_saleDate` ON `sales_transactions` (`saleDate`);
CREATE INDEX `IDX_batches_unitCost` ON `inventory_batches` (`unitCost`);
CREATE INDEX `IDX_items_safetyStock` ON `items` (`safetyStock`);
```

### Bước 3: Verify Migration

Script `run_new_migration.js` sẽ tự động verify. Hoặc chạy thủ công:

```sql
USE kfc_scm;

-- Kiểm tra columns trong sales_transactions
SELECT COLUMN_NAME 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = 'kfc_scm' 
  AND TABLE_NAME = 'sales_transactions' 
  AND COLUMN_NAME IN ('costPrice', 'totalCost', 'grossProfit');

-- Kiểm tra columns trong inventory_batches
SELECT COLUMN_NAME 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = 'kfc_scm' 
  AND TABLE_NAME = 'inventory_batches' 
  AND COLUMN_NAME = 'unitCost';

-- Kiểm tra columns trong items
SELECT COLUMN_NAME 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = 'kfc_scm' 
  AND TABLE_NAME = 'items' 
  AND COLUMN_NAME IN ('safetyStock', 'leadTimeDays');

-- Kiểm tra indexes
SELECT INDEX_NAME 
FROM INFORMATION_SCHEMA.STATISTICS 
WHERE TABLE_SCHEMA = 'kfc_scm' 
  AND INDEX_NAME IN ('IDX_sales_saleDate', 'IDX_batches_unitCost', 'IDX_items_safetyStock');
```

## 📊 Chi Tiết Các Thay Đổi

### 1. Bảng `sales_transactions`

**Thêm columns:**
- `costPrice` (DECIMAL(15,2), NULL) - Giá vốn trung bình
- `totalCost` (DECIMAL(15,2), NULL) - Tổng giá vốn
- `grossProfit` (DECIMAL(15,2), NULL) - Lợi nhuận gộp

**Index:**
- `IDX_sales_saleDate` - Tối ưu query theo ngày bán

### 2. Bảng `inventory_batches`

**Thêm columns:**
- `unitCost` (DECIMAL(15,2), NULL) - Giá vốn đơn vị từ PO

**Index:**
- `IDX_batches_unitCost` - Tối ưu query theo giá vốn

### 3. Bảng `items`

**Thêm columns:**
- `safetyStock` (DECIMAL(10,2), NULL) - Tồn kho an toàn
- `leadTimeDays` (INT, NULL) - Thời gian chờ vận chuyển (ngày)

**Index:**
- `IDX_items_safetyStock` - Tối ưu query theo safety stock

## ⚠️ Lưu Ý Quan Trọng

1. **BACKUP TRƯỚC**: Luôn backup database trước khi chạy migration
2. **NULL Values**: Các fields mới sẽ là NULL cho records cũ (bình thường)
3. **Idempotent**: Migration có thể chạy nhiều lần an toàn (sẽ skip nếu column đã tồn tại)
4. **Performance**: Indexes sẽ được tạo tự động, có thể mất vài giây với database lớn

## 🔄 Rollback (Nếu Cần)

```sql
USE kfc_scm;

-- Xóa indexes
DROP INDEX `IDX_sales_saleDate` ON `sales_transactions`;
DROP INDEX `IDX_batches_unitCost` ON `inventory_batches`;
DROP INDEX `IDX_items_safetyStock` ON `items`;

-- Xóa columns từ sales_transactions
ALTER TABLE `sales_transactions`
DROP COLUMN `grossProfit`,
DROP COLUMN `totalCost`,
DROP COLUMN `costPrice`;

-- Xóa columns từ inventory_batches
ALTER TABLE `inventory_batches`
DROP COLUMN `unitCost`;

-- Xóa columns từ items
ALTER TABLE `items`
DROP COLUMN `leadTimeDays`,
DROP COLUMN `safetyStock`;
```

## ✅ Checklist

- [ ] Backup database
- [ ] Chạy migration trên dev environment
- [ ] Verify các columns đã được thêm
- [ ] Verify các indexes đã được tạo
- [ ] Test các tính năng mới (cost calculation, safety stock, etc.)
- [ ] Chạy migration trên production (nếu dev OK)

## 📝 Files Trong Thư Mục Database

- `kfc.sql` - Schema gốc của database
- `migration_add_new_features.sql` - Migration SQL mới nhất
- `run_new_migration.js` - Script Node.js để chạy migration
- `add_indexes.js` - Script để thêm indexes (nếu cần)
- `MIGRATION_GUIDE.md` - File này

## 🐛 Troubleshooting

### Lỗi: Column already exists
- **Nguyên nhân**: Migration đã chạy trước đó
- **Giải pháp**: Bỏ qua, đây là bình thường. Migration là idempotent.

### Lỗi: Cannot add index (duplicate)
- **Nguyên nhân**: Index đã tồn tại
- **Giải pháp**: Bỏ qua hoặc xóa index cũ trước.

### Lỗi: Table doesn't exist
- **Nguyên nhân**: Database chưa được tạo hoặc schema chưa đúng
- **Giải pháp**: Chạy `kfc.sql` trước để tạo schema gốc.

---

*Cập nhật lần cuối: 2024*
