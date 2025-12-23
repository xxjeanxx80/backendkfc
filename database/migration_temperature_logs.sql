-- Migration để tạo bảng temperature_logs nếu chưa tồn tại
-- Hoặc thêm cột createdAt nếu bảng đã tồn tại nhưng thiếu cột

-- Kiểm tra và tạo bảng nếu chưa tồn tại
CREATE TABLE IF NOT EXISTS `temperature_logs` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `batchId` INT NOT NULL,
  `temperature` FLOAT NOT NULL,
  `recordedAt` DATETIME NOT NULL,
  `isAlert` BOOLEAN DEFAULT FALSE,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`batchId`) REFERENCES `inventory_batches`(`id`) ON DELETE CASCADE,
  INDEX `idx_batchId` (`batchId`),
  INDEX `idx_recordedAt` (`recordedAt`),
  INDEX `idx_isAlert` (`isAlert`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Nếu bảng đã tồn tại nhưng thiếu cột createdAt, thêm cột đó
SET @dbname = DATABASE();
SET @tablename = 'temperature_logs';
SET @columnname = 'createdAt';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (TABLE_SCHEMA = @dbname)
      AND (TABLE_NAME = @tablename)
      AND (COLUMN_NAME = @columnname)
  ) > 0,
  'SELECT 1',
  CONCAT('ALTER TABLE ', @tablename, ' ADD COLUMN `', @columnname, '` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP')
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

