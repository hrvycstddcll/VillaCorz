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
CREATE DATABASE IF NOT EXISTS `villacorz_db` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci */ /*!80016 DEFAULT ENCRYPTION='N' */;
USE `villacorz_db`;

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
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Dumping data for table villacorz_db.migrations: ~1 rows (approximately)
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES
	(1, '0001_01_01_000000_create_users_table', 1),
	(2, '0001_01_01_000001_create_cache_table', 1),
	(3, '0001_01_01_000002_create_jobs_table', 1),
	(4, '2026_10_12_165222_create_personal_access_tokens_table', 1),
	(5, '2026_10_12_171710_add_firstname_lastname_to_users_table', 1),
	(6, '2026_10_12_172918_add_role_to_users_table', 1),
	(7, '2026_10_12_180125_remove_name_from_users_table', 2);

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
) ENGINE=InnoDB AUTO_INCREMENT=20 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Dumping data for table villacorz_db.personal_access_tokens: ~0 rows (approximately)
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
	(19, 'App\\Models\\User', 2, 'auth_token', 'de7ed15f45c65a9c3f59b668ccd0fea48441cd55e747a56749df1da0a604de95', '["*"]', NULL, NULL, '2026-10-12 19:33:28', '2026-10-12 19:33:28');

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

-- Dumping data for table villacorz_db.sessions: ~0 rows (approximately)

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
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Dumping data for table villacorz_db.users: ~3 rows (approximately)
INSERT INTO `users` (`id`, `firstname`, `lastname`, `email`, `email_verified_at`, `password`, `remember_token`, `created_at`, `updated_at`, `role`) VALUES
	(1, 'Harvey', 'Dacillo', 'harvey.test@example.com', NULL, '$2y$12$YbD9Ik4GZ4C0iOyNii8oc.Ateo.0POD0ueqbP0dR0LZJzajDzp7cK', NULL, '2026-10-12 09:56:45', '2026-10-12 09:56:45', 'customer'),
	(2, 'Nuren', 'Cedo', 'nuren@gmail.com', NULL, '$2y$12$1bSYlPH2YQCTAYb8YpzLK.jY5jnmvlkYkHCULuahJ8sYc.ikEPeKu', NULL, '2026-10-12 10:28:54', '2026-10-12 10:28:54', 'customer'),
	(3, 'Julby Mier', 'Bilog', 'jmbilog@gmail.com', NULL, '$2y$12$tFgDW2.amA5YBg.beT7JQOd3u89.dlR8XkiBPJowky1GlzYQpcXVq', NULL, '2026-10-12 11:00:05', '2026-10-12 11:00:05', 'customer');

/*!40103 SET TIME_ZONE=IFNULL(@OLD_TIME_ZONE, 'system') */;
/*!40101 SET SQL_MODE=IFNULL(@OLD_SQL_MODE, '') */;
/*!40014 SET FOREIGN_KEY_CHECKS=IFNULL(@OLD_FOREIGN_KEY_CHECKS, 1) */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40111 SET SQL_NOTES=IFNULL(@OLD_SQL_NOTES, 1) */;
