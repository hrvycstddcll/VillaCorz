
-- --------------------------------------------------------
-- Host:                         127.0.0.1
-- Server version:               8.4.3 - MySQL Community Server - GPL
-- Server OS:                    Win64
-- HeidiSQL Version:             12.8.0.6908
-- --------------------------------------------------------

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET NAMES utf8 */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;


-- Dumping database structure for villacorz_db
CREATE DATABASE IF NOT EXISTS `villacorz_db` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci */ /*!80016 DEFAULT ENCRYPTION='N' */;
USE `villacorz_db`;

-- Dumping structure for table villacorz_db.activity_logs
CREATE TABLE IF NOT EXISTS `activity_logs` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint unsigned DEFAULT NULL,
  `action` varchar(40) COLLATE utf8mb4_unicode_ci NOT NULL,
  `subject_type` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `subject_id` bigint unsigned DEFAULT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `properties` json DEFAULT NULL,
  `ip_address` varchar(45) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `user_agent` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `activity_logs_user_id_foreign` (`user_id`),
  KEY `activity_logs_action_index` (`action`),
  KEY `activity_logs_subject_type_subject_id_index` (`subject_type`,`subject_id`),
  KEY `activity_logs_created_at_index` (`created_at`),
  CONSTRAINT `activity_logs_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=31 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Dumping data for table villacorz_db.activity_logs: ~7 rows (approximately)
INSERT INTO `activity_logs` (`id`, `user_id`, `action`, `subject_type`, `subject_id`, `description`, `properties`, `ip_address`, `user_agent`, `created_at`) VALUES
	(4, 1, 'updated', 'App\\Models\\Service', 3, 'Updated offer “Room 1”.', '{"name": "Room 1", "status": "active", "changed_fields": ["weekday_discount_type", "weekday_discount_value"]}', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Code/1.146.0 Chrome/150.0.7871.250 Electron/43.8.6 Safari/537.36', '2026-11-11 17:14:29'),
	(5, 1, 'logout', 'App\\Models\\User', 1, 'Signed out.', NULL, '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Code/1.146.0 Chrome/150.0.7871.250 Electron/43.8.6 Safari/537.36', '2026-11-11 17:16:30'),
	(6, 1, 'login', 'App\\Models\\User', 1, 'Signed in.', '{"role": "admin"}', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Code/1.146.0 Chrome/150.0.7871.250 Electron/43.8.6 Safari/537.36', '2026-11-11 17:16:42'),
	(7, 1, 'login', 'App\\Models\\User', 1, 'Signed in.', '{"role": "admin"}', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Code/1.146.0 Chrome/150.0.7871.250 Electron/43.8.6 Safari/537.36', '2026-11-11 20:56:08'),
	(8, 1, 'login', 'App\\Models\\User', 1, 'Signed in.', '{"role": "admin"}', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Code/1.146.0 Chrome/150.0.7871.250 Electron/43.8.6 Safari/537.36', '2026-11-12 05:30:18'),
	(9, 1, 'logout', 'App\\Models\\User', 1, 'Signed out.', NULL, '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Code/1.146.0 Chrome/150.0.7871.250 Electron/43.8.6 Safari/537.36', '2026-11-12 05:31:31'),
	(10, 2, 'login', 'App\\Models\\User', 2, 'Signed in.', '{"role": "customer"}', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Code/1.146.0 Chrome/150.0.7871.250 Electron/43.8.6 Safari/537.36', '2026-11-12 05:33:48'),
	(11, 1, 'login', 'App\\Models\\User', 1, 'Signed in.', '{"role": "admin"}', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/157.0.0.0 Safari/537.36', '2026-11-12 07:30:42'),
	(12, 1, 'created', 'App\\Models\\Service', 6, 'Created offer “Room 1”.', '{"pax": 4, "kind": "room", "name": "Room 1", "price": "3000.00", "status": "active", "image_count": 1, "weekend_price": null, "weekday_discount_type": "fixed", "weekend_discount_type": null, "weekday_discount_value": "500.00", "weekend_discount_value": null}', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/157.0.0.0 Safari/537.36', '2026-11-12 07:38:25'),
	(13, 1, 'updated', 'App\\Models\\Service', 6, 'Updated offer “Room 2”.', '{"name": "Room 2", "status": "active", "changed_fields": ["name"]}', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/157.0.0.0 Safari/537.36', '2026-11-12 07:39:00'),
	(14, 1, 'updated', 'App\\Models\\Service', 3, 'Updated offer “Room 1”.', '{"name": "Room 1", "status": "active", "changed_fields": ["weekday_discount_type", "weekday_discount_value", "pax"]}', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/157.0.0.0 Safari/537.36', '2026-11-12 07:39:18'),
	(15, 1, 'updated', 'App\\Models\\Service', 5, 'Updated offer “The Whole Villa”.', '{"name": "The Whole Villa", "status": "active", "changed_fields": ["images"]}', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/157.0.0.0 Safari/537.36', '2026-11-12 07:39:53'),
	(16, 1, 'updated', 'App\\Models\\Service', 5, 'Updated offer “The Whole Villa”.', '{"name": "The Whole Villa", "status": "active", "changed_fields": ["weekday_discount_type", "weekday_discount_value"]}', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/157.0.0.0 Safari/537.36', '2026-11-12 07:42:53'),
	(17, 1, 'created', 'App\\Models\\Service', 7, 'Created offer “Room 3”.', '{"pax": null, "kind": "room", "name": "Room 3", "price": "3000.00", "status": "active", "image_count": 1, "weekend_price": null, "weekday_discount_type": "fixed", "weekend_discount_type": null, "weekday_discount_value": "500.00", "weekend_discount_value": null}', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/157.0.0.0 Safari/537.36', '2026-11-12 07:44:13'),
	(18, 1, 'created', 'App\\Models\\Service', 8, 'Created offer “Room 4”.', '{"pax": null, "kind": "room", "name": "Room 4", "price": "4000.00", "status": "active", "image_count": 1, "weekend_price": null, "weekday_discount_type": "fixed", "weekend_discount_type": null, "weekday_discount_value": "500.00", "weekend_discount_value": null}', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/157.0.0.0 Safari/537.36', '2026-11-12 07:46:24'),
	(19, 1, 'updated', 'App\\Models\\Service', 5, 'Updated offer “The Whole Villa”.', '{"name": "The Whole Villa", "status": "active", "changed_fields": []}', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/157.0.0.0 Safari/537.36', '2026-11-12 07:46:38'),
	(20, 1, 'created', 'App\\Models\\Service', 9, 'Created offer “Room 5”.', '{"pax": null, "kind": "room", "name": "Room 5", "price": "4000.00", "status": "active", "image_count": 1, "weekend_price": null, "weekday_discount_type": "fixed", "weekend_discount_type": null, "weekday_discount_value": "500.00", "weekend_discount_value": null}', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/157.0.0.0 Safari/537.36', '2026-11-12 07:49:01'),
	(21, 1, 'updated', 'App\\Models\\Service', 7, 'Updated offer “Room 3”.', '{"name": "Room 3", "status": "active", "changed_fields": ["pax"]}', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/157.0.0.0 Safari/537.36', '2026-11-12 07:49:42'),
	(22, 1, 'updated', 'App\\Models\\Service', 5, 'Updated offer “The Whole Villa”.', '{"name": "The Whole Villa", "status": "active", "changed_fields": ["pax"]}', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/157.0.0.0 Safari/537.36', '2026-11-12 07:50:30'),
	(23, 1, 'updated', 'App\\Models\\Service', 8, 'Updated offer “Room 4”.', '{"name": "Room 4", "status": "active", "changed_fields": ["pax"]}', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/157.0.0.0 Safari/537.36', '2026-11-12 07:50:43'),
	(24, 1, 'updated', 'App\\Models\\Service', 9, 'Updated offer “Room 5”.', '{"name": "Room 5", "status": "active", "changed_fields": ["pax"]}', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/157.0.0.0 Safari/537.36', '2026-11-12 07:51:18'),
	(25, 1, 'updated', 'App\\Models\\Service', 8, 'Updated offer “Room 4”.', '{"name": "Room 4", "status": "active", "changed_fields": ["pax"]}', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/157.0.0.0 Safari/537.36', '2026-11-12 07:51:34'),
	(26, 1, 'updated', 'App\\Models\\Service', 5, 'Updated offer “The Whole Villa”.', '{"name": "The Whole Villa", "status": "active", "changed_fields": []}', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/157.0.0.0 Safari/537.36', '2026-11-12 07:52:00'),
	(27, 1, 'updated', 'App\\Models\\Service', 6, 'Updated offer “Room 2”.', '{"name": "Room 2", "status": "active", "changed_fields": ["description"]}', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/157.0.0.0 Safari/537.36', '2026-11-12 07:54:04'),
	(28, 1, 'updated', 'App\\Models\\Service', 7, 'Updated offer “Room 3”.', '{"name": "Room 3", "status": "active", "changed_fields": ["description"]}', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/157.0.0.0 Safari/537.36', '2026-11-12 07:54:56'),
	(29, 1, 'updated', 'App\\Models\\Service', 8, 'Updated offer “Room 4”.', '{"name": "Room 4", "status": "active", "changed_fields": ["description"]}', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/157.0.0.0 Safari/537.36', '2026-11-12 07:56:44'),
	(30, 1, 'updated', 'App\\Models\\Service', 9, 'Updated offer “Room 5”.', '{"name": "Room 5", "status": "active", "changed_fields": ["description"]}', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/157.0.0.0 Safari/537.36', '2026-11-12 07:58:37');

-- Dumping structure for table villacorz_db.cache
CREATE TABLE IF NOT EXISTS `cache` (
  `key` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `value` mediumtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `expiration` int NOT NULL,
  PRIMARY KEY (`key`),
  KEY `cache_expiration_index` (`expiration`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Dumping data for table villacorz_db.cache: ~0 rows (approximately)

-- Dumping structure for table villacorz_db.cache_locks
CREATE TABLE IF NOT EXISTS `cache_locks` (
  `key` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `owner` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `expiration` int NOT NULL,
  PRIMARY KEY (`key`),
  KEY `cache_locks_expiration_index` (`expiration`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Dumping data for table villacorz_db.cache_locks: ~0 rows (approximately)

-- Dumping structure for table villacorz_db.failed_jobs
CREATE TABLE IF NOT EXISTS `failed_jobs` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `uuid` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `connection` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `queue` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `payload` longtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `exception` longtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `failed_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `failed_jobs_uuid_unique` (`uuid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Dumping data for table villacorz_db.failed_jobs: ~0 rows (approximately)

-- Dumping structure for table villacorz_db.jobs
CREATE TABLE IF NOT EXISTS `jobs` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `queue` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `payload` longtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `attempts` tinyint unsigned NOT NULL,
  `reserved_at` int unsigned DEFAULT NULL,
  `available_at` int unsigned NOT NULL,
  `created_at` int unsigned NOT NULL,
  PRIMARY KEY (`id`),
  KEY `jobs_queue_index` (`queue`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Dumping data for table villacorz_db.jobs: ~0 rows (approximately)

-- Dumping structure for table villacorz_db.job_batches
CREATE TABLE IF NOT EXISTS `job_batches` (
  `id` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `total_jobs` int NOT NULL,
  `pending_jobs` int NOT NULL,
  `failed_jobs` int NOT NULL,
  `failed_job_ids` longtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `options` mediumtext COLLATE utf8mb4_unicode_ci,
  `cancelled_at` int DEFAULT NULL,
  `created_at` int NOT NULL,
  `finished_at` int DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Dumping data for table villacorz_db.job_batches: ~0 rows (approximately)

-- Dumping structure for table villacorz_db.migrations
CREATE TABLE IF NOT EXISTS `migrations` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `migration` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `batch` int NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=20 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Dumping data for table villacorz_db.migrations: ~18 rows (approximately)
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES
	(1, '0001_01_01_000000_create_users_table', 1),
	(2, '0001_01_01_000001_create_cache_table', 1),
	(3, '0001_01_01_000002_create_jobs_table', 1),
	(4, '2026_10_12_165222_create_personal_access_tokens_table', 1),
	(5, '2026_10_12_171710_add_firstname_lastname_to_users_table', 1),
	(6, '2026_10_12_172918_add_role_to_users_table', 1),
	(7, '2026_10_12_180125_remove_name_from_users_table', 2),
	(9, '2026_10_14_230849_create_email_otps_table', 3),
	(10, '2026_10_15_000000_create_pending_registrations_table', 4),
	(11, '2026_11_07_030630_create_services_table', 5),
	(12, '2026_11_07_030655_create_service_images_table', 5),
	(13, '2026_11_10_042215_add_details_to_services_table', 6),
	(14, '2026_11_11_000000_create_activity_logs_table', 7),
	(15, '2026_11_11_010000_drop_pending_registrations_table', 7),
	(16, '2026_11_12_000000_add_discount_to_services_table', 7),
	(17, '2026_11_12_010000_add_day_discounts_to_services_table', 7),
	(18, '2026_11_12_020000_add_kind_to_services_table', 8),
	(19, '2026_11_12_021000_add_weekend_price_to_services_table', 8);

-- Dumping structure for table villacorz_db.password_reset_tokens
CREATE TABLE IF NOT EXISTS `password_reset_tokens` (
  `email` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `token` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Dumping data for table villacorz_db.password_reset_tokens: ~0 rows (approximately)

-- Dumping structure for table villacorz_db.personal_access_tokens
CREATE TABLE IF NOT EXISTS `personal_access_tokens` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `tokenable_type` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `tokenable_id` bigint unsigned NOT NULL,
  `name` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `token` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `abilities` text COLLATE utf8mb4_unicode_ci,
  `last_used_at` timestamp NULL DEFAULT NULL,
  `expires_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `personal_access_tokens_token_unique` (`token`),
  KEY `personal_access_tokens_tokenable_type_tokenable_id_index` (`tokenable_type`,`tokenable_id`),
  KEY `personal_access_tokens_expires_at_index` (`expires_at`)
) ENGINE=InnoDB AUTO_INCREMENT=26 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Dumping data for table villacorz_db.personal_access_tokens: ~21 rows (approximately)
INSERT INTO `personal_access_tokens` (`id`, `tokenable_type`, `tokenable_id`, `name`, `token`, `abilities`, `last_used_at`, `expires_at`, `created_at`, `updated_at`) VALUES
	(1, 'App\\Models\\User', 2, 'auth_token', '51787c8876c57f27e59f929879e922a60a1051aecab61dc42fb440cba0ab745d', '["*"]', NULL, NULL, '2026-10-12 10:59:17', '2026-10-12 10:59:17'),
	(2, 'App\\Models\\User', 3, 'auth_token', 'd30c7b69316aed836db379b82b35eb8fc028f400005a8d5d8b6f9db6d72b49b8', '["*"]', NULL, NULL, '2026-10-12 11:00:17', '2026-10-12 11:00:17'),
	(3, 'App\\Models\\User', 3, 'auth_token', 'd6d1c261af76343501649d7fa53792ba0c48f2de844d66979103e00a7037f626', '["*"]', NULL, NULL, '2026-10-12 17:53:31', '2026-10-12 17:53:31'),
	(4, 'App\\Models\\User', 3, 'auth_token', 'eee41cba54200a8c45e2acb2903bdb7832506607b86dcec1fab867c40ecf5f3a', '["*"]', NULL, NULL, '2026-10-12 18:17:24', '2026-10-12 18:17:24'),
	(5, 'App\\Models\\User', 3, 'auth_token', 'f19af5dbde51780a900a1868959997bdb6d75a5b5bb87a100b5db559e475b777', '["*"]', NULL, NULL, '2026-10-12 18:17:48', '2026-10-12 18:17:48'),
	(6, 'App\\Models\\User', 3, 'auth_token', 'edbc44d1608bd2e0d585f118e66a0d54464f5e82c6d1dfa7fa383a28a69f5378', '["*"]', NULL, NULL, '2026-10-12 18:23:01', '2026-10-12 18:23:01'),
	(7, 'App\\Models\\User', 3, 'auth_token', '0692bbdcc24163d5fcaa40f1b174c24337db2aea8a2c8daddbf7fcb7104d2fe7', '["*"]', NULL, NULL, '2026-10-12 18:31:07', '2026-10-12 18:31:07'),
	(8, 'App\\Models\\User', 3, 'auth_token', 'ae17dd13c0c9724d8f9b68d3a3f9da77d28cb9e78668325324ec1f9027397b73', '["*"]', NULL, NULL, '2026-10-12 18:31:09', '2026-10-12 18:31:09'),
	(9, 'App\\Models\\User', 3, 'auth_token', '19ec286996bb616622ca65d9d5b77c82421912d8198b44f0e5eedb5e1cf9c53a', '["*"]', NULL, NULL, '2026-10-12 18:34:15', '2026-10-12 18:34:15'),
	(10, 'App\\Models\\User', 3, 'auth_token', 'ce95c97034763dd93f8cf5697bf2d80e072683893634ab0fc52a2d9b14bf3ec2', '["*"]', NULL, NULL, '2026-10-12 18:38:43', '2026-10-12 18:38:43'),
	(11, 'App\\Models\\User', 3, 'auth_token', '889db62f721666142302d27b800093c9de6934dda03ccf361b4f3f507adbd34e', '["*"]', NULL, NULL, '2026-10-12 18:39:37', '2026-10-12 18:39:37'),
	(12, 'App\\Models\\User', 3, 'auth_token', '084868f28b1a9042f23f4793eeeecec2e9a8f766a87e270805ecbce77d6b916b', '["*"]', NULL, NULL, '2026-10-12 18:56:18', '2026-10-12 18:56:18'),
	(13, 'App\\Models\\User', 3, 'auth_token', '43293929bece7a24438fef831e96e6724328e6fc2c7504d986edd05c5f4eae2e', '["*"]', NULL, NULL, '2026-10-12 18:56:28', '2026-10-12 18:56:28'),
	(14, 'App\\Models\\User', 3, 'auth_token', '2be414f3e7fa9b5c46744bdc16dd95b5f103f9a42db0d6500f2cf9a02c83dfcd', '["*"]', NULL, NULL, '2026-10-12 19:05:00', '2026-10-12 19:05:00'),
	(15, 'App\\Models\\User', 3, 'auth_token', 'a3926ba91df474dc36cfa450c388b856830e58e16114ad7e2492e656bd4bf88c', '["*"]', NULL, NULL, '2026-10-12 19:07:17', '2026-10-12 19:07:17'),
	(16, 'App\\Models\\User', 3, 'auth_token', 'bbef981fd2bcdf2c129ba78c2caca91a40309a3edeb913a6d55a7943346ea08a', '["*"]', NULL, NULL, '2026-10-12 19:16:00', '2026-10-12 19:16:00'),
	(17, 'App\\Models\\User', 3, 'auth_token', '99dd4ade8304cb66d49e4f5d4f9bc2a4e7bf765e120a4ba2bc96851d3e4e5a08', '["*"]', NULL, NULL, '2026-10-12 19:25:28', '2026-10-12 19:25:28'),
	(18, 'App\\Models\\User', 3, 'auth_token', '7809758a1dc43d8ca478f855dc5d875d1cde4ae8df687d2d3039c8a5edef9de2', '["*"]', NULL, NULL, '2026-10-12 19:25:31', '2026-10-12 19:25:31'),
	(19, 'App\\Models\\User', 2, 'auth_token', 'de7ed15f45c65a9c3f59b668ccd0fea48441cd55e747a56749df1da0a604de95', '["*"]', NULL, NULL, '2026-10-12 19:33:28', '2026-10-12 19:33:28'),
	(20, 'App\\Models\\User', 3, 'auth_token', 'ff9a09022e3ddd522ec4219cecf2d40a1a556ef60b567c27fd24af61a4709acd', '["*"]', NULL, NULL, '2026-10-12 20:07:45', '2026-10-12 20:07:45'),
	(24, 'App\\Models\\User', 1, 'discount-qa', '470dc60fa42f4ae7cda7251a7f4ba92991b399374265f89784ae1ce5ab05dc98', '["*"]', NULL, NULL, '2026-11-11 16:54:55', '2026-11-11 16:54:55');

