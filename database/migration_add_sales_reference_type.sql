-- Migration: Thêm 'SALES' vào enum referenceType trong bảng inventory_transactions
-- Date: 2025-12-22

USE kfc_scm;

-- Kiểm tra và thêm 'SALES' vào enum referenceType
ALTER TABLE `inventory_transactions` 
MODIFY COLUMN `referenceType` enum('PO','GRN','ADJUSTMENT','SALES') COLLATE utf8mb4_unicode_ci NOT NULL;

