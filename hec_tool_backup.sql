-- MySQL dump 10.13  Distrib 8.0.38, for Win64 (x86_64)
--
-- Host: localhost    Database: hec_tool
-- ------------------------------------------------------
-- Server version	8.0.39

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `alumni`
--

DROP TABLE IF EXISTS `alumni`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `alumni` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) DEFAULT NULL,
  `branch` varchar(255) DEFAULT NULL,
  `passout_year` int DEFAULT NULL,
  `pg_university` varchar(255) DEFAULT NULL,
  `pg_course` varchar(255) DEFAULT NULL,
  `pg_country` varchar(100) DEFAULT NULL,
  `pg_city` varchar(100) DEFAULT NULL,
  `current_company` varchar(255) DEFAULT NULL,
  `designation` varchar(255) DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL,
  `linkedin_url` varchar(1024) DEFAULT NULL,
  `phone` varchar(50) DEFAULT NULL,
  `willing_to_mentor` tinyint(1) DEFAULT '1',
  `areas_of_help` json DEFAULT NULL,
  `photo_url` varchar(1024) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `alumni`
--

LOCK TABLES `alumni` WRITE;
/*!40000 ALTER TABLE `alumni` DISABLE KEYS */;
/*!40000 ALTER TABLE `alumni` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `documents`
--

DROP TABLE IF EXISTS `documents`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `documents` (
  `id` int NOT NULL AUTO_INCREMENT,
  `student_id` int DEFAULT NULL,
  `doc_type` enum('score_card','hall_ticket','offer_letter','transcript','lor','sop','passport','visa','other') DEFAULT NULL,
  `original_name` varchar(255) DEFAULT NULL,
  `file_name` varchar(255) DEFAULT NULL,
  `file_path` varchar(1024) DEFAULT NULL,
  `file_size` int DEFAULT NULL,
  `mime_type` varchar(100) DEFAULT NULL,
  `uploaded_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `student_id` (`student_id`),
  CONSTRAINT `documents_ibfk_1` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=18 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `documents`
--

LOCK TABLES `documents` WRITE;
/*!40000 ALTER TABLE `documents` DISABLE KEYS */;
INSERT INTO `documents` VALUES (1,2,'score_card','dashboard2.jpg','score_card_dashboard2.jpg','uploads\\IT_TU4F2324028_ShravaniRaut_2027\\score_card_dashboard2.jpg',150544,'image/jpeg','2026-08-20 05:01:56'),(2,3,'hall_ticket','dashboard1.png','hall_ticket_dashboard1.png','uploads\\IT_TU4F2324055_ShravaniRaut_2027\\hall_ticket_dashboard1.png',108851,'image/png','2026-08-26 06:16:31'),(3,3,'offer_letter','Certificate.pdf','offer_letter_Certificate.pdf','uploads\\IT_TU4F2324055_ShravaniRaut_2027\\offer_letter_Certificate.pdf',199386,'application/pdf','2026-08-26 06:16:31'),(4,3,'transcript','CSS-Certificate.pdf','transcript_CSS-Certificate.pdf','uploads\\IT_TU4F2324055_ShravaniRaut_2027\\transcript_CSS-Certificate.pdf',1097333,'application/pdf','2026-08-26 06:16:31'),(5,4,'score_card','Resume.pdf','score_card_Resume.pdf','uploads\\IT_TU4F2324017_TejashriBhangale_2027\\score_card_Resume.pdf',463015,'application/pdf','2026-08-26 08:27:22'),(6,5,'score_card','Resume.pdf','score_card_Resume.pdf','uploads\\IT_TU4f2324027_ShravaniRaut_2027\\score_card_Resume.pdf',463015,'application/pdf','2026-08-26 08:41:58'),(7,6,'hall_ticket','ShravaniRaut.pdf','hall_ticket_ShravaniRaut.pdf','uploads\\IT_TU4F2324011_ShravaniRaut_2027\\hall_ticket_ShravaniRaut.pdf',573814,'application/pdf','2026-08-31 07:44:46'),(8,7,'score_card','Resume.pdf','score_card_Resume.pdf','uploads\\CS_TU3F2324027_ShravaniRaut_2027\\score_card_Resume.pdf',463015,'application/pdf','2026-08-31 07:58:21'),(9,7,'offer_letter','Resume.pdf','offer_letter_Resume.pdf','uploads\\CS_TU3F2324027_ShravaniRaut_2027\\offer_letter_Resume.pdf',463015,'application/pdf','2026-08-31 07:58:21'),(10,7,'transcript','ShravaniRaut.pdf','transcript_ShravaniRaut.pdf','uploads\\CS_TU3F2324027_ShravaniRaut_2027\\transcript_ShravaniRaut.pdf',573814,'application/pdf','2026-08-31 07:58:21'),(11,9,'score_card','Resume.pdf','score_card_Resume.pdf','uploads\\IT_TU4F2324019_ganja_2025\\score_card_Resume.pdf',463015,'application/pdf','2026-09-01 18:33:01'),(12,10,'score_card','Screenshot 2026-08-23 113130.png','score_card_Screenshot 2026-08-23 113130.png','uploads\\IT_tu4f12312536_sujal_2027\\score_card_Screenshot 2026-08-23 113130.png',185832,'image/png','2026-09-03 06:12:04'),(13,11,'score_card','Screenshot 2026-09-03 005622.png','score_card_Screenshot 2026-09-03 005622.png','uploads\\IT_TU4FREYTTEB_DURVESH_2027\\score_card_Screenshot 2026-09-03 005622.png',3766,'image/png','2026-09-03 09:20:28'),(14,12,'score_card','Screenshot 2026-08-23 084018.png','score_card_Screenshot 2026-08-23 084018.png','uploads\\IT_TUF232477_TejashriBhangale_2027\\score_card_Screenshot 2026-08-23 084018.png',24721,'image/png','2026-09-03 17:45:04'),(15,13,'score_card','Screenshot 2026-08-23 084018.png','score_card_Screenshot 2026-08-23 084018.png','uploads\\IT_TU4F2324018_TejashriS_2027\\score_card_Screenshot 2026-08-23 084018.png',24721,'image/png','2026-09-03 18:44:16'),(16,14,'score_card','resume.pdf','score_card_resume.pdf','uploads\\IT_TU4F2324030_ShravaniRaut_2027\\score_card_resume.pdf',463015,'application/pdf','2026-09-03 19:03:00'),(17,15,'score_card','images.jpg','score_card_images.jpg','uploads\\IT_TU4F2425028_ShravaniRaut_2027\\score_card_images.jpg',62035,'image/jpeg','2026-09-03 19:17:43');
/*!40000 ALTER TABLE `documents` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `students`
--

DROP TABLE IF EXISTS `students`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `students` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tu4f_id` varchar(255) NOT NULL,
  `date_submitted` datetime DEFAULT CURRENT_TIMESTAMP,
  `name` varchar(255) NOT NULL,
  `department` varchar(255) NOT NULL,
  `admission_year` int NOT NULL,
  `passout_year` int NOT NULL,
  `ug_duration` varchar(50) DEFAULT NULL,
  `contact_no` varchar(50) DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL,
  `applying_for` varchar(100) DEFAULT NULL,
  `higher_education` tinyint(1) DEFAULT '1',
  `entrance_exam_appeared` tinyint(1) DEFAULT NULL,
  `entrance_exam_name` varchar(100) DEFAULT NULL,
  `entrance_exam_score` varchar(100) DEFAULT NULL,
  `country` varchar(100) DEFAULT NULL,
  `institute_admitted` varchar(255) DEFAULT NULL,
  `pg_duration` varchar(50) DEFAULT NULL,
  `pg_course` varchar(255) DEFAULT NULL,
  `drive_folder_url` varchar(1024) DEFAULT NULL,
  `status` enum('pending','partial','completed','follow_up') DEFAULT 'pending',
  `review_status` enum('unchecked','checked') DEFAULT 'unchecked',
  `notes` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `ai_score_extracted` varchar(100) DEFAULT NULL,
  `ai_verification_status` enum('unverified','verified','discrepancy_detected','manual_check_needed') DEFAULT 'unverified',
  `ai_verification_notes` text,
  PRIMARY KEY (`id`),
  UNIQUE KEY `tu4f_id` (`tu4f_id`)
) ENGINE=InnoDB AUTO_INCREMENT=16 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `students`
--

LOCK TABLES `students` WRITE;
/*!40000 ALTER TABLE `students` DISABLE KEYS */;
INSERT INTO `students` VALUES (2,'TU4F2324028','2026-08-20 10:31:56','Shravani Raut','IT',2023,2027,'4','08446565447','rshravani055@gmail.com','MS',1,1,'GATE','99','INDIA','WELINKARS','2','FINNCE',NULL,'partial','unchecked',NULL,'2026-08-20 05:01:56','2026-08-20 05:01:56',NULL,'unverified',NULL),(3,'TU4F2324055','2026-08-26 11:46:31','Shravani Raut','IT',2023,2027,'4','08446565447','rshravani055@gmail.com','MBA',1,0,'GATE',NULL,'INDIA','WELINGKARS','2','FINANCE','/uploads/IT_TU4F2324055_ShravaniRaut_2027','partial','unchecked',NULL,'2026-08-26 06:16:31','2026-08-26 06:16:31',NULL,'unverified',NULL),(4,'TU4F2324017','2026-08-26 13:57:22','Tejashri Bhangale','IT',2023,2027,'4','9823049588','bhangaleteju@gmail.com','MS',1,1,'GATE','99','Germany','Hardvard','2','AI','/uploads/IT_TU4F2324017_TejashriBhangale_2027','partial','unchecked',NULL,'2026-08-26 08:27:22','2026-08-26 08:27:22',NULL,'unverified',NULL),(5,'TU4f2324027','2026-08-26 14:11:58','Shravani Raut','IT',2023,2027,'4','08446565447','rshravani055@gmail.com','MS',1,1,'GRE','99','usa','harvard','2','cs','/uploads/IT_TU4f2324027_ShravaniRaut_2027','partial','unchecked',NULL,'2026-08-26 08:41:58','2026-08-26 08:41:58',NULL,'unverified',NULL),(6,'TU4F2324011','2026-08-31 13:14:46','Shravani Raut','IT',2023,2027,NULL,'08446565447','rshravani055@gmail.com',NULL,0,0,NULL,NULL,NULL,NULL,NULL,NULL,'/uploads/IT_TU4F2324011_ShravaniRaut_2027','pending','unchecked',NULL,'2026-08-31 07:44:46','2026-08-31 07:44:46',NULL,'unverified',NULL),(7,'TU3F2324027','2026-08-31 13:28:21','Shravani Raut','CS',2023,2027,'4','08446565447','rshravani055@gmail.com','MBA',1,1,'GATE','88','INDIA','WELINGKARS','2','IT','/uploads/CS_TU3F2324027_ShravaniRaut_2027','completed','checked',NULL,'2026-08-31 07:58:21','2026-08-31 08:00:21',NULL,'unverified',NULL),(9,'TU4F2324019','2026-09-02 00:03:01','ganja','IT',2021,2025,'4','8767876787','ganja@gmail.com','MS',1,1,'TOEFL','100','UK','Harvard ','2','IT','/uploads/IT_TU4F2324019_ganja_2025','partial','unchecked',NULL,'2026-09-01 18:33:01','2026-09-01 18:33:01',NULL,'unverified',NULL),(10,'tu4f12312536','2026-09-03 11:42:04','sujal','IT',2023,2027,'2','08446565447','sujalatkari.22@gmail.com','MTech',1,1,'GATE','99','india','dy patil','2','mtech in ai','/uploads/IT_tu4f12312536_sujal_2027','partial','unchecked',NULL,'2026-09-03 06:12:04','2026-09-03 06:12:04',NULL,'unverified',NULL),(11,'TU4FREYTTEB','2026-09-03 14:50:28','DURVESH','IT',2022,2027,'4','8549463839','durveshmurkute19@gmail.com','MTech',1,1,'GATE','99','indian','terna eng college','2','mtech in it','/uploads/IT_TU4FREYTTEB_DURVESH_2027','partial','checked',NULL,'2026-09-03 09:20:28','2026-09-03 09:22:04',NULL,'manual_check_needed','? AI Note: Scorecard uploaded. Automatic score scan flagged for manual review.'),(12,'TU$F232477','2026-09-03 23:15:04','Tejashri Bhangale','IT',2023,2027,'4','9867456777','tejashri@gmail.com',NULL,1,1,'GMAT','89','UK','Harvard',NULL,'AI','/uploads/IT_TUF232477_TejashriBhangale_2027','partial','unchecked',NULL,'2026-09-03 17:45:04','2026-09-03 17:45:04','89','verified','✅ AI Verified: Document score (89) matches entered score (89).'),(13,'TU4F2324018','2026-09-04 00:14:16','Tejashri S ','IT',2023,2027,'4','7867567846','bhangale@32','MBA',1,1,'GATE','79','USA ','Harvard ','2','IT','/uploads/IT_TU4F2324018_TejashriS_2027','partial','unchecked',NULL,'2026-09-03 18:44:16','2026-09-03 18:44:16',NULL,'manual_check_needed','? AI Note: Scorecard uploaded. Automatic score scan flagged for manual review.'),(14,'TU4F2324030','2026-09-04 00:33:00','Shravani Raut','IT',2023,2027,'4','08446565447','reenaraut2015@gmail.com','MBA',1,1,'GATE','99','India','Mumbai Uni','2','IT','/uploads/IT_TU4F2324030_ShravaniRaut_2027','partial','unchecked',NULL,'2026-09-03 19:03:00','2026-09-03 19:03:00','99','verified','✅ AI Verified: Document score (99) matches entered score (99).'),(15,'TU4F2425028','2026-09-04 00:47:41','Shravani Raut','IT',2023,2027,'4','8888888888','reenaraut2022@gmail.com','MBA',1,1,'GATE','99','India','DYPATIL','1','IT','https://drive.google.com/drive/folders/12QfHPwhxvFN7dTQJFHHgCw7E_-peyUwv','partial','unchecked',NULL,'2026-09-03 19:17:41','2026-09-03 19:17:41',NULL,'manual_check_needed','? AI Note: Scorecard uploaded. Automatic score scan flagged for manual review.');
/*!40000 ALTER TABLE `students` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-09-04 12:56:58
