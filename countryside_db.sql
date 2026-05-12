-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: May 18, 2025 at 07:47 AM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `countryside_db`
--

-- --------------------------------------------------------

--
-- Table structure for table `audit_logs`
--

CREATE TABLE `audit_logs` (
  `id` int(11) NOT NULL,
  `payroll_id` int(11) NOT NULL,
  `user_id` varchar(20) DEFAULT NULL,
  `action` varchar(50) NOT NULL,
  `remarks` text DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  `employee_id` varchar(20) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `audit_logs`
--

INSERT INTO `audit_logs` (`id`, `payroll_id`, `user_id`, `action`, `remarks`, `created_at`, `employee_id`) VALUES
(1, 1, '2025-50001', 'submit', NULL, '2025-05-08 13:59:18', '2025-50001'),
(2, 2, '2025-50001', 'submit', NULL, '2025-05-08 13:59:18', '2025-50002'),
(3, 3, '2025-50001', 'submit', NULL, '2025-05-08 13:59:18', '2025-50003'),
(4, 4, '2025-50001', 'submit', NULL, '2025-05-08 13:59:18', '2025-50004'),
(5, 5, '2025-50001', 'submit', NULL, '2025-05-08 13:59:18', '2025-50005'),
(6, 6, '2025-50001', 'submit', NULL, '2025-05-08 13:59:18', '2025-50006'),
(7, 7, '2025-50000', 'submit', NULL, '2025-05-08 14:04:51', '2025-50007'),
(8, 1, '2025-50000', 'approve', NULL, '2025-05-08 14:08:45', '2025-50001'),
(9, 2, '2025-50000', 'approve', NULL, '2025-05-08 14:08:45', '2025-50002'),
(10, 3, '2025-50000', 'approve', NULL, '2025-05-08 14:08:45', '2025-50003'),
(11, 4, '2025-50000', 'approve', NULL, '2025-05-08 14:08:45', '2025-50004'),
(12, 5, '2025-50000', 'approve', NULL, '2025-05-08 14:08:45', '2025-50005'),
(13, 6, '2025-50000', 'approve', NULL, '2025-05-08 14:12:20', '2025-50006'),
(14, 7, '2025-50000', 'approve', NULL, '2025-05-08 14:12:20', '2025-50007'),
(15, 1, '2025-50000', 'process', NULL, '2025-05-08 14:24:21', '2025-50001'),
(16, 2, '2025-50000', 'process', NULL, '2025-05-08 14:24:21', '2025-50002'),
(17, 3, '2025-50000', 'process', NULL, '2025-05-08 14:24:21', '2025-50003'),
(18, 4, '2025-50000', 'process', NULL, '2025-05-08 14:29:06', '2025-50004'),
(19, 5, '2025-50000', 'process', NULL, '2025-05-08 14:29:06', '2025-50005'),
(20, 6, '2025-50000', 'process', NULL, '2025-05-08 14:29:06', '2025-50006'),
(21, 7, '2025-50000', 'process', NULL, '2025-05-08 14:29:06', '2025-50007');

-- --------------------------------------------------------

--
-- Table structure for table `available_schedules`
--

CREATE TABLE `available_schedules` (
  `id` int(11) NOT NULL,
  `type` varchar(255) NOT NULL,
  `time_in` varchar(255) NOT NULL,
  `time_out` varchar(255) NOT NULL,
  `work_days` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`work_days`)),
  `day_off` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`day_off`)),
  `remarks` varchar(255) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `deleted_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `available_schedules`
--

INSERT INTO `available_schedules` (`id`, `type`, `time_in`, `time_out`, `work_days`, `day_off`, `remarks`, `created_at`, `updated_at`, `deleted_at`) VALUES
(1, 'Day', '08:00', '17:00', '[\"Monday\",\"Tuesday\",\"Wednesday\",\"Thursday\",\"Friday\"]', '[\"Saturday\",\"Sunday\"]', 'for regular shift ', '0000-00-00 00:00:00', '2025-05-01 18:52:10', '2025-05-01 18:52:10'),
(2, 'Morning Shift', '08:00', '17:00', '[\"Monday\",\"Tuesday\",\"Wednesday\",\"Thursday\",\"Friday\",\"Saturday\"]', '[\"Sunday\"]', 'for morning shift', '2025-05-01 16:22:51', '2025-05-01 19:00:56', NULL),
(3, 'Mid Shift', '10:00', '19:00', '[\"Monday\",\"Tuesday\",\"Wednesday\",\"Thursday\",\"Friday\",\"Saturday\"]', '[\"Sunday\"]', 'typically for branches operation', '2025-05-01 19:02:26', '2025-05-01 19:02:26', NULL),
(4, 'Afternoon Shift', '13:00', '22:00', '[\"Monday\",\"Tuesday\",\"Wednesday\",\"Thursday\",\"Friday\",\"Saturday\"]', '[\"Sunday\"]', 'for afternoon shifts', '2025-05-01 19:03:32', '2025-05-01 19:09:24', NULL),
(5, 'Night Shift (with night differential)', '22:00', '07:00', '[\"Tuesday\",\"Wednesday\",\"Thursday\",\"Friday\",\"Saturday\",\"Monday\"]', '[\"Sunday\"]', 'matatapang but with 10% bonus???', '2025-05-01 19:04:58', '2025-05-04 07:53:36', NULL),
(6, 'Custom Shift', '18:00', '03:00', '[\"Monday\",\"Tuesday\",\"Wednesday\",\"Thursday\",\"Friday\",\"Sunday\"]', '[\"Saturday\"]', 'ito si nath kulet', '2025-05-05 10:08:01', '2025-05-05 10:08:01', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `batch_raw_materials`
--

CREATE TABLE `batch_raw_materials` (
  `id` int(11) NOT NULL,
  `batch_id` int(11) NOT NULL,
  `inventory_item_code` varchar(20) NOT NULL,
  `quantity_used` decimal(10,2) NOT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `batch_raw_materials`
--

INSERT INTO `batch_raw_materials` (`id`, `batch_id`, `inventory_item_code`, `quantity_used`, `created_at`, `updated_at`) VALUES
(1, 1, 'RAW-202505-0004', 10.00, '2025-05-16 14:06:34', '2025-05-16 14:06:34'),
(2, 1, 'RAW-202505-0002', 10.00, '2025-05-16 14:06:34', '2025-05-16 14:06:34'),
(3, 2, 'RAW-202505-0003', 10.00, '2025-05-16 14:14:50', '2025-05-16 14:14:50'),
(4, 8, 'RAW-202505-0002', 10.00, '2025-05-16 18:38:49', '2025-05-16 18:38:49'),
(5, 9, 'RAW-202505-0002', 10.00, '2025-05-16 18:54:09', '2025-05-16 18:54:09'),
(6, 10, 'RAW-202505-0003', 50.00, '2025-05-16 21:15:11', '2025-05-16 21:15:11'),
(7, 11, 'RAW-202505-0005', 50.00, '2025-05-17 21:09:01', '2025-05-17 21:09:01'),
(8, 12, 'RAW-202505-0001', 3.00, '2025-05-17 21:14:14', '2025-05-17 21:14:14');

-- --------------------------------------------------------

--
-- Table structure for table `branches`
--

CREATE TABLE `branches` (
  `id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `address` text DEFAULT NULL,
  `contact_number` varchar(20) DEFAULT NULL,
  `manager_name` varchar(100) DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `branches`
--

INSERT INTO `branches` (`id`, `name`, `address`, `contact_number`, `manager_name`, `is_active`) VALUES
(1, 'Main Branch', '123 Main Street, City Center', '123-456-7890', 'John Smith', 1),
(2, 'North Branch', '456 North Avenue, Uptown', '123-456-7891', 'Jane Doe', 1),
(3, 'South Branch', '789 South Boulevard, Downtown', '123-456-7892', 'Robert Johnson', 1);

-- --------------------------------------------------------

--
-- Table structure for table `branch_distribution_requests`
--