-- Dumping structure for table villacorz_db.services
CREATE TABLE IF NOT EXISTS `services` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `created_by` bigint unsigned DEFAULT NULL,
  `kind` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'room',
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `price` decimal(10,2) NOT NULL,
  `weekend_price` decimal(10,2) DEFAULT NULL,
  `weekday_discount_type` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `weekday_discount_value` decimal(10,2) DEFAULT NULL,
  `weekend_discount_type` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `weekend_discount_value` decimal(10,2) DEFAULT NULL,
  `pax` smallint unsigned DEFAULT NULL,
  `features` json DEFAULT NULL,
  `amenities` json DEFAULT NULL,
  `status` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `services_created_by_foreign` (`created_by`),
  KEY `services_status_index` (`status`),
  KEY `services_kind_index` (`kind`),
  CONSTRAINT `services_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Dumping data for table villacorz_db.services: ~2 rows (approximately)
INSERT INTO `services` (`id`, `created_by`, `kind`, `name`, `description`, `price`, `weekend_price`, `weekday_discount_type`, `weekday_discount_value`, `weekend_discount_type`, `weekend_discount_value`, `pax`, `features`, `amenities`, `status`, `created_at`, `updated_at`) VALUES
	(3, 1, 'room', 'Room 1', 'Provides a cozy bunk-style setup with air conditioning, a TV, and a private CR, great for small groups and families.', 3000.00, NULL, 'fixed', 500.00, NULL, NULL, 4, '[]', '["TV", "Private CR", "Airconditioned"]', 'active', '2026-11-10 09:35:31', '2026-11-12 07:39:18'),
	(5, NULL, 'exclusive', 'The Whole Villa', 'Make the whole beach house yours. Gather in the shared spaces, unwind in comfortable rooms, and enjoy an easygoing seaside stay with your group.', 15500.00, 17000.00, 'fixed', 1500.00, NULL, NULL, 35, '[]', '["TV", "Private CR", "Airconditioned", "2 Fans"]', 'active', '2026-11-11 20:47:31', '2026-11-12 07:50:30'),
	(6, 1, 'room', 'Room 2', 'Offers rustic wooden bunk beds and modern comforts, including AC, TV and a private CR, for a relaxing stay with your family and barkada.', 3000.00, NULL, 'fixed', 500.00, NULL, NULL, 4, '[]', '["TV", "Private CR", "Airconditioned"]', 'active', '2026-11-12 07:38:25', '2026-11-12 07:54:04'),
	(7, 1, 'room', 'Room 3', 'Offers rustic wooden bunk beds and modern comforts, including AC, TV and a private CR, for a relaxing stay with your family and barkada.', 3000.00, NULL, 'fixed', 500.00, NULL, NULL, 4, '[]', '["TV", "Private CR", "Airconditioned"]', 'active', '2026-11-12 07:44:13', '2026-11-12 07:54:55'),
	(8, 1, 'room', 'Room 4', 'Offers warm wooden bunk beds and air-conditioned comfort, an ideal pick for guest who wants a simple, peaceful retreat without the extras.', 4000.00, NULL, 'fixed', 500.00, NULL, NULL, 10, '[]', '["Airconditioned"]', 'active', '2026-11-12 07:46:24', '2026-11-12 07:56:44'),
	(9, 1, 'room', 'Room 5', 'Features  spacious ,comfty bed with airconditioning and two fans, giving you budget-friendly comfort and a relaxing, easygoing stay.', 4000.00, NULL, 'fixed', 500.00, NULL, NULL, 10, '[]', '["Airconditioned", "2 Fans"]', 'active', '2026-11-12 07:49:01', '2026-11-12 07:58:37');

-- Dumping structure for table villacorz_db.service_images
CREATE TABLE IF NOT EXISTS `service_images` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `service_id` bigint unsigned NOT NULL,
  `image_url` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `public_id` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `is_primary` tinyint(1) NOT NULL DEFAULT '0',
  `sort_order` smallint unsigned NOT NULL DEFAULT '0',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `service_images_public_id_unique` (`public_id`),
  KEY `service_images_service_id_is_primary_index` (`service_id`,`is_primary`),
  CONSTRAINT `service_images_service_id_foreign` FOREIGN KEY (`service_id`) REFERENCES `services` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Dumping data for table villacorz_db.service_images: ~4 rows (approximately)
INSERT INTO `service_images` (`id`, `service_id`, `image_url`, `public_id`, `is_primary`, `sort_order`, `created_at`, `updated_at`) VALUES
	(1, 3, 'https://res.cloudinary.com/ql4hruc3/image/upload/v1794332098/villacorz/services/yprlscorcqiiql1r424p.png', 'villacorz/services/yprlscorcqiiql1r424p', 1, 0, '2026-11-10 09:35:31', '2026-11-10 09:35:31'),
	(2, 3, 'https://res.cloudinary.com/ql4hruc3/image/upload/v1794332110/villacorz/services/tjpf9dsiylah0qp23loi.png', 'villacorz/services/tjpf9dsiylah0qp23loi', 0, 2, '2026-11-10 09:35:31', '2026-11-11 17:14:29'),
	(3, 3, 'https://res.cloudinary.com/ql4hruc3/image/upload/v1794332120/villacorz/services/qb6uqdun4bvxcyglv6dz.png', 'villacorz/services/qb6uqdun4bvxcyglv6dz', 0, 3, '2026-11-10 09:35:31', '2026-11-11 17:14:29'),
	(4, 3, 'https://res.cloudinary.com/ql4hruc3/image/upload/v1794332130/villacorz/services/tuprxy0ps8seo9hl1mne.png', 'villacorz/services/tuprxy0ps8seo9hl1mne', 0, 1, '2026-11-10 09:35:31', '2026-11-11 17:14:29'),
	(5, 6, 'https://res.cloudinary.com/ql4hruc3/image/upload/v1794497904/villacorz/services/ngkerfgqaxjlzi5gyi1b.png', 'villacorz/services/ngkerfgqaxjlzi5gyi1b', 1, 0, '2026-11-12 07:38:25', '2026-11-12 07:38:25'),
	(6, 5, 'https://res.cloudinary.com/ql4hruc3/image/upload/v1794497992/villacorz/services/d9prvrjz19lfwcxkkod3.png', 'villacorz/services/d9prvrjz19lfwcxkkod3', 1, 0, '2026-11-12 07:39:53', '2026-11-12 07:39:53'),
	(7, 7, 'https://res.cloudinary.com/ql4hruc3/image/upload/v1794498252/villacorz/services/eyomr4waqrbvssuz0wn9.png', 'villacorz/services/eyomr4waqrbvssuz0wn9', 1, 0, '2026-11-12 07:44:13', '2026-11-12 07:44:13'),
	(8, 8, 'https://res.cloudinary.com/ql4hruc3/image/upload/v1794498384/villacorz/services/dnjtsgrqbppowcnhkblj.png', 'villacorz/services/dnjtsgrqbppowcnhkblj', 1, 0, '2026-11-12 07:46:24', '2026-11-12 07:46:24'),
	(9, 9, 'https://res.cloudinary.com/ql4hruc3/image/upload/v1794498540/villacorz/services/sga1hrdyuw1ujmq6drzw.png', 'villacorz/services/sga1hrdyuw1ujmq6drzw', 1, 0, '2026-11-12 07:49:01', '2026-11-12 07:49:01');

-- Dumping structure for table villacorz_db.sessions
CREATE TABLE IF NOT EXISTS `sessions` (
  `id` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_id` bigint unsigned DEFAULT NULL,
  `ip_address` varchar(45) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `user_agent` text COLLATE utf8mb4_unicode_ci,
  `payload` longtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `last_activity` int NOT NULL,
  PRIMARY KEY (`id`),
  KEY `sessions_user_id_index` (`user_id`),
  KEY `sessions_last_activity_index` (`last_activity`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Dumping data for table villacorz_db.sessions: ~17 rows (approximately)
INSERT INTO `sessions` (`id`, `user_id`, `ip_address`, `user_agent`, `payload`, `last_activity`) VALUES
	('1YDAs5Cmc0Q2Y69DykiDth6ygxU1eRnUaQoufPm5', NULL, '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Code/1.146.0 Chrome/150.0.7871.250 Electron/43.8.6 Safari/537.36', 'YTozOntzOjY6Il90b2tlbiI7czo0MDoiSFNPTmhSYlhuZkxzbjZiZ09QSGFxaEhidnB4Z1k4azZMd3BKa3FYeiI7czo5OiJfcHJldmlvdXMiO2E6Mjp7czozOiJ1cmwiO3M6MzA6Imh0dHA6Ly9sb2NhbGhvc3Q6ODAwMC9hcGkvdXNlciI7czo1OiJyb3V0ZSI7Tjt9czo2OiJfZmxhc2giO2E6Mjp7czozOiJvbGQiO2E6MDp7fXM6MzoibmV3IjthOjA6e319fQ==', 1794495171),
	('1ypLk3NVOEWH84qZctBCGCDymGVKTTMt2TQRqytt', NULL, '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Code/1.146.0 Chrome/150.0.7871.250 Electron/43.8.6 Safari/537.36', 'YTozOntzOjY6Il90b2tlbiI7czo0MDoiZWY5YnpTSFp3MWJEaDNxN3l0NDBrT3VaQkJZMFAxdTl4aXlDZHR2TiI7czo5OiJfcHJldmlvdXMiO2E6Mjp7czozOiJ1cmwiO3M6NDE6Imh0dHA6Ly9sb2NhbGhvc3Q6ODAwMC9zYW5jdHVtL2NzcmYtY29va2llIjtzOjU6InJvdXRlIjtzOjE5OiJzYW5jdHVtLmNzcmYtY29va2llIjt9czo2OiJfZmxhc2giO2E6Mjp7czozOiJvbGQiO2E6MDp7fXM6MzoibmV3IjthOjA6e319fQ==', 1794496293),
	('2LdAtAsvNwlPPGgz8F2gGyDabLRVTeGPrIohaWSs', NULL, '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Code/1.146.0 Chrome/150.0.7871.250 Electron/43.8.6 Safari/537.36', 'YTozOntzOjY6Il90b2tlbiI7czo0MDoibWNlbDZORTNEbUlwd05aS2JYbzQxNjQ4SzQ3dmFvczdXaHFkR1JPZyI7czo5OiJfcHJldmlvdXMiO2E6Mjp7czozOiJ1cmwiO3M6MzQ6Imh0dHA6Ly9sb2NhbGhvc3Q6ODAwMC9hcGkvc2VydmljZXMiO3M6NToicm91dGUiO047fXM6NjoiX2ZsYXNoIjthOjI6e3M6Mzoib2xkIjthOjA6e31zOjM6Im5ldyI7YTowOnt9fX0=', 1794494326),
	('7KDIPtsBH0sIWb7hgieix2drEJuJNpFGPxKuTVT8', NULL, '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Code/1.146.0 Chrome/150.0.7871.250 Electron/43.8.6 Safari/537.36', 'YTozOntzOjY6Il90b2tlbiI7czo0MDoiczBMMjNqajJlcHFFVndaZXpEdEhVZ3NaWjNkVTZIYmtBaXRnNXJITCI7czo5OiJfcHJldmlvdXMiO2E6Mjp7czozOiJ1cmwiO3M6MzQ6Imh0dHA6Ly9sb2NhbGhvc3Q6ODAwMC9hcGkvc2VydmljZXMiO3M6NToicm91dGUiO047fXM6NjoiX2ZsYXNoIjthOjI6e3M6Mzoib2xkIjthOjA6e31zOjM6Im5ldyI7YTowOnt9fX0=', 1794494181),
	('8BKks3udP3iK9RGlSlNtbgO68aDuciV8rU2BvQIq', NULL, '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Code/1.146.0 Chrome/150.0.7871.250 Electron/43.8.6 Safari/537.36', 'YTozOntzOjY6Il90b2tlbiI7czo0MDoiUnR6UWQzNGpEZ2tidnBEU25MNHc4UEFsOWZiSDFmV0k4eDdXWElzYSI7czo5OiJfcHJldmlvdXMiO2E6Mjp7czozOiJ1cmwiO3M6MzQ6Imh0dHA6Ly9sb2NhbGhvc3Q6ODAwMC9hcGkvc2VydmljZXMiO3M6NToicm91dGUiO047fXM6NjoiX2ZsYXNoIjthOjI6e3M6Mzoib2xkIjthOjA6e31zOjM6Im5ldyI7YTowOnt9fX0=', 1794496386),
	('8JecLr3PPlgnEht1GJEtjXLMn5Zp0zWe2xYDO1WS', NULL, '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Code/1.146.0 Chrome/150.0.7871.250 Electron/43.8.6 Safari/537.36', 'YTozOntzOjY6Il90b2tlbiI7czo0MDoianpMRjFER3VSc1pNa3RoYTNPRlNsNDJEWHVXOVBHRlBkSmlUWVF4eiI7czo5OiJfcHJldmlvdXMiO2E6Mjp7czozOiJ1cmwiO3M6MzQ6Imh0dHA6Ly9sb2NhbGhvc3Q6ODAwMC9hcGkvc2VydmljZXMiO3M6NToicm91dGUiO047fXM6NjoiX2ZsYXNoIjthOjI6e3M6Mzoib2xkIjthOjA6e31zOjM6Im5ldyI7YTowOnt9fX0=', 1794494191),
	('9Six2e2466DVobVRIvoOkzGC8nnLDUydkrj6yNxV', NULL, '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Code/1.146.0 Chrome/150.0.7871.250 Electron/43.8.6 Safari/537.36', 'YTozOntzOjY6Il90b2tlbiI7czo0MDoiZHVXTGVhdFo3UUUzQmRwMm1CVjdvMGNMVW1pVHE4emM1VW5zY1oxMiI7czo5OiJfcHJldmlvdXMiO2E6Mjp7czozOiJ1cmwiO3M6MzQ6Imh0dHA6Ly9sb2NhbGhvc3Q6ODAwMC9hcGkvc2VydmljZXMiO3M6NToicm91dGUiO047fXM6NjoiX2ZsYXNoIjthOjI6e3M6Mzoib2xkIjthOjA6e31zOjM6Im5ldyI7YTowOnt9fX0=', 1794494866),
	('ATNUKKsX3GeAswurszLZGyfHY4VWKLNrRpkPQdtw', NULL, '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Code/1.146.0 Chrome/150.0.7871.250 Electron/43.8.6 Safari/537.36', 'YTozOntzOjY6Il90b2tlbiI7czo0MDoiY2swanlQYVRma0ZocWk0SEszM1NjdVhSMWN0Nm1IYm5McVNJcmp4MyI7czo5OiJfcHJldmlvdXMiO2E6Mjp7czozOiJ1cmwiO3M6MzA6Imh0dHA6Ly9sb2NhbGhvc3Q6ODAwMC9hcGkvdXNlciI7czo1OiJyb3V0ZSI7Tjt9czo2OiJfZmxhc2giO2E6Mjp7czozOiJvbGQiO2E6MDp7fXM6MzoibmV3IjthOjA6e319fQ==', 1794495172),
	('Brgh6kIhf7ThZfsGTbIFi7Z1OZUpw1FguHDCHg1w', 1, '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/157.0.0.0 Safari/537.36', 'YTo1OntzOjY6Il90b2tlbiI7czo0MDoiYVlyRUVwWUNKYkIweEVlbGVKVXpWNm9NVDdvYWFpSmloMnh4dFB0QyI7czo5OiJfcHJldmlvdXMiO2E6Mjp7czozOiJ1cmwiO3M6MzQ6Imh0dHA6Ly9sb2NhbGhvc3Q6ODAwMC9hcGkvc2VydmljZXMiO3M6NToicm91dGUiO047fXM6NjoiX2ZsYXNoIjthOjI6e3M6Mzoib2xkIjthOjA6e31zOjM6Im5ldyI7YTowOnt9fXM6NTA6ImxvZ2luX3dlYl81OWJhMzZhZGRjMmIyZjk0MDE1ODBmMDE0YzdmNThlYTRlMzA5ODlkIjtpOjE7czoxNzoicGFzc3dvcmRfaGFzaF93ZWIiO3M6NjQ6ImNmZjUyM2IwNzJkNWY5NDUyODU4NWY1ZDQwYmFhOTU3ZjQzMmEwOTUyZDE4YTJmODVjYzUxYzUwMjUxNzkxYjQiO30=', 1794499206),
	('C9y6ONW1w5zm8MBWkeMoDVOiNbKzkTezzzm813Dg', NULL, '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Code/1.146.0 Chrome/150.0.7871.250 Electron/43.8.6 Safari/537.36', 'YTozOntzOjY6Il90b2tlbiI7czo0MDoiWTZTeXRFU1kwWEpmNFVJdmJKZ2FocnlGYnNYNzc2TlVwWVU0RWdoayI7czo5OiJfcHJldmlvdXMiO2E6Mjp7czozOiJ1cmwiO3M6MzQ6Imh0dHA6Ly9sb2NhbGhvc3Q6ODAwMC9hcGkvc2VydmljZXMiO3M6NToicm91dGUiO047fXM6NjoiX2ZsYXNoIjthOjI6e3M6Mzoib2xkIjthOjA6e31zOjM6Im5ldyI7YTowOnt9fX0=', 1794494464),
	('CbUGluC6nu32RW7BgKBhksSYvsv2kM0NMAZRy6sH', NULL, '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Code/1.146.0 Chrome/150.0.7871.250 Electron/43.8.6 Safari/537.36', 'YTozOntzOjY6Il90b2tlbiI7czo0MDoiTEJnNk5UQlNuYUZFNmtOMUVxSjhvTHBEQndYaTRMTmdaa0NzdUdnVCI7czo5OiJfcHJldmlvdXMiO2E6Mjp7czozOiJ1cmwiO3M6MzQ6Imh0dHA6Ly9sb2NhbGhvc3Q6ODAwMC9hcGkvc2VydmljZXMiO3M6NToicm91dGUiO047fXM6NjoiX2ZsYXNoIjthOjI6e3M6Mzoib2xkIjthOjA6e31zOjM6Im5ldyI7YTowOnt9fX0=', 1794496385),
	('cIHnAUt23bRFh2AwkrQjN9clFVCwcvNdEkdn20ML', NULL, '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Code/1.146.0 Chrome/150.0.7871.250 Electron/43.8.6 Safari/537.36', 'YTozOntzOjY6Il90b2tlbiI7czo0MDoiM2xHSVJjQ1ZVOWhsTHdDZmhQamZMSnJIRXdJdHhmenNwcjRScEE2VSI7czo5OiJfcHJldmlvdXMiO2E6Mjp7czozOiJ1cmwiO3M6MzQ6Imh0dHA6Ly9sb2NhbGhvc3Q6ODAwMC9hcGkvc2VydmljZXMiO3M6NToicm91dGUiO047fXM6NjoiX2ZsYXNoIjthOjI6e3M6Mzoib2xkIjthOjA6e31zOjM6Im5ldyI7YTowOnt9fX0=', 1794494865),
	('F5sc3ogEYIdEfNdNIhjApJmhF9fF26OsCL6WqaKI', 2, '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Code/1.146.0 Chrome/150.0.7871.250 Electron/43.8.6 Safari/537.36', 'YTo1OntzOjY6Il90b2tlbiI7czo0MDoidkRoWm1TSXJnUDJPTUlTeUI1NHVTaXo4bFFXalNvSzR6Z2RHVTQ1TSI7czo2OiJfZmxhc2giO2E6Mjp7czozOiJvbGQiO2E6MDp7fXM6MzoibmV3IjthOjA6e319czo5OiJfcHJldmlvdXMiO2E6Mjp7czozOiJ1cmwiO3M6MzQ6Imh0dHA6Ly9sb2NhbGhvc3Q6ODAwMC9hcGkvc2VydmljZXMiO3M6NToicm91dGUiO047fXM6NTA6ImxvZ2luX3dlYl81OWJhMzZhZGRjMmIyZjk0MDE1ODBmMDE0YzdmNThlYTRlMzA5ODlkIjtpOjI7czoxNzoicGFzc3dvcmRfaGFzaF93ZWIiO3M6NjQ6IjZmNTUwNmVhNzg2MDZlZDQ2MzBkYTQ4MzE5NjE5YTM0ZDk5MzUyNWE0ZTg0MjFiNWQ2ZWUyMjlmM2M3ODY5YWQiO30=', 1794496951),
	('HE7S5H3ZYkeqaRkKBNJAyR43SfztCP07nmgAnsPZ', NULL, '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Code/1.146.0 Chrome/150.0.7871.250 Electron/43.8.6 Safari/537.36', 'YTozOntzOjY6Il90b2tlbiI7czo0MDoidVVhck5uUzdMcnVXV1N1WlN6eXNRYjBKWkxRREJmUTUxSHI5U2hzNSI7czo5OiJfcHJldmlvdXMiO2E6Mjp7czozOiJ1cmwiO3M6MzQ6Imh0dHA6Ly9sb2NhbGhvc3Q6ODAwMC9hcGkvc2VydmljZXMiO3M6NToicm91dGUiO047fXM6NjoiX2ZsYXNoIjthOjI6e3M6Mzoib2xkIjthOjA6e31zOjM6Im5ldyI7YTowOnt9fX0=', 1794495172),
	('hLmAKaeLQ7RzW5FUYbYmXw2Aw6wcbqFUnd3qzvqb', NULL, '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Code/1.146.0 Chrome/150.0.7871.250 Electron/43.8.6 Safari/537.36', 'YTozOntzOjY6Il90b2tlbiI7czo0MDoiZG1IaGJ4ck5URE44ZlJESVBRelVRT3JUZUxyM2FiMk16MWtCQU93WSI7czo5OiJfcHJldmlvdXMiO2E6Mjp7czozOiJ1cmwiO3M6MzQ6Imh0dHA6Ly9sb2NhbGhvc3Q6ODAwMC9hcGkvc2VydmljZXMiO3M6NToicm91dGUiO047fXM6NjoiX2ZsYXNoIjthOjI6e3M6Mzoib2xkIjthOjA6e31zOjM6Im5ldyI7YTowOnt9fX0=', 1794496373),
	('i1O9djcd1I2C2rCWmn0odkrqRhgEIYefWf2XJGtU', NULL, '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Code/1.146.0 Chrome/150.0.7871.250 Electron/43.8.6 Safari/537.36', 'YTozOntzOjY6Il90b2tlbiI7czo0MDoiR1NiTklDNlVnVDk0UnBUNWFXVGlZdVlQZWxrUDNDamJJNGIxRGJrVCI7czo5OiJfcHJldmlvdXMiO2E6Mjp7czozOiJ1cmwiO3M6MzA6Imh0dHA6Ly9sb2NhbGhvc3Q6ODAwMC9hcGkvdXNlciI7czo1OiJyb3V0ZSI7Tjt9czo2OiJfZmxhc2giO2E6Mjp7czozOiJvbGQiO2E6MDp7fXM6MzoibmV3IjthOjA6e319fQ==', 1794494317),
	('ixeYztYwDyzVi7cTV3WutfMZfyIL9OKJooiQdJlN', NULL, '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Code/1.146.0 Chrome/150.0.7871.250 Electron/43.8.6 Safari/537.36', 'YTozOntzOjY6Il90b2tlbiI7czo0MDoiWGRiU29rYXF5Z1lmbFBjMFdHc2FGTnVrVEN2TDZKem9seVd5bDJXciI7czo5OiJfcHJldmlvdXMiO2E6Mjp7czozOiJ1cmwiO3M6MzA6Imh0dHA6Ly9sb2NhbGhvc3Q6ODAwMC9hcGkvdXNlciI7czo1OiJyb3V0ZSI7Tjt9czo2OiJfZmxhc2giO2E6Mjp7czozOiJvbGQiO2E6MDp7fXM6MzoibmV3IjthOjA6e319fQ==', 1794493685),
	('IZDk90AGwgvRn8S9bwqEDjaLSS5F8fs6DUao0wpM', NULL, '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Code/1.146.0 Chrome/150.0.7871.250 Electron/43.8.6 Safari/537.36', 'YTozOntzOjY6Il90b2tlbiI7czo0MDoiMUw0WEtvUnBaVFVJQ0tyeEgxakVvb1o3cm50YjI5bGc5YldRMkc5ZiI7czo5OiJfcHJldmlvdXMiO2E6Mjp7czozOiJ1cmwiO3M6MzQ6Imh0dHA6Ly9sb2NhbGhvc3Q6ODAwMC9hcGkvc2VydmljZXMiO3M6NToicm91dGUiO047fXM6NjoiX2ZsYXNoIjthOjI6e3M6Mzoib2xkIjthOjA6e31zOjM6Im5ldyI7YTowOnt9fX0=', 1794493686),
	('JLZ5UhXZKEXWtNLdXbTK0A0JApGwSqljNeL6rasT', NULL, '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Code/1.146.0 Chrome/150.0.7871.250 Electron/43.8.6 Safari/537.36', 'YTozOntzOjY6Il90b2tlbiI7czo0MDoiaDhGYTV5VG5WWVd1cnBLRlJ1aDlidklYM1V0YThia0VxSGQyazdLbyI7czo5OiJfcHJldmlvdXMiO2E6Mjp7czozOiJ1cmwiO3M6MzA6Imh0dHA6Ly9sb2NhbGhvc3Q6ODAwMC9hcGkvdXNlciI7czo1OiJyb3V0ZSI7Tjt9czo2OiJfZmxhc2giO2E6Mjp7czozOiJvbGQiO2E6MDp7fXM6MzoibmV3IjthOjA6e319fQ==', 1794494866),
	('Kw4dqUSj0Ml8pDpPp7EXUzWggGE7FqeIQDxSIkhm', NULL, '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Code/1.146.0 Chrome/150.0.7871.250 Electron/43.8.6 Safari/537.36', 'YTozOntzOjY6Il90b2tlbiI7czo0MDoiZDF2UDZhclF3dmtobHFQY01WVVpBeTFFS294ckVTSU44OEhaNXJkbCI7czo5OiJfcHJldmlvdXMiO2E6Mjp7czozOiJ1cmwiO3M6MzA6Imh0dHA6Ly9sb2NhbGhvc3Q6ODAwMC9hcGkvdXNlciI7czo1OiJyb3V0ZSI7Tjt9czo2OiJfZmxhc2giO2E6Mjp7czozOiJvbGQiO2E6MDp7fXM6MzoibmV3IjthOjA6e319fQ==', 1794496385),
	('lAeUlmlUqobttSdeeHAFL89B65biuFbuivEFHh7u', NULL, '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Code/1.146.0 Chrome/150.0.7871.250 Electron/43.8.6 Safari/537.36', 'YTozOntzOjY6Il90b2tlbiI7czo0MDoialcyUmRjTTFxMTNkTUtOYVN4MElBc09jSkpzVDVtc1VSZFBpQXZmWiI7czo5OiJfcHJldmlvdXMiO2E6Mjp7czozOiJ1cmwiO3M6MzQ6Imh0dHA6Ly9sb2NhbGhvc3Q6ODAwMC9hcGkvc2VydmljZXMiO3M6NToicm91dGUiO047fXM6NjoiX2ZsYXNoIjthOjI6e3M6Mzoib2xkIjthOjA6e31zOjM6Im5ldyI7YTowOnt9fX0=', 1794493685),
	('loO3fRtv3JQSNEr0xv0yHlOcJPQ20aS6EOVzFwmr', NULL, '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Code/1.146.0 Chrome/150.0.7871.250 Electron/43.8.6 Safari/537.36', 'YTozOntzOjY6Il90b2tlbiI7czo0MDoid2czaldkYWRISFNldmtKZDdWYUdvOVZaQjJpUERWRkZSS25ldkNLNCI7czo5OiJfcHJldmlvdXMiO2E6Mjp7czozOiJ1cmwiO3M6MzQ6Imh0dHA6Ly9sb2NhbGhvc3Q6ODAwMC9hcGkvc2VydmljZXMiO3M6NToicm91dGUiO047fXM6NjoiX2ZsYXNoIjthOjI6e3M6Mzoib2xkIjthOjA6e31zOjM6Im5ldyI7YTowOnt9fX0=', 1794494464),
	('mcjaM6Y5IfL6itjfbQQYfo0SUM9HWt7hsHJ1HD5N', NULL, '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Code/1.146.0 Chrome/150.0.7871.250 Electron/43.8.6 Safari/537.36', 'YTozOntzOjY6Il90b2tlbiI7czo0MDoiMTNDRFZBV1pmeEg2WlM4eFhSUTBOU1BiRzl4blhldmZHNkpla1FZOSI7czo5OiJfcHJldmlvdXMiO2E6Mjp7czozOiJ1cmwiO3M6MzQ6Imh0dHA6Ly9sb2NhbGhvc3Q6ODAwMC9hcGkvc2VydmljZXMiO3M6NToicm91dGUiO047fXM6NjoiX2ZsYXNoIjthOjI6e3M6Mzoib2xkIjthOjA6e31zOjM6Im5ldyI7YTowOnt9fX0=', 1794494192),
	('MLyzqmv9GtfRPGEgMUyFgTwF26XlmAqKg9PStNVP', NULL, '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Code/1.146.0 Chrome/150.0.7871.250 Electron/43.8.6 Safari/537.36', 'YTozOntzOjY6Il90b2tlbiI7czo0MDoiY0FzcnVFTm5BVlRnMnlDc09LYXNUMlduSDhiSUFVRFF2ZHFjUGZIbiI7czo5OiJfcHJldmlvdXMiO2E6Mjp7czozOiJ1cmwiO3M6MzQ6Imh0dHA6Ly9sb2NhbGhvc3Q6ODAwMC9hcGkvc2VydmljZXMiO3M6NToicm91dGUiO047fXM6NjoiX2ZsYXNoIjthOjI6e3M6Mzoib2xkIjthOjA6e31zOjM6Im5ldyI7YTowOnt9fX0=', 1794494326),
	('MN3lANk0KrEyPoZdBqDDc4Yi82Snq41kM2qFA0HV', NULL, '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Code/1.146.0 Chrome/150.0.7871.250 Electron/43.8.6 Safari/537.36', 'YTozOntzOjY6Il90b2tlbiI7czo0MDoiS3ZtUVNEeFVuT2swdVgySm9oSjdtREN3anFXVkdKcmZCaHNHS0hiWCI7czo5OiJfcHJldmlvdXMiO2E6Mjp7czozOiJ1cmwiO3M6MzA6Imh0dHA6Ly9sb2NhbGhvc3Q6ODAwMC9hcGkvdXNlciI7czo1OiJyb3V0ZSI7Tjt9czo2OiJfZmxhc2giO2E6Mjp7czozOiJvbGQiO2E6MDp7fXM6MzoibmV3IjthOjA6e319fQ==', 1794494317),
	('MqKOHZVIed9W8XOdmZA66QNnrEivB6FRISCVDY1r', NULL, '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Code/1.146.0 Chrome/150.0.7871.250 Electron/43.8.6 Safari/537.36', 'YTozOntzOjY6Il90b2tlbiI7czo0MDoiaXR2M0NVdkVHc2RlSURjTXZid0I4QlVqa09aSzZLdG1NTnhxOVlYciI7czo5OiJfcHJldmlvdXMiO2E6Mjp7czozOiJ1cmwiO3M6MzA6Imh0dHA6Ly9sb2NhbGhvc3Q6ODAwMC9hcGkvdXNlciI7czo1OiJyb3V0ZSI7Tjt9czo2OiJfZmxhc2giO2E6Mjp7czozOiJvbGQiO2E6MDp7fXM6MzoibmV3IjthOjA6e319fQ==', 1794495171),
	('NSb4VRkua3JH3ZSEFEMr1GLY6AJM67ooJa0nyoMS', NULL, '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Code/1.146.0 Chrome/150.0.7871.250 Electron/43.8.6 Safari/537.36', 'YTozOntzOjY6Il90b2tlbiI7czo0MDoiSGM5UVVRNFRFYXV5WmxudmR4Z2tpZU5ndFloNW9TZmNIeVVVY2FDOSI7czo5OiJfcHJldmlvdXMiO2E6Mjp7czozOiJ1cmwiO3M6MzA6Imh0dHA6Ly9sb2NhbGhvc3Q6ODAwMC9hcGkvdXNlciI7czo1OiJyb3V0ZSI7Tjt9czo2OiJfZmxhc2giO2E6Mjp7czozOiJvbGQiO2E6MDp7fXM6MzoibmV3IjthOjA6e319fQ==', 1794494866),
	('NUTplUCqPsShCdCy2nBiNLpUKW9QAf4dreRkzXGC', NULL, '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Code/1.146.0 Chrome/150.0.7871.250 Electron/43.8.6 Safari/537.36', 'YTozOntzOjY6Il90b2tlbiI7czo0MDoiUEt1SzF4STlkcWlIWFVVSUJ6OVRzcWlCbEc1TllyQmNiVXV5d1o2bSI7czo5OiJfcHJldmlvdXMiO2E6Mjp7czozOiJ1cmwiO3M6MzQ6Imh0dHA6Ly9sb2NhbGhvc3Q6ODAwMC9hcGkvc2VydmljZXMiO3M6NToicm91dGUiO047fXM6NjoiX2ZsYXNoIjthOjI6e3M6Mzoib2xkIjthOjA6e31zOjM6Im5ldyI7YTowOnt9fX0=', 1794493698),
	('oxvPuCadva2miEYQYnfBE4jEArJckf7vSiiSB3na', NULL, '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Code/1.146.0 Chrome/150.0.7871.250 Electron/43.8.6 Safari/537.36', 'YTozOntzOjY6Il90b2tlbiI7czo0MDoiamZSTnBDdlZrRUFxejNuVW5tR3p3bGJRVmdyRFI5bkxWVGlURnNMaSI7czo5OiJfcHJldmlvdXMiO2E6Mjp7czozOiJ1cmwiO3M6MzA6Imh0dHA6Ly9sb2NhbGhvc3Q6ODAwMC9hcGkvdXNlciI7czo1OiJyb3V0ZSI7Tjt9czo2OiJfZmxhc2giO2E6Mjp7czozOiJvbGQiO2E6MDp7fXM6MzoibmV3IjthOjA6e319fQ==', 1794494865),
	('P4bo2AZoFHDnvzgfQPNKGbjwWJ2lUTwaaZFRgRPX', NULL, '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Code/1.146.0 Chrome/150.0.7871.250 Electron/43.8.6 Safari/537.36', 'YTozOntzOjY6Il90b2tlbiI7czo0MDoiSk5kWG55aVFSUXhZZzA1Q0IwdDh2MWpQQW5mQ0dMRkNGQkFieWJJYyI7czo5OiJfcHJldmlvdXMiO2E6Mjp7czozOiJ1cmwiO3M6MzQ6Imh0dHA6Ly9sb2NhbGhvc3Q6ODAwMC9hcGkvc2VydmljZXMiO3M6NToicm91dGUiO047fXM6NjoiX2ZsYXNoIjthOjI6e3M6Mzoib2xkIjthOjA6e31zOjM6Im5ldyI7YTowOnt9fX0=', 1794495171),
	('QiLZfWLTxVKLlx7FU1oX2cIT6GY9n1XSnKKPKciZ', NULL, '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Code/1.146.0 Chrome/150.0.7871.250 Electron/43.8.6 Safari/537.36', 'YTozOntzOjY6Il90b2tlbiI7czo0MDoiM2VuMjgzY3MzSHA4d2ZZWHJFQ2RTOFpJcm9Oc3RWdGN0ZFN4NnFpZiI7czo5OiJfcHJldmlvdXMiO2E6Mjp7czozOiJ1cmwiO3M6MzA6Imh0dHA6Ly9sb2NhbGhvc3Q6ODAwMC9hcGkvdXNlciI7czo1OiJyb3V0ZSI7Tjt9czo2OiJfZmxhc2giO2E6Mjp7czozOiJvbGQiO2E6MDp7fXM6MzoibmV3IjthOjA6e319fQ==', 1794495172),
	('qMkyfkYAKbqRCO9jRMqXyxwr66p1CeyGji9VkNIn', NULL, '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Code/1.146.0 Chrome/150.0.7871.250 Electron/43.8.6 Safari/537.36', 'YTozOntzOjY6Il90b2tlbiI7czo0MDoiWlpzMnFlMXFqTWo4RURpSEwxY3BhampxOEl0ejRrbkxXZkZnZmdZUiI7czo5OiJfcHJldmlvdXMiO2E6Mjp7czozOiJ1cmwiO3M6MzA6Imh0dHA6Ly9sb2NhbGhvc3Q6ODAwMC9hcGkvdXNlciI7czo1OiJyb3V0ZSI7Tjt9czo2OiJfZmxhc2giO2E6Mjp7czozOiJvbGQiO2E6MDp7fXM6MzoibmV3IjthOjA6e319fQ==', 1794493685),
	('QxfIIS51nbTW9BZppLhjWhEtgysmNiCJddSI5jIv', NULL, '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Code/1.146.0 Chrome/150.0.7871.250 Electron/43.8.6 Safari/537.36', 'YToyOntzOjY6Il90b2tlbiI7czo0MDoiOXMwZ1pjVGJhRVVhT1F6WGdNeENZRm5Ib0xjZVhiUWZyV0c5RkVFOCI7czo2OiJfZmxhc2giO2E6Mjp7czozOiJvbGQiO2E6MDp7fXM6MzoibmV3IjthOjA6e319fQ==', 1794496238),
	('QYVE42Jog7l6gLnnXhIZvpVujXF666mlMZ2V9JQL', NULL, '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Code/1.146.0 Chrome/150.0.7871.250 Electron/43.8.6 Safari/537.36', 'YToyOntzOjY6Il90b2tlbiI7czo0MDoiZkU0MnhqSGJjMmE2aFd6RHlBZmRaN0liQXQxYVR1aUh0anBlcTU0UiI7czo2OiJfZmxhc2giO2E6Mjp7czozOiJvbGQiO2E6MDp7fXM6MzoibmV3IjthOjA6e319fQ==', 1794496294),
	('RJXtBpVOz3vsjKys82XCofbIOWupwCrFKb9iUvZ8', NULL, '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Code/1.146.0 Chrome/150.0.7871.250 Electron/43.8.6 Safari/537.36', 'YTozOntzOjY6Il90b2tlbiI7czo0MDoid2hVcndGVzExSUs0VWg2Mk1xTHlaNUxWVVhuckhDMWFOcHVwNkVJYSI7czo5OiJfcHJldmlvdXMiO2E6Mjp7czozOiJ1cmwiO3M6NDE6Imh0dHA6Ly9sb2NhbGhvc3Q6ODAwMC9zYW5jdHVtL2NzcmYtY29va2llIjtzOjU6InJvdXRlIjtzOjE5OiJzYW5jdHVtLmNzcmYtY29va2llIjt9czo2OiJfZmxhc2giO2E6Mjp7czozOiJvbGQiO2E6MDp7fXM6MzoibmV3IjthOjA6e319fQ==', 1794496237),
	('rU3kd8Mc1G89keoY9CJ4nbyP729Lr98pKGzeWXI5', NULL, '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Code/1.146.0 Chrome/150.0.7871.250 Electron/43.8.6 Safari/537.36', 'YTozOntzOjY6Il90b2tlbiI7czo0MDoiWkhFcXAzUlJ3UWVJY3NZUzE4RGhnZmN0U0dlWk9haUNZVFBFOTFveSI7czo5OiJfcHJldmlvdXMiO2E6Mjp7czozOiJ1cmwiO3M6MzQ6Imh0dHA6Ly9sb2NhbGhvc3Q6ODAwMC9hcGkvc2VydmljZXMiO3M6NToicm91dGUiO047fXM6NjoiX2ZsYXNoIjthOjI6e3M6Mzoib2xkIjthOjA6e31zOjM6Im5ldyI7YTowOnt9fX0=', 1794493697),
	('tgBdtwZbXF4uXrmr0Nof7sL7DwBC3g7wBLLYJpnl', NULL, '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Code/1.146.0 Chrome/150.0.7871.250 Electron/43.8.6 Safari/537.36', 'YTozOntzOjY6Il90b2tlbiI7czo0MDoiTWVzckNJWVpFNHhtM1U5TWt4U1BacTNMZUpmbmo3NVgxWTZqNmxNSyI7czo5OiJfcHJldmlvdXMiO2E6Mjp7czozOiJ1cmwiO3M6MzA6Imh0dHA6Ly9sb2NhbGhvc3Q6ODAwMC9hcGkvdXNlciI7czo1OiJyb3V0ZSI7Tjt9czo2OiJfZmxhc2giO2E6Mjp7czozOiJvbGQiO2E6MDp7fXM6MzoibmV3IjthOjA6e319fQ==', 1794494865),
	('wBgz2PdqzbEIRWhZpfDWAOCI0ZICXhMed0xTTrdp', NULL, '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Code/1.146.0 Chrome/150.0.7871.250 Electron/43.8.6 Safari/537.36', 'YTozOntzOjY6Il90b2tlbiI7czo0MDoiWnViaEN0bG9BVnBTaEdZTFh1bG9HZ21uM3E3WkpwcTlENlpucm1KMCI7czo5OiJfcHJldmlvdXMiO2E6Mjp7czozOiJ1cmwiO3M6MzQ6Imh0dHA6Ly9sb2NhbGhvc3Q6ODAwMC9hcGkvc2VydmljZXMiO3M6NToicm91dGUiO047fXM6NjoiX2ZsYXNoIjthOjI6e3M6Mzoib2xkIjthOjA6e31zOjM6Im5ldyI7YTowOnt9fX0=', 1794496373),
	('wJrRC3l5BxP607d5Jxu65t0g793bWGply9cNjY9i', NULL, '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Code/1.146.0 Chrome/150.0.7871.250 Electron/43.8.6 Safari/537.36', 'YTozOntzOjY6Il90b2tlbiI7czo0MDoiVjlQekRJUjNEbHIzR2w5S3Y5UGxhc2JaTVdIdFdMZDUwUDBySFlDUyI7czo5OiJfcHJldmlvdXMiO2E6Mjp7czozOiJ1cmwiO3M6MzQ6Imh0dHA6Ly9sb2NhbGhvc3Q6ODAwMC9hcGkvc2VydmljZXMiO3M6NToicm91dGUiO047fXM6NjoiX2ZsYXNoIjthOjI6e3M6Mzoib2xkIjthOjA6e31zOjM6Im5ldyI7YTowOnt9fX0=', 1794494181),
	('YgOFmGbhAbhSXWGXOqbF2nuzV6I7FhXEXduSBEP1', NULL, '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Code/1.146.0 Chrome/150.0.7871.250 Electron/43.8.6 Safari/537.36', 'YTozOntzOjY6Il90b2tlbiI7czo0MDoiMVk4ckRPdEtaQ3c2V1FSbElwdEl3Qlp1TG0yMFlROVJQNlMyV2pocCI7czo5OiJfcHJldmlvdXMiO2E6Mjp7czozOiJ1cmwiO3M6MzA6Imh0dHA6Ly9sb2NhbGhvc3Q6ODAwMC9hcGkvdXNlciI7czo1OiJyb3V0ZSI7Tjt9czo2OiJfZmxhc2giO2E6Mjp7czozOiJvbGQiO2E6MDp7fXM6MzoibmV3IjthOjA6e319fQ==', 1794496385);

-- Dumping structure for table villacorz_db.users
CREATE TABLE IF NOT EXISTS `users` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `firstname` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `lastname` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email_verified_at` timestamp NULL DEFAULT NULL,
  `password` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `remember_token` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `role` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'customer',
  PRIMARY KEY (`id`),
  UNIQUE KEY `users_email_unique` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Dumping data for table villacorz_db.users: ~2 rows (approximately)
INSERT INTO `users` (`id`, `firstname`, `lastname`, `email`, `email_verified_at`, `password`, `remember_token`, `created_at`, `updated_at`, `role`) VALUES
	(1, 'Admin', 'Account', 'dlord0260@gmail.com', '2026-10-31 20:14:21', '$2y$12$p1qLnpTjGPROeB9Ur97PP./2x6/7UBg0x6H8NwZtyDBg4sRA1CJV6', NULL, '2026-10-31 20:14:21', '2026-11-07 07:19:19', 'admin'),
	(2, 'Haydee', 'Dacillo', 'dacillohaydee@gmail.com', '2026-11-04 06:58:13', '$2y$12$F1tMQB3HeIUYj2Aj4zZifOe2F.Gh1znjuDI/IM4Ko05sjCRc2iyQ.', NULL, '2026-11-04 06:58:13', '2026-11-04 06:58:13', 'customer');

/*!40103 SET TIME_ZONE=IFNULL(@OLD_TIME_ZONE, 'system') */;
/*!40101 SET SQL_MODE=IFNULL(@OLD_SQL_MODE, '') */;
/*!40014 SET FOREIGN_KEY_CHECKS=IFNULL(@OLD_FOREIGN_KEY_CHECKS, 1) */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40111 SET SQL_NOTES=IFNULL(@OLD_SQL_NOTES, 1) */;
