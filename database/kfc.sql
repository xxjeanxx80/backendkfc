-- --------------------------------------------------------
-- Host:                         127.0.0.1
-- Server version:               8.0.30 - MySQL Community Server - GPL
-- Server OS:                    Win64
-- HeidiSQL Version:             12.1.0.6537
-- --------------------------------------------------------

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET NAMES utf8 */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;


-- Dumping database structure for kfc_scm
CREATE DATABASE IF NOT EXISTS `kfc_scm` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci */ /*!80016 DEFAULT ENCRYPTION='N' */;
USE `kfc_scm`;

-- Dumping structure for table kfc_scm.goods_receipts
CREATE TABLE IF NOT EXISTS `goods_receipts` (
  `id` int NOT NULL AUTO_INCREMENT,
  `grnNumber` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `poId` int NOT NULL,
  `receivedDate` datetime NOT NULL,
  `receivedBy` int DEFAULT NULL,
  `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `deletedAt` datetime(6) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `IDX_a4bea96567327d364aadf77859` (`grnNumber`),
  KEY `FK_ce16e0f721f4f895e10199f3351` (`poId`),
  KEY `FK_95cbd9e1a9b8ec9c4309b2f4af2` (`receivedBy`),
  CONSTRAINT `FK_95cbd9e1a9b8ec9c4309b2f4af2` FOREIGN KEY (`receivedBy`) REFERENCES `users` (`id`),
  CONSTRAINT `FK_ce16e0f721f4f895e10199f3351` FOREIGN KEY (`poId`) REFERENCES `purchase_orders` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Dumping data for table kfc_scm.goods_receipts: ~2 rows (approximately)
INSERT INTO `goods_receipts` (`id`, `grnNumber`, `poId`, `receivedDate`, `receivedBy`, `createdAt`, `deletedAt`) VALUES
	(1, 'GRN-20231220-001', 1, '2025-12-20 17:37:55', 3, '2025-12-20 17:37:55.829037', NULL),
	(2, 'GRN-20231218-002', 2, '2025-12-20 17:37:55', 3, '2025-12-20 17:37:55.829037', NULL);

-- Dumping structure for table kfc_scm.goods_receipt_items
CREATE TABLE IF NOT EXISTS `goods_receipt_items` (
  `id` int NOT NULL AUTO_INCREMENT,
  `grnId` int NOT NULL,
  `itemId` int NOT NULL,
  `batchNo` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `expiryDate` datetime(6) NOT NULL,
  `receivedQty` int NOT NULL,
  `deletedAt` datetime(6) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `FK_7a618ff0e133f6c4533cf36e87f` (`grnId`),
  KEY `FK_dbde794826e06a9d408c7949e6a` (`itemId`),
  CONSTRAINT `FK_7a618ff0e133f6c4533cf36e87f` FOREIGN KEY (`grnId`) REFERENCES `goods_receipts` (`id`) ON DELETE CASCADE,
  CONSTRAINT `FK_dbde794826e06a9d408c7949e6a` FOREIGN KEY (`itemId`) REFERENCES `items` (`id`),
  CONSTRAINT `goods_receipt_items_chk_1` CHECK ((`receivedQty` > 0))
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Dumping data for table kfc_scm.goods_receipt_items: ~2 rows (approximately)
INSERT INTO `goods_receipt_items` (`id`, `grnId`, `itemId`, `batchNo`, `expiryDate`, `receivedQty`, `deletedAt`) VALUES
	(1, 1, 1, 'BATCH-CHK-20231201', '2024-06-01 00:00:00.000000', 500, NULL),
	(2, 2, 3, 'BATCH-COKE-20231020', '2024-04-20 00:00:00.000000', 10, NULL);

-- Dumping structure for table kfc_scm.inventory_batches
CREATE TABLE IF NOT EXISTS `inventory_batches` (
  `id` int NOT NULL AUTO_INCREMENT,
  `itemId` int NOT NULL,
  `batchNo` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `expiryDate` datetime(6) NOT NULL,
  `quantityOnHand` int NOT NULL DEFAULT '0',
  `temperature` float DEFAULT NULL,
  `unitCost` decimal(15,2) DEFAULT NULL,
  `status` enum('in_stock','low_stock','out_of_stock','expired') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'in_stock',
  `storeId` int NOT NULL,
  `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `deletedAt` datetime(6) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `IDX_42c4104ea1e6abba3d7dcc7f7c` (`storeId`,`batchNo`),
  KEY `FK_c9ed1acce356a32720c52671826` (`itemId`),
  KEY `IDX_batches_unitCost` (`unitCost`),
  CONSTRAINT `FK_c9ed1acce356a32720c52671826` FOREIGN KEY (`itemId`) REFERENCES `items` (`id`),
  CONSTRAINT `FK_db4b81ed7d2976844d016b1556f` FOREIGN KEY (`storeId`) REFERENCES `stores` (`id`),
  CONSTRAINT `inventory_batches_chk_1` CHECK ((`quantityOnHand` >= 0)),
  CONSTRAINT `inventory_batches_chk_2` CHECK (((`temperature` is null) or (`temperature` between -(30) and 50)))
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Dumping data for table kfc_scm.inventory_batches: ~4 rows (approximately)
INSERT INTO `inventory_batches` (`id`, `itemId`, `batchNo`, `expiryDate`, `quantityOnHand`, `temperature`, `unitCost`, `status`, `storeId`, `createdAt`, `updatedAt`, `deletedAt`) VALUES
	(1, 1, 'BATCH-CHK-20231201', '2024-06-01 00:00:00.000000', 500, -18, NULL, 'in_stock', 1, '2025-12-20 17:37:55.840968', '2025-12-20 17:37:55.840968', NULL),
	(2, 2, 'BATCH-POT-20231115', '2024-11-15 00:00:00.000000', 200, -18, NULL, 'in_stock', 1, '2025-12-20 17:37:55.840968', '2025-12-20 17:37:55.840968', NULL),
	(3, 3, 'BATCH-COKE-20231020', '2024-04-20 00:00:00.000000', 10, NULL, NULL, 'in_stock', 1, '2025-12-20 17:37:55.840968', '2025-12-20 17:37:55.840968', NULL),
	(4, 4, 'BATCH-VEG-20231225', '2023-12-30 00:00:00.000000', 5, 4, NULL, 'low_stock', 1, '2025-12-20 17:37:55.840968', '2025-12-20 17:37:55.840968', NULL);

-- Dumping structure for table kfc_scm.inventory_transactions
CREATE TABLE IF NOT EXISTS `inventory_transactions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `batchId` int NOT NULL,
  `itemId` int NOT NULL,
  `transactionType` enum('RECEIPT','ISSUE','ADJUSTMENT') COLLATE utf8mb4_unicode_ci NOT NULL,
  `quantity` int NOT NULL,
  `referenceType` enum('PO','GRN','ADJUSTMENT','SALES') COLLATE utf8mb4_unicode_ci NOT NULL,
  `referenceId` int DEFAULT NULL,
  `createdBy` int DEFAULT NULL,
  `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `FK_95d7efce048d5dcb6d9aa59a248` (`batchId`),
  KEY `FK_d027ed40e39e81b95d21a3e8c98` (`itemId`),
  KEY `FK_8927d776cb7bd98e563a51b2a26` (`createdBy`),
  CONSTRAINT `FK_8927d776cb7bd98e563a51b2a26` FOREIGN KEY (`createdBy`) REFERENCES `users` (`id`),
  CONSTRAINT `FK_95d7efce048d5dcb6d9aa59a248` FOREIGN KEY (`batchId`) REFERENCES `inventory_batches` (`id`),
  CONSTRAINT `FK_d027ed40e39e81b95d21a3e8c98` FOREIGN KEY (`itemId`) REFERENCES `items` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Dumping data for table kfc_scm.inventory_transactions: ~4 rows (approximately)
INSERT INTO `inventory_transactions` (`id`, `batchId`, `itemId`, `transactionType`, `quantity`, `referenceType`, `referenceId`, `createdBy`, `createdAt`) VALUES
	(1, 1, 1, 'RECEIPT', 500, 'GRN', 1, 3, '2025-12-20 17:37:55.846923'),
	(2, 2, 2, 'RECEIPT', 200, 'ADJUSTMENT', NULL, 3, '2025-12-20 17:37:55.846923'),
	(3, 3, 3, 'RECEIPT', 10, 'GRN', 2, 3, '2025-12-20 17:37:55.846923'),
	(4, 4, 4, 'RECEIPT', 5, 'ADJUSTMENT', NULL, 3, '2025-12-20 17:37:55.846923');

-- Dumping structure for table kfc_scm.items
CREATE TABLE IF NOT EXISTS `items` (
  `id` int NOT NULL AUTO_INCREMENT,
  `itemName` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `sku` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `category` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `unit` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `minStockLevel` int NOT NULL DEFAULT '10',
  `maxStockLevel` int NOT NULL DEFAULT '100',
  `safetyStock` decimal(10,2) DEFAULT NULL,
  `leadTimeDays` int DEFAULT NULL,
  `isActive` tinyint NOT NULL DEFAULT '1',
  `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `deletedAt` datetime(6) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `IDX_ed4485e4da7cc242cf46db2e3a` (`sku`),
  KEY `IDX_items_safetyStock` (`safetyStock`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Dumping data for table kfc_scm.items: ~4 rows (approximately)
INSERT INTO `items` (`id`, `itemName`, `sku`, `category`, `unit`, `minStockLevel`, `maxStockLevel`, `safetyStock`, `leadTimeDays`, `isActive`, `createdAt`, `updatedAt`, `deletedAt`) VALUES
	(1, 'Frozen Chicken Wings', 'CHK-WINGS-001', 'Meat', 'kg', 100, 1000, NULL, NULL, 1, '2025-12-20 17:37:55.809886', '2025-12-20 17:37:55.809886', NULL),
	(2, 'French Fries (Shoestring)', 'POT-FRIES-001', 'Frozen', 'kg', 50, 500, NULL, NULL, 1, '2025-12-20 17:37:55.809886', '2025-12-20 17:37:55.809886', NULL),
	(3, 'Coca Cola Syrup', 'BEV-COKE-001', 'Beverage', 'box', 5, 50, NULL, NULL, 1, '2025-12-20 17:37:55.809886', '2025-12-20 17:37:55.809886', NULL),
	(4, 'Fresh Iceberg Lettuce', 'VEG-LET-001', 'Vegetables', 'kg', 10, 30, NULL, NULL, 1, '2025-12-20 17:37:55.809886', '2025-12-20 17:37:55.809886', NULL);

-- Dumping structure for table kfc_scm.purchase_orders
CREATE TABLE IF NOT EXISTS `purchase_orders` (
  `id` int NOT NULL AUTO_INCREMENT,
  `orderDate` datetime NOT NULL,
  `expectedDeliveryDate` datetime(6) DEFAULT NULL,
  `status` enum('draft','pending_approval','approved','sent','confirmed','delivered','cancelled') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'draft',
  `totalAmount` decimal(15,2) NOT NULL DEFAULT '0.00',
  `supplierId` int NOT NULL,
  `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `storeId` int NOT NULL,
  `poNumber` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `notes` text COLLATE utf8mb4_unicode_ci,
  `approvedBy` int DEFAULT NULL,
  `approvedAt` datetime(6) DEFAULT NULL,
  `rejectionReason` text COLLATE utf8mb4_unicode_ci,
  `confirmedBy` int DEFAULT NULL,
  `confirmedAt` datetime(6) DEFAULT NULL,
  `actualDeliveryDate` datetime(6) DEFAULT NULL,
  `supplierNotes` text COLLATE utf8mb4_unicode_ci,
  `deletedAt` datetime(6) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `IDX_2e0fc7a6605393a9bd691cdceb` (`poNumber`),
  KEY `FK_0c3ff892a9f2ed16f59d31cccae` (`supplierId`),
  KEY `FK_33425839ce6c00008f311f2c028` (`storeId`),
  CONSTRAINT `FK_0c3ff892a9f2ed16f59d31cccae` FOREIGN KEY (`supplierId`) REFERENCES `suppliers` (`id`),
  CONSTRAINT `FK_33425839ce6c00008f311f2c028` FOREIGN KEY (`storeId`) REFERENCES `stores` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Dumping data for table kfc_scm.purchase_orders: ~5 rows (approximately)
INSERT INTO `purchase_orders` (`id`, `orderDate`, `expectedDeliveryDate`, `status`, `totalAmount`, `supplierId`, `createdAt`, `updatedAt`, `storeId`, `poNumber`, `notes`, `approvedBy`, `approvedAt`, `rejectionReason`, `confirmedBy`, `confirmedAt`, `actualDeliveryDate`, `supplierNotes`, `deletedAt`) VALUES
	(1, '2025-12-20 17:37:55', '2025-12-22 17:37:55.000000', 'approved', 5000000.00, 1, '2025-12-20 17:37:55.816329', '2025-12-21 16:02:38.000000', 1, '1', NULL, 2, '2025-12-21 16:02:38.745000', NULL, NULL, NULL, NULL, NULL, NULL),
	(2, '2025-12-18 17:37:55', '2025-12-20 17:37:55.000000', 'delivered', 2500000.00, 2, '2025-12-20 17:37:55.816329', '2025-12-20 17:59:46.585722', 1, '2', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
	(3, '2025-12-21 07:00:00', '2025-12-25 07:00:00.000000', 'cancelled', 111100.00, 1, '2025-12-21 15:53:22.298966', '2025-12-21 16:11:40.000000', 1, 'PO-1766307202272', '', 2, '2025-12-21 16:11:40.560000', 'quá ít', NULL, NULL, NULL, NULL, NULL),
	(4, '2025-12-21 07:00:00', '2025-12-31 07:00:00.000000', 'approved', 1000000.00, 3, '2025-12-21 16:06:14.758986', '2025-12-21 16:06:43.000000', 1, 'PO-1766307974730', '', 2, '2025-12-21 16:06:43.284000', NULL, NULL, NULL, NULL, NULL, NULL),
	(5, '2025-12-22 07:00:00', '2026-06-28 07:00:00.000000', 'approved', 2666000.00, 2, '2025-12-22 14:39:42.747101', '2025-12-22 14:49:06.000000', 1, 'PO-1766389182721', '', 2, '2025-12-22 14:49:06.588000', NULL, NULL, NULL, NULL, NULL, NULL);

-- Dumping structure for table kfc_scm.purchase_order_items
CREATE TABLE IF NOT EXISTS `purchase_order_items` (
  `id` int NOT NULL AUTO_INCREMENT,
  `poId` int NOT NULL,
  `itemId` int NOT NULL,
  `quantity` int NOT NULL,
  `unitPrice` decimal(15,2) NOT NULL,
  `totalAmount` decimal(15,2) NOT NULL,
  `unit` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`id`),
  KEY `FK_303eff42427ac5ccbdc333dedf6` (`poId`),
  KEY `FK_fe5b0e9db9479afaa7320cb836f` (`itemId`),
  CONSTRAINT `FK_303eff42427ac5ccbdc333dedf6` FOREIGN KEY (`poId`) REFERENCES `purchase_orders` (`id`) ON DELETE CASCADE,
  CONSTRAINT `FK_fe5b0e9db9479afaa7320cb836f` FOREIGN KEY (`itemId`) REFERENCES `items` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Dumping data for table kfc_scm.purchase_order_items: ~6 rows (approximately)
INSERT INTO `purchase_order_items` (`id`, `poId`, `itemId`, `quantity`, `unitPrice`, `totalAmount`, `unit`) VALUES
	(1, 1, 1, 100, 50000.00, 5000000.00, 'pcs'),
	(2, 2, 3, 10, 250000.00, 2500000.00, 'pcs'),
	(3, 3, 2, 100, 1111.00, 111100.00, 'pcs'),
	(4, 4, 4, 10, 100000.00, 1000000.00, 'pcs'),
	(5, 5, 1, 100, 10000.00, 1000000.00, 'pcs'),
	(6, 5, 4, 1000, 1666.00, 1666000.00, 'pcs');

-- Dumping structure for table kfc_scm.roles
CREATE TABLE IF NOT EXISTS `roles` (
  `id` int NOT NULL AUTO_INCREMENT,
  `code` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `IDX_f6d54f95c31b73fb1bdd8e91d0` (`code`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Dumping data for table kfc_scm.roles: ~4 rows (approximately)
INSERT INTO `roles` (`id`, `code`, `name`) VALUES
	(1, 'ADMIN', 'System Administrator'),
	(2, 'STORE_MANAGER', 'Store Manager'),
	(3, 'INVENTORY_STAFF', 'Inventory Staff'),
	(4, 'PROCUREMENT_STAFF', 'Procurement Staff');

-- Dumping structure for table kfc_scm.sales_transactions
CREATE TABLE IF NOT EXISTS `sales_transactions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `storeId` int NOT NULL,
  `itemId` int NOT NULL,
  `quantity` int NOT NULL,
  `unitPrice` decimal(15,2) NOT NULL,
  `totalAmount` decimal(15,2) NOT NULL,
  `costPrice` decimal(15,2) DEFAULT NULL,
  `totalCost` decimal(15,2) DEFAULT NULL,
  `grossProfit` decimal(15,2) DEFAULT NULL,
  `saleDate` datetime NOT NULL,
  `createdBy` int DEFAULT NULL,
  `notes` text COLLATE utf8mb4_unicode_ci,
  `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `deletedAt` datetime(6) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `FK_sales_store` (`storeId`),
  KEY `FK_sales_item` (`itemId`),
  KEY `FK_sales_user` (`createdBy`),
  KEY `IDX_sales_saleDate` (`saleDate`),
  CONSTRAINT `FK_6755b51e53df364b2792518d457` FOREIGN KEY (`createdBy`) REFERENCES `users` (`id`),
  CONSTRAINT `FK_b28b6800e59e50704ab92a180d3` FOREIGN KEY (`storeId`) REFERENCES `stores` (`id`),
  CONSTRAINT `FK_c2d876c0f49cbffc6819de05cdd` FOREIGN KEY (`itemId`) REFERENCES `items` (`id`),
  CONSTRAINT `sales_transactions_chk_1` CHECK ((`quantity` > 0)),
  CONSTRAINT `sales_transactions_chk_2` CHECK ((`unitPrice` > 0))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Dumping data for table kfc_scm.sales_transactions: ~0 rows (approximately)

-- Dumping structure for table kfc_scm.stock_requests
CREATE TABLE IF NOT EXISTS `stock_requests` (
  `id` int NOT NULL AUTO_INCREMENT,
  `storeId` int NOT NULL,
  `itemId` int NOT NULL,
  `requestedQty` int NOT NULL,
  `status` enum('requested','pending_approval','approved','rejected','po_generated','fulfilled','cancelled') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'requested',
  `priority` enum('low','medium','high') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'medium',
  `requestedBy` int DEFAULT NULL,
  `approvedBy` int DEFAULT NULL,
  `approvedAt` datetime(6) DEFAULT NULL,
  `poId` int DEFAULT NULL,
  `notes` text COLLATE utf8mb4_unicode_ci,
  `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `deletedAt` datetime(6) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `IDX_6609c0743d85fbd34941851a64` (`storeId`),
  KEY `IDX_ce7fd1de77d6251ce342e3898c` (`itemId`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Dumping data for table kfc_scm.stock_requests: ~0 rows (approximately)

-- Dumping structure for table kfc_scm.stores
CREATE TABLE IF NOT EXISTS `stores` (
  `id` int NOT NULL AUTO_INCREMENT,
  `code` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `location` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `isActive` tinyint NOT NULL DEFAULT '1',
  `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `deletedAt` datetime(6) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `IDX_72bdebc754d6a689b3c169cab8` (`code`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Dumping data for table kfc_scm.stores: ~1 rows (approximately)
INSERT INTO `stores` (`id`, `code`, `name`, `location`, `isActive`, `createdAt`, `updatedAt`, `deletedAt`) VALUES
	(1, 'KFC-MM-001', 'KFC Mega Market Shop', 'District 2, Ho Chi Minh City', 1, '2025-12-20 17:37:55.778236', '2025-12-20 17:37:55.778236', NULL);

-- Dumping structure for table kfc_scm.suppliers
CREATE TABLE IF NOT EXISTS `suppliers` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `contactPerson` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `leadTimeDays` int NOT NULL DEFAULT '0',
  `reliabilityScore` float NOT NULL DEFAULT '0',
  `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `phone` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `isActive` tinyint NOT NULL DEFAULT '1',
  `address` text COLLATE utf8mb4_unicode_ci,
  `deletedAt` datetime(6) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Dumping data for table kfc_scm.suppliers: ~3 rows (approximately)
INSERT INTO `suppliers` (`id`, `name`, `contactPerson`, `email`, `leadTimeDays`, `reliabilityScore`, `createdAt`, `updatedAt`, `phone`, `isActive`, `address`, `deletedAt`) VALUES
	(1, 'CP Vietnam', 'Mr. A', 'contact@cp.com.vn', 2, 4.8, '2025-12-20 17:37:55.803819', '2025-12-20 17:37:55.803819', '', 1, NULL, NULL),
	(2, 'Coca Cola Beverages', 'Ms. B', 'sales@coke.com.vn', 3, 4.9, '2025-12-20 17:37:55.803819', '2025-12-20 17:37:55.803819', '', 1, NULL, NULL),
	(3, 'Da Lat Veggies', 'Mr. C', 'order@dalatveg.vn', 1, 4.5, '2025-12-20 17:37:55.803819', '2025-12-20 17:37:55.803819', '', 1, NULL, NULL);

-- Dumping structure for table kfc_scm.supplier_items
CREATE TABLE IF NOT EXISTS `supplier_items` (
  `id` int NOT NULL AUTO_INCREMENT,
  `supplierId` int NOT NULL,
  `itemId` int NOT NULL,
  `unitPrice` decimal(15,2) NOT NULL,
  `currency` varchar(3) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'VND',
  `minOrderQty` int NOT NULL DEFAULT '1',
  `leadTimeDays` int DEFAULT NULL,
  `isPreferred` tinyint(1) NOT NULL DEFAULT '0',
  `effectiveFrom` date DEFAULT NULL,
  `effectiveTo` date DEFAULT NULL,
  `isActive` tinyint(1) NOT NULL DEFAULT '1',
  `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `deletedAt` datetime(6) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `IDX_5c1008482d719f3e1dac4c07e9` (`supplierId`,`itemId`),
  KEY `IDX_ac68828664c613d8006342ec8b` (`supplierId`),
  KEY `IDX_77db74f768112721851626a2a9` (`itemId`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Dumping data for table kfc_scm.supplier_items: ~3 rows (approximately)
INSERT INTO `supplier_items` (`id`, `supplierId`, `itemId`, `unitPrice`, `currency`, `minOrderQty`, `leadTimeDays`, `isPreferred`, `effectiveFrom`, `effectiveTo`, `isActive`, `createdAt`, `updatedAt`, `deletedAt`) VALUES
	(1, 1, 10, 12.50, 'VND', 1, 3, 1, '2025-01-01', NULL, 1, '2025-12-21 13:47:26.401479', '2025-12-21 13:47:26.401479', NULL),
	(2, 1, 11, 25.00, 'VND', 1, 5, 0, '2025-01-01', NULL, 1, '2025-12-21 13:47:26.401479', '2025-12-21 13:47:26.401479', NULL),
	(3, 2, 10, 11.90, 'VND', 1, 7, 0, '2025-01-01', NULL, 1, '2025-12-21 13:47:26.401479', '2025-12-21 13:47:26.401479', NULL);

-- Dumping structure for table kfc_scm.users
CREATE TABLE IF NOT EXISTS `users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `fullName` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `isActive` tinyint NOT NULL DEFAULT '1',
  `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `password_hash` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `roleId` int NOT NULL,
  `storeId` int DEFAULT NULL,
  `username` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `deletedAt` datetime(6) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `IDX_fe0bb3f6520ee0469504521e71` (`username`),
  KEY `FK_c82cd4fa8f0ac4a74328abe997a` (`storeId`),
  KEY `FK_368e146b785b574f42ae9e53d5e` (`roleId`),
  CONSTRAINT `FK_368e146b785b574f42ae9e53d5e` FOREIGN KEY (`roleId`) REFERENCES `roles` (`id`),
  CONSTRAINT `FK_c82cd4fa8f0ac4a74328abe997a` FOREIGN KEY (`storeId`) REFERENCES `stores` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Dumping data for table kfc_scm.users: ~5 rows (approximately)
INSERT INTO `users` (`id`, `fullName`, `isActive`, `createdAt`, `updatedAt`, `password_hash`, `roleId`, `storeId`, `username`, `deletedAt`) VALUES
	(1, 'System Admin', 1, '2025-12-20 17:37:55.797280', '2025-12-21 01:06:13.577747', '$2b$10$qwKb4LTrrIE0c/vmTHo2s.YDG9J3sk6hJ750fEAQFs8g7J5BSYj6a', 1, 1, 'admin', NULL),
	(2, 'Nguyen Van Manager', 1, '2025-12-20 17:37:55.797280', '2025-12-21 01:06:13.577747', '$2b$10$qwKb4LTrrIE0c/vmTHo2s.YDG9J3sk6hJ750fEAQFs8g7J5BSYj6a', 2, 1, 'mana', NULL),
	(3, 'Tran Inventory', 1, '2025-12-20 17:37:55.797280', '2025-12-22 14:43:06.000000', '$2b$10$qwKb4LTrrIE0c/vmTHo2s.YDG9J3sk6hJ750fEAQFs8g7J5BSYj6a', 3, 1, 'inven', NULL),
	(4, 'Le Procurement', 1, '2025-12-20 17:37:55.797280', '2025-12-21 15:43:11.000000', '$2b$10$qwKb4LTrrIE0c/vmTHo2s.YDG9J3sk6hJ750fEAQFs8g7J5BSYj6a', 4, 1, 'pro', NULL),
	(5, 'test', 1, '2025-12-21 01:20:16.527248', '2025-12-21 15:45:49.000000', '$2b$10$V0AKgC3S5E1hPzr68D3MTePsFCjRMuv6.8pmImjruhDTvUtMURv7S', 2, 1, 'test5', '2025-12-21 15:45:49.000000'),
	(6, 'test', 1, '2025-12-22 14:42:44.197155', '2025-12-22 14:42:53.000000', '$2b$10$GliKsFFYFuLw1pg0H/37/OKyLo4CKTSBfSy3.gv9IP0dGgIy99cuC', 1, 1, 'test', '2025-12-22 14:42:53.000000');

/*!40103 SET TIME_ZONE=IFNULL(@OLD_TIME_ZONE, 'system') */;
/*!40101 SET SQL_MODE=IFNULL(@OLD_SQL_MODE, '') */;
/*!40014 SET FOREIGN_KEY_CHECKS=IFNULL(@OLD_FOREIGN_KEY_CHECKS, 1) */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40111 SET SQL_NOTES=IFNULL(@OLD_SQL_NOTES, 1) */;