CREATE TABLE `branch_distribution_requests` (
  `id` int(11) NOT NULL,
  `request_id` varchar(20) NOT NULL,
  `branch_id` int(11) NOT NULL,
  `branch_name` varchar(100) NOT NULL,
  `status` varchar(20) NOT NULL DEFAULT 'pending',
  `remarks` text DEFAULT NULL,
  `requested_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `approved_at` timestamp NULL DEFAULT NULL,
  `rejected_at` timestamp NULL DEFAULT NULL,
  `rejection_reason` text DEFAULT NULL,
  `created_by` int(11) NOT NULL,
  `processed_by` int(11) DEFAULT NULL,
  `processed_at` datetime DEFAULT NULL,
  `process_notes` text DEFAULT NULL,
  `fulfilled_by` varchar(50) DEFAULT NULL,
  `fulfilled_at` datetime DEFAULT NULL,
  `deleted_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `branch_distribution_requests`
--

INSERT INTO `branch_distribution_requests` (`id`, `request_id`, `branch_id`, `branch_name`, `status`, `remarks`, `requested_at`, `approved_at`, `rejected_at`, `rejection_reason`, `created_by`, `processed_by`, `processed_at`, `process_notes`, `fulfilled_by`, `fulfilled_at`, `deleted_at`) VALUES
(1, 'REQ-2024-0001', 1, 'Main Branch', 'pending', 'Weekly inventory replenishment', '2024-06-01 02:30:00', NULL, NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL),
(2, 'REQ-2024-0002', 1, 'Main Branch', 'approved', 'Urgent request for weekend promotion', '2024-05-29 06:15:00', '2024-05-30 01:22:00', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL),
(3, 'REQ-2024-0003', 1, 'Main Branch', 'rejected', 'Items not available in stock', '2024-05-25 03:05:00', NULL, NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL),
(4, 'REQ-202505-7942', 1, 'Main Branch', 'pending', 'Test request', '2025-05-18 13:40:08', NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL),
(5, 'REQ-202505-1552', 1, 'Main Branch', 'pending', 'Test request', '2025-05-18 13:40:23', NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL),
(6, 'REQ-202505-2275', 1, 'Main Branch', 'pending', 'Test request', '2025-05-18 13:44:06', NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL),
(7, 'REQ-202505-7231', 1, 'Main Branch', 'pending', 'Test request', '2025-05-18 13:44:14', NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL),
(8, 'REQ-202505-4192', 1, 'Main Branch', 'pending', 'Test request', '2025-05-18 13:45:48', NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `branch_distribution_request_items`
--

CREATE TABLE `branch_distribution_request_items` (
  `id` int(11) NOT NULL,
  `request_id` int(11) NOT NULL,
  `product_id` int(11) NOT NULL,
  `product_code` varchar(20) NOT NULL,
  `product_name` varchar(100) NOT NULL,
  `category` varchar(50) NOT NULL,
  `quantity` int(11) NOT NULL,
  `unit` varchar(20) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `branch_distribution_request_items`
--

INSERT INTO `branch_distribution_request_items` (`id`, `request_id`, `product_id`, `product_code`, `product_name`, `category`, `quantity`, `unit`) VALUES
(1, 1, 1, 'FOO-202406-0001', 'Flour', 'Food Ingredients', 10, 'kg'),
(2, 1, 3, 'FOO-202406-0002', 'Sugar', 'Food Ingredients', 5, 'kg'),
(3, 2, 2, 'PAC-202406-0001', 'Paper Bags', 'Packaging Materials', 200, 'pcs'),
(4, 3, 4, 'KIT-202406-0001', 'Mixing Bowl', 'Kitchen Equipment', 2, 'pcs');

-- --------------------------------------------------------

--
-- Table structure for table `branch_inventory`
--

CREATE TABLE `branch_inventory` (
  `id` int(11) NOT NULL,
  `item_code` varchar(20) NOT NULL,
  `item_name` varchar(100) NOT NULL,
  `category` varchar(50) NOT NULL,
  `quantity` int(11) NOT NULL DEFAULT 0,
  `unit` varchar(20) NOT NULL,
  `status` varchar(20) NOT NULL,
  `reorder_point` int(11) NOT NULL DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `branch_inventory`
--

INSERT INTO `branch_inventory` (`id`, `item_code`, `item_name`, `category`, `quantity`, `unit`, `status`, `reorder_point`, `created_at`, `updated_at`) VALUES
(1, 'FOO-202406-0001', 'Flour', 'Food Ingredients', 25, 'kg', 'In Stock', 10, '2025-05-18 02:28:26', '2025-05-18 02:28:26'),
(2, 'PAC-202406-0001', 'Paper Bags', 'Packaging Materials', 500, 'pcs', 'In Stock', 100, '2025-05-18 02:28:26', '2025-05-18 02:28:26'),
(3, 'FOO-202406-0002', 'Sugar', 'Food Ingredients', 15, 'kg', 'Low Stock', 20, '2025-05-18 02:28:26', '2025-05-18 02:28:26'),
(4, 'KIT-202406-0001', 'Mixing Bowl', 'Kitchen Equipment', 3, 'pcs', 'In Stock', 2, '2025-05-18 02:28:26', '2025-05-18 02:28:26'),
(5, 'CLE-202406-0001', 'Disinfectant', 'Cleaning Supplies', 5, 'bottles', 'Low Stock', 8, '2025-05-18 02:28:26', '2025-05-18 02:28:26'),
(6, 'FOO-202406-0003', 'Salt', 'Food Ingredients', 8, 'kg', 'In Stock', 5, '2025-05-18 02:28:26', '2025-05-18 02:28:26'),
(7, 'FOO-202406-0004', 'Cooking Oil', 'Food Ingredients', 2, 'liters', 'Low Stock', 10, '2025-05-18 02:28:26', '2025-05-18 02:28:26'),
(8, 'PAC-202406-0002', 'Plastic Containers', 'Packaging Materials', 50, 'pcs', 'In Stock', 30, '2025-05-18 02:28:26', '2025-05-18 02:28:26'),
(9, 'KIT-202406-0002', 'Spatula', 'Kitchen Equipment', 2, 'pcs', 'Low Stock', 3, '2025-05-18 02:28:26', '2025-05-18 02:28:26'),
(10, 'RAW-202406-0001', 'Ground Pork', 'Raw Materials', 0, 'kg', 'Out of Stock', 10, '2025-05-18 02:28:26', '2025-05-18 02:28:26'),
(11, 'RAW-202406-0002', 'Chicken', 'Raw Materials', 5, 'kg', 'Low Stock', 15, '2025-05-18 02:28:26', '2025-05-18 02:28:26'),
(12, 'CLE-202406-0002', 'Floor Cleaner', 'Cleaning Supplies', 3, 'bottles', 'Low Stock', 5, '2025-05-18 02:28:26', '2025-05-18 02:28:26'),
(13, 'OTH-202406-0001', 'Receipt Paper', 'Others', 10, 'rolls', 'In Stock', 5, '2025-05-18 02:28:26', '2025-05-18 02:28:26'),
(14, 'KIT-202406-0003', 'Knife Set', 'Kitchen Equipment', 1, 'set', 'Low Stock', 1, '2025-05-18 02:28:26', '2025-05-18 02:28:26'),
(15, 'PAC-202406-0003', 'Take-out Boxes', 'Packaging Materials', 200, 'pcs', 'In Stock', 100, '2025-05-18 02:28:26', '2025-05-18 02:28:26');

-- --------------------------------------------------------

--
-- Table structure for table `deliveries`
--

CREATE TABLE `deliveries` (
  `id` int(11) NOT NULL,
  `request_id` varchar(20) NOT NULL,
  `supplier` varchar(100) NOT NULL,
  `items` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`items`)),
  `delivery_date` datetime NOT NULL,
  `status` enum('Pending','Received','Canceled') NOT NULL DEFAULT 'Pending',
  `received_by` varchar(100) DEFAULT NULL,
  `received_at` datetime DEFAULT NULL,
  `receipt_url` varchar(255) DEFAULT NULL,
  `paid_status` enum('Unpaid','Paid') NOT NULL DEFAULT 'Unpaid',
  `paid_at` datetime DEFAULT NULL,
  `paid_by` varchar(255) DEFAULT NULL,
  `canceled_by` varchar(100) DEFAULT NULL,
  `canceled_at` datetime DEFAULT NULL,
  `cancel_reason` varchar(255) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `deliveries`
--

INSERT INTO `deliveries` (`id`, `request_id`, `supplier`, `items`, `delivery_date`, `status`, `received_by`, `received_at`, `receipt_url`, `paid_status`, `paid_at`, `paid_by`, `canceled_by`, `canceled_at`, `cancel_reason`, `created_at`, `updated_at`) VALUES
(1, 'REQ-202505-0002', 'STATIC SUPPLIER', '[{\"id\":16,\"request_id\":\"REQ-202505-0002\",\"item_name\":\"bigas\",\"quantity\":\"3.00\",\"unit\":\"pack\",\"unit_price\":\"1250.00\",\"amount\":\"3750.00\",\"created_at\":\"2025-05-14T19:08:28.000Z\",\"deleted_at\":null},{\"id\":17,\"request_id\":\"REQ-202505-0002\",\"item_name\":\"uling\",\"quantity\":\"4.00\",\"unit\":\"pack\",\"unit_price\":\"10.00\",\"amount\":\"40.00\",\"created_at\":\"2025-05-14T19:08:28.000Z\",\"deleted_at\":null}]', '2025-05-14 21:14:00', 'Received', 'Unknown User', '2025-05-15 18:58:34', NULL, 'Paid', '2025-05-15 21:08:58', 'Unknown User', NULL, NULL, NULL, '2025-05-14 21:14:07', '2025-05-15 21:08:58'),
(2, 'REQ-202505-0001', 'STATIC SUPPLIER', '[{\"id\":13,\"request_id\":\"REQ-202505-0001\",\"item_name\":\"Chicken Wings\",\"quantity\":\"50.00\",\"unit\":\"pc\",\"unit_price\":\"100.00\",\"amount\":\"5000.00\",\"supply_type\":\"Raw Materials\",\"created_at\":\"2025-05-14T14:23:25.000Z\",\"deleted_at\":null},{\"id\":14,\"request_id\":\"REQ-202505-0001\",\"item_name\":\"Pork Ribs\",\"quantity\":\"100.00\",\"unit\":\"pc\",\"unit_price\":\"120.00\",\"amount\":\"12000.00\",\"supply_type\":\"Raw Materials\",\"created_at\":\"2025-05-14T14:23:25.000Z\",\"deleted_at\":null},{\"id\":15,\"request_id\":\"REQ-202505-0001\",\"item_name\":\"Chicken Legs\",\"quantity\":\"50.00\",\"unit\":\"set\",\"unit_price\":\"100.00\",\"amount\":\"5000.00\",\"supply_type\":\"Raw Materials\",\"created_at\":\"2025-05-14T14:23:25.000Z\",\"deleted_at\":null}]', '2025-05-15 18:40:00', 'Received', 'Unknown User', '2025-05-15 18:58:44', NULL, 'Paid', '2025-05-15 21:12:53', 'Unknown User', NULL, NULL, NULL, '2025-05-15 18:40:42', '2025-05-15 21:12:53'),
(3, 'REQ-202505-0003', 'STATIC SUPPLIER', '[{\"id\":18,\"request_id\":\"REQ-202505-0003\",\"item_name\":\"Pork Ribs\",\"quantity\":\"10.00\",\"unit\":\"pc\",\"unit_price\":\"120.00\",\"amount\":\"1200.00\",\"supply_type\":\"Raw Materials\",\"created_at\":\"2025-05-15T18:59:21.000Z\",\"deleted_at\":null,\"stockStatus\":\"Restock\",\"selectedCategory\":\"Raw Materials\",\"selectedItemCode\":\"RAW-202505-0003\"}]', '2025-05-15 19:00:00', 'Received', 'Unknown User', '2025-05-17 04:08:04', NULL, 'Paid', '2025-05-17 04:08:08', 'Unknown User', NULL, NULL, NULL, '2025-05-15 19:00:07', '2025-05-17 04:08:08'),
(4, 'REQ-202505-0004', 'STATIC SUPPLIER', '[{\"id\":20,\"request_id\":\"REQ-202505-0004\",\"item_name\":\"Beef\",\"quantity\":\"100.00\",\"unit\":\"pc\",\"unit_price\":\"100.00\",\"amount\":\"10000.00\",\"supply_type\":\"Raw Materials\",\"created_at\":\"2025-05-17T04:02:29.000Z\",\"deleted_at\":null,\"stockStatus\":\"New Stock\",\"selectedCategory\":\"Raw Materials\",\"selectedItemCode\":\"\"}]', '2025-05-17 04:03:00', 'Received', 'Unknown User', '2025-05-17 04:05:35', NULL, 'Paid', '2025-05-17 04:06:29', 'Unknown User', NULL, NULL, NULL, '2025-05-17 04:03:30', '2025-05-17 04:06:29'),
(5, 'REQ-202505-0005', 'STATIC SUPPLIER', '[{\"id\":21,\"request_id\":\"REQ-202505-0005\",\"item_name\":\"Beef Ribs\",\"quantity\":\"100.00\",\"unit\":\"kg\",\"unit_price\":\"120.00\",\"amount\":\"12000.00\",\"supply_type\":\"Raw Materials\",\"created_at\":\"2025-05-17T20:36:48.000Z\",\"deleted_at\":null,\"stockStatus\":\"New Stock\",\"selectedCategory\":\"Raw Materials\",\"selectedItemCode\":\"\"}]', '2025-05-17 20:37:00', 'Received', 'Unknown User', '2025-05-17 20:38:34', NULL, 'Paid', '2025-05-17 20:39:47', 'Unknown User', NULL, NULL, NULL, '2025-05-17 20:37:41', '2025-05-17 20:39:47'),
(6, 'REQ-202505-0006', 'STATIC SUPPLIER', '[{\"id\":22,\"request_id\":\"REQ-202505-0006\",\"item_name\":\"Baboy \",\"quantity\":\"50.00\",\"unit\":\"kg\",\"unit_price\":\"150.00\",\"amount\":\"7500.00\",\"supply_type\":\"Raw Materials\",\"created_at\":\"2025-05-17T20:51:35.000Z\",\"deleted_at\":null,\"stockStatus\":\"New Stock\",\"selectedCategory\":\"Raw Materials\",\"selectedItemCode\":\"\",\"item_code\":\"\",\"category\":\"Raw Materials\"}]', '2025-05-17 20:52:00', 'Received', 'Unknown User', '2025-05-17 21:00:35', NULL, 'Paid', '2025-05-17 21:28:52', 'Unknown User', NULL, NULL, NULL, '2025-05-17 20:52:01', '2025-05-17 21:28:52'),
(7, 'REQ-202505-0007', 'CED', '[{\"id\":23,\"request_id\":\"REQ-202505-0007\",\"item_name\":\"Baboy\",\"quantity\":\"50.00\",\"unit\":\"kg\",\"unit_price\":\"120.00\",\"amount\":\"6000.00\",\"supply_type\":\"Raw Materials\",\"created_at\":\"2025-05-17T21:29:25.000Z\",\"deleted_at\":null,\"stockStatus\":\"Restock\",\"selectedCategory\":\"Raw Materials\",\"selectedItemCode\":\"RAW-202505-0005\",\"item_code\":\"RAW-202505-0005\",\"category\":\"Raw Materials\"}]', '2025-05-17 21:30:00', 'Received', 'Unknown User', '2025-05-17 21:31:24', NULL, 'Paid', '2025-05-17 21:31:33', 'Unknown User', NULL, NULL, NULL, '2025-05-17 21:30:38', '2025-05-17 21:31:33'),
(8, 'REQ-202505-0008', 'STATIC SUPPLIER', '[{\"id\":24,\"request_id\":\"REQ-202505-0008\",\"item_name\":\"bitsin\",\"quantity\":\"10.00\",\"unit\":\"kg\",\"unit_price\":\"20.00\",\"amount\":\"200.00\",\"supply_type\":\"Food Ingredients\",\"created_at\":\"2025-05-17T21:36:35.000Z\",\"deleted_at\":null,\"stockStatus\":\"New Stock\",\"selectedCategory\":\"Food Ingredients\",\"selectedItemCode\":\"\",\"reorder_point\":3,\"item_code\":\"\",\"category\":\"Food Ingredients\"},{\"id\":25,\"request_id\":\"REQ-202505-0008\",\"item_name\":\"asin\",\"quantity\":\"10.00\",\"unit\":\"kg\",\"unit_price\":\"20.00\",\"amount\":\"200.00\",\"supply_type\":\"Food Ingredients\",\"created_at\":\"2025-05-17T21:36:35.000Z\",\"deleted_at\":null,\"stockStatus\":\"New Stock\",\"selectedCategory\":\"Food Ingredients\",\"selectedItemCode\":\"\",\"reorder_point\":4,\"item_code\":\"\",\"category\":\"Food Ingredients\"}]', '2025-05-17 21:37:00', 'Received', 'Unknown User', '2025-05-17 21:38:02', NULL, 'Paid', '2025-05-17 21:38:23', 'Unknown User', NULL, NULL, NULL, '2025-05-17 21:37:22', '2025-05-17 21:38:23'),
(9, 'REQ-202505-0009', 'jOHN', '[{\"id\":26,\"request_id\":\"REQ-202505-0009\",\"item_name\":\"Suka\",\"quantity\":\"10.00\",\"unit\":\"kg\",\"unit_price\":\"100.00\",\"amount\":\"1000.00\",\"supply_type\":\"Food Ingredients\",\"created_at\":\"2025-05-17T21:44:46.000Z\",\"deleted_at\":null,\"stockStatus\":\"New Stock\",\"selectedCategory\":\"Food Ingredients\",\"selectedItemCode\":\"\",\"reorder_point\":3,\"item_code\":\"\",\"category\":\"Food Ingredients\"}]', '2025-05-17 21:45:00', 'Received', 'Unknown User', '2025-05-17 21:46:44', NULL, 'Paid', '2025-05-17 21:46:53', 'Unknown User', NULL, NULL, NULL, '2025-05-17 21:45:56', '2025-05-17 21:46:53'),
(10, 'REQ-202505-0010', 'STATIC SUPPLIER', '[{\"id\":27,\"request_id\":\"REQ-202505-0010\",\"item_name\":\"BAGGOON\",\"quantity\":\"10.00\",\"unit\":\"bottle\",\"unit_price\":\"50.00\",\"amount\":\"500.00\",\"supply_type\":\"Food Ingredients\",\"created_at\":\"2025-05-17T21:54:06.000Z\",\"deleted_at\":null,\"stockStatus\":\"New Stock\",\"selectedCategory\":\"Food Ingredients\",\"selectedItemCode\":\"\",\"reorder_point\":4,\"item_code\":\"\",\"category\":\"Food Ingredients\"}]', '2025-05-17 21:54:00', 'Received', 'Unknown User', '2025-05-17 21:55:15', NULL, 'Paid', '2025-05-17 21:55:21', 'Unknown User', NULL, NULL, NULL, '2025-05-17 21:54:44', '2025-05-17 21:55:21');

-- --------------------------------------------------------

--
-- Table structure for table `emergency_contacts`
--

CREATE TABLE `emergency_contacts` (
  `id` int(11) NOT NULL,
  `employee_id` varchar(20) NOT NULL,
  `first_name` varchar(50) NOT NULL,
  `middle_name` varchar(50) DEFAULT NULL,
  `last_name` varchar(50) NOT NULL,
  `full_name` varchar(150) NOT NULL,
  `relationship` varchar(50) NOT NULL,
  `contact_number` varchar(15) NOT NULL,
  `deleted_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `emergency_contacts`
--

INSERT INTO `emergency_contacts` (`id`, `employee_id`, `first_name`, `middle_name`, `last_name`, `full_name`, `relationship`, `contact_number`, `deleted_at`) VALUES
(12, '2025-50000', 'Lorna', 'D.', 'Belisario', '', 'Mother', '09352342354', NULL),
(18, '2025-50001', 'Pat', 'M.', 'Mirhan', 'Pat M. Mirhan', 'Tatay', '09235256433', NULL),
(24, '2024-50000', 'John', 'K', 'Smith', 'John K Smith', 'Spouse', '09123456789', '2025-04-24 18:07:06'),
(25, '2024-50001', 'Maria', 'Santos', 'Dela Cruz', 'Maria Santos Dela Cruz', 'Sister', '09987654321', '2025-04-25 09:53:09'),
(26, '2024-50002', 'Maria', 'Luna', 'Dela Cruz', 'Maria Luna Dela Cruz', 'Spouse', '09987654322', '2025-04-25 03:11:05'),
(27, '2025-50002', 'Marco', 'M.', 'Paja', 'Marco M. Paja', 'Asawa', '09235873485', NULL),
(28, '2025-50003', 'Cedric', '', 'Belisario', 'Cedric Belisario', 'Ewan po', '09234673647', NULL),
(29, '2025-50004', 'Ella', 'F.', 'Callejas', 'Ella F. Callejas', 'Spouse', '09234325435', NULL),
(30, '2025-50005', 'Ella Mae', 'M.', 'Paja', 'Ella Mae M. Paja', 'Asawa na lng', '09397583434', NULL),
(31, '2025-50006', 'HBSDAF', 'DFDefve', 'dvfge', 'HBSDAF DFDefve dvfge', 'WEVFE', '09346376433', NULL),
(32, '2025-50007', 'ced', 'red', 'alba', 'ced red alba', 'father', '09273871674', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `employees`
--

CREATE TABLE `employees` (
  `id` int(11) NOT NULL,
  `employee_id` varchar(20) NOT NULL,
  `first_name` varchar(50) NOT NULL,
  `middle_name` varchar(50) DEFAULT NULL,
  `last_name` varchar(50) NOT NULL,
  `full_name` varchar(150) NOT NULL,
  `department` varchar(50) NOT NULL,
  `date_of_hire` date NOT NULL,
  `date_of_birth` date NOT NULL,
  `gender` varchar(10) NOT NULL,
  `contact_number` varchar(15) NOT NULL,
  `email` varchar(100) NOT NULL,
  `address` text NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `profile_image_path` varchar(255) DEFAULT NULL,
  `deleted_at` datetime DEFAULT NULL,
  `role_id` int(11) DEFAULT NULL,
  `position_id` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `employees`
--

INSERT INTO `employees` (`id`, `employee_id`, `first_name`, `middle_name`, `last_name`, `full_name`, `department`, `date_of_hire`, `date_of_birth`, `gender`, `contact_number`, `email`, `address`, `created_at`, `profile_image_path`, `deleted_at`, `role_id`, `position_id`) VALUES
(4, '2025-50000', 'Cedric Kyle', 'D.', 'Belisario', 'Cedric Kyle D. Belisario', 'Admin Department', '2025-04-22', '2003-12-05', 'Male', '09299764768', 'cedricbelisario@gmail.com', 'San Juan Sur Manabo, Abra', '2025-04-22 14:34:23', 'uploads/main branch/profiles/profile-1745332463038-649811496.jpg', NULL, 1, NULL),
(10, '2025-50001', 'John Marco', 'P.', 'Paja', 'John Marco P. Paja', 'HR Department', '2025-04-04', '2003-11-16', 'Male', '09234525454', 'marco@gmail.com', 'Imus, Cavite', '2025-04-23 14:21:48', 'uploads/main branch/profiles/profile-1745418108875-668004656.jpg', NULL, 2, 5),
(19, '2024-50000', 'Jane', 'M', 'Smith', '', 'IT Department', '2024-03-25', '1995-05-15', 'Female', '09876543210', 'jane.smith@example.com', '123 Tech Street, Metro Manila', '2025-04-24 09:19:03', NULL, '2025-04-24 18:07:06', NULL, NULL),
(20, '2024-50001', 'Juan', 'Santos', 'Dela Cruz', 'Juan Santos Dela Cruz', 'HR Department', '2024-03-20', '1995-06-15', 'Male', '09123456789', 'juan.delacruz@gmail.com', '123 Makati City, Metro Manila', '2025-04-24 17:40:05', NULL, '2025-04-25 09:53:09', 2, NULL),
(21, '2024-50002', 'Juan', 'Reyes', 'Dela Cruz', 'Juan Reyes Dela Cruz', 'IT', '2024-03-20', '1995-05-15', 'Male', '09123456780', 'juan.delacruz@example.com', '456 New Street, Makati City', '2025-04-24 18:02:53', 'uploads/main branch/profiles/profile-1745518144392-179096408.jpg', '2025-04-25 03:11:05', NULL, NULL),
(22, '2025-50002', 'Patrick', 'M.', 'Mirhan', 'Patrick M. Mirhan', 'HR Department', '2025-04-25', '2003-12-05', 'Male', '09233532545', 'pat@gmail.com', 'Imus, Cavite', '2025-04-24 18:45:47', 'uploads/main branch/profiles/profile-1745520347273-534405503.jpg', NULL, 3, 6),
(23, '2025-50003', 'Charles', 'A.', 'Alvaran', 'Charles A. Alvaran', 'Supply Chain Management', '2025-04-25', '2003-02-05', 'Male', '09234234232', 'c@gmail.com', 'Jan lng', '2025-04-24 19:28:20', 'uploads/main branch/profiles/profile-1745549997784-476041866.jpg', NULL, 7, 10),
(24, '2025-50004', 'Nathaniel', 'V.', 'Vasquez', 'Nathaniel V. Vasquez', 'Branch Operation', '2025-04-26', '2003-12-05', 'Male', '09235324343', 'nath@gmail.com', 'Imus, Cavite', '2025-04-26 04:08:01', NULL, NULL, 19, 13),
(25, '2025-50005', 'Ella Francine', 'G.', 'Callejas', 'Ella Francine G. Callejas', 'Finance Department', '2025-04-26', '2003-12-05', 'Female', '09234763246', 'elya@gmail.com', 'Silang, Cavite', '2025-04-26 04:11:50', 'uploads/main branch/profiles/profile-1745640710729-38208914.jpg', NULL, 4, 7),
(26, '2025-50006', 'Jgj', '', 'Ggjg', 'Jgj Ggjg', 'Production Department', '2025-04-28', '2003-12-03', 'Female', '09234673690', 'ce@gmail.com', 'Jna lngjgjg', '2025-04-28 10:44:01', NULL, NULL, 22, 15),
(27, '2025-50007', 'ced', 'reb', 'paja', 'ced reb paja', 'Supply Chain Management', '2025-05-06', '2002-02-13', 'Male', '09823787843', 'jdk@gmail.com', 'anabu', '2025-05-06 09:11:14', NULL, NULL, 7, 9);

-- --------------------------------------------------------

--
-- Table structure for table `employee_attendance`
--

CREATE TABLE `employee_attendance` (
  `id` int(11) NOT NULL,
  `employee_id` varchar(20) NOT NULL,
  `date` date NOT NULL,
  `schedule_id` int(11) NOT NULL,
  `start_time` time DEFAULT NULL,
  `end_time` time DEFAULT NULL,
  `status` varchar(20) DEFAULT NULL,
  `hours_worked` decimal(5,2) DEFAULT NULL,
  `regular_hours` decimal(5,2) DEFAULT NULL,
  `overtime_hours` decimal(5,2) DEFAULT NULL,
  `late_minutes` int(11) DEFAULT NULL,
  `absent` tinyint(1) NOT NULL DEFAULT 0,
  `tardiness_deduction` decimal(10,2) DEFAULT NULL,
  `absent_deduction` decimal(10,2) DEFAULT NULL,
  `holiday_pay` decimal(10,2) DEFAULT NULL,
  `remarks` text DEFAULT NULL,
  `overtime_proof` varchar(255) DEFAULT NULL,
  `approval_status` enum('Pending','Approved','Rejected') DEFAULT 'Pending',
  `ot_approval_status` enum('Pending','Approved','Rejected') DEFAULT NULL,
  `ot_approved_by` varchar(150) DEFAULT NULL,
  `ot_approved_at` datetime DEFAULT NULL,
  `approved_by` varchar(150) DEFAULT NULL,
  `approved_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp(),
  `deleted_at` datetime DEFAULT NULL,
  `ot_remarks` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `employee_attendance`
--

INSERT INTO `employee_attendance` (`id`, `employee_id`, `date`, `schedule_id`, `start_time`, `end_time`, `status`, `hours_worked`, `regular_hours`, `overtime_hours`, `late_minutes`, `absent`, `tardiness_deduction`, `absent_deduction`, `holiday_pay`, `remarks`, `overtime_proof`, `approval_status`, `ot_approval_status`, `ot_approved_by`, `ot_approved_at`, `approved_by`, `approved_at`, `created_at`, `updated_at`, `deleted_at`, `ot_remarks`) VALUES
(1, '2025-50001', '2025-05-02', 6, '08:00:00', '17:00:00', 'Present', 8.00, 8.00, 0.00, 0, 0, 0.00, NULL, NULL, NULL, NULL, 'Approved', NULL, NULL, NULL, 'Cedric Kyle D. Belisario', '2025-05-02 09:31:15', '2025-05-02 09:04:59', '2025-05-02 17:59:48', NULL, NULL),
(2, '2025-50002', '2025-05-02', 5, '17:00:00', '17:00:00', 'Late', 0.00, 0.00, 0.00, 540, 0, 720.00, NULL, NULL, NULL, NULL, 'Rejected', NULL, NULL, NULL, NULL, NULL, '2025-05-02 09:04:59', '2025-05-02 17:59:48', NULL, NULL),
(3, '2025-50003', '2025-05-02', 8, '08:00:00', '12:00:00', 'Present', 4.00, 4.00, 0.00, 0, 0, 0.00, NULL, NULL, NULL, NULL, 'Rejected', NULL, NULL, NULL, NULL, NULL, '2025-05-02 09:04:59', '2025-05-02 17:59:48', NULL, NULL),
(4, '2025-50004', '2025-05-02', 3, '08:00:00', '17:00:00', 'Present', 9.00, 8.00, 0.00, 0, 0, 0.00, NULL, NULL, NULL, NULL, 'Approved', NULL, NULL, NULL, 'Cedric Kyle D. Belisario', '2025-05-02 10:01:22', '2025-05-02 09:04:59', '2025-05-02 17:59:48', NULL, NULL),
(5, '2025-50005', '2025-05-02', 7, '10:00:00', '22:00:00', 'Present', 11.00, 8.00, 3.00, 0, 0, 0.00, NULL, NULL, NULL, 'uploads/overtime_proofs/1746180487340-103499946.jpg', 'Approved', NULL, NULL, NULL, 'Cedric Kyle D. Belisario', '2025-05-02 10:08:42', '2025-05-02 09:04:59', '2025-05-02 17:59:48', NULL, NULL),
(6, '2025-50006', '2025-05-02', 9, '22:00:00', '07:00:00', 'Present', 9.00, 7.00, 0.00, 0, 0, 0.00, NULL, NULL, NULL, NULL, 'Approved', NULL, NULL, NULL, 'Cedric Kyle D. Belisario', '2025-05-02 10:18:43', '2025-05-02 09:04:59', '2025-05-02 17:59:48', NULL, NULL),
(7, '2025-50002', '2025-05-02', 5, NULL, NULL, 'Absent', 0.00, NULL, 0.00, NULL, 0, NULL, NULL, NULL, NULL, NULL, 'Rejected', NULL, NULL, NULL, NULL, NULL, '2025-05-02 09:47:49', '2025-05-02 09:47:49', NULL, NULL),
(8, '2025-50002', '2025-05-02', 5, NULL, NULL, 'Absent', 0.00, NULL, 0.00, NULL, 0, NULL, NULL, NULL, NULL, NULL, 'Rejected', NULL, NULL, NULL, NULL, NULL, '2025-05-02 09:47:55', '2025-05-02 09:47:55', NULL, NULL),
(9, '2025-50003', '2025-05-02', 8, NULL, NULL, 'Absent', 0.00, NULL, 0.00, NULL, 0, NULL, NULL, NULL, NULL, NULL, 'Rejected', NULL, NULL, NULL, NULL, NULL, '2025-05-02 10:00:02', '2025-05-02 10:00:02', NULL, NULL),
(10, '2025-50002', '2025-05-02', 5, NULL, NULL, 'Absent', 0.00, NULL, 0.00, NULL, 0, NULL, NULL, NULL, NULL, NULL, 'Rejected', NULL, NULL, NULL, NULL, NULL, '2025-05-02 10:08:54', '2025-05-02 10:08:54', NULL, NULL),
(11, '2025-50001', '2025-04-01', 6, '08:00:00', '16:00:00', 'Present', 7.00, 8.00, 0.00, 0, 0, 0.00, NULL, 0.00, NULL, NULL, 'Approved', NULL, NULL, NULL, 'Cedric Kyle D. Belisario', '2025-05-02 22:55:39', '2025-05-02 14:47:40', '2025-05-02 17:59:48', NULL, NULL),
(12, '2025-50002', '2025-04-01', 5, NULL, NULL, 'Absent', 0.00, 0.00, 0.00, NULL, 1, NULL, NULL, NULL, NULL, NULL, 'Approved', NULL, NULL, NULL, 'Cedric Kyle D. Belisario', '2025-05-02 22:55:39', '2025-05-02 14:47:40', '2025-05-02 14:47:40', NULL, NULL),
(13, '2025-50003', '2025-04-01', 8, '22:00:00', '07:00:00', 'Late', 8.00, 20.00, 2.00, 0, 0, 0.00, NULL, 0.00, NULL, NULL, 'Approved', NULL, NULL, NULL, 'Cedric Kyle D. Belisario', '2025-05-02 22:55:39', '2025-05-02 14:47:40', '2025-05-02 17:59:48', NULL, NULL),
(14, '2025-50004', '2025-04-01', 3, '08:00:00', '17:00:00', 'Present', 8.00, 8.00, 2.00, 0, 0, 0.00, NULL, 0.00, NULL, NULL, 'Approved', NULL, NULL, NULL, 'Cedric Kyle D. Belisario', '2025-05-02 22:55:39', '2025-05-02 14:47:40', '2025-05-02 17:59:48', NULL, NULL),
(15, '2025-50005', '2025-04-01', 7, '08:00:00', '19:00:00', 'Present', 10.00, 10.00, 2.00, 0, 0, 0.00, NULL, 0.00, NULL, NULL, 'Approved', NULL, NULL, NULL, 'Cedric Kyle D. Belisario', '2025-05-02 22:55:39', '2025-05-02 14:47:40', '2025-05-02 17:59:48', NULL, NULL),
(16, '2025-50006', '2025-04-01', 9, '22:00:00', '09:00:00', 'Present', 10.00, 8.00, 2.00, 0, 0, 0.00, NULL, 0.00, NULL, NULL, 'Approved', NULL, NULL, NULL, 'Cedric Kyle D. Belisario', '2025-05-02 22:55:39', '2025-05-02 14:47:40', '2025-05-02 17:59:48', NULL, NULL),
(17, '2025-50001', '2025-04-02', 6, '08:30:00', '17:00:00', 'Late', 7.50, 7.50, 0.00, 30, 0, 50.00, NULL, 0.00, NULL, NULL, 'Approved', NULL, NULL, NULL, 'Cedric Kyle D. Belisario', '2025-05-02 22:55:39', '2025-05-02 14:47:40', '2025-05-02 17:59:48', NULL, NULL),
(18, '2025-50002', '2025-04-02', 5, '08:00:00', '16:00:00', 'Present', 7.00, 8.00, 2.00, 0, 0, 0.00, NULL, 0.00, NULL, NULL, 'Approved', NULL, NULL, NULL, 'Cedric Kyle D. Belisario', '2025-05-02 22:55:39', '2025-05-02 14:47:40', '2025-05-02 17:59:48', NULL, NULL),
(19, '2025-50003', '2025-04-02', 8, '22:00:00', '07:00:00', 'Late', 8.00, 20.00, 2.00, 0, 0, 0.00, NULL, 0.00, NULL, NULL, 'Approved', NULL, NULL, NULL, 'Cedric Kyle D. Belisario', '2025-05-02 22:55:39', '2025-05-02 14:47:40', '2025-05-02 17:59:48', NULL, NULL),
(20, '2025-50004', '2025-04-02', 3, '08:30:00', '17:00:00', 'Late', 7.50, 7.50, 2.00, 30, 0, 40.00, NULL, 0.00, NULL, NULL, 'Approved', NULL, NULL, NULL, 'Cedric Kyle D. Belisario', '2025-05-02 22:55:39', '2025-05-02 14:47:40', '2025-05-02 17:59:48', NULL, NULL),
(21, '2025-50005', '2025-04-02', 7, '08:00:00', '19:00:00', 'Present', 10.00, 10.00, 2.00, 0, 0, 0.00, NULL, 0.00, NULL, NULL, 'Approved', NULL, NULL, NULL, 'Cedric Kyle D. Belisario', '2025-05-02 22:55:39', '2025-05-02 14:47:40', '2025-05-02 17:59:48', NULL, NULL),
(22, '2025-50006', '2025-04-02', 9, '22:00:00', '06:00:00', 'Present', 7.00, 8.00, 2.00, 0, 0, 0.00, NULL, 0.00, NULL, NULL, 'Approved', NULL, NULL, NULL, 'Cedric Kyle D. Belisario', '2025-05-02 22:55:39', '2025-05-02 14:47:40', '2025-05-02 17:59:48', NULL, NULL),
(23, '2025-50001', '2025-04-03', 6, '08:00:00', '16:00:00', 'Present', 7.00, 8.00, 0.00, 0, 0, 0.00, NULL, 0.00, NULL, NULL, 'Approved', NULL, NULL, NULL, 'Cedric Kyle D. Belisario', '2025-05-02 22:55:39', '2025-05-02 14:47:40', '2025-05-02 17:59:48', NULL, NULL),
(24, '2025-50002', '2025-04-03', 5, '08:00:00', '19:00:00', 'Present', 10.00, 8.00, 2.00, 0, 0, 0.00, NULL, 0.00, NULL, NULL, 'Approved', NULL, NULL, NULL, 'Cedric Kyle D. Belisario', '2025-05-02 22:55:39', '2025-05-02 14:47:40', '2025-05-02 17:59:48', NULL, NULL),
(25, '2025-50003', '2025-04-03', 8, '22:30:00', '07:00:00', 'Late', 7.50, 19.50, 2.00, 0, 0, 0.00, NULL, 0.00, NULL, NULL, 'Approved', NULL, NULL, NULL, 'Cedric Kyle D. Belisario', '2025-05-02 22:55:39', '2025-05-02 14:47:40', '2025-05-02 17:59:48', NULL, NULL),
(26, '2025-50004', '2025-04-03', 3, '08:00:00', '17:00:00', 'Present', 8.00, 8.00, 2.00, 0, 0, 0.00, NULL, 0.00, NULL, NULL, 'Approved', NULL, NULL, NULL, 'Cedric Kyle D. Belisario', '2025-05-02 22:55:39', '2025-05-02 14:47:40', '2025-05-02 17:59:48', NULL, NULL),
(27, '2025-50005', '2025-04-03', 7, '08:30:00', '17:00:00', 'Present', 7.50, 9.50, 2.00, 0, 0, 0.00, NULL, 0.00, NULL, NULL, 'Approved', NULL, NULL, NULL, 'Cedric Kyle D. Belisario', '2025-05-02 22:55:39', '2025-05-02 14:47:40', '2025-05-02 17:59:48', NULL, NULL),
(28, '2025-50006', '2025-04-03', 9, NULL, NULL, 'Absent', 0.00, 0.00, 0.00, NULL, 1, NULL, NULL, NULL, NULL, NULL, 'Approved', NULL, NULL, NULL, 'Cedric Kyle D. Belisario', '2025-05-02 22:55:39', '2025-05-02 14:47:40', '2025-05-02 14:47:40', NULL, NULL),
(29, '2025-50001', '2025-04-04', 6, '08:00:00', '16:00:00', 'Present', 7.00, 8.00, 0.00, 0, 0, 0.00, NULL, 0.00, NULL, NULL, 'Approved', NULL, NULL, NULL, 'Cedric Kyle D. Belisario', '2025-05-02 22:55:39', '2025-05-02 14:47:40', '2025-05-02 17:59:48', NULL, NULL),
(30, '2025-50002', '2025-04-04', 5, '08:00:00', '17:00:00', 'Present', 8.00, 8.00, 2.00, 0, 0, 0.00, NULL, 0.00, NULL, NULL, 'Approved', NULL, NULL, NULL, 'Cedric Kyle D. Belisario', '2025-05-02 22:55:39', '2025-05-02 14:47:40', '2025-05-02 17:59:48', NULL, NULL),
(31, '2025-50003', '2025-04-04', 8, '22:00:00', '06:00:00', 'Late', 7.00, 20.00, 2.00, 30, 0, 0.00, NULL, 0.00, NULL, NULL, 'Approved', NULL, NULL, NULL, 'Cedric Kyle D. Belisario', '2025-05-02 22:55:39', '2025-05-02 14:47:40', '2025-05-02 17:59:48', NULL, NULL),
(32, '2025-50004', '2025-04-04', 3, NULL, NULL, 'Absent', 0.00, 0.00, 0.00, NULL, 1, NULL, NULL, NULL, NULL, NULL, 'Approved', NULL, NULL, NULL, 'Cedric Kyle D. Belisario', '2025-05-02 22:55:39', '2025-05-02 14:47:40', '2025-05-02 14:47:40', NULL, NULL),
(33, '2025-50005', '2025-04-04', 7, '08:00:00', '19:00:00', 'Present', 10.00, 10.00, 2.00, 0, 0, 0.00, NULL, 0.00, NULL, NULL, 'Approved', NULL, NULL, NULL, 'Cedric Kyle D. Belisario', '2025-05-02 22:55:39', '2025-05-02 14:47:40', '2025-05-02 17:59:48', NULL, NULL),
(34, '2025-50006', '2025-04-04', 9, '22:00:00', '06:00:00', 'Present', 7.00, 8.00, 2.00, 0, 0, 0.00, NULL, 0.00, NULL, NULL, 'Approved', NULL, NULL, NULL, 'Cedric Kyle D. Belisario', '2025-05-02 22:55:39', '2025-05-02 14:47:40', '2025-05-02 17:59:48', NULL, NULL),
(35, '2025-50001', '2025-04-05', 6, '08:30:00', '17:00:00', 'Late', 7.50, 7.50, 0.00, 30, 0, 50.00, NULL, 0.00, NULL, NULL, 'Approved', NULL, NULL, NULL, 'Cedric Kyle D. Belisario', '2025-05-02 22:55:39', '2025-05-02 14:47:40', '2025-05-02 17:59:48', NULL, NULL),
(36, '2025-50002', '2025-04-05', 5, '08:00:00', '19:00:00', 'Present', 10.00, 8.00, 2.00, 0, 0, 0.00, NULL, 0.00, NULL, NULL, 'Approved', NULL, NULL, NULL, 'Cedric Kyle D. Belisario', '2025-05-02 22:55:39', '2025-05-02 14:47:40', '2025-05-02 17:59:48', NULL, NULL),
(37, '2025-50003', '2025-04-05', 8, '22:00:00', '09:00:00', 'Late', 10.00, 20.00, 2.00, 5, 0, 0.00, NULL, 0.00, NULL, NULL, 'Approved', NULL, NULL, NULL, 'Cedric Kyle D. Belisario', '2025-05-02 22:55:39', '2025-05-02 14:47:40', '2025-05-02 17:59:48', NULL, NULL),
(38, '2025-50004', '2025-04-05', 3, '08:30:00', '17:00:00', 'Late', 7.50, 7.50, 2.00, 30, 0, 40.00, NULL, 0.00, NULL, NULL, 'Approved', NULL, NULL, NULL, 'Cedric Kyle D. Belisario', '2025-05-02 22:55:39', '2025-05-02 14:47:40', '2025-05-02 17:59:48', NULL, NULL),
(39, '2025-50005', '2025-04-05', 7, '08:00:00', '17:00:00', 'Present', 8.00, 10.00, 2.00, 0, 0, 0.00, NULL, 0.00, NULL, NULL, 'Approved', NULL, NULL, NULL, 'Cedric Kyle D. Belisario', '2025-05-02 22:55:39', '2025-05-02 14:47:40', '2025-05-02 17:59:48', NULL, NULL),
(40, '2025-50006', '2025-04-05', 9, '22:00:00', '07:00:00', 'Present', 8.00, 8.00, 2.00, 0, 0, 0.00, NULL, 0.00, NULL, NULL, 'Approved', NULL, NULL, NULL, 'Cedric Kyle D. Belisario', '2025-05-02 22:55:39', '2025-05-02 14:47:40', '2025-05-02 17:59:48', NULL, NULL),
(41, '2025-50001', '2025-04-07', 6, '08:00:00', '17:00:00', 'Present', 8.00, 8.00, 0.00, 0, 0, 0.00, NULL, 0.00, NULL, NULL, 'Approved', NULL, NULL, NULL, 'Cedric Kyle D. Belisario', '2025-05-02 22:55:39', '2025-05-02 14:47:40', '2025-05-02 17:59:48', NULL, NULL),
(42, '2025-50002', '2025-04-07', 5, '08:00:00', '19:00:00', 'Present', 10.00, 8.00, 2.00, 0, 0, 0.00, NULL, 0.00, NULL, NULL, 'Approved', NULL, NULL, NULL, 'Cedric Kyle D. Belisario', '2025-05-02 22:55:39', '2025-05-02 14:47:40', '2025-05-02 17:59:48', NULL, NULL),
(43, '2025-50003', '2025-04-07', 8, NULL, NULL, 'Absent', 0.00, 0.00, 0.00, NULL, 1, NULL, NULL, NULL, NULL, NULL, 'Approved', NULL, NULL, NULL, 'Cedric Kyle D. Belisario', '2025-05-02 22:55:39', '2025-05-02 14:47:40', '2025-05-02 14:47:40', NULL, NULL),
(44, '2025-50004', '2025-04-07', 3, NULL, NULL, 'Absent', 0.00, 0.00, 0.00, NULL, 1, NULL, NULL, NULL, NULL, NULL, 'Approved', NULL, NULL, NULL, 'Cedric Kyle D. Belisario', '2025-05-02 22:55:39', '2025-05-02 14:47:40', '2025-05-02 14:47:40', NULL, NULL),
(45, '2025-50005', '2025-04-07', 7, NULL, NULL, 'Absent', 0.00, 0.00, 0.00, NULL, 1, NULL, NULL, NULL, NULL, NULL, 'Approved', NULL, NULL, NULL, 'Cedric Kyle D. Belisario', '2025-05-02 22:55:39', '2025-05-02 14:47:40', '2025-05-02 14:47:40', NULL, NULL),
(46, '2025-50001', '2025-04-08', 6, NULL, NULL, 'Absent', 0.00, 0.00, 0.00, NULL, 1, NULL, NULL, NULL, NULL, NULL, 'Approved', NULL, NULL, NULL, 'Cedric Kyle D. Belisario', '2025-05-02 22:55:39', '2025-05-02 14:47:40', '2025-05-02 14:47:40', NULL, NULL),
(47, '2025-50002', '2025-04-08', 5, '08:00:00', '16:00:00', 'Present', 7.00, 8.00, 2.00, 0, 0, 0.00, NULL, 0.00, NULL, NULL, 'Approved', NULL, NULL, NULL, 'Cedric Kyle D. Belisario', '2025-05-02 22:55:39', '2025-05-02 14:47:40', '2025-05-02 17:59:48', NULL, NULL),
(48, '2025-50003', '2025-04-08', 8, '22:00:00', '06:00:00', 'Late', 7.00, 20.00, 2.00, 10, 0, 0.00, NULL, 0.00, NULL, NULL, 'Approved', NULL, NULL, NULL, 'Cedric Kyle D. Belisario', '2025-05-02 22:55:39', '2025-05-02 14:47:40', '2025-05-02 17:59:48', NULL, NULL),
(49, '2025-50004', '2025-04-08', 3, '08:00:00', '19:00:00', 'Present', 10.00, 8.00, 2.00, 0, 0, 0.00, NULL, 0.00, NULL, NULL, 'Approved', NULL, NULL, NULL, 'Cedric Kyle D. Belisario', '2025-05-02 22:55:39', '2025-05-02 14:47:40', '2025-05-02 17:59:48', NULL, NULL),
(50, '2025-50005', '2025-04-08', 7, NULL, NULL, 'Absent', 0.00, 0.00, 0.00, NULL, 1, NULL, NULL, NULL, NULL, NULL, 'Approved', NULL, NULL, NULL, 'Cedric Kyle D. Belisario', '2025-05-02 22:55:39', '2025-05-02 14:47:40', '2025-05-02 14:47:40', NULL, NULL),
(51, '2025-50006', '2025-04-08', 9, '22:00:00', '07:00:00', 'Present', 8.00, 8.00, 2.00, 0, 0, 0.00, NULL, 0.00, NULL, NULL, 'Approved', NULL, NULL, NULL, 'Cedric Kyle D. Belisario', '2025-05-02 22:55:39', '2025-05-02 14:47:40', '2025-05-02 17:59:48', NULL, NULL),
(52, '2025-50001', '2025-04-09', 6, '08:00:00', '16:00:00', 'Present', 7.00, 8.00, 0.00, 0, 0, 0.00, NULL, 0.00, NULL, NULL, 'Approved', NULL, NULL, NULL, 'Cedric Kyle D. Belisario', '2025-05-02 22:55:39', '2025-05-02 14:47:40', '2025-05-02 17:59:48', NULL, NULL),
(53, '2025-50002', '2025-04-09', 5, NULL, NULL, 'Absent', 0.00, 0.00, 0.00, NULL, 1, NULL, NULL, NULL, NULL, NULL, 'Approved', NULL, NULL, NULL, 'Cedric Kyle D. Belisario', '2025-05-02 22:55:39', '2025-05-02 14:47:40', '2025-05-02 14:47:40', NULL, NULL),
(54, '2025-50003', '2025-04-09', 8, '22:30:00', '07:00:00', 'Late', 7.50, 19.50, 2.00, 0, 0, 0.00, NULL, 0.00, NULL, NULL, 'Approved', NULL, NULL, NULL, 'Cedric Kyle D. Belisario', '2025-05-02 22:55:39', '2025-05-02 14:47:40', '2025-05-02 17:59:48', NULL, NULL),
(55, '2025-50004', '2025-04-09', 3, '08:00:00', '17:00:00', 'Present', 8.00, 8.00, 2.00, 0, 0, 0.00, NULL, 0.00, NULL, NULL, 'Approved', NULL, NULL, NULL, 'Cedric Kyle D. Belisario', '2025-05-02 22:55:39', '2025-05-02 14:47:40', '2025-05-02 17:59:48', NULL, NULL),
(56, '2025-50005', '2025-04-09', 7, '08:00:00', '19:00:00', 'Present', 10.00, 10.00, 2.00, 0, 0, 0.00, NULL, 0.00, NULL, NULL, 'Approved', NULL, NULL, NULL, 'Cedric Kyle D. Belisario', '2025-05-02 22:55:39', '2025-05-02 14:47:40', '2025-05-02 17:59:48', NULL, NULL),
(57, '2025-50006', '2025-04-09', 9, '22:00:00', '06:00:00', 'Present', 7.00, 8.00, 2.00, 0, 0, 0.00, NULL, 0.00, NULL, NULL, 'Approved', NULL, NULL, NULL, 'Cedric Kyle D. Belisario', '2025-05-02 22:55:39', '2025-05-02 14:47:40', '2025-05-02 17:59:48', NULL, NULL),
(58, '2025-50001', '2025-04-10', 6, '08:00:00', '19:00:00', 'Present', 10.00, 8.00, 0.00, 0, 0, 0.00, NULL, 0.00, NULL, NULL, 'Approved', NULL, NULL, NULL, 'Cedric Kyle D. Belisario', '2025-05-02 22:55:39', '2025-05-02 14:47:40', '2025-05-02 17:59:48', NULL, NULL),
(59, '2025-50002', '2025-04-10', 5, NULL, NULL, 'Absent', 0.00, 0.00, 0.00, NULL, 1, NULL, NULL, NULL, NULL, NULL, 'Approved', NULL, NULL, NULL, 'Cedric Kyle D. Belisario', '2025-05-02 22:55:39', '2025-05-02 14:47:40', '2025-05-02 14:47:40', NULL, NULL),
(60, '2025-50003', '2025-04-10', 8, '22:30:00', '07:00:00', 'Late', 7.50, 19.50, 2.00, 0, 0, 0.00, NULL, 0.00, NULL, NULL, 'Approved', NULL, NULL, NULL, 'Cedric Kyle D. Belisario', '2025-05-02 22:55:39', '2025-05-02 14:47:40', '2025-05-02 17:59:48', NULL, NULL),
(61, '2025-50004', '2025-04-10', 3, '08:30:00', '17:00:00', 'Late', 7.50, 7.50, 2.00, 30, 0, 40.00, NULL, 0.00, NULL, NULL, 'Approved', NULL, NULL, NULL, 'Cedric Kyle D. Belisario', '2025-05-02 22:55:39', '2025-05-02 14:47:40', '2025-05-02 17:59:48', NULL, NULL),
(62, '2025-50005', '2025-04-10', 7, '08:00:00', '19:00:00', 'Present', 10.00, 10.00, 2.00, 0, 0, 0.00, NULL, 0.00, NULL, NULL, 'Approved', NULL, NULL, NULL, 'Cedric Kyle D. Belisario', '2025-05-02 22:55:39', '2025-05-02 14:47:40', '2025-05-02 17:59:48', NULL, NULL),
(63, '2025-50006', '2025-04-10', 9, '22:00:00', '06:00:00', 'Present', 7.00, 8.00, 2.00, 0, 0, 0.00, NULL, 0.00, NULL, NULL, 'Approved', NULL, NULL, NULL, 'Cedric Kyle D. Belisario', '2025-05-02 22:55:39', '2025-05-02 14:47:40', '2025-05-02 17:59:48', NULL, NULL),
(64, '2025-50001', '2025-04-11', 6, NULL, NULL, 'Absent', 0.00, 0.00, 0.00, NULL, 1, NULL, NULL, NULL, NULL, NULL, 'Approved', NULL, NULL, NULL, 'Cedric Kyle D. Belisario', '2025-05-02 22:55:39', '2025-05-02 14:47:40', '2025-05-02 14:47:40', NULL, NULL),
(65, '2025-50002', '2025-04-11', 5, '08:30:00', '17:00:00', 'Late', 7.50, 7.50, 2.00, 30, 0, 40.00, NULL, 0.00, NULL, NULL, 'Approved', NULL, NULL, NULL, 'Cedric Kyle D. Belisario', '2025-05-02 22:55:39', '2025-05-02 14:47:40', '2025-05-02 17:59:48', NULL, NULL),
(66, '2025-50003', '2025-04-11', 8, NULL, NULL, 'Absent', 0.00, 0.00, 0.00, NULL, 1, NULL, NULL, NULL, NULL, NULL, 'Approved', NULL, NULL, NULL, 'Cedric Kyle D. Belisario', '2025-05-02 22:55:39', '2025-05-02 14:47:40', '2025-05-02 14:47:40', NULL, NULL),
(67, '2025-50004', '2025-04-11', 3, '08:00:00', '16:00:00', 'Present', 7.00, 8.00, 2.00, 0, 0, 0.00, NULL, 0.00, NULL, NULL, 'Approved', NULL, NULL, NULL, 'Cedric Kyle D. Belisario', '2025-05-02 22:55:39', '2025-05-02 14:47:40', '2025-05-02 17:59:48', NULL, NULL),
(68, '2025-50005', '2025-04-11', 7, '08:00:00', '17:00:00', 'Present', 8.00, 10.00, 2.00, 0, 0, 0.00, NULL, 0.00, NULL, NULL, 'Approved', NULL, NULL, NULL, 'Cedric Kyle D. Belisario', '2025-05-02 22:55:39', '2025-05-02 14:47:40', '2025-05-02 17:59:48', NULL, NULL),
(69, '2025-50006', '2025-04-11', 9, '22:30:00', '07:00:00', 'Late', 7.50, 7.50, 2.00, 30, 0, 50.00, NULL, 0.00, NULL, NULL, 'Approved', NULL, NULL, NULL, 'Cedric Kyle D. Belisario', '2025-05-02 22:55:39', '2025-05-02 14:47:40', '2025-05-02 17:59:48', NULL, NULL),
(70, '2025-50001', '2025-04-12', 6, '08:00:00', '19:00:00', 'Present', 10.00, 8.00, 0.00, 0, 0, 0.00, NULL, 0.00, NULL, NULL, 'Approved', NULL, NULL, NULL, 'Cedric Kyle D. Belisario', '2025-05-02 22:55:39', '2025-05-02 14:47:40', '2025-05-02 17:59:48', NULL, NULL),
(71, '2025-50002', '2025-04-12', 5, '08:00:00', '19:00:00', 'Present', 10.00, 8.00, 2.00, 0, 0, 0.00, NULL, 0.00, NULL, NULL, 'Approved', NULL, NULL, NULL, 'Cedric Kyle D. Belisario', '2025-05-02 22:55:39', '2025-05-02 14:47:40', '2025-05-02 17:59:48', NULL, NULL),
(72, '2025-50003', '2025-04-12', 8, '22:00:00', '09:00:00', 'Late', 10.00, 20.00, 2.00, 0, 0, 0.00, NULL, 0.00, NULL, NULL, 'Approved', NULL, NULL, NULL, 'Cedric Kyle D. Belisario', '2025-05-02 22:55:39', '2025-05-02 14:47:40', '2025-05-02 17:59:48', NULL, NULL),
(73, '2025-50004', '2025-04-12', 3, '08:30:00', '17:00:00', 'Late', 7.50, 7.50, 2.00, 30, 0, 40.00, NULL, 0.00, NULL, NULL, 'Approved', NULL, NULL, NULL, 'Cedric Kyle D. Belisario', '2025-05-02 22:55:39', '2025-05-02 14:47:40', '2025-05-02 17:59:48', NULL, NULL),
(74, '2025-50005', '2025-04-12', 7, '08:30:00', '17:00:00', 'Present', 7.50, 9.50, 2.00, 0, 0, 0.00, NULL, 0.00, NULL, NULL, 'Approved', NULL, NULL, NULL, 'Cedric Kyle D. Belisario', '2025-05-02 22:55:39', '2025-05-02 14:47:40', '2025-05-02 17:59:48', NULL, NULL),
(75, '2025-50006', '2025-04-12', 9, '22:00:00', '06:00:00', 'Present', 7.00, 8.00, 2.00, 0, 0, 0.00, NULL, 0.00, NULL, NULL, 'Approved', NULL, NULL, NULL, 'Cedric Kyle D. Belisario', '2025-05-02 22:55:39', '2025-05-02 14:47:40', '2025-05-02 17:59:48', NULL, NULL),
(76, '2025-50001', '2025-04-14', 6, '08:00:00', '19:00:00', 'Present', 10.00, 8.00, 2.00, 0, 0, 0.00, NULL, 0.00, NULL, NULL, 'Approved', NULL, NULL, NULL, 'Cedric Kyle D. Belisario', '2025-05-02 22:55:39', '2025-05-02 14:47:40', '2025-05-02 17:59:48', NULL, NULL),
(77, '2025-50002', '2025-04-14', 5, '08:30:00', '17:00:00', 'Late', 7.50, 7.50, 2.00, 30, 0, 40.00, NULL, 0.00, NULL, NULL, 'Approved', NULL, NULL, NULL, 'Cedric Kyle D. Belisario', '2025-05-02 22:55:39', '2025-05-02 14:47:40', '2025-05-02 17:59:48', NULL, NULL),
(78, '2025-50003', '2025-04-14', 8, '22:30:00', '07:00:00', 'Late', 7.50, 19.50, 2.00, 0, 0, 0.00, NULL, 0.00, NULL, NULL, 'Approved', NULL, NULL, NULL, 'Cedric Kyle D. Belisario', '2025-05-02 22:55:39', '2025-05-02 14:47:40', '2025-05-02 17:59:48', NULL, NULL),
(79, '2025-50004', '2025-04-14', 3, '08:30:00', '17:00:00', 'Late', 7.50, 7.50, 2.00, 30, 0, 40.00, NULL, 0.00, NULL, NULL, 'Approved', NULL, NULL, NULL, 'Cedric Kyle D. Belisario', '2025-05-02 22:55:39', '2025-05-02 14:47:40', '2025-05-02 17:59:48', NULL, NULL),
(80, '2025-50005', '2025-04-14', 7, NULL, NULL, 'Absent', 0.00, 0.00, 0.00, NULL, 1, NULL, NULL, NULL, NULL, NULL, 'Approved', NULL, NULL, NULL, 'Cedric Kyle D. Belisario', '2025-05-02 22:55:39', '2025-05-02 14:47:40', '2025-05-02 14:47:40', NULL, NULL),
(81, '2025-50001', '2025-04-15', 6, '08:00:00', '19:00:00', 'Present', 10.00, 8.00, 2.00, 0, 0, 0.00, NULL, 0.00, NULL, NULL, 'Approved', NULL, NULL, NULL, 'Cedric Kyle D. Belisario', '2025-05-02 22:55:39', '2025-05-02 14:47:40', '2025-05-02 17:59:48', NULL, NULL),
(82, '2025-50002', '2025-04-15', 5, NULL, NULL, 'Absent', 0.00, 0.00, 0.00, NULL, 1, NULL, NULL, NULL, NULL, NULL, 'Approved', NULL, NULL, NULL, 'Cedric Kyle D. Belisario', '2025-05-02 22:55:39', '2025-05-02 14:47:40', '2025-05-02 14:47:40', NULL, NULL),
(83, '2025-50003', '2025-04-15', 8, '22:30:00', '07:00:00', 'Late', 7.50, 19.50, 2.00, 750, 0, 0.00, NULL, 0.00, NULL, NULL, 'Approved', NULL, NULL, NULL, 'Cedric Kyle D. Belisario', '2025-05-02 22:55:39', '2025-05-02 14:47:40', '2025-05-02 17:59:48', NULL, NULL),
(84, '2025-50004', '2025-04-15', 3, '08:00:00', '16:00:00', 'Present', 7.00, 8.00, 2.00, 0, 0, 0.00, NULL, 0.00, NULL, NULL, 'Approved', NULL, NULL, NULL, 'Cedric Kyle D. Belisario', '2025-05-02 22:55:39', '2025-05-02 14:47:40', '2025-05-02 17:59:48', NULL, NULL),
(85, '2025-50005', '2025-04-15', 7, '08:30:00', '17:00:00', 'Present', 7.50, 9.50, 2.00, 0, 0, 0.00, NULL, 0.00, NULL, NULL, 'Approved', NULL, NULL, NULL, 'Cedric Kyle D. Belisario', '2025-05-02 22:55:39', '2025-05-02 14:47:40', '2025-05-02 17:59:48', NULL, NULL),
(86, '2025-50006', '2025-04-15', 9, '22:30:00', '07:00:00', 'Late', 7.50, 7.50, 2.00, 30, 0, 50.00, NULL, 0.00, NULL, NULL, 'Approved', NULL, NULL, NULL, 'Cedric Kyle D. Belisario', '2025-05-02 22:55:39', '2025-05-02 14:47:40', '2025-05-02 17:59:48', NULL, NULL),
(87, '2025-50001', '2025-04-16', 6, NULL, NULL, 'Absent', 0.00, 0.00, 0.00, NULL, 1, NULL, NULL, NULL, NULL, NULL, 'Approved', NULL, NULL, NULL, 'Cedric Kyle D. Belisario', '2025-05-02 22:55:39', '2025-05-02 14:47:40', '2025-05-02 14:47:40', NULL, NULL),
(88, '2025-50002', '2025-04-16', 5, NULL, NULL, 'Absent', 0.00, 0.00, 0.00, NULL, 1, NULL, NULL, NULL, NULL, NULL, 'Approved', NULL, NULL, NULL, 'Cedric Kyle D. Belisario', '2025-05-02 22:55:39', '2025-05-02 14:47:40', '2025-05-02 14:47:40', NULL, NULL),
(89, '2025-50003', '2025-04-16', 8, '22:00:00', '07:00:00', 'Late', 8.00, 20.00, 2.00, 0, 0, 0.00, NULL, 0.00, NULL, NULL, 'Approved', NULL, NULL, NULL, 'Cedric Kyle D. Belisario', '2025-05-02 22:55:39', '2025-05-02 14:47:40', '2025-05-02 17:59:48', NULL, NULL),
(90, '2025-50004', '2025-04-16', 3, '08:00:00', '19:00:00', 'Present', 10.00, 8.00, 2.00, 0, 0, 0.00, NULL, 0.00, NULL, NULL, 'Approved', NULL, NULL, NULL, 'Cedric Kyle D. Belisario', '2025-05-02 22:55:39', '2025-05-02 14:47:40', '2025-05-02 17:59:48', NULL, NULL),
(91, '2025-50005', '2025-04-16', 7, '08:00:00', '19:00:00', 'Present', 10.00, 10.00, 2.00, 0, 0, 0.00, NULL, 0.00, NULL, NULL, 'Approved', NULL, NULL, NULL, 'Cedric Kyle D. Belisario', '2025-05-02 22:55:39', '2025-05-02 14:47:40', '2025-05-02 17:59:48', NULL, NULL),
(92, '2025-50006', '2025-04-16', 9, '22:30:00', '07:00:00', 'Late', 7.50, 7.50, 2.00, 30, 0, 50.00, NULL, 0.00, NULL, NULL, 'Approved', NULL, NULL, NULL, 'Cedric Kyle D. Belisario', '2025-05-02 22:55:39', '2025-05-02 14:47:40', '2025-05-02 17:59:48', NULL, NULL),
(93, '2025-50001', '2025-04-17', 6, '08:00:00', '16:00:00', 'Present', 7.00, 8.00, 2.00, 0, 0, 0.00, NULL, 0.00, NULL, NULL, 'Approved', NULL, NULL, NULL, 'Cedric Kyle D. Belisario', '2025-05-02 22:55:39', '2025-05-02 14:47:40', '2025-05-02 17:59:48', NULL, NULL),
(94, '2025-50002', '2025-04-17', 5, '08:00:00', '16:00:00', 'Present', 7.00, 8.00, 2.00, 0, 0, 0.00, NULL, 0.00, NULL, NULL, 'Approved', NULL, NULL, NULL, 'Cedric Kyle D. Belisario', '2025-05-02 22:55:39', '2025-05-02 14:47:40', '2025-05-02 17:59:48', NULL, NULL),
(95, '2025-50003', '2025-04-17', 8, '22:00:00', '07:00:00', 'Late', 8.00, 20.00, 2.00, 0, 0, 0.00, NULL, 0.00, NULL, NULL, 'Approved', NULL, NULL, NULL, 'Cedric Kyle D. Belisario', '2025-05-02 22:55:39', '2025-05-02 14:47:40', '2025-05-02 17:59:48', NULL, NULL),
(96, '2025-50004', '2025-04-17', 3, '08:00:00', '19:00:00', 'Present', 10.00, 8.00, 2.00, 0, 0, 0.00, NULL, 0.00, NULL, NULL, 'Approved', NULL, NULL, NULL, 'Cedric Kyle D. Belisario', '2025-05-02 22:55:39', '2025-05-02 14:47:40', '2025-05-02 17:59:48', NULL, NULL),
(97, '2025-50005', '2025-04-17', 7, NULL, NULL, 'Absent', 0.00, 0.00, 0.00, NULL, 1, NULL, NULL, NULL, NULL, NULL, 'Approved', NULL, NULL, NULL, 'Cedric Kyle D. Belisario', '2025-05-02 22:55:39', '2025-05-02 14:47:40', '2025-05-02 14:47:40', NULL, NULL),
(98, '2025-50006', '2025-04-17', 9, '22:00:00', '06:00:00', 'Present', 7.00, 8.00, 2.00, 0, 0, 0.00, NULL, 0.00, NULL, NULL, 'Approved', NULL, NULL, NULL, 'Cedric Kyle D. Belisario', '2025-05-02 22:55:39', '2025-05-02 14:47:40', '2025-05-02 17:59:48', NULL, NULL),
(99, '2025-50001', '2025-04-18', 6, '08:00:00', '16:00:00', 'Present', 7.00, 8.00, 2.00, 0, 0, 0.00, NULL, 0.00, NULL, NULL, 'Approved', NULL, NULL, NULL, 'Cedric Kyle D. Belisario', '2025-05-02 22:55:39', '2025-05-02 14:47:40', '2025-05-02 17:59:48', NULL, NULL),
(100, '2025-50002', '2025-04-18', 5, '08:30:00', '17:00:00', 'Late', 7.50, 7.50, 2.00, 30, 0, 40.00, NULL, 0.00, NULL, NULL, 'Approved', NULL, NULL, NULL, 'Cedric Kyle D. Belisario', '2025-05-02 22:55:39', '2025-05-02 14:47:40', '2025-05-02 17:59:48', NULL, NULL),
(101, '2025-50003', '2025-04-18', 8, NULL, NULL, 'Absent', 0.00, 0.00, 0.00, NULL, 1, NULL, NULL, NULL, NULL, NULL, 'Approved', NULL, NULL, NULL, 'Cedric Kyle D. Belisario', '2025-05-02 22:55:39', '2025-05-02 14:47:40', '2025-05-02 14:47:40', NULL, NULL),
(102, '2025-50004', '2025-04-18', 3, '08:00:00', '17:00:00', 'Present', 8.00, 8.00, 2.00, 0, 0, 0.00, NULL, 0.00, NULL, NULL, 'Approved', NULL, NULL, NULL, 'Cedric Kyle D. Belisario', '2025-05-02 22:55:39', '2025-05-02 14:47:40', '2025-05-02 17:59:48', NULL, NULL),
(103, '2025-50005', '2025-04-18', 7, '08:00:00', '17:00:00', 'Present', 8.00, 10.00, 2.00, 0, 0, 0.00, NULL, 0.00, NULL, NULL, 'Approved', NULL, NULL, NULL, 'Cedric Kyle D. Belisario', '2025-05-02 22:55:39', '2025-05-02 14:47:40', '2025-05-02 17:59:48', NULL, NULL),
(104, '2025-50006', '2025-04-18', 9, '22:00:00', '09:00:00', 'Present', 10.00, 8.00, 2.00, 0, 0, 0.00, NULL, 0.00, NULL, NULL, 'Approved', NULL, NULL, NULL, 'Cedric Kyle D. Belisario', '2025-05-02 22:55:39', '2025-05-02 14:47:40', '2025-05-02 17:59:48', NULL, NULL),
(105, '2025-50001', '2025-04-19', 6, '08:30:00', '17:00:00', 'Late', 7.50, 7.50, 2.00, 30, 0, 50.00, NULL, 0.00, NULL, NULL, 'Approved', NULL, NULL, NULL, 'Cedric Kyle D. Belisario', '2025-05-02 22:55:39', '2025-05-02 14:47:40', '2025-05-02 17:59:48', NULL, NULL),
(106, '2025-50002', '2025-04-19', 5, '08:00:00', '19:00:00', 'Present', 10.00, 8.00, 2.00, 0, 0, 0.00, NULL, 0.00, NULL, NULL, 'Approved', NULL, NULL, NULL, 'Cedric Kyle D. Belisario', '2025-05-02 22:55:39', '2025-05-02 14:47:40', '2025-05-02 17:59:48', NULL, NULL),
(107, '2025-50003', '2025-04-19', 8, '22:00:00', '06:00:00', 'Late', 7.00, 20.00, 2.00, 0, 0, 0.00, NULL, 0.00, NULL, NULL, 'Approved', NULL, NULL, NULL, 'Cedric Kyle D. Belisario', '2025-05-02 22:55:39', '2025-05-02 14:47:40', '2025-05-02 17:59:48', NULL, NULL),
(108, '2025-50004', '2025-04-19', 3, '08:00:00', '17:00:00', 'Present', 8.00, 8.00, 2.00, 0, 0, 0.00, NULL, 0.00, NULL, NULL, 'Approved', NULL, NULL, NULL, 'Cedric Kyle D. Belisario', '2025-05-02 22:55:39', '2025-05-02 14:47:40', '2025-05-02 17:59:48', NULL, NULL),
(109, '2025-50005', '2025-04-19', 7, NULL, NULL, 'Absent', 0.00, 0.00, 0.00, NULL, 1, NULL, NULL, NULL, NULL, NULL, 'Approved', NULL, NULL, NULL, 'Cedric Kyle D. Belisario', '2025-05-02 22:55:39', '2025-05-02 14:47:40', '2025-05-02 14:47:40', NULL, NULL),
(110, '2025-50006', '2025-04-19', 9, NULL, NULL, 'Absent', 0.00, 0.00, 0.00, NULL, 1, NULL, NULL, NULL, NULL, NULL, 'Approved', NULL, NULL, NULL, 'Cedric Kyle D. Belisario', '2025-05-02 22:55:39', '2025-05-02 14:47:40', '2025-05-02 14:47:40', NULL, NULL),
(111, '2025-50001', '2025-04-21', 6, '08:00:00', '16:00:00', 'Present', 7.00, 8.00, 2.00, 0, 0, 0.00, NULL, 0.00, NULL, NULL, 'Approved', NULL, NULL, NULL, 'Cedric Kyle D. Belisario', '2025-05-02 22:55:39', '2025-05-02 14:47:40', '2025-05-02 17:59:48', NULL, NULL),
(112, '2025-50002', '2025-04-21', 5, NULL, NULL, 'Absent', 0.00, 0.00, 0.00, NULL, 1, NULL, NULL, NULL, NULL, NULL, 'Approved', NULL, NULL, NULL, 'Cedric Kyle D. Belisario', '2025-05-02 22:55:39', '2025-05-02 14:47:40', '2025-05-02 14:47:40', NULL, NULL),
(113, '2025-50003', '2025-04-21', 8, '22:30:00', '07:00:00', 'Late', 7.50, 19.50, 2.00, 0, 0, 0.00, NULL, 0.00, NULL, NULL, 'Approved', NULL, NULL, NULL, 'Cedric Kyle D. Belisario', '2025-05-02 22:55:39', '2025-05-02 14:47:40', '2025-05-02 17:59:48', NULL, NULL),
(114, '2025-50004', '2025-04-21', 3, '08:00:00', '17:00:00', 'Present', 8.00, 8.00, 2.00, 0, 0, 0.00, NULL, 0.00, NULL, NULL, 'Approved', NULL, NULL, NULL, 'Cedric Kyle D. Belisario', '2025-05-02 22:55:39', '2025-05-02 14:47:40', '2025-05-02 17:59:48', NULL, NULL),
(115, '2025-50005', '2025-04-21', 7, '08:00:00', '17:00:00', 'Present', 8.00, 10.00, 2.00, 0, 0, 0.00, NULL, 0.00, NULL, NULL, 'Approved', NULL, NULL, NULL, 'Cedric Kyle D. Belisario', '2025-05-02 22:55:39', '2025-05-02 14:47:40', '2025-05-02 17:59:48', NULL, NULL),
(116, '2025-50001', '2025-04-22', 6, '08:30:00', '17:00:00', 'Late', 7.50, 7.50, 2.00, 30, 0, 50.00, NULL, 0.00, NULL, NULL, 'Approved', NULL, NULL, NULL, 'Cedric Kyle D. Belisario', '2025-05-02 22:55:39', '2025-05-02 14:47:40', '2025-05-02 17:59:48', NULL, NULL),
(117, '2025-50002', '2025-04-22', 5, '08:00:00', '17:00:00', 'Present', 8.00, 8.00, 2.00, 0, 0, 0.00, NULL, 0.00, NULL, NULL, 'Approved', NULL, NULL, NULL, 'Cedric Kyle D. Belisario', '2025-05-02 22:55:39', '2025-05-02 14:47:40', '2025-05-02 17:59:48', NULL, NULL),
(118, '2025-50003', '2025-04-22', 8, '22:00:00', '07:00:00', 'Late', 8.00, 20.00, 2.00, 0, 0, 0.00, NULL, 0.00, NULL, NULL, 'Approved', NULL, NULL, NULL, 'Cedric Kyle D. Belisario', '2025-05-02 22:55:39', '2025-05-02 14:47:40', '2025-05-02 17:59:48', NULL, NULL),
(119, '2025-50004', '2025-04-22', 3, NULL, NULL, 'Absent', 0.00, 0.00, 0.00, NULL, 1, NULL, NULL, NULL, NULL, NULL, 'Approved', NULL, NULL, NULL, 'Cedric Kyle D. Belisario', '2025-05-02 22:55:39', '2025-05-02 14:47:40', '2025-05-02 14:47:40', NULL, NULL),
(120, '2025-50005', '2025-04-22', 7, '08:00:00', '16:00:00', 'Present', 7.00, 10.00, 2.00, 0, 0, 0.00, NULL, 0.00, NULL, NULL, 'Approved', NULL, NULL, NULL, 'Cedric Kyle D. Belisario', '2025-05-02 22:55:39', '2025-05-02 14:47:40', '2025-05-02 17:59:48', NULL, NULL),
(121, '2025-50006', '2025-04-22', 9, '22:00:00', '09:00:00', 'Present', 10.00, 8.00, 2.00, 0, 0, 0.00, NULL, 0.00, NULL, NULL, 'Approved', NULL, NULL, NULL, 'Cedric Kyle D. Belisario', '2025-05-02 22:55:39', '2025-05-02 14:47:40', '2025-05-02 17:59:48', NULL, NULL),
(122, '2025-50001', '2025-04-23', 6, '08:30:00', '17:00:00', 'Late', 7.50, 7.50, 2.00, 30, 0, 50.00, NULL, 0.00, NULL, NULL, 'Approved', NULL, NULL, NULL, 'Cedric Kyle D. Belisario', '2025-05-02 22:55:39', '2025-05-02 14:47:40', '2025-05-02 17:59:48', NULL, NULL),
(123, '2025-50002', '2025-04-23', 5, NULL, NULL, 'Absent', 0.00, 0.00, 0.00, NULL, 1, NULL, NULL, NULL, NULL, NULL, 'Approved', NULL, NULL, NULL, 'Cedric Kyle D. Belisario', '2025-05-02 22:55:39', '2025-05-02 14:47:40', '2025-05-02 14:47:40', NULL, NULL),
(124, '2025-50003', '2025-04-23', 8, '22:30:00', '07:00:00', 'Late', 7.50, 19.50, 2.00, 30, 0, 0.00, NULL, 0.00, NULL, NULL, 'Approved', NULL, NULL, NULL, 'Cedric Kyle D. Belisario', '2025-05-02 22:55:39', '2025-05-02 14:47:40', '2025-05-02 17:59:48', NULL, NULL),
(125, '2025-50004', '2025-04-23', 3, '08:00:00', '16:00:00', 'Present', 7.00, 8.00, 2.00, 0, 0, 0.00, NULL, 0.00, NULL, NULL, 'Approved', NULL, NULL, NULL, 'Cedric Kyle D. Belisario', '2025-05-02 22:55:39', '2025-05-02 14:47:40', '2025-05-02 17:59:48', NULL, NULL),
(126, '2025-50005', '2025-04-23', 7, '08:00:00', '19:00:00', 'Present', 10.00, 10.00, 2.00, 0, 0, 0.00, NULL, 0.00, NULL, NULL, 'Approved', NULL, NULL, NULL, 'Cedric Kyle D. Belisario', '2025-05-02 22:55:39', '2025-05-02 14:47:40', '2025-05-02 17:59:48', NULL, NULL),
(127, '2025-50006', '2025-04-23', 9, '22:30:00', '07:00:00', 'Late', 7.50, 7.50, 2.00, 30, 0, 50.00, NULL, 0.00, NULL, NULL, 'Approved', NULL, NULL, NULL, 'Cedric Kyle D. Belisario', '2025-05-02 22:55:39', '2025-05-02 14:47:40', '2025-05-02 17:59:48', NULL, NULL),
(128, '2025-50001', '2025-04-24', 6, '08:00:00', '19:00:00', 'Present', 10.00, 8.00, 2.00, 0, 0, 0.00, NULL, 0.00, NULL, NULL, 'Approved', NULL, NULL, NULL, 'Cedric Kyle D. Belisario', '2025-05-02 22:55:39', '2025-05-02 14:47:40', '2025-05-02 17:59:48', NULL, NULL),
(129, '2025-50002', '2025-04-24', 5, NULL, NULL, 'Absent', 0.00, 0.00, 0.00, NULL, 1, NULL, NULL, NULL, NULL, NULL, 'Approved', NULL, NULL, NULL, 'Cedric Kyle D. Belisario', '2025-05-02 22:55:39', '2025-05-02 14:47:40', '2025-05-02 14:47:40', NULL, NULL),
(130, '2025-50003', '2025-04-24', 8, '22:00:00', '09:00:00', 'Late', 10.00, 20.00, 2.00, 50, 0, 0.00, NULL, 0.00, NULL, NULL, 'Approved', NULL, NULL, NULL, 'Cedric Kyle D. Belisario', '2025-05-02 22:55:39', '2025-05-02 14:47:40', '2025-05-02 17:59:48', NULL, NULL),
(131, '2025-50004', '2025-04-24', 3, '08:00:00', '16:00:00', 'Present', 7.00, 8.00, 2.00, 0, 0, 0.00, NULL, 0.00, NULL, NULL, 'Approved', NULL, NULL, NULL, 'Cedric Kyle D. Belisario', '2025-05-02 22:55:39', '2025-05-02 14:47:40', '2025-05-02 17:59:48', NULL, NULL),
(132, '2025-50005', '2025-04-24', 7, '08:00:00', '19:00:00', 'Present', 10.00, 10.00, 2.00, 0, 0, 0.00, NULL, 0.00, NULL, NULL, 'Approved', NULL, NULL, NULL, 'Cedric Kyle D. Belisario', '2025-05-02 22:55:39', '2025-05-02 14:47:40', '2025-05-02 17:59:48', NULL, NULL),
(133, '2025-50006', '2025-04-24', 9, '22:30:00', '07:00:00', 'Late', 7.50, 7.50, 2.00, 30, 0, 50.00, NULL, 0.00, NULL, NULL, 'Approved', NULL, NULL, NULL, 'Cedric Kyle D. Belisario', '2025-05-02 22:55:39', '2025-05-02 14:47:40', '2025-05-02 17:59:48', NULL, NULL),
(134, '2025-50001', '2025-04-25', 6, '08:00:00', '19:00:00', 'Present', 10.00, 8.00, 2.00, 0, 0, 0.00, NULL, 0.00, NULL, NULL, 'Approved', NULL, NULL, NULL, 'Cedric Kyle D. Belisario', '2025-05-02 22:55:39', '2025-05-02 14:47:40', '2025-05-02 17:59:48', NULL, NULL),
(135, '2025-50002', '2025-04-25', 5, NULL, NULL, 'Absent', 0.00, 0.00, 0.00, NULL, 1, NULL, NULL, NULL, NULL, NULL, 'Approved', NULL, NULL, NULL, 'Cedric Kyle D. Belisario', '2025-05-02 22:55:39', '2025-05-02 14:47:40', '2025-05-02 14:47:40', NULL, NULL),
(136, '2025-50003', '2025-04-25', 8, NULL, NULL, 'Absent', 0.00, 0.00, 0.00, NULL, 1, NULL, NULL, NULL, NULL, NULL, 'Approved', NULL, NULL, NULL, 'Cedric Kyle D. Belisario', '2025-05-02 22:55:39', '2025-05-02 14:47:40', '2025-05-02 14:47:40', NULL, NULL),
(137, '2025-50004', '2025-04-25', 3, '08:00:00', '16:00:00', 'Present', 7.00, 8.00, 2.00, 0, 0, 0.00, NULL, 0.00, NULL, NULL, 'Approved', NULL, NULL, NULL, 'Cedric Kyle D. Belisario', '2025-05-02 22:55:39', '2025-05-02 14:47:40', '2025-05-02 17:59:48', NULL, NULL),
(138, '2025-50005', '2025-04-25', 7, NULL, NULL, 'Absent', 0.00, 0.00, 0.00, NULL, 1, NULL, NULL, NULL, NULL, NULL, 'Approved', NULL, NULL, NULL, 'Cedric Kyle D. Belisario', '2025-05-02 22:55:39', '2025-05-02 14:47:40', '2025-05-02 14:47:40', NULL, NULL),
(139, '2025-50006', '2025-04-25', 9, '22:30:00', '07:00:00', 'Late', 7.50, 7.50, 2.00, 30, 0, 50.00, NULL, 0.00, NULL, NULL, 'Approved', NULL, NULL, NULL, 'Cedric Kyle D. Belisario', '2025-05-02 22:55:39', '2025-05-02 14:47:40', '2025-05-02 17:59:48', NULL, NULL),
(140, '2025-50001', '2025-04-26', 6, '08:00:00', '17:00:00', 'Present', 8.00, 8.00, 2.00, 0, 0, 0.00, NULL, 0.00, NULL, NULL, 'Approved', NULL, NULL, NULL, 'Cedric Kyle D. Belisario', '2025-05-02 22:55:39', '2025-05-02 14:47:40', '2025-05-02 17:59:48', NULL, NULL),
(141, '2025-50002', '2025-04-26', 5, NULL, NULL, 'Absent', 0.00, 0.00, 0.00, NULL, 1, NULL, NULL, NULL, NULL, NULL, 'Approved', NULL, NULL, NULL, 'Cedric Kyle D. Belisario', '2025-05-02 22:55:39', '2025-05-02 14:47:40', '2025-05-02 14:47:40', NULL, NULL),
(142, '2025-50003', '2025-04-26', 8, '22:30:00', '07:00:00', 'Late', 7.50, 19.50, 2.00, 10, 0, 0.00, NULL, 0.00, NULL, NULL, 'Approved', NULL, NULL, NULL, 'Cedric Kyle D. Belisario', '2025-05-02 22:55:39', '2025-05-02 14:47:40', '2025-05-02 17:59:48', NULL, NULL),
(143, '2025-50004', '2025-04-26', 3, '08:00:00', '19:00:00', 'Present', 10.00, 8.00, 2.00, 0, 0, 0.00, NULL, 0.00, NULL, NULL, 'Approved', NULL, NULL, NULL, 'Cedric Kyle D. Belisario', '2025-05-02 22:55:39', '2025-05-02 14:47:40', '2025-05-02 17:59:48', NULL, NULL),
(144, '2025-50005', '2025-04-26', 7, '08:00:00', '19:00:00', 'Present', 10.00, 10.00, 2.00, 0, 0, 0.00, NULL, 0.00, NULL, NULL, 'Approved', NULL, NULL, NULL, 'Cedric Kyle D. Belisario', '2025-05-02 22:55:39', '2025-05-02 14:47:40', '2025-05-02 17:59:48', NULL, NULL),
(145, '2025-50006', '2025-04-26', 9, '22:00:00', '09:00:00', 'Present', 10.00, 8.00, 2.00, 0, 0, 0.00, NULL, 0.00, NULL, NULL, 'Approved', NULL, NULL, NULL, 'Cedric Kyle D. Belisario', '2025-05-02 22:55:39', '2025-05-02 14:47:40', '2025-05-02 17:59:48', NULL, NULL),
(146, '2025-50001', '2025-04-28', 6, '08:00:00', '16:00:00', 'Present', 7.00, 8.00, 2.00, 0, 0, 0.00, NULL, 0.00, NULL, NULL, 'Approved', NULL, NULL, NULL, 'Cedric Kyle D. Belisario', '2025-05-02 22:55:39', '2025-05-02 14:47:40', '2025-05-02 17:59:48', NULL, NULL),
(147, '2025-50002', '2025-04-28', 5, '08:00:00', '19:00:00', 'Present', 10.00, 8.00, 2.00, 0, 0, 0.00, NULL, 0.00, NULL, NULL, 'Approved', NULL, NULL, NULL, 'Cedric Kyle D. Belisario', '2025-05-02 22:55:39', '2025-05-02 14:47:40', '2025-05-02 17:59:48', NULL, NULL),
(148, '2025-50003', '2025-04-28', 8, '22:00:00', '06:00:00', 'Late', 7.00, 20.00, 2.00, 10, 0, 0.00, NULL, 0.00, NULL, NULL, 'Approved', NULL, NULL, NULL, 'Cedric Kyle D. Belisario', '2025-05-02 22:55:39', '2025-05-02 14:47:40', '2025-05-02 17:59:48', NULL, NULL),
(149, '2025-50004', '2025-04-28', 3, '08:00:00', '16:00:00', 'Present', 7.00, 8.00, 2.00, 0, 0, 0.00, NULL, 0.00, NULL, NULL, 'Approved', NULL, NULL, NULL, 'Cedric Kyle D. Belisario', '2025-05-02 22:55:39', '2025-05-02 14:47:40', '2025-05-02 17:59:48', NULL, NULL),
(150, '2025-50005', '2025-04-28', 7, NULL, NULL, 'Absent', 0.00, 0.00, 0.00, NULL, 1, NULL, NULL, NULL, NULL, NULL, 'Approved', NULL, NULL, NULL, 'Cedric Kyle D. Belisario', '2025-05-02 22:55:39', '2025-05-02 14:47:40', '2025-05-02 14:47:40', NULL, NULL),
(151, '2025-50001', '2025-04-29', 6, '08:30:00', '17:00:00', 'Late', 7.50, 7.50, 2.00, 30, 0, 50.00, NULL, 0.00, NULL, NULL, 'Approved', NULL, NULL, NULL, 'Cedric Kyle D. Belisario', '2025-05-02 22:55:39', '2025-05-02 14:47:40', '2025-05-02 17:59:48', NULL, NULL),
(152, '2025-50002', '2025-04-29', 5, '08:00:00', '19:00:00', 'Present', 10.00, 8.00, 2.00, 0, 0, 0.00, NULL, 0.00, NULL, NULL, 'Approved', NULL, NULL, NULL, 'Cedric Kyle D. Belisario', '2025-05-02 22:55:39', '2025-05-02 14:47:40', '2025-05-02 17:59:48', NULL, NULL),
(153, '2025-50003', '2025-04-29', 8, NULL, NULL, 'Absent', 0.00, 0.00, 0.00, NULL, 1, NULL, NULL, NULL, NULL, NULL, 'Approved', NULL, NULL, NULL, 'Cedric Kyle D. Belisario', '2025-05-02 22:55:39', '2025-05-02 14:47:40', '2025-05-02 14:47:40', NULL, NULL),
(154, '2025-50004', '2025-04-29', 3, NULL, NULL, 'Absent', 0.00, 0.00, 0.00, NULL, 1, NULL, NULL, NULL, NULL, NULL, 'Approved', NULL, NULL, NULL, 'Cedric Kyle D. Belisario', '2025-05-02 22:55:39', '2025-05-02 14:47:40', '2025-05-02 14:47:40', NULL, NULL),
(155, '2025-50005', '2025-04-29', 7, '08:00:00', '19:00:00', 'Present', 10.00, 10.00, 2.00, 0, 0, 0.00, NULL, 0.00, NULL, NULL, 'Approved', NULL, NULL, NULL, 'Cedric Kyle D. Belisario', '2025-05-02 22:55:39', '2025-05-02 14:47:40', '2025-05-02 17:59:48', NULL, NULL),
(156, '2025-50006', '2025-04-29', 9, '22:30:00', '07:00:00', 'Late', 7.50, 7.50, 2.00, 30, 0, 50.00, NULL, 0.00, NULL, NULL, 'Approved', NULL, NULL, NULL, 'Cedric Kyle D. Belisario', '2025-05-02 22:55:39', '2025-05-02 14:47:40', '2025-05-02 17:59:48', NULL, NULL),
(157, '2025-50001', '2025-04-30', 6, NULL, NULL, 'Absent', 0.00, 0.00, 0.00, NULL, 1, NULL, NULL, NULL, NULL, NULL, 'Approved', NULL, NULL, NULL, 'Cedric Kyle D. Belisario', '2025-05-02 22:55:39', '2025-05-02 14:47:40', '2025-05-02 14:47:40', NULL, NULL),
(158, '2025-50002', '2025-04-30', 5, '08:00:00', '19:00:00', 'Present', 10.00, 8.00, 2.00, 0, 0, 0.00, NULL, 0.00, NULL, NULL, 'Approved', NULL, NULL, NULL, 'Cedric Kyle D. Belisario', '2025-05-02 22:55:39', '2025-05-02 14:47:40', '2025-05-02 17:59:48', NULL, NULL),
(159, '2025-50003', '2025-04-30', 8, '22:30:00', '07:00:00', 'Late', 7.50, 19.50, 2.00, 0, 0, 0.00, NULL, 0.00, NULL, NULL, 'Approved', NULL, NULL, NULL, 'Cedric Kyle D. Belisario', '2025-05-02 22:55:39', '2025-05-02 14:47:40', '2025-05-02 17:59:48', NULL, NULL),
(160, '2025-50004', '2025-04-30', 3, '08:00:00', '17:00:00', 'Present', 8.00, 8.00, 2.00, 0, 0, 0.00, NULL, 0.00, NULL, NULL, 'Approved', NULL, NULL, NULL, 'Cedric Kyle D. Belisario', '2025-05-02 22:55:39', '2025-05-02 14:47:40', '2025-05-02 17:59:48', NULL, NULL),
(161, '2025-50005', '2025-04-30', 7, '08:00:00', '16:00:00', 'Present', 7.00, 10.00, 2.00, 0, 0, 0.00, NULL, 0.00, NULL, NULL, 'Approved', NULL, NULL, NULL, 'Cedric Kyle D. Belisario', '2025-05-02 22:55:39', '2025-05-02 14:47:40', '2025-05-02 17:59:48', NULL, NULL),
(162, '2025-50006', '2025-04-30', 9, NULL, NULL, 'Absent', 0.00, 0.00, 0.00, NULL, 1, NULL, NULL, NULL, NULL, NULL, 'Approved', NULL, NULL, NULL, 'Cedric Kyle D. Belisario', '2025-05-02 22:55:39', '2025-05-02 14:47:40', '2025-05-02 14:47:40', NULL, NULL),
(163, '2025-50001', '2025-05-03', 6, '08:50:00', '20:00:00', 'Late', 10.17, 7.17, 3.00, 50, 0, 83.33, NULL, 0.00, NULL, 'uploads/overtime_proofs/1746297096186-277305043.jpg', 'Approved', NULL, NULL, NULL, 'John Marco P. Paja', '2025-05-03 18:42:00', '2025-05-03 17:58:58', '2025-05-03 18:42:00', NULL, NULL),
(164, '2025-50002', '2025-05-03', 5, '08:50:00', '20:00:00', 'Late', 7.17, 7.17, 3.00, 50, 0, 66.67, NULL, 0.00, NULL, 'uploads/overtime_proofs/1746298879952-863613288.jpg', 'Approved', NULL, NULL, NULL, 'Patrick M. Mirhan', '2025-05-03 19:01:39', '2025-05-03 17:58:58', '2025-05-03 19:01:39', NULL, NULL),
(165, '2025-50003', '2025-05-03', 8, '10:50:00', '20:00:00', 'Late', 7.17, 7.17, 0.00, 50, 0, 66.67, NULL, 0.00, NULL, NULL, 'Approved', NULL, NULL, NULL, NULL, NULL, '2025-05-03 17:58:58', '2025-05-03 19:09:16', NULL, NULL),
(166, '2025-50004', '2025-05-03', 3, '10:50:00', NULL, 'Late', 0.00, 0.00, 0.00, 170, 0, 226.67, NULL, NULL, NULL, NULL, 'Pending', NULL, NULL, NULL, NULL, NULL, '2025-05-03 17:58:58', '2025-05-03 18:03:35', NULL, NULL),
(167, '2025-50005', '2025-05-03', 7, '10:50:00', NULL, 'Late', 0.00, 0.00, 0.00, 50, 0, 83.33, NULL, NULL, NULL, NULL, 'Pending', NULL, NULL, NULL, NULL, NULL, '2025-05-03 17:58:58', '2025-05-03 18:03:43', NULL, NULL),
(168, '2025-50006', '2025-05-03', 9, '22:11:00', '07:11:00', 'Present', 8.00, 7.82, 0.18, 0, 0, 0.00, NULL, 0.00, NULL, NULL, 'Approved', NULL, NULL, NULL, 'John Marco P. Paja', '2025-05-03 18:05:43', '2025-05-03 17:58:58', '2025-05-03 18:05:43', NULL, NULL),
(169, '2025-50001', '2025-05-03', 6, NULL, NULL, 'Absent', 0.00, NULL, 0.00, NULL, 0, NULL, NULL, NULL, NULL, NULL, 'Rejected', NULL, NULL, NULL, NULL, NULL, '2025-05-03 18:37:35', '2025-05-03 18:37:35', NULL, NULL),
(170, '2025-50006', '2025-05-04', 9, '22:00:00', '07:00:00', 'Present', 8.00, 8.00, 0.00, 0, 0, 0.00, NULL, 0.00, NULL, NULL, 'Approved', NULL, NULL, NULL, 'John Marco P. Paja', '2025-05-04 06:53:24', '2025-05-04 06:52:09', '2025-05-04 06:53:24', NULL, NULL),
(171, '2025-50001', '2025-05-04', 6, '08:00:00', '17:00:00', 'Rest Day', 8.00, 8.00, 0.00, NULL, 0, NULL, NULL, 0.00, NULL, NULL, 'Approved', NULL, NULL, NULL, 'John Marco P. Paja', '2025-05-04 14:05:30', '2025-05-04 13:38:46', '2025-05-04 14:05:30', NULL, NULL),
(172, '2025-50002', '2025-05-04', 5, NULL, NULL, 'Day Off', 0.00, 0.00, 0.00, NULL, 0, NULL, NULL, NULL, NULL, NULL, '', NULL, NULL, NULL, NULL, NULL, '2025-05-04 13:38:46', '2025-05-04 13:38:46', NULL, NULL),
(173, '2025-50003', '2025-05-04', 8, NULL, NULL, 'Day Off', 0.00, 0.00, 0.00, NULL, 0, NULL, NULL, NULL, NULL, NULL, '', NULL, NULL, NULL, NULL, NULL, '2025-05-04 13:38:46', '2025-05-04 13:38:46', NULL, NULL),
(174, '2025-50004', '2025-05-04', 3, NULL, NULL, 'Day Off', 0.00, 0.00, 0.00, NULL, 0, NULL, NULL, NULL, NULL, NULL, '', NULL, NULL, NULL, NULL, NULL, '2025-05-04 13:38:46', '2025-05-04 13:38:46', NULL, NULL),
(175, '2025-50005', '2025-05-04', 7, NULL, NULL, 'Day Off', 0.00, 0.00, 0.00, NULL, 0, NULL, NULL, NULL, NULL, NULL, '', NULL, NULL, NULL, NULL, NULL, '2025-05-04 13:38:46', '2025-05-04 13:38:46', NULL, NULL),
(176, '2025-50001', '2025-05-05', 6, '08:00:00', '20:00:00', 'Present', 8.00, 8.00, 3.00, 0, 0, 0.00, NULL, 0.00, NULL, '/uploads/overtime_proofs/1746445810599-495628055.jpg', 'Approved', 'Approved', NULL, '2025-05-05 12:04:09', 'John Marco P. Paja', '2025-05-05 09:53:16', '2025-05-05 09:46:25', '2025-05-05 12:04:09', NULL, 'not valid ot proof'),
(177, '2025-50002', '2025-05-05', 5, '18:10:33', '03:00:00', 'Present', 7.83, 7.83, 0.00, 0, 0, 0.00, NULL, 0.00, NULL, NULL, 'Approved', NULL, NULL, NULL, 'John Marco P. Paja', '2025-05-05 12:46:58', '2025-05-05 09:46:25', '2025-05-05 12:46:58', NULL, NULL),
(178, '2025-50003', '2025-05-05', 8, '10:00:00', '19:00:00', 'Present', 8.00, 8.00, 0.00, 0, 0, 0.00, NULL, 0.00, NULL, NULL, 'Approved', NULL, NULL, NULL, 'John Marco P. Paja', '2025-05-05 13:27:50', '2025-05-05 09:46:25', '2025-05-05 13:27:50', NULL, NULL),
(179, '2025-50004', '2025-05-05', 3, '08:00:00', '19:00:00', 'Present', 8.00, 8.00, 2.00, 0, 0, 0.00, NULL, 0.00, NULL, '/uploads/overtime_proofs/1746451729399-531584972.jpg', 'Approved', 'Approved', NULL, '2025-05-05 13:29:25', 'John Marco P. Paja', '2025-05-05 13:27:54', '2025-05-05 09:46:25', '2025-05-05 13:29:25', NULL, NULL),
(180, '2025-50005', '2025-05-05', 7, '10:00:00', '19:00:00', 'Present', 8.00, 8.00, 0.00, 0, 0, 0.00, NULL, 0.00, NULL, NULL, 'Approved', NULL, NULL, NULL, 'John Marco P. Paja', '2025-05-05 13:27:52', '2025-05-05 09:46:25', '2025-05-05 13:27:52', NULL, NULL),
(181, '2025-50006', '2025-05-05', 9, '22:00:00', '07:00:00', 'Present', 8.00, 8.00, 0.00, 0, 0, 0.00, NULL, 0.00, NULL, NULL, 'Approved', NULL, NULL, NULL, 'John Marco P. Paja', '2025-05-05 13:27:46', '2025-05-05 09:46:25', '2025-05-05 13:27:46', NULL, NULL),
(182, '2025-50001', '2025-05-06', 6, NULL, NULL, 'Absent', 0.00, 0.00, 0.00, NULL, 1, NULL, NULL, NULL, NULL, NULL, 'Pending', NULL, NULL, NULL, NULL, NULL, '2025-05-06 09:13:29', '2025-05-06 09:13:29', NULL, NULL),
(183, '2025-50002', '2025-05-06', 5, NULL, NULL, 'Absent', 0.00, 0.00, 0.00, NULL, 1, NULL, NULL, NULL, NULL, NULL, 'Pending', NULL, NULL, NULL, NULL, NULL, '2025-05-06 09:13:29', '2025-05-06 09:13:29', NULL, NULL),
(184, '2025-50003', '2025-05-06', 8, NULL, NULL, 'Absent', 0.00, 0.00, 0.00, NULL, 1, NULL, NULL, NULL, NULL, NULL, 'Pending', NULL, NULL, NULL, NULL, NULL, '2025-05-06 09:13:29', '2025-05-06 09:13:29', NULL, NULL),
(185, '2025-50004', '2025-05-06', 3, NULL, NULL, 'Absent', 0.00, 0.00, 0.00, NULL, 1, NULL, NULL, NULL, NULL, NULL, 'Pending', NULL, NULL, NULL, NULL, NULL, '2025-05-06 09:13:29', '2025-05-06 09:13:29', NULL, NULL),
(186, '2025-50005', '2025-05-06', 7, NULL, NULL, 'Absent', 0.00, 0.00, 0.00, NULL, 1, NULL, NULL, NULL, NULL, NULL, 'Pending', NULL, NULL, NULL, NULL, NULL, '2025-05-06 09:13:29', '2025-05-06 09:13:29', NULL, NULL),
(187, '2025-50006', '2025-05-06', 9, NULL, NULL, 'Absent', 0.00, 0.00, 0.00, NULL, 1, NULL, NULL, NULL, NULL, NULL, 'Pending', NULL, NULL, NULL, NULL, NULL, '2025-05-06 09:13:29', '2025-05-06 09:13:29', NULL, NULL),
(188, '2025-50001', '2025-05-07', 6, NULL, NULL, 'Absent', 0.00, 0.00, 0.00, NULL, 1, NULL, NULL, NULL, NULL, NULL, 'Pending', NULL, NULL, NULL, NULL, NULL, '2025-05-07 14:34:15', '2025-05-07 14:34:15', NULL, NULL),
(189, '2025-50002', '2025-05-07', 5, NULL, NULL, 'Absent', 0.00, 0.00, 0.00, NULL, 1, NULL, NULL, NULL, NULL, NULL, 'Pending', NULL, NULL, NULL, NULL, NULL, '2025-05-07 14:34:15', '2025-05-07 14:34:15', NULL, NULL),
(190, '2025-50003', '2025-05-07', 8, NULL, NULL, 'Absent', 0.00, 0.00, 0.00, NULL, 1, NULL, NULL, NULL, NULL, NULL, 'Pending', NULL, NULL, NULL, NULL, NULL, '2025-05-07 14:34:15', '2025-05-07 14:34:15', NULL, NULL),
(191, '2025-50004', '2025-05-07', 3, NULL, NULL, 'Absent', 0.00, 0.00, 0.00, NULL, 1, NULL, NULL, NULL, NULL, NULL, 'Pending', NULL, NULL, NULL, NULL, NULL, '2025-05-07 14:34:15', '2025-05-07 14:34:15', NULL, NULL),
(192, '2025-50005', '2025-05-07', 7, NULL, NULL, 'Absent', 0.00, 0.00, 0.00, NULL, 1, NULL, NULL, NULL, NULL, NULL, 'Pending', NULL, NULL, NULL, NULL, NULL, '2025-05-07 14:34:15', '2025-05-07 14:34:15', NULL, NULL),
(193, '2025-50006', '2025-05-07', 9, NULL, NULL, 'Absent', 0.00, 0.00, 0.00, NULL, 1, NULL, NULL, NULL, NULL, NULL, 'Pending', NULL, NULL, NULL, NULL, NULL, '2025-05-07 14:34:15', '2025-05-07 14:34:15', NULL, NULL);
INSERT INTO `employee_attendance` (`id`, `employee_id`, `date`, `schedule_id`, `start_time`, `end_time`, `status`, `hours_worked`, `regular_hours`, `overtime_hours`, `late_minutes`, `absent`, `tardiness_deduction`, `absent_deduction`, `holiday_pay`, `remarks`, `overtime_proof`, `approval_status`, `ot_approval_status`, `ot_approved_by`, `ot_approved_at`, `approved_by`, `approved_at`, `created_at`, `updated_at`, `deleted_at`, `ot_remarks`) VALUES
(194, '2025-50007', '2025-05-07', 10, NULL, NULL, 'Absent', 0.00, 0.00, 0.00, NULL, 1, NULL, NULL, NULL, NULL, NULL, 'Pending', NULL, NULL, NULL, NULL, NULL, '2025-05-07 14:34:15', '2025-05-07 14:34:15', NULL, NULL),
(195, '2025-50001', '2025-05-08', 6, '08:00:00', '17:00:00', 'Present', 8.00, 8.00, 0.00, 0, 0, 0.00, NULL, 0.00, NULL, NULL, 'Approved', NULL, NULL, NULL, 'Cedric Kyle D. Belisario', '2025-05-08 13:38:44', '2025-05-08 12:00:04', '2025-05-08 13:38:44', NULL, NULL),
(196, '2025-50002', '2025-05-08', 5, '08:00:00', '17:00:00', 'Present', 8.00, 8.00, 0.00, 0, 0, 0.00, NULL, 0.00, NULL, NULL, 'Approved', NULL, NULL, NULL, 'Cedric Kyle D. Belisario', '2025-05-08 13:38:44', '2025-05-08 12:00:04', '2025-05-08 13:38:44', NULL, NULL),
(197, '2025-50003', '2025-05-08', 8, '10:00:00', '17:00:00', 'Present', 6.00, 8.00, 0.00, 0, 0, 0.00, NULL, 0.00, NULL, NULL, 'Approved', NULL, NULL, NULL, 'Cedric Kyle D. Belisario', '2025-05-08 13:38:44', '2025-05-08 12:00:04', '2025-05-08 13:38:44', NULL, NULL),
(198, '2025-50004', '2025-05-08', 3, '08:00:00', '17:00:00', 'Present', 8.00, 8.00, 0.00, 0, 0, 0.00, NULL, 0.00, NULL, NULL, 'Approved', NULL, NULL, NULL, 'Cedric Kyle D. Belisario', '2025-05-08 13:38:44', '2025-05-08 12:00:04', '2025-05-08 13:38:44', NULL, NULL),
(199, '2025-50005', '2025-05-08', 7, '10:00:00', '19:00:00', 'Present', 8.00, 8.00, 0.00, 0, 0, 0.00, NULL, 0.00, NULL, NULL, 'Approved', NULL, NULL, NULL, 'Cedric Kyle D. Belisario', '2025-05-08 13:38:44', '2025-05-08 12:00:04', '2025-05-08 13:38:44', NULL, NULL),
(200, '2025-50006', '2025-05-08', 9, '22:00:00', '07:00:00', 'Present', 8.00, 8.00, 0.00, 0, 0, 0.00, NULL, 0.00, NULL, NULL, 'Approved', NULL, NULL, NULL, 'Cedric Kyle D. Belisario', '2025-05-08 13:38:44', '2025-05-08 12:00:04', '2025-05-08 13:38:44', NULL, NULL),
(201, '2025-50007', '2025-05-08', 10, '08:00:00', '17:00:00', 'Present', 8.00, 8.00, 0.00, 0, 0, 0.00, NULL, 0.00, NULL, NULL, 'Approved', NULL, NULL, NULL, 'Cedric Kyle D. Belisario', '2025-05-08 13:38:44', '2025-05-08 12:00:04', '2025-05-08 13:38:44', NULL, NULL),
(202, '2025-50001', '2025-05-09', 6, '08:00:00', '17:00:00', 'Present', 8.00, 8.00, 0.00, 0, 0, 0.00, NULL, 0.00, NULL, NULL, 'Approved', NULL, NULL, NULL, 'Cedric Kyle D. Belisario', '2025-05-09 03:55:01', '2025-05-09 03:49:32', '2025-05-09 03:55:01', NULL, NULL),
(203, '2025-50002', '2025-05-09', 5, '08:00:00', '17:00:00', 'Present', 8.00, 8.00, 0.00, 0, 0, 0.00, NULL, 0.00, NULL, NULL, 'Approved', NULL, NULL, NULL, 'Cedric Kyle D. Belisario', '2025-05-09 03:55:01', '2025-05-09 03:49:32', '2025-05-09 03:55:01', NULL, NULL),
(204, '2025-50003', '2025-05-09', 8, '10:00:00', '19:00:00', 'Present', 8.00, 8.00, 0.00, 0, 0, 0.00, NULL, 0.00, NULL, NULL, 'Approved', NULL, NULL, NULL, 'Cedric Kyle D. Belisario', '2025-05-09 03:55:01', '2025-05-09 03:49:32', '2025-05-09 03:55:01', NULL, NULL),
(205, '2025-50004', '2025-05-09', 3, '08:00:00', '17:00:00', 'Present', 8.00, 8.00, 0.00, 0, 0, 0.00, NULL, 0.00, NULL, NULL, 'Approved', NULL, NULL, NULL, 'Cedric Kyle D. Belisario', '2025-05-09 03:55:01', '2025-05-09 03:49:32', '2025-05-09 03:55:01', NULL, NULL),
(206, '2025-50005', '2025-05-09', 7, '10:20:00', '19:30:00', 'Late', 7.67, 7.67, 0.00, 20, 0, 33.33, NULL, 0.00, NULL, NULL, 'Approved', NULL, NULL, NULL, 'Cedric Kyle D. Belisario', '2025-05-09 03:55:01', '2025-05-09 03:49:32', '2025-05-09 03:55:01', NULL, NULL),
(207, '2025-50006', '2025-05-09', 9, '22:26:00', '07:30:00', 'Late', 7.57, 7.57, 0.00, 26, 0, 43.33, NULL, 0.00, NULL, NULL, 'Approved', NULL, NULL, NULL, 'Cedric Kyle D. Belisario', '2025-05-09 03:55:01', '2025-05-09 03:49:32', '2025-05-09 03:55:01', NULL, NULL),
(208, '2025-50007', '2025-05-09', 10, '08:00:00', '17:20:00', 'Present', 8.00, 8.00, 0.00, 0, 0, 0.00, NULL, 0.00, NULL, NULL, 'Approved', NULL, NULL, NULL, 'Cedric Kyle D. Belisario', '2025-05-09 03:55:01', '2025-05-09 03:49:32', '2025-05-09 03:55:01', NULL, NULL),
(209, '2025-50001', '2025-05-13', 6, '08:10:00', '17:10:00', 'Present', 7.83, 7.83, 0.00, 0, 0, 0.00, NULL, 0.00, NULL, NULL, 'Approved', NULL, NULL, NULL, 'Cedric Kyle D. Belisario', '2025-05-14 05:50:51', '2025-05-13 11:46:10', '2025-05-14 05:50:51', NULL, NULL),
(210, '2025-50002', '2025-05-13', 5, '08:10:00', '17:10:00', 'Present', 7.83, 7.83, 0.00, 0, 0, 0.00, NULL, 0.00, NULL, NULL, 'Approved', NULL, NULL, NULL, 'Cedric Kyle D. Belisario', '2025-05-14 05:50:51', '2025-05-13 11:46:10', '2025-05-14 05:50:51', NULL, NULL),
(211, '2025-50003', '2025-05-13', 8, '10:10:00', '19:10:00', 'Present', 7.83, 7.83, 0.00, 0, 0, 0.00, NULL, 0.00, NULL, NULL, 'Approved', NULL, NULL, NULL, 'Cedric Kyle D. Belisario', '2025-05-14 05:50:51', '2025-05-13 11:46:10', '2025-05-14 05:50:51', NULL, NULL),
(212, '2025-50004', '2025-05-13', 3, '08:10:00', '07:10:00', 'Present', 22.00, 7.83, 0.00, 0, 0, 0.00, NULL, 0.00, NULL, NULL, 'Approved', 'Rejected', NULL, NULL, 'Cedric Kyle D. Belisario', '2025-05-14 05:50:51', '2025-05-13 11:46:10', '2025-05-14 05:50:51', NULL, NULL),
(213, '2025-50005', '2025-05-13', 7, '10:10:00', '19:10:00', 'Present', 7.83, 7.83, 0.00, 0, 0, 0.00, NULL, 0.00, NULL, NULL, 'Approved', NULL, NULL, NULL, 'Cedric Kyle D. Belisario', '2025-05-14 05:50:51', '2025-05-13 11:46:10', '2025-05-14 05:50:51', NULL, NULL),
(214, '2025-50006', '2025-05-13', 9, '22:10:00', '07:10:00', 'Present', 7.83, 7.83, 0.00, 0, 0, 0.00, NULL, 0.00, NULL, NULL, 'Approved', NULL, NULL, NULL, 'Cedric Kyle D. Belisario', '2025-05-14 05:50:51', '2025-05-13 11:46:10', '2025-05-14 05:50:51', NULL, NULL),
(215, '2025-50007', '2025-05-13', 10, '08:10:00', '17:10:00', 'Present', 7.83, 7.83, 0.00, 0, 0, 0.00, NULL, 0.00, NULL, NULL, 'Approved', NULL, NULL, NULL, 'Cedric Kyle D. Belisario', '2025-05-14 05:50:51', '2025-05-13 11:46:10', '2025-05-14 05:50:51', NULL, NULL),
(216, '2025-50001', '2025-05-14', 6, '08:00:00', '17:00:00', 'Present', 8.00, 8.00, 0.00, 0, 0, 0.00, NULL, 0.00, NULL, NULL, 'Approved', NULL, NULL, NULL, 'Cedric Kyle D. Belisario', '2025-05-14 05:29:07', '2025-05-14 05:22:59', '2025-05-14 05:29:07', NULL, NULL),
(217, '2025-50002', '2025-05-14', 5, '08:00:00', '17:00:00', 'Present', 8.00, 8.00, 0.00, 0, 0, 0.00, NULL, 0.00, NULL, NULL, 'Approved', NULL, NULL, NULL, 'Cedric Kyle D. Belisario', '2025-05-14 05:29:07', '2025-05-14 05:22:59', '2025-05-14 05:29:07', NULL, NULL),
(218, '2025-50003', '2025-05-14', 8, '10:00:00', '19:00:00', 'Present', 8.00, 8.00, 0.00, 0, 0, 0.00, NULL, 0.00, NULL, NULL, 'Approved', NULL, NULL, NULL, 'Cedric Kyle D. Belisario', '2025-05-14 05:29:07', '2025-05-14 05:22:59', '2025-05-14 05:29:07', NULL, NULL),
(219, '2025-50004', '2025-05-14', 3, '08:00:00', '17:00:00', 'Present', 8.00, 8.00, 0.00, 0, 0, 0.00, NULL, 0.00, NULL, NULL, 'Approved', NULL, NULL, NULL, 'Cedric Kyle D. Belisario', '2025-05-14 05:29:07', '2025-05-14 05:22:59', '2025-05-14 05:29:07', NULL, NULL),
(220, '2025-50005', '2025-05-14', 7, '10:00:00', '19:00:00', 'Present', 8.00, 8.00, 0.00, 0, 0, 0.00, NULL, 0.00, NULL, NULL, 'Approved', NULL, NULL, NULL, 'Cedric Kyle D. Belisario', '2025-05-14 05:29:07', '2025-05-14 05:22:59', '2025-05-14 05:29:07', NULL, NULL),
(221, '2025-50006', '2025-05-14', 9, '22:30:00', '07:30:00', 'Late', 7.50, 7.50, 0.00, 30, 0, 50.00, NULL, 0.00, NULL, NULL, 'Approved', NULL, NULL, NULL, 'Cedric Kyle D. Belisario', '2025-05-14 05:38:17', '2025-05-14 05:22:59', '2025-05-14 05:38:17', NULL, NULL),
(222, '2025-50007', '2025-05-14', 10, '08:00:00', '17:00:00', 'Present', 8.00, 8.00, 0.00, 0, 0, 0.00, NULL, 0.00, NULL, NULL, 'Approved', NULL, NULL, NULL, 'Cedric Kyle D. Belisario', '2025-05-14 05:29:07', '2025-05-14 05:22:59', '2025-05-14 05:29:07', NULL, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `employee_deductions`
--

CREATE TABLE `employee_deductions` (
  `id` int(11) NOT NULL,
  `description` varchar(255) NOT NULL COMMENT 'Name of mandatory deduction (SSS, PhilHealth, Pag-IBIG)',
  `deduction_type` enum('SSS','PHILHEALTH','PAGIBIG') NOT NULL COMMENT 'Type of government mandatory deduction',
  `salary_range_from` decimal(10,2) NOT NULL COMMENT 'Starting salary bracket',
  `salary_range_to` decimal(10,2) NOT NULL COMMENT 'Ending salary bracket',
  `percentage_rate` decimal(5,2) NOT NULL COMMENT 'Percentage rate for this salary bracket',
  `employer_share` decimal(5,2) NOT NULL COMMENT 'Employer contribution percentage',
  `employee_share` decimal(5,2) NOT NULL COMMENT 'Employee contribution percentage',
  `minimum_contribution` decimal(10,2) DEFAULT NULL COMMENT 'Minimum contribution amount if applicable',
  `maximum_contribution` decimal(10,2) DEFAULT NULL COMMENT 'Maximum contribution amount if applicable',
  `effective_date` datetime NOT NULL COMMENT 'When this rate becomes effective',
  `end_date` datetime DEFAULT NULL COMMENT 'When this rate expires',
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp(),
  `deleted_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `employee_deductions`
--

INSERT INTO `employee_deductions` (`id`, `description`, `deduction_type`, `salary_range_from`, `salary_range_to`, `percentage_rate`, `employer_share`, `employee_share`, `minimum_contribution`, `maximum_contribution`, `effective_date`, `end_date`, `created_at`, `updated_at`, `deleted_at`) VALUES
(1, 'Pag-ibig', 'PAGIBIG', 1.00, 9999999.00, 2.00, 1.00, 1.00, NULL, NULL, '2025-01-01 00:00:00', NULL, '2025-05-01 08:50:58', '2025-05-02 17:17:26', NULL),
(2, 'Philhealth', 'PHILHEALTH', 1.00, 99999.00, 5.00, 2.50, 2.50, NULL, NULL, '2025-01-01 00:00:00', NULL, '2025-05-01 09:58:47', '2025-05-02 17:16:45', NULL),
(3, 'SSS Basic', 'SSS', 1.00, 10000.00, 15.00, 10.00, 5.00, NULL, NULL, '2025-01-01 00:00:00', NULL, '2025-05-01 10:08:42', '2025-05-01 10:08:42', NULL),
(4, 'SSS Premium', 'SSS', 10001.00, 50000.00, 15.00, 9.00, 6.00, NULL, NULL, '2025-01-01 00:00:00', NULL, '2025-05-01 10:12:27', '2025-05-01 11:15:42', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `employee_schedules`
--

CREATE TABLE `employee_schedules` (
  `id` int(11) NOT NULL,
  `employee_id` varchar(20) NOT NULL,
  `schedule_id` int(11) NOT NULL,
  `remarks` text DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `deleted_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `employee_schedules`
--

INSERT INTO `employee_schedules` (`id`, `employee_id`, `schedule_id`, `remarks`, `created_at`, `updated_at`, `deleted_at`) VALUES
(3, '2025-50004', 2, '', '2025-05-02 04:09:13', '2025-05-02 04:15:00', NULL),
(4, '2025-50004', 2, '', '2025-05-02 04:15:16', '2025-05-02 04:17:43', '2025-05-02 04:17:43'),
(5, '2025-50002', 2, 'balik morning shift', '2025-05-02 08:42:55', '2025-05-05 13:20:59', NULL),
(6, '2025-50001', 2, '', '2025-05-02 08:43:10', '2025-05-02 08:43:10', NULL),
(7, '2025-50005', 3, '', '2025-05-02 08:43:24', '2025-05-02 08:43:24', NULL),
(8, '2025-50003', 3, '', '2025-05-02 08:43:49', '2025-05-02 08:43:49', NULL),
(9, '2025-50006', 5, '', '2025-05-02 08:44:06', '2025-05-02 08:44:06', NULL),
(10, '2025-50007', 2, '', '2025-05-07 07:36:40', '2025-05-07 07:36:40', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `inventory`
--

CREATE TABLE `inventory` (
  `id` int(11) NOT NULL,
  `item_code` varchar(20) NOT NULL,
  `item_name` varchar(100) NOT NULL,
  `description` text DEFAULT NULL,
  `category` enum('Food Ingredients','Office Supplies','Kitchen Equipment','Cleaning Supplies','Service Equipment','Raw Materials','Packaging Materials','Others') NOT NULL,
  `unit` varchar(20) NOT NULL,
  `quantity` decimal(10,2) NOT NULL DEFAULT 0.00,
  `reorder_point` int(11) NOT NULL DEFAULT 10,
  `last_received` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp(),
  `deleted_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `inventory`
--

INSERT INTO `inventory` (`id`, `item_code`, `item_name`, `description`, `category`, `unit`, `quantity`, `reorder_point`, `last_received`, `created_at`, `updated_at`, `deleted_at`) VALUES
(11, 'RAW-202505-0001', 'bigas', NULL, 'Raw Materials', 'pack', 0.00, 20, '2025-05-18 03:31:32', '2025-05-15 18:58:35', '2025-05-18 03:32:49', NULL),
(12, 'OTH-202505-0001', 'uling', NULL, 'Others', 'pack', 4.00, 20, '2025-05-15 18:58:35', '2025-05-15 18:58:35', '2025-05-15 21:42:58', NULL),
(13, 'RAW-202505-0002', 'Chicken Wings', NULL, 'Raw Materials', 'pc', 20.00, 20, '2025-05-15 18:58:44', '2025-05-15 18:58:44', '2025-05-16 18:54:09', NULL),
(14, 'RAW-202505-0003', 'Pork Ribs', NULL, 'Raw Materials', 'pc', 50.00, 50, '2025-05-17 04:08:04', '2025-05-15 18:58:44', '2025-05-17 04:08:04', NULL),
(15, 'RAW-202505-0004', 'Chicken Legs', NULL, 'Raw Materials', 'set', 40.00, 20, '2025-05-15 18:58:44', '2025-05-15 18:58:44', '2025-05-16 14:06:34', NULL),
(18, 'RAW-202505-0005', 'Baboy ', NULL, 'Raw Materials', 'kg', 50.00, 0, '2025-05-17 21:31:24', '2025-05-17 21:00:35', '2025-05-17 21:31:24', NULL),
(19, 'FOO-202505-0001', 'bitsin', NULL, 'Food Ingredients', 'kg', 10.00, 0, '2025-05-17 21:38:02', '2025-05-17 21:38:02', '2025-05-17 21:38:02', NULL),
(20, 'FOO-202505-0002', 'asin', NULL, 'Food Ingredients', 'kg', 20.00, 0, '2025-05-18 03:58:09', '2025-05-17 21:38:02', '2025-05-18 03:58:09', NULL),
(21, 'FOO-202505-0003', 'Suka', NULL, 'Food Ingredients', 'kg', 10.00, 0, '2025-05-17 21:46:44', '2025-05-17 21:46:44', '2025-05-17 21:46:44', NULL),
(22, 'FOO-202505-0004', 'BAGGOON', NULL, 'Food Ingredients', 'bottle', 10.00, 0, '2025-05-17 21:55:15', '2025-05-17 21:55:15', '2025-05-17 21:55:15', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `inventory_products`
--

CREATE TABLE `inventory_products` (
  `id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `category` varchar(50) NOT NULL,
  `unit` varchar(20) NOT NULL,
  `quantity` decimal(10,2) DEFAULT 0.00,
  `max_quantity` decimal(10,2) NOT NULL,
  `expiry_date` date DEFAULT NULL,
  `image` varchar(255) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `deleted_at` datetime DEFAULT NULL,
  `price` decimal(10,2) NOT NULL DEFAULT 0.00,
  `status` varchar(20) NOT NULL DEFAULT 'active'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `inventory_products`
--

INSERT INTO `inventory_products` (`id`, `name`, `category`, `unit`, `quantity`, `max_quantity`, `expiry_date`, `image`, `created_at`, `deleted_at`, `price`, `status`) VALUES
(1, 'Beef Steak', 'Raw Material', 'kg', 100.00, 120.00, '2025-12-25', 'uploads\\inventory_images\\1745944741016.png', '2025-04-29 16:39:01', NULL, 350.00, 'active');

-- --------------------------------------------------------

--
-- Table structure for table `inventory_receivings`
--

CREATE TABLE `inventory_receivings` (
  `id` int(11) NOT NULL,
  `receiving_id` varchar(20) NOT NULL,
  `request_id` varchar(20) DEFAULT NULL,
  `supplier_name` varchar(100) NOT NULL,
  `received_by` varchar(20) NOT NULL,
  `receiving_date` datetime NOT NULL DEFAULT current_timestamp(),
  `remarks` text DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `deleted_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `inventory_receiving_items`
--

CREATE TABLE `inventory_receiving_items` (
  `id` int(11) NOT NULL,
  `receiving_id` varchar(20) NOT NULL,
  `item_code` varchar(20) NOT NULL,
  `item_name` varchar(100) NOT NULL,
  `quantity_received` decimal(10,2) NOT NULL,
  `unit` varchar(20) NOT NULL,
  `unit_cost` decimal(10,2) NOT NULL,
  `total_cost` decimal(10,2) NOT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `inventory_stock_ins`
--

CREATE TABLE `inventory_stock_ins` (
  `id` int(11) NOT NULL,
  `item_code` varchar(20) NOT NULL,
  `quantity` decimal(10,2) NOT NULL,
  `unit` varchar(20) NOT NULL,
  `date` date NOT NULL DEFAULT curdate(),
  `supplier` varchar(100) DEFAULT NULL,
  `remarks` varchar(255) DEFAULT NULL,
  `document` varchar(255) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `inventory_stock_ins`
--

INSERT INTO `inventory_stock_ins` (`id`, `item_code`, `quantity`, `unit`, `date`, `supplier`, `remarks`, `document`, `created_at`) VALUES
(1, 'RAW-202505-0001', 5.00, 'pack', '2025-05-18', 'domeng', 'asdas', NULL, '2025-05-18 03:31:32'),
(2, 'FOO-202505-0002', 10.00, 'kg', '2025-05-18', 'ced', 'qwq', NULL, '2025-05-18 03:58:09');

-- --------------------------------------------------------

--
-- Table structure for table `inventory_stock_outs`
--

CREATE TABLE `inventory_stock_outs` (
  `id` int(11) NOT NULL,
  `item_code` varchar(20) NOT NULL,
  `quantity` decimal(10,2) NOT NULL,
  `unit` varchar(20) NOT NULL,
  `date` date NOT NULL DEFAULT curdate(),
  `reason` varchar(100) NOT NULL,
  `remarks` varchar(255) DEFAULT NULL,
  `document` varchar(255) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `inventory_stock_outs`
--

INSERT INTO `inventory_stock_outs` (`id`, `item_code`, `quantity`, `unit`, `date`, `reason`, `remarks`, `document`, `created_at`) VALUES
(1, 'RAW-202505-0001', 5.00, 'pack', '2025-05-18', 'invalid', 'sd', NULL, '2025-05-18 03:32:49');

-- --------------------------------------------------------

--
-- Table structure for table `leaves`
--

CREATE TABLE `leaves` (
  `id` int(11) NOT NULL,
  `employee_id` varchar(20) NOT NULL,
  `date_from` date NOT NULL,
  `date_to` date NOT NULL,
  `type` varchar(50) NOT NULL,
  `status` varchar(20) NOT NULL DEFAULT 'Pending',
  `is_paid` tinyint(1) NOT NULL DEFAULT 1,
  `remarks` text DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  `deleted_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `leaves`
--

INSERT INTO `leaves` (`id`, `employee_id`, `date_from`, `date_to`, `type`, `status`, `is_paid`, `remarks`, `created_at`, `updated_at`, `deleted_at`) VALUES
(1, '2025-50004', '2025-05-01', '2025-05-30', 'Sick Leave', 'Pending', 1, 'may sakit po', '2025-05-02 12:53:54', '2025-05-02 12:53:54', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `payrolls`
--

CREATE TABLE `payrolls` (
  `id` int(11) NOT NULL,
  `employee_id` varchar(20) NOT NULL,
  `month` int(11) NOT NULL,
  `quarter` int(11) NOT NULL,
  `week` int(11) NOT NULL,
  `start_date` date NOT NULL,
  `end_date` date NOT NULL,
  `payroll_date` datetime NOT NULL,
  `days_present` int(11) NOT NULL,
  `total_hours_worked` float NOT NULL,
  `overtime_hours` float DEFAULT 0,
  `tardiness_hours` float DEFAULT 0,
  `regular_hour_pay` float NOT NULL,
  `days_absent` int(11) NOT NULL,
  `absent_deduction` float NOT NULL,
  `overtime_pay` float NOT NULL,
  `tardiness_deduction` float NOT NULL,
  `status` int(11) NOT NULL DEFAULT 0,
  `allowance` float NOT NULL DEFAULT 0,
  `bonus` float NOT NULL DEFAULT 0,
  `paid_holiday` float NOT NULL DEFAULT 0,
  `deduction` float NOT NULL,
  `gross_pay` float NOT NULL,
  `salary_before_tax` float NOT NULL,
  `net_pay` float NOT NULL,
  `tax_deduction` float NOT NULL,
  `remarks` text DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp(),
  `deleted_at` datetime DEFAULT NULL,
  `rest_day_pay` decimal(10,2) DEFAULT 0.00,
  `rest_day_hours` decimal(5,2) DEFAULT 0.00
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `payrolls`
--

INSERT INTO `payrolls` (`id`, `employee_id`, `month`, `quarter`, `week`, `start_date`, `end_date`, `payroll_date`, `days_present`, `total_hours_worked`, `overtime_hours`, `tardiness_hours`, `regular_hour_pay`, `days_absent`, `absent_deduction`, `overtime_pay`, `tardiness_deduction`, `status`, `allowance`, `bonus`, `paid_holiday`, `deduction`, `gross_pay`, `salary_before_tax`, `net_pay`, `tax_deduction`, `remarks`, `created_at`, `updated_at`, `deleted_at`, `rest_day_pay`, `rest_day_hours`) VALUES
(1, '2025-50001', 5, 2, 18, '2025-05-01', '2025-05-15', '2025-05-08 13:54:49', 4, 42.17, 3, 0.83, 4217, 2, 0, 375, 83.33, 9, 0, 0, 0, 562.05, 5632, 5632, 5069.95, 0, NULL, '2025-05-08 13:54:49', '2025-05-08 14:24:21', NULL, 1040.00, 8.00),
(2, '2025-50002', 5, 2, 18, '2025-05-01', '2025-05-15', '2025-05-08 13:54:49', 3, 23, 0, 0.83, 1840, 2, 0, 0, 66.67, 9, 0, 0, 0, 223.07, 1840, 1840, 1616.93, 0, NULL, '2025-05-08 13:54:49', '2025-05-08 14:24:21', NULL, 0.00, 0.00),
(3, '2025-50003', 5, 2, 18, '2025-05-01', '2025-05-15', '2025-05-08 13:54:49', 3, 21.17, 0, 0.83, 1693.6, 2, 0, 0, 66.67, 9, 0, 0, 0, 210.626, 1693.6, 1693.6, 1482.97, 0, NULL, '2025-05-08 13:54:49', '2025-05-08 14:24:21', NULL, 0.00, 0.00),
(4, '2025-50004', 5, 2, 18, '2025-05-01', '2025-05-15', '2025-05-08 13:54:49', 3, 25, 2, 2.83, 2000, 2, 0, 200, 226.67, 9, 0, 0, 0, 413.67, 2200, 2200, 1786.33, 0, NULL, '2025-05-08 13:54:49', '2025-05-08 14:29:06', NULL, 0.00, 0.00),
(5, '2025-50005', 5, 2, 18, '2025-05-01', '2025-05-15', '2025-05-08 13:54:49', 3, 27, 0, 0.83, 2700, 2, 0, 0, 83.33, 9, 0, 0, 0, 312.83, 2700, 2700, 2387.17, 0, NULL, '2025-05-08 13:54:49', '2025-05-08 14:29:06', NULL, 0.00, 0.00),
(6, '2025-50006', 5, 2, 18, '2025-05-01', '2025-05-15', '2025-05-08 13:54:49', 4, 41, 0, 0, 4100, 2, 0, 0, 0, 9, 0, 0, 0, 348.5, 4100, 4100, 3751.5, 0, NULL, '2025-05-08 13:54:49', '2025-05-08 14:29:06', NULL, 0.00, 0.00),
(7, '2025-50007', 5, 2, 18, '2025-05-01', '2025-05-15', '2025-05-08 13:54:49', 1, 8, 0, 0, 800, 1, 0, 0, 0, 9, 0, 0, 0, 68, 800, 800, 732, 0, NULL, '2025-05-08 13:54:49', '2025-05-08 14:29:06', NULL, 0.00, 0.00),
(8, '2025-50001', 4, 2, 14, '2025-04-01', '2025-04-30', '2025-05-14 08:56:05', 22, 177, 0, 3, 29736, 4, 0, 0, 300, 0, 0, 0, 0, 7642.29, 29736, 29736, 22093.7, 4517.38, NULL, '2025-05-14 08:56:05', '2025-05-14 08:56:05', NULL, 0.00, 0.00),
(9, '2025-50002', 4, 2, 14, '2025-04-01', '2025-04-30', '2025-05-14 08:56:05', 16, 139.5, 0, 1.5, 7428.38, 10, 0, 0, 120, 0, 0, 0, 0, 751.412, 7428.38, 7428.38, 6676.96, 0, NULL, '2025-05-14 08:56:05', '2025-05-14 08:56:05', NULL, 0.00, 0.00),
(10, '2025-50003', 4, 2, 14, '2025-04-01', '2025-04-30', '2025-05-14 08:56:05', 21, 165.5, 0, 14.92, 13240, 5, 0, 0, 0, 0, 0, 0, 0, 1822.5, 13240, 13240, 11417.5, 564.7, NULL, '2025-05-14 08:56:05', '2025-05-14 08:56:05', NULL, 0.00, 0.00),
(11, '2025-50004', 4, 2, 14, '2025-04-01', '2025-04-30', '2025-05-14 08:56:05', 22, 175.5, 0, 2.5, 9345.38, 4, 0, 0, 200, 0, 0, 0, 0, 994.357, 9345.38, 9345.38, 8351.02, 0, NULL, '2025-05-14 08:56:05', '2025-05-14 08:56:05', NULL, 0.00, 0.00),
(12, '2025-50005', 4, 2, 14, '2025-04-01', '2025-04-30', '2025-05-14 08:56:05', 19, 168.5, 0, 0, 14027.6, 7, 0, 0, 0, 0, 0, 0, 0, 2054.85, 14027.6, 14027.6, 11972.8, 722.225, NULL, '2025-05-14 08:56:05', '2025-05-14 08:56:05', NULL, 0.00, 0.00),
(13, '2025-50006', 4, 2, 14, '2025-04-01', '2025-04-30', '2025-05-14 08:56:05', 19, 150.5, 0, 3.5, 15050, 3, 0, 0, 350, 0, 0, 0, 0, 2706.45, 15050, 15050, 12343.5, 926.7, NULL, '2025-05-14 08:56:05', '2025-05-14 08:56:05', NULL, 0.00, 0.00),
(14, '2025-50007', 4, 2, 14, '2025-04-01', '2025-04-30', '2025-05-14 08:56:05', 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, NULL, '2025-05-14 08:56:05', '2025-05-14 08:56:05', NULL, 0.00, 0.00);

-- --------------------------------------------------------

--
-- Table structure for table `payroll_deductions`
--

CREATE TABLE `payroll_deductions` (
  `id` int(11) NOT NULL,
  `payroll_id` int(11) NOT NULL,
  `deduction_type` varchar(255) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `amount` decimal(10,2) NOT NULL,
  `employee_share` decimal(10,2) DEFAULT NULL,
  `employer_share` decimal(10,2) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `payroll_deductions`
--

INSERT INTO `payroll_deductions` (`id`, `payroll_id`, `deduction_type`, `description`, `amount`, `employee_share`, `employer_share`, `created_at`, `updated_at`) VALUES
(1, 1, 'PAGIBIG', 'Pag-ibig', 56.32, 56.32, 56.32, '2025-05-08 13:54:49', '2025-05-08 13:54:49'),
(2, 1, 'PHILHEALTH', 'Philhealth', 140.80, 140.80, 140.80, '2025-05-08 13:54:49', '2025-05-08 13:54:49'),
(3, 1, 'SSS', 'SSS Basic', 281.60, 281.60, 563.20, '2025-05-08 13:54:49', '2025-05-08 13:54:49'),
(4, 2, 'PAGIBIG', 'Pag-ibig', 18.40, 18.40, 18.40, '2025-05-08 13:54:49', '2025-05-08 13:54:49'),
(5, 2, 'PHILHEALTH', 'Philhealth', 46.00, 46.00, 46.00, '2025-05-08 13:54:49', '2025-05-08 13:54:49'),
(6, 2, 'SSS', 'SSS Basic', 92.00, 92.00, 184.00, '2025-05-08 13:54:49', '2025-05-08 13:54:49'),
(7, 3, 'PAGIBIG', 'Pag-ibig', 16.94, 16.94, 16.94, '2025-05-08 13:54:49', '2025-05-08 13:54:49'),
(8, 3, 'PHILHEALTH', 'Philhealth', 42.34, 42.34, 42.34, '2025-05-08 13:54:49', '2025-05-08 13:54:49'),
(9, 3, 'SSS', 'SSS Basic', 84.68, 84.68, 169.36, '2025-05-08 13:54:49', '2025-05-08 13:54:49'),
(10, 4, 'PAGIBIG', 'Pag-ibig', 22.00, 22.00, 22.00, '2025-05-08 13:54:49', '2025-05-08 13:54:49'),
(11, 4, 'PHILHEALTH', 'Philhealth', 55.00, 55.00, 55.00, '2025-05-08 13:54:49', '2025-05-08 13:54:49'),
(12, 4, 'SSS', 'SSS Basic', 110.00, 110.00, 220.00, '2025-05-08 13:54:49', '2025-05-08 13:54:49'),
(13, 5, 'PAGIBIG', 'Pag-ibig', 27.00, 27.00, 27.00, '2025-05-08 13:54:49', '2025-05-08 13:54:49'),
(14, 5, 'PHILHEALTH', 'Philhealth', 67.50, 67.50, 67.50, '2025-05-08 13:54:49', '2025-05-08 13:54:49'),
(15, 5, 'SSS', 'SSS Basic', 135.00, 135.00, 270.00, '2025-05-08 13:54:49', '2025-05-08 13:54:49'),
(16, 6, 'PAGIBIG', 'Pag-ibig', 41.00, 41.00, 41.00, '2025-05-08 13:54:49', '2025-05-08 13:54:49'),
(17, 6, 'PHILHEALTH', 'Philhealth', 102.50, 102.50, 102.50, '2025-05-08 13:54:49', '2025-05-08 13:54:49'),
(18, 6, 'SSS', 'SSS Basic', 205.00, 205.00, 410.00, '2025-05-08 13:54:49', '2025-05-08 13:54:49'),
(19, 7, 'PAGIBIG', 'Pag-ibig', 8.00, 8.00, 8.00, '2025-05-08 13:54:49', '2025-05-08 13:54:49'),
(20, 7, 'PHILHEALTH', 'Philhealth', 20.00, 20.00, 20.00, '2025-05-08 13:54:49', '2025-05-08 13:54:49'),
(21, 7, 'SSS', 'SSS Basic', 40.00, 40.00, 80.00, '2025-05-08 13:54:49', '2025-05-08 13:54:49'),
(22, 8, 'PAGIBIG', 'Pag-ibig', 297.36, 297.36, 297.36, '2025-05-14 08:56:05', '2025-05-14 08:56:05'),
(23, 8, 'PHILHEALTH', 'Philhealth', 743.40, 743.40, 743.40, '2025-05-14 08:56:05', '2025-05-14 08:56:05'),
(24, 8, 'SSS', 'SSS Premium', 1784.16, 1784.16, 2676.24, '2025-05-14 08:56:05', '2025-05-14 08:56:05'),
(25, 9, 'PAGIBIG', 'Pag-ibig', 74.28, 74.28, 74.28, '2025-05-14 08:56:05', '2025-05-14 08:56:05'),
(26, 9, 'PHILHEALTH', 'Philhealth', 185.71, 185.71, 185.71, '2025-05-14 08:56:05', '2025-05-14 08:56:05'),
(27, 9, 'SSS', 'SSS Basic', 371.42, 371.42, 742.84, '2025-05-14 08:56:05', '2025-05-14 08:56:05'),
(28, 10, 'PAGIBIG', 'Pag-ibig', 132.40, 132.40, 132.40, '2025-05-14 08:56:05', '2025-05-14 08:56:05'),
(29, 10, 'PHILHEALTH', 'Philhealth', 331.00, 331.00, 331.00, '2025-05-14 08:56:05', '2025-05-14 08:56:05'),
(30, 10, 'SSS', 'SSS Premium', 794.40, 794.40, 1191.60, '2025-05-14 08:56:05', '2025-05-14 08:56:05'),
(31, 11, 'PAGIBIG', 'Pag-ibig', 93.45, 93.45, 93.45, '2025-05-14 08:56:05', '2025-05-14 08:56:05'),
(32, 11, 'PHILHEALTH', 'Philhealth', 233.63, 233.63, 233.63, '2025-05-14 08:56:05', '2025-05-14 08:56:05'),
(33, 11, 'SSS', 'SSS Basic', 467.27, 467.27, 934.54, '2025-05-14 08:56:05', '2025-05-14 08:56:05'),
(34, 12, 'PAGIBIG', 'Pag-ibig', 140.28, 140.28, 140.28, '2025-05-14 08:56:05', '2025-05-14 08:56:05'),
(35, 12, 'PHILHEALTH', 'Philhealth', 350.69, 350.69, 350.69, '2025-05-14 08:56:05', '2025-05-14 08:56:05'),
(36, 12, 'SSS', 'SSS Premium', 841.66, 841.66, 1262.49, '2025-05-14 08:56:05', '2025-05-14 08:56:05'),
(37, 13, 'PAGIBIG', 'Pag-ibig', 150.50, 150.50, 150.50, '2025-05-14 08:56:05', '2025-05-14 08:56:05'),
(38, 13, 'PHILHEALTH', 'Philhealth', 376.25, 376.25, 376.25, '2025-05-14 08:56:05', '2025-05-14 08:56:05'),
(39, 13, 'SSS', 'SSS Premium', 903.00, 903.00, 1354.50, '2025-05-14 08:56:05', '2025-05-14 08:56:05');

-- --------------------------------------------------------

--
-- Table structure for table `positions`
--

CREATE TABLE `positions` (
  `id` int(11) NOT NULL,
  `position_title` varchar(255) NOT NULL,
  `department` varchar(255) NOT NULL,
  `branch` varchar(255) NOT NULL DEFAULT 'Main Office',
  `rate_per_hour` float NOT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `deleted_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `positions`
--

INSERT INTO `positions` (`id`, `position_title`, `department`, `branch`, `rate_per_hour`, `created_at`, `updated_at`, `deleted_at`) VALUES
(5, 'HR Admin', 'HR Department', 'Main Branch', 168, '2025-04-30 16:25:51', '2025-05-14 08:55:06', NULL),
(6, 'HR Staff', 'HR Department', 'Main Office', 53.25, '2025-04-30 17:46:34', '2025-05-14 08:46:50', NULL),
(7, 'Finance Admin', 'Finance Department', 'Main Office', 83.25, '2025-04-30 17:58:14', '2025-05-14 08:47:32', NULL),
(8, 'Finance Staff', 'Finance Department', 'Main Office', 53.25, '2025-04-30 18:00:18', '2025-05-14 08:47:44', NULL),
(9, 'SCM Admin', 'Supply Chain Management', 'Main Office', 100, '2025-04-30 18:07:30', '2025-04-30 18:07:30', NULL),
(10, 'SCM Staff', 'Supply Chain Management', 'Main Office', 80, '2025-04-30 18:07:46', '2025-05-01 03:49:24', NULL),
(11, 'CRM Admin', 'Customer Relationship Management', 'Main Office', 100, '2025-05-01 03:49:48', '2025-05-01 03:49:48', NULL),
(12, 'CRM Staff', 'Customer Relationship Management', 'Main Office', 80, '2025-05-01 03:51:24', '2025-05-01 03:51:38', NULL),
(13, 'Branch Manager', 'Branch Operation', 'Main Office', 100, '2025-05-07 03:40:33', '2025-05-07 03:40:33', NULL),
(14, 'Procurement Manager', 'Procurement Department', 'Main Office', 100, '2025-05-07 04:42:58', '2025-05-07 04:42:58', NULL),
(15, 'Production Admin', 'Production Department', 'Main Office', 83.25, '2025-05-14 09:17:30', '2025-05-14 09:17:30', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `production_batches`
--

CREATE TABLE `production_batches` (
  `id` int(11) NOT NULL,
  `batch_number` varchar(20) NOT NULL,
  `product_name` varchar(100) NOT NULL,
  `primary_stock` int(11) NOT NULL DEFAULT 0,
  `secondary_stock` int(11) NOT NULL DEFAULT 0,
  `reorder_point` int(11) NOT NULL,
  `unit` varchar(20) NOT NULL,
  `production_date` datetime NOT NULL,
  `expiry_date` datetime NOT NULL,
  `production_manager` varchar(100) NOT NULL,
  `remarks` text DEFAULT NULL,
  `status` enum('active','completed','cancelled') DEFAULT 'active',
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `production_batches`
--

INSERT INTO `production_batches` (`id`, `batch_number`, `product_name`, `primary_stock`, `secondary_stock`, `reorder_point`, `unit`, `production_date`, `expiry_date`, `production_manager`, `remarks`, `status`, `created_at`, `updated_at`) VALUES
(1, 'BN-2025-001', 'Fried Siken', 10, 0, 10, 'pc', '2025-05-16 00:00:00', '2025-05-17 00:00:00', 'manager1', 'jdbuwe', 'active', '2025-05-16 14:06:34', '2025-05-16 14:06:34'),
(9, 'BN-2025-003', 'Siken Wings', 0, 10, 10, 'pc', '2025-05-16 00:00:00', '2025-05-17 00:00:00', 'ced d. belisario', 're stock', 'active', '2025-05-16 18:54:09', '2025-05-16 18:54:09'),
(10, 'BN-2025-004', 'Ribs ni marco', 50, 0, 10, 'pc', '2025-05-16 00:00:00', '2025-05-24 00:00:00', 'ced d. belisario', 'wefbwej', 'active', '2025-05-16 21:15:11', '2025-05-16 21:15:11'),
(11, 'BN-2025-005', 'Litson', 50, 0, 10, 'kg', '2025-05-17 00:00:00', '2025-05-19 00:00:00', 'ced d. belisario', 'sd', 'active', '2025-05-17 21:09:01', '2025-05-17 21:09:01'),
(12, 'BN-2025-006', 'fried rice', 3, 0, 10, 'pack', '2025-05-17 00:00:00', '2025-05-19 00:00:00', 'ced d. belisario', 'adsf', 'active', '2025-05-17 21:14:14', '2025-05-17 21:14:14');

-- --------------------------------------------------------

--
-- Table structure for table `production_finished_goods`
--

CREATE TABLE `production_finished_goods` (
  `id` int(11) NOT NULL,
  `batch_id` int(11) NOT NULL,
  `item_name` varchar(100) NOT NULL,
  `produced_qty` int(11) NOT NULL,
  `unit` varchar(20) NOT NULL,
  `batch_no` varchar(20) DEFAULT NULL,
  `expiry_date` datetime DEFAULT NULL,
  `image` varchar(255) DEFAULT NULL,
  `deleted_at` datetime DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `production_finished_goods`
--

INSERT INTO `production_finished_goods` (`id`, `batch_id`, `item_name`, `produced_qty`, `unit`, `batch_no`, `expiry_date`, `image`, `deleted_at`, `created_at`, `updated_at`) VALUES
(1, 1, 'Fried Siken', 10, 'pc', '', '2025-05-17 00:00:00', 'http://localhost:3000/uploads/production_images/1747404295438.jpg', NULL, '2025-05-17 03:35:42', '2025-05-16 20:07:02'),
(2, 1, 'Siken Wings', 10, 'pc', '', '2025-05-17 00:00:00', 'http://localhost:3000/uploads/production_images/1747404357575.jpg', NULL, '2025-05-17 03:35:42', '2025-05-17 03:35:42'),
(5, 9, 'Siken Wings', 10, 'pc', '', '2025-05-17 00:00:00', 'http://localhost:3000/uploads/production_images/1747422537901.jpg', NULL, '2025-05-17 03:35:42', '2025-05-17 03:35:42'),
(6, 10, 'Ribs ni marco', 50, 'pc', '', '2025-05-24 00:00:00', 'http://localhost:3000/uploads/production_images/1747430100700.jpg', NULL, '2025-05-16 21:15:11', '2025-05-16 21:15:11'),
(7, 11, 'Litson', 50, 'kg', '', '2025-05-19 00:00:00', 'http://localhost:3000/uploads/production_images/1747516129647.jpg', NULL, '2025-05-17 21:09:01', '2025-05-17 21:09:01'),
(8, 12, 'fried rice', 3, 'pack', '', '2025-05-19 00:00:00', 'http://localhost:3000/uploads/production_images/1747516447400.jpg', NULL, '2025-05-17 21:14:14', '2025-05-17 21:14:14');

-- --------------------------------------------------------

--
-- Table structure for table `product_price_histories`
--

CREATE TABLE `product_price_histories` (
  `id` int(11) NOT NULL,
  `product_id` int(11) NOT NULL,
  `old_price` decimal(10,2) NOT NULL,
  `new_price` decimal(10,2) NOT NULL,
  `changed_by` varchar(100) NOT NULL,
  `reason` varchar(255) DEFAULT NULL,
  `changed_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `product_price_histories`
--

INSERT INTO `product_price_histories` (`id`, `product_id`, `old_price`, `new_price`, `changed_by`, `reason`, `changed_at`) VALUES
(1, 1, 0.00, 350.00, 'System', NULL, '2025-04-29 17:21:12');

-- --------------------------------------------------------

--
-- Table structure for table `roles`
--

CREATE TABLE `roles` (
  `id` int(11) NOT NULL,
  `role_name` varchar(100) NOT NULL,
  `description` text DEFAULT NULL,
  `department` varchar(100) NOT NULL,
  `permissions` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`permissions`)),
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `deleted_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `roles`
--

INSERT INTO `roles` (`id`, `role_name`, `description`, `department`, `permissions`, `created_at`, `updated_at`, `deleted_at`) VALUES
(1, 'Super Admin', 'Full system administrator access', 'Admin Department', '[1]', '2025-04-22 15:34:44', '2025-04-22 15:34:44', NULL),
(2, 'HR Manager', 'Full access to HR department functions', 'HR Department', '[2,3,4,5,6,7,26]', '2025-04-22 15:34:44', '2025-04-30 10:55:48', NULL),
(3, 'HR Staff', 'Basic HR staff with attendance access', 'HR Department', '[5,6]', '2025-04-22 15:34:44', '2025-04-25 10:19:54', NULL),
(4, 'Finance Manager', 'Full access to Finance department', 'Finance Department', '[8,9,11,24,25,29]', '2025-04-22 15:34:44', '2025-05-07 03:32:41', NULL),
(5, 'Finance Staff', 'Basic Finance with dashboard and report access', 'Finance Department', '[9,11]', '2025-04-22 16:20:40', '2025-04-28 11:18:32', NULL),
(7, 'SCM Manager', 'can access all scm feature', 'Supply Chain Management', '[14,16,19,22,35,33,34]', '2025-04-23 12:28:46', '2025-05-14 08:02:02', NULL),
(8, 'Sales Manager', 'Full access to sales features', 'Sales Department', '[12,13]', '2025-04-23 12:57:54', '2025-04-28 11:18:32', NULL),
(9, 'Sales Staff', 'Basic sales dashboard access', 'Sales Department', '[13]', '2025-04-23 12:57:54', '2025-04-28 11:18:32', NULL),
(10, 'CRM Manager', 'Full access to CRM features', 'Customer Relationship Management', '[17,18]', '2025-04-23 12:57:54', '2025-04-28 08:25:21', NULL),
(11, 'CRM Staff', 'Basic CRM dashboard access', 'Customer Relationship Management', '[18]', '2025-04-23 12:57:54', '2025-04-28 08:25:21', NULL),
(13, 'SCM Assistant Manager', 'Full access to supply chain features', 'Supply Chain Management', '[14,16,15]', '2025-04-24 19:05:46', '2025-04-28 08:25:21', '2025-04-24 20:40:26'),
(14, 'SCM Assistants Manager', 'Assistant lng ', 'Supply Chain Management', '[14,16,15]', '2025-04-24 19:20:23', '2025-04-28 08:25:21', '2025-04-24 20:40:07'),
(15, 'CRM test', 'Test role', 'Customer Relationship Management', '[17,18]', '2025-04-28 08:13:48', '2025-04-28 08:25:21', NULL),
(16, 'Test  Role', 'This is test role only', 'HR Department', '[7]', '2025-04-28 10:58:35', '2025-05-01 09:25:34', NULL),
(17, 'Test 2', 'this is to check if nagana', 'Customer Relationship Management', '[17,18]', '2025-05-01 09:26:24', '2025-05-01 09:26:24', NULL),
(18, 'hr payroll', 'qwer23', 'HR Department', '[26]', '2025-05-01 09:32:07', '2025-05-01 09:32:07', NULL),
(19, 'Branch Manager', 'branch manager  operation', 'Branch Operation', '[40,41,45,42,43,44]', '2025-05-07 03:09:52', '2025-05-16 21:47:02', NULL),
(20, 'Production Manager', 'manage all staff about production', 'Production Department', '[31,32]', '2025-05-07 04:43:34', '2025-05-14 09:15:15', NULL),
(21, 'production admins', 'asds', 'Production Department', '[31,32,36,37,38,39]', '2025-05-16 21:52:06', '2025-05-16 21:52:06', NULL),
(22, 'Production adminss', 'dsadds', 'Production Department', '[31,32,36,37,38,39]', '2025-05-16 22:11:05', '2025-05-16 22:11:05', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `sequelizemeta`
--

CREATE TABLE `sequelizemeta` (
  `name` varchar(255) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

--
-- Dumping data for table `sequelizemeta`
--

INSERT INTO `sequelizemeta` (`name`) VALUES
('20250505114006-add-ot-remarks-to-employee-attendance.js'),
('20250507151331-add_request_workflow_fields.js'),
('add-deleted-at-to-leaves.js'),
('add-ot-to-employee-attendance.js'),
('add-position-id-to-employees.js'),
('add-role-id-employees.js'),
('add-soft-delete.js'),
('add-status-to-attendance.js'),
('create-audit-logs-table.js'),
('create-available-schedule-table.js'),
('create-emergency-contacts-table.js'),
('create-employee-attendance-table.js'),
('create-employee-deduction-table.js'),
('create-employee-schedule-table.js'),
('create-employees-table.js'),
('create-inventory-table.js'),
('create-leaves-table.js'),
('create-payroll-deductions.js'),
('create-payrolls-table.js'),
('create-positions-table.js'),
('create-product-price-history.js'),
('create-request-table.js'),
('create-role-table.js'),
('create-stock-adjustment-table.js'),
('create-stock-in-table.js'),
('create-stock-out-tabl.js'),
('create-users-table.js'),
('edit-inventory-table.js'),
('modify-approved-by-col.js'),
('modify-employee-schedule-fk.js'),
('modify-mandatory-deduction-table.js'),
('recreate-employee-attendance-table.js'),
('recreate2-attendance-table.js'),
('update-mandatory-deduction-table.js'),
('update-mandatory-table.js');

-- --------------------------------------------------------

--
-- Table structure for table `stock_adjustments`
--

CREATE TABLE `stock_adjustments` (
  `id` int(11) NOT NULL,
  `product_id` int(11) NOT NULL,
  `old_quantity` decimal(10,2) NOT NULL,
  `new_quantity` decimal(10,2) NOT NULL,
  `adjustment_type` enum('increase','decrease','set') NOT NULL,
  `reason` varchar(255) NOT NULL,
  `remarks` varchar(255) DEFAULT NULL,
  `document` varchar(255) DEFAULT NULL,
  `user` varchar(255) NOT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  `deleted_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `stock_adjustments`
--

INSERT INTO `stock_adjustments` (`id`, `product_id`, `old_quantity`, `new_quantity`, `adjustment_type`, `reason`, `remarks`, `document`, `user`, `created_at`, `deleted_at`) VALUES
(1, 1, 50.00, 50.00, 'set', 'Physical Count', 'Set to actual count', 'uploads\\adjustment_docs\\1745953365127.jpg', 'Kyle', '2025-04-29 19:02:45', NULL),
(2, 1, 50.00, 5.00, 'set', 'Physical Count', 'Set to actual count', 'uploads\\adjustment_docs\\1745954490998.jpg', 'Kyle', '2025-04-29 19:21:31', NULL),
(3, 1, 5.00, 50.00, 'set', 'Physical Count', 'Set to actual count', NULL, 'Kyle', '2025-04-29 19:22:27', NULL),
(4, 1, 50.00, 60.00, 'increase', 'Physical Count', 'Set to actual count', NULL, 'Kyle', '2025-04-29 19:22:56', NULL),
(5, 1, 60.00, 55.00, 'decrease', 'Physical Count', 'Set to actual count', NULL, 'Kyle', '2025-04-29 19:23:55', NULL),
(6, 1, 55.00, 110.00, 'increase', 'Physical Count', 'Set to actual count', NULL, 'Kyle', '2025-04-29 19:25:25', NULL),
(7, 1, 110.00, 0.00, 'decrease', 'Physical Count', 'Set to actual count', NULL, 'Kyle', '2025-04-29 19:25:57', NULL),
(8, 1, 0.00, 100.00, 'increase', 'OUT OF STOCKS', 'ADDED NEW STOCKS', NULL, 'CEDRIC', '2025-04-29 21:51:50', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `stock_ins`
--

CREATE TABLE `stock_ins` (
  `id` int(11) NOT NULL,
  `product_id` int(11) NOT NULL,
  `quantity` decimal(10,2) NOT NULL,
  `unit` varchar(20) NOT NULL,
  `date` date NOT NULL,
  `supplier` varchar(100) DEFAULT NULL,
  `remarks` varchar(255) DEFAULT NULL,
  `document` varchar(255) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `stock_ins`
--

INSERT INTO `stock_ins` (`id`, `product_id`, `quantity`, `unit`, `date`, `supplier`, `remarks`, `document`, `created_at`) VALUES
(1, 1, 100.00, 'kg', '2025-04-30', 'Marco', 'Araw Araw sipag lng', NULL, '2025-04-29 17:45:46'),
(2, 1, 100.00, 'kg', '2025-04-30', NULL, NULL, NULL, '2025-04-29 18:09:32');

-- --------------------------------------------------------

--
-- Table structure for table `stock_outs`
--

CREATE TABLE `stock_outs` (
  `id` int(11) NOT NULL,
  `product_id` int(11) NOT NULL,
  `quantity` decimal(10,2) NOT NULL,
  `unit` varchar(20) NOT NULL,
  `date` date NOT NULL,
  `reason` varchar(100) NOT NULL,
  `remarks` varchar(255) DEFAULT NULL,
  `document` varchar(255) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `stock_outs`
--

INSERT INTO `stock_outs` (`id`, `product_id`, `quantity`, `unit`, `date`, `reason`, `remarks`, `document`, `created_at`) VALUES
(1, 1, 100.00, 'kg', '2025-04-30', 'Sales', 'Sold to Customer', NULL, '2025-04-29 18:02:02'),
(2, 1, 10.00, 'kg', '2025-04-30', 'Sales', 'Sold to Customer', NULL, '2025-04-29 18:13:45');

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` int(11) NOT NULL,
  `employee_id` varchar(20) DEFAULT NULL,
  `email` varchar(100) NOT NULL,
  `password` varchar(255) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `role_id` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `employee_id`, `email`, `password`, `created_at`, `role_id`) VALUES
(5, '2025-50000', 'cedricbelisario@gmail.com', '$2b$10$C1r4YkDqgRDGqhWkPnPQjOM.NcBRAC8CjlbpwrLfn39EjPneKrSzi', '2025-04-22 14:34:23', 1),
(11, '2025-50001', 'marco@gmail.com', '$2b$10$7l3Aol1RCi0Gh0eB17yxK.SRjDIS8SOYW5zuoUT3vpolko82MNsrq', '2025-04-23 14:21:48', 2),
(20, '2024-50000', 'jane.smith@example.com', '$2b$10$cJiwpMZHq9L46pnGKxAHNejo7.BxDjlH/qs7/TCbV6gTBpOGrRzUS', '2025-04-24 09:19:03', 0),
(21, '2024-50001', 'juan.delacruz@gmail.com', '$2b$10$uB2dteuj0OQfTfKxMOLhx.BGFPR6PqosF9VZqhBBKryHuV08RxldS', '2025-04-24 17:40:05', 2),
(22, '2024-50002', 'juan.delacruz@example.com', '$2b$10$ryNMavBaBxFPOXmyTvGiQeNzbVE4CfD5b4wyvMO8SkexdZqTWSYIO', '2025-04-24 18:02:53', 0),
(23, '2025-50002', 'pat@gmail.com', '$2b$10$Pq0gXXdUpJWrW2QD2PvjPOZD8Ql1lmO8KU5mtq5T7AClJIK05yqdC', '2025-04-24 18:45:47', 2),
(24, '2025-50003', 'c@gmail.com', '$2b$10$wyALNoRZW9MdWv1qWWYxreSf/Zv.sgBTh5kZojH4hZSyZQulJcpyy', '2025-04-24 19:28:20', 1),
(27, '2025-50004', 'nath@gmail.com', '$2b$10$6GKvIQk4QJbLL2QR48DV1eoaUNZmu0V4YMAwNKDxJaw3DOhPIlgs6', '2025-04-26 04:08:01', 0),
(28, '2025-50005', 'elya@gmail.com', '$2b$10$oew.c5ppndTxSAnItTCOQuEf/KsL6.dguM5YJ9Bt571aTvkm8dudG', '2025-04-26 04:11:51', 0),
(29, '2025-50006', 'ced@gmail.com', '$2b$10$o9QTW4fXTVX6ZoBjeM7CwuJemA47Cwo9QaBG6relZoBKryV89/aZy', '2025-04-28 10:44:01', 0),
(30, '2025-50007', 'jdk@gmail.com', '$2b$10$AA5.ZqfgmTuNbZ3mDr4rVe6M3.VBuq8Z2clKX8zB1aYC0zQbHr8T.', '2025-05-06 09:11:15', 0);

-- --------------------------------------------------------

--
-- Stand-in structure for view `v_branch_distribution_requests`
-- (See below for the actual view)
--
CREATE TABLE `v_branch_distribution_requests` (
);

-- --------------------------------------------------------

--
-- Structure for view `v_branch_distribution_requests`
--
DROP TABLE IF EXISTS `v_branch_distribution_requests`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `v_branch_distribution_requests`  AS SELECT `branch_distribution_request`.`id` AS `id`, `branch_distribution_request`.`request_id` AS `request_id`, `branch_distribution_request`.`branch_id` AS `branch_id`, `branch_distribution_request`.`branch_name` AS `branch_name`, `branch_distribution_request`.`remarks` AS `remarks`, `branch_distribution_request`.`status` AS `status`, `branch_distribution_request`.`requested_by` AS `requested_by`, `branch_distribution_request`.`requested_at` AS `requested_at`, `branch_distribution_request`.`processed_by` AS `processed_by`, `branch_distribution_request`.`processed_at` AS `processed_at`, `branch_distribution_request`.`process_notes` AS `process_notes`, `branch_distribution_request`.`fulfilled_by` AS `fulfilled_by`, `branch_distribution_request`.`fulfilled_at` AS `fulfilled_at`, `branch_distribution_request`.`created_at` AS `created_at`, `branch_distribution_request`.`updated_at` AS `updated_at`, `branch_distribution_request`.`deleted_at` AS `deleted_at`, `items`.`id` AS `items_id`, `items`.`request_id` AS `items_request_id`, `items`.`product_id` AS `items_product_id`, `items`.`product_code` AS `items_product_code`, `items`.`product_name` AS `items_product_name`, `items`.`quantity` AS `items_quantity`, `items`.`unit` AS `items_unit`, `items`.`category` AS `items_category`, `items`.`notes` AS `items_notes`, `items`.`fulfilled_quantity` AS `items_fulfilled_quantity`, `items`.`created_at` AS `items_created_at`, `items`.`updated_at` AS `items_updated_at` FROM (`branch_distribution_requests` `branch_distribution_request` left join `branch_distribution_request_items` `items` on(`branch_distribution_request`.`request_id` = `items`.`request_id`)) WHERE `branch_distribution_request`.`deleted_at` is null ;

--
-- Indexes for dumped tables
--

--
-- Indexes for table `audit_logs`
--
ALTER TABLE `audit_logs`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `available_schedules`
--
ALTER TABLE `available_schedules`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `branches`
--
ALTER TABLE `branches`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `branch_distribution_requests`
--
ALTER TABLE `branch_distribution_requests`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `branch_distribution_request_items`
--
ALTER TABLE `branch_distribution_request_items`
  ADD PRIMARY KEY (`id`),
  ADD KEY `request_id` (`request_id`);

--
-- Indexes for table `branch_inventory`
--
ALTER TABLE `branch_inventory`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `emergency_contacts`
--
ALTER TABLE `emergency_contacts`
  ADD PRIMARY KEY (`id`),
  ADD KEY `employee_id` (`employee_id`);

--
-- Indexes for table `employees`
--
ALTER TABLE `employees`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `employee_id` (`employee_id`),
  ADD UNIQUE KEY `email` (`email`),
  ADD KEY `fk_role_id` (`role_id`),
  ADD KEY `employees_position_id_foreign_idx` (`position_id`);

--
-- Indexes for table `employee_attendance`
--
ALTER TABLE `employee_attendance`
  ADD PRIMARY KEY (`id`),
  ADD KEY `employee_id` (`employee_id`),
  ADD KEY `schedule_id` (`schedule_id`);

--
-- Indexes for table `employee_deductions`
--
ALTER TABLE `employee_deductions`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `employee_schedules`
--
ALTER TABLE `employee_schedules`
  ADD PRIMARY KEY (`id`),
  ADD KEY `employee_schedules_employee_id` (`employee_id`),
  ADD KEY `employee_schedules_schedule_id` (`schedule_id`);

--
-- Indexes for table `inventory_products`
--
ALTER TABLE `inventory_products`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `leaves`
--
ALTER TABLE `leaves`
  ADD PRIMARY KEY (`id`),
  ADD KEY `employee_id` (`employee_id`);

--
-- Indexes for table `payrolls`
--
ALTER TABLE `payrolls`
  ADD PRIMARY KEY (`id`),
  ADD KEY `employee_id` (`employee_id`);

--
-- Indexes for table `payroll_deductions`
--
ALTER TABLE `payroll_deductions`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `positions`
--
ALTER TABLE `positions`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `product_price_histories`
--
ALTER TABLE `product_price_histories`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_price_history_product` (`product_id`);

--
-- Indexes for table `roles`
--
ALTER TABLE `roles`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `role_name` (`role_name`),
  ADD UNIQUE KEY `roles_role_name` (`role_name`);

--
-- Indexes for table `sequelizemeta`
--
ALTER TABLE `sequelizemeta`
  ADD PRIMARY KEY (`name`),
  ADD UNIQUE KEY `name` (`name`);

--
-- Indexes for table `stock_adjustments`
--
ALTER TABLE `stock_adjustments`
  ADD PRIMARY KEY (`id`),
  ADD KEY `product_id` (`product_id`);

--
-- Indexes for table `stock_ins`
--
ALTER TABLE `stock_ins`
  ADD PRIMARY KEY (`id`),
  ADD KEY `product_id` (`product_id`);

--
-- Indexes for table `stock_outs`
--
ALTER TABLE `stock_outs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `product_id` (`product_id`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `email` (`email`),
  ADD UNIQUE KEY `employee_id` (`employee_id`),
  ADD KEY `fk_user_role` (`role_id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `audit_logs`
--
ALTER TABLE `audit_logs`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=22;

--
-- AUTO_INCREMENT for table `available_schedules`
--
ALTER TABLE `available_schedules`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `branches`
--
ALTER TABLE `branches`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `branch_distribution_requests`
--
ALTER TABLE `branch_distribution_requests`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT for table `branch_distribution_request_items`
--
ALTER TABLE `branch_distribution_request_items`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `branch_inventory`
--
ALTER TABLE `branch_inventory`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=16;

--
-- AUTO_INCREMENT for table `emergency_contacts`
--
ALTER TABLE `emergency_contacts`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=33;

--
-- AUTO_INCREMENT for table `employees`
--
ALTER TABLE `employees`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=28;

--
-- AUTO_INCREMENT for table `employee_attendance`
--
ALTER TABLE `employee_attendance`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=223;

--
-- AUTO_INCREMENT for table `employee_deductions`
--
ALTER TABLE `employee_deductions`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `employee_schedules`
--
ALTER TABLE `employee_schedules`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

--
-- AUTO_INCREMENT for table `inventory_products`
--
ALTER TABLE `inventory_products`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `leaves`
--
ALTER TABLE `leaves`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `payrolls`
--
ALTER TABLE `payrolls`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=15;

--
-- AUTO_INCREMENT for table `payroll_deductions`
--
ALTER TABLE `payroll_deductions`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=40;

--
-- AUTO_INCREMENT for table `positions`
--
ALTER TABLE `positions`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=16;

--
-- AUTO_INCREMENT for table `product_price_histories`
--
ALTER TABLE `product_price_histories`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `roles`
--
ALTER TABLE `roles`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=23;

--
-- AUTO_INCREMENT for table `stock_adjustments`
--
ALTER TABLE `stock_adjustments`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT for table `stock_ins`
--
ALTER TABLE `stock_ins`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `stock_outs`
--
ALTER TABLE `stock_outs`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=31;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `branch_distribution_request_items`
--
ALTER TABLE `branch_distribution_request_items`
  ADD CONSTRAINT `branch_distribution_request_items_ibfk_1` FOREIGN KEY (`request_id`) REFERENCES `branch_distribution_requests` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `emergency_contacts`
--
ALTER TABLE `emergency_contacts`
  ADD CONSTRAINT `emergency_contacts_ibfk_1` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`employee_id`);

--
-- Constraints for table `employees`
--
ALTER TABLE `employees`
  ADD CONSTRAINT `employees_position_id_foreign_idx` FOREIGN KEY (`position_id`) REFERENCES `positions` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `employees_role_id_foreign_idx` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_role_id` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`);

--
-- Constraints for table `employee_attendance`
--
ALTER TABLE `employee_attendance`
  ADD CONSTRAINT `employee_attendance_ibfk_1` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`employee_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `employee_attendance_ibfk_2` FOREIGN KEY (`schedule_id`) REFERENCES `employee_schedules` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `employee_schedules`
--
ALTER TABLE `employee_schedules`
  ADD CONSTRAINT `employee_schedules_ibfk_1` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`employee_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `employee_schedules_ibfk_2` FOREIGN KEY (`schedule_id`) REFERENCES `available_schedules` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `leaves`
--
ALTER TABLE `leaves`
  ADD CONSTRAINT `leaves_ibfk_1` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`employee_id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `payrolls`
--
ALTER TABLE `payrolls`
  ADD CONSTRAINT `payrolls_ibfk_1` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`employee_id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `product_price_histories`
--
ALTER TABLE `product_price_histories`
  ADD CONSTRAINT `fk_price_history_product` FOREIGN KEY (`product_id`) REFERENCES `inventory_products` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `product_price_histories_ibfk_1` FOREIGN KEY (`product_id`) REFERENCES `inventory_products` (`id`);

--
-- Constraints for table `stock_adjustments`
--
ALTER TABLE `stock_adjustments`
  ADD CONSTRAINT `stock_adjustments_ibfk_1` FOREIGN KEY (`product_id`) REFERENCES `inventory_products` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `stock_ins`
--
ALTER TABLE `stock_ins`
  ADD CONSTRAINT `stock_ins_ibfk_1` FOREIGN KEY (`product_id`) REFERENCES `inventory_products` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `stock_outs`
--
ALTER TABLE `stock_outs`
  ADD CONSTRAINT `stock_outs_ibfk_1` FOREIGN KEY (`product_id`) REFERENCES `inventory_products` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `users`
--
ALTER TABLE `users`
  ADD CONSTRAINT `users_ibfk_1` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`employee_id`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
