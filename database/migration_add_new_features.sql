-- Migration: Add new features for cost calculation, safety stock, and expiry warnings
-- Date: 2024

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

-- Indexes for performance
CREATE INDEX `IDX_sales_saleDate` ON `sales_transactions` (`saleDate`);
CREATE INDEX `IDX_batches_unitCost` ON `inventory_batches` (`unitCost`);
CREATE INDEX `IDX_items_safetyStock` ON `items` (`safetyStock`);

