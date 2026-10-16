-- ==============================================================================
-- SMART EVM: ONLINE VOTING SYSTEM
-- COMPLETE MYSQL DATABASE DEFINITION AND SEED DATA SCRIPT
-- Database Engine: MySQL 8.0 / 9.x (InnoDB Engine)
-- Charset: utf8mb4 | Collation: utf8mb4_unicode_ci
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 0. DATABASE CREATION AND ENVIRONMENT SETUP
-- ------------------------------------------------------------------------------
CREATE DATABASE IF NOT EXISTS `voting_system`
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE `voting_system`;

SET FOREIGN_KEY_CHECKS = 0;
SET SQL_MODE = 'NO_AUTO_VALUE_ON_ZERO';
SET time_zone = '+00:00';

-- Drop existing tables to ensure clean recreation if executed repeatedly
DROP TABLE IF EXISTS `digital_vvpat`;
DROP TABLE IF EXISTS `votes`;
DROP TABLE IF EXISTS `otp_verifications`;
DROP TABLE IF EXISTS `election_voter_status`;
DROP TABLE IF EXISTS `voters`;
DROP TABLE IF EXISTS `candidates`;
DROP TABLE IF EXISTS `election_constituencies`;
DROP TABLE IF EXISTS `notifications`;
DROP TABLE IF EXISTS `audit_logs`;
DROP TABLE IF EXISTS `elections`;
DROP TABLE IF EXISTS `election_officers`;
DROP TABLE IF EXISTS `polling_stations`;
DROP TABLE IF EXISTS `constituencies`;
DROP TABLE IF EXISTS `regions`;
DROP TABLE IF EXISTS `login_logs`;
DROP TABLE IF EXISTS `election_commissioners`;
DROP TABLE IF EXISTS `users`;
DROP TABLE IF EXISTS `political_parties`;
DROP TABLE IF EXISTS `settings`;

SET FOREIGN_KEY_CHECKS = 1;

-- ==============================================================================
-- 1. AUTHENTICATION & USER MANAGEMENT TABLES
-- ==============================================================================

-- Table 1: users
CREATE TABLE `users` (
    `id` INT NOT NULL AUTO_INCREMENT,
    `email` VARCHAR(255) NOT NULL,
    `passwordHash` VARCHAR(255) NOT NULL,
    `role` ENUM('COMMISSIONER', 'OFFICER') NOT NULL,
    `isActive` TINYINT(1) NOT NULL DEFAULT 1,
    `lastLoginAt` DATETIME NULL,
    `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `deletedAt` DATETIME NULL,
    PRIMARY KEY (`id`),
    UNIQUE KEY `users_email_key` (`email`),
    INDEX `ix_users_email` (`email`),
    INDEX `ix_users_role` (`role`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table 2: election_commissioners
CREATE TABLE `election_commissioners` (
    `id` INT NOT NULL AUTO_INCREMENT,
    `userId` INT NOT NULL,
    `fullName` VARCHAR(150) NOT NULL,
    `employeeId` VARCHAR(50) NOT NULL,
    `phone` VARCHAR(20) NOT NULL,
    `designation` VARCHAR(100) NOT NULL,
    `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `election_commissioners_userId_key` (`userId`),
    UNIQUE KEY `election_commissioners_employeeId_key` (`employeeId`),
    INDEX `ix_election_commissioners_userId` (`userId`),
    CONSTRAINT `fk_election_commissioners_userId`
        FOREIGN KEY (`userId`) REFERENCES `users` (`id`)
        ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table 3: login_logs
CREATE TABLE `login_logs` (
    `id` INT NOT NULL AUTO_INCREMENT,
    `userId` INT NOT NULL,
    `ipAddress` VARCHAR(45) NOT NULL,
    `userAgent` VARCHAR(500) NULL,
    `success` TINYINT(1) NOT NULL,
    `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    INDEX `ix_login_logs_userId` (`userId`),
    INDEX `ix_login_logs_createdAt` (`createdAt`),
    CONSTRAINT `fk_login_logs_userId`
        FOREIGN KEY (`userId`) REFERENCES `users` (`id`)
        ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==============================================================================
-- 2. GEOGRAPHICAL & ELECTORAL HIERARCHY TABLES
-- ==============================================================================

-- Table 4: regions
CREATE TABLE `regions` (
    `id` INT NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(150) NOT NULL,
    `code` VARCHAR(50) NOT NULL,
    `description` TEXT NULL,
    `isActive` TINYINT(1) NOT NULL DEFAULT 1,
    `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `deletedAt` DATETIME NULL,
    PRIMARY KEY (`id`),
    UNIQUE KEY `regions_name_key` (`name`),
    UNIQUE KEY `regions_code_key` (`code`),
    INDEX `ix_regions_code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table 5: constituencies
CREATE TABLE `constituencies` (
    `id` INT NOT NULL AUTO_INCREMENT,
    `regionId` INT NOT NULL,
    `name` VARCHAR(200) NOT NULL,
    `code` VARCHAR(50) NOT NULL,
    `description` TEXT NULL,
    `isActive` TINYINT(1) NOT NULL DEFAULT 1,
    `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `deletedAt` DATETIME NULL,
    PRIMARY KEY (`id`),
    UNIQUE KEY `constituencies_code_key` (`code`),
    INDEX `ix_constituencies_regionId` (`regionId`),
    INDEX `ix_constituencies_code` (`code`),
    CONSTRAINT `fk_constituencies_regionId`
        FOREIGN KEY (`regionId`) REFERENCES `regions` (`id`)
        ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table 6: polling_stations
CREATE TABLE `polling_stations` (
    `id` INT NOT NULL AUTO_INCREMENT,
    `constituencyId` INT NOT NULL,
    `name` VARCHAR(200) NOT NULL,
    `code` VARCHAR(50) NOT NULL,
    `address` TEXT NOT NULL,
    `capacity` INT NOT NULL DEFAULT 1000,
    `totalBooths` INT NOT NULL DEFAULT 1,
    `machineStatus` ENUM('IDLE', 'ACTIVE', 'LOCKED', 'PAUSED', 'CLOSED') NOT NULL DEFAULT 'IDLE',
    `isPollingActive` TINYINT(1) NOT NULL DEFAULT 0,
    `isActive` TINYINT(1) NOT NULL DEFAULT 1,
    `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `deletedAt` DATETIME NULL,
    PRIMARY KEY (`id`),
    UNIQUE KEY `polling_stations_code_key` (`code`),
    INDEX `ix_polling_stations_constituencyId` (`constituencyId`),
    CONSTRAINT `fk_polling_stations_constituencyId`
        FOREIGN KEY (`constituencyId`) REFERENCES `constituencies` (`id`)
        ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table 7: election_officers
CREATE TABLE `election_officers` (
    `id` INT NOT NULL AUTO_INCREMENT,
    `userId` INT NOT NULL,
    `fullName` VARCHAR(150) NOT NULL,
    `employeeId` VARCHAR(50) NOT NULL,
    `phone` VARCHAR(20) NOT NULL,
    `pollingStationId` INT NULL,
    `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `deletedAt` DATETIME NULL,
    PRIMARY KEY (`id`),
    UNIQUE KEY `election_officers_userId_key` (`userId`),
    UNIQUE KEY `election_officers_employeeId_key` (`employeeId`),
    INDEX `ix_election_officers_userId` (`userId`),
    INDEX `ix_election_officers_pollingStationId` (`pollingStationId`),
    CONSTRAINT `fk_election_officers_userId`
        FOREIGN KEY (`userId`) REFERENCES `users` (`id`)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `fk_election_officers_pollingStationId`
        FOREIGN KEY (`pollingStationId`) REFERENCES `polling_stations` (`id`)
        ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==============================================================================
-- 3. ELECTIONS & CONSTITUENCY LINKAGE
-- ==============================================================================

-- Table 8: elections
CREATE TABLE `elections` (
    `id` INT NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(200) NOT NULL,
    `description` TEXT NULL,
    `electionType` VARCHAR(100) NOT NULL,
    `scheduledDate` DATETIME NOT NULL,
    `startTime` DATETIME NULL,
    `endTime` DATETIME NULL,
    `status` ENUM('DRAFT', 'SCHEDULED', 'ACTIVE', 'PAUSED', 'CLOSED', 'RESULTS_PUBLISHED') NOT NULL DEFAULT 'DRAFT',
    `isResultPublished` TINYINT(1) NOT NULL DEFAULT 0,
    `officerId` INT NULL,
    `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `deletedAt` DATETIME NULL,
    PRIMARY KEY (`id`),
    INDEX `ix_elections_status` (`status`),
    INDEX `ix_elections_scheduledDate` (`scheduledDate`),
    INDEX `ix_elections_officerId` (`officerId`),
    CONSTRAINT `fk_elections_officerId`
        FOREIGN KEY (`officerId`) REFERENCES `election_officers` (`id`)
        ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table 9: election_constituencies
CREATE TABLE `election_constituencies` (
    `id` INT NOT NULL AUTO_INCREMENT,
    `electionId` INT NOT NULL,
    `constituencyId` INT NOT NULL,
    `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `election_constituencies_electionId_constituencyId_key` (`electionId`, `constituencyId`),
    INDEX `ix_election_constituencies_electionId` (`electionId`),
    INDEX `ix_election_constituencies_constituencyId` (`constituencyId`),
    CONSTRAINT `fk_election_constituencies_electionId`
        FOREIGN KEY (`electionId`) REFERENCES `elections` (`id`)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `fk_election_constituencies_constituencyId`
        FOREIGN KEY (`constituencyId`) REFERENCES `constituencies` (`id`)
        ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==============================================================================
-- 4. POLITICAL PARTIES & CANDIDATES
-- ==============================================================================

-- Table 10: political_parties
CREATE TABLE `political_parties` (
    `id` INT NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(200) NOT NULL,
    `abbreviation` VARCHAR(20) NOT NULL,
    `symbol` VARCHAR(255) NULL,
    `symbolUrl` VARCHAR(500) NULL,
    `color` VARCHAR(7) NOT NULL DEFAULT '#1a73e8',
    `foundedYear` INT NULL,
    `isActive` TINYINT(1) NOT NULL DEFAULT 1,
    `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `deletedAt` DATETIME NULL,
    PRIMARY KEY (`id`),
    INDEX `ix_political_parties_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table 11: candidates
CREATE TABLE `candidates` (
    `id` INT NOT NULL AUTO_INCREMENT,
    `electionId` INT NOT NULL,
    `constituencyId` INT NOT NULL,
    `partyId` INT NULL,
    `fullName` VARCHAR(150) NOT NULL,
    `photoUrl` VARCHAR(500) NULL,
    `age` INT NOT NULL,
    `qualification` VARCHAR(200) NULL,
    `serialNumber` INT NOT NULL,
    `isIndependent` TINYINT(1) NOT NULL DEFAULT 0,
    `isActive` TINYINT(1) NOT NULL DEFAULT 1,
    `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `deletedAt` DATETIME NULL,
    PRIMARY KEY (`id`),
    UNIQUE KEY `candidates_electionId_constituencyId_serialNumber_key` (`electionId`, `constituencyId`, `serialNumber`),
    INDEX `ix_candidates_electionId` (`electionId`),
    INDEX `ix_candidates_constituencyId` (`constituencyId`),
    INDEX `ix_candidates_partyId` (`partyId`),
    CONSTRAINT `fk_candidates_electionId`
        FOREIGN KEY (`electionId`) REFERENCES `elections` (`id`)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `fk_candidates_constituencyId`
        FOREIGN KEY (`constituencyId`) REFERENCES `constituencies` (`id`)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT `fk_candidates_partyId`
        FOREIGN KEY (`partyId`) REFERENCES `political_parties` (`id`)
        ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==============================================================================
-- 5. ELECTORAL ROLL & VOTER PARTICIPATION
-- ==============================================================================

-- Table 12: voters
CREATE TABLE `voters` (
    `id` INT NOT NULL AUTO_INCREMENT,
    `constituencyId` INT NOT NULL,
    `pollingStationId` INT NOT NULL,
    `fullName` VARCHAR(150) NOT NULL,
    `voterId` VARCHAR(50) NOT NULL,
    `aadhaarHash` VARCHAR(64) NULL,
    `dateOfBirth` DATETIME NOT NULL,
    `gender` VARCHAR(10) NOT NULL,
    `address` TEXT NOT NULL,
    `phone` VARCHAR(20) NULL,
    `photoUrl` VARCHAR(500) NULL,
    `faceData` LONGTEXT NULL,
    `serialNumber` INT NOT NULL,
    `isActive` TINYINT(1) NOT NULL DEFAULT 1,
    `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `deletedAt` DATETIME NULL,
    PRIMARY KEY (`id`),
    UNIQUE KEY `voters_voterId_key` (`voterId`),
    UNIQUE KEY `voters_aadhaarHash_key` (`aadhaarHash`),
    INDEX `ix_voters_voterId` (`voterId`),
    INDEX `ix_voters_aadhaarHash` (`aadhaarHash`),
    INDEX `ix_voters_constituencyId` (`constituencyId`),
    INDEX `ix_voters_pollingStationId` (`pollingStationId`),
    CONSTRAINT `fk_voters_constituencyId`
        FOREIGN KEY (`constituencyId`) REFERENCES `constituencies` (`id`)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT `fk_voters_pollingStationId`
        FOREIGN KEY (`pollingStationId`) REFERENCES `polling_stations` (`id`)
        ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table 13: election_voter_status
CREATE TABLE `election_voter_status` (
    `id` INT NOT NULL AUTO_INCREMENT,
    `voterId` INT NOT NULL,
    `electionId` INT NOT NULL,
    `hasVoted` TINYINT(1) NOT NULL DEFAULT 0,
    `votedAt` DATETIME NULL,
    PRIMARY KEY (`id`),
    UNIQUE KEY `election_voter_status_voterId_electionId_key` (`voterId`, `electionId`),
    INDEX `ix_election_voter_status_voterId` (`voterId`),
    INDEX `ix_election_voter_status_electionId` (`electionId`),
    CONSTRAINT `fk_election_voter_status_voterId`
        FOREIGN KEY (`voterId`) REFERENCES `voters` (`id`)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `fk_election_voter_status_electionId`
        FOREIGN KEY (`electionId`) REFERENCES `elections` (`id`)
        ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table 14: otp_verifications
CREATE TABLE `otp_verifications` (
    `id` INT NOT NULL AUTO_INCREMENT,
    `voterId` INT NOT NULL,
    `otp` VARCHAR(6) NOT NULL,
    `method` ENUM('AADHAAR', 'VOTER_ID') NOT NULL,
    `status` ENUM('PENDING', 'VERIFIED', 'FAILED') NOT NULL DEFAULT 'PENDING',
    `expiresAt` DATETIME NOT NULL,
    `verifiedAt` DATETIME NULL,
    `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    INDEX `ix_otp_verifications_voterId` (`voterId`),
    INDEX `ix_otp_verifications_otp` (`otp`),
    CONSTRAINT `fk_otp_verifications_voterId`
        FOREIGN KEY (`voterId`) REFERENCES `voters` (`id`)
        ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==============================================================================
-- 6. CRYPTOGRAPHIC BALLOTS & DIGITAL VVPAT
-- ==============================================================================

-- Table 15: votes
CREATE TABLE `votes` (
    `id` INT NOT NULL AUTO_INCREMENT,
    `voterId` INT NOT NULL,
    `electionId` INT NOT NULL,
    `candidateId` INT NOT NULL,
    `pollingStationId` INT NOT NULL,
    `voteHash` VARCHAR(64) NOT NULL,
    `referenceNumber` VARCHAR(50) NOT NULL,
    `isVerified` TINYINT(1) NOT NULL DEFAULT 0,
    `castAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `votes_voterId_electionId_key` (`voterId`, `electionId`),
    UNIQUE KEY `votes_voteHash_key` (`voteHash`),
    UNIQUE KEY `votes_referenceNumber_key` (`referenceNumber`),
    INDEX `ix_votes_castAt` (`castAt`),
    INDEX `ix_votes_electionId` (`electionId`),
    INDEX `ix_votes_candidateId` (`candidateId`),
    INDEX `ix_votes_pollingStationId` (`pollingStationId`),
    CONSTRAINT `fk_votes_voterId`
        FOREIGN KEY (`voterId`) REFERENCES `voters` (`id`)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT `fk_votes_electionId`
        FOREIGN KEY (`electionId`) REFERENCES `elections` (`id`)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT `fk_votes_candidateId`
        FOREIGN KEY (`candidateId`) REFERENCES `candidates` (`id`)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT `fk_votes_pollingStationId`
        FOREIGN KEY (`pollingStationId`) REFERENCES `polling_stations` (`id`)
        ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table 16: digital_vvpat
CREATE TABLE `digital_vvpat` (
    `id` INT NOT NULL AUTO_INCREMENT,
    `voteId` INT NOT NULL,
    `candidateId` INT NOT NULL,
    `candidateName` VARCHAR(150) NOT NULL,
    `partyName` VARCHAR(200) NOT NULL,
    `partySymbolUrl` VARCHAR(500) NULL,
    `electionName` VARCHAR(200) NOT NULL,
    `referenceNumber` VARCHAR(50) NOT NULL,
    `voteHash` VARCHAR(64) NOT NULL,
    `timestamp` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `digital_vvpat_voteId_key` (`voteId`),
    INDEX `ix_digital_vvpat_voteId` (`voteId`),
    INDEX `ix_digital_vvpat_candidateId` (`candidateId`),
    CONSTRAINT `fk_digital_vvpat_voteId`
        FOREIGN KEY (`voteId`) REFERENCES `votes` (`id`)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `fk_digital_vvpat_candidateId`
        FOREIGN KEY (`candidateId`) REFERENCES `candidates` (`id`)
        ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==============================================================================
-- 7. SYSTEM AUDITING, ALERTS & CONFIGURATION
-- ==============================================================================

-- Table 17: audit_logs
CREATE TABLE `audit_logs` (
    `id` INT NOT NULL AUTO_INCREMENT,
    `userId` INT NULL,
    `electionId` INT NULL,
    `action` ENUM(
        'LOGIN', 'LOGOUT', 'CREATE', 'UPDATE', 'DELETE',
        'VOTE_CAST', 'VERIFY_VOTER', 'LOCK_MACHINE', 'UNLOCK_MACHINE',
        'PAUSE_POLLING', 'RESUME_POLLING', 'CLOSE_POLLING',
        'PUBLISH_RESULTS', 'BACKUP', 'RESTORE', 'EXPORT'
    ) NOT NULL,
    `module` VARCHAR(100) NOT NULL,
    `description` TEXT NOT NULL,
    `ipAddress` VARCHAR(45) NULL,
    `userAgent` VARCHAR(500) NULL,
    `metadata` JSON NULL,
    `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    INDEX `ix_audit_logs_userId` (`userId`),
    INDEX `ix_audit_logs_electionId` (`electionId`),
    INDEX `ix_audit_logs_action` (`action`),
    INDEX `ix_audit_logs_createdAt` (`createdAt`),
    CONSTRAINT `fk_audit_logs_userId`
        FOREIGN KEY (`userId`) REFERENCES `users` (`id`)
        ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT `fk_audit_logs_electionId`
        FOREIGN KEY (`electionId`) REFERENCES `elections` (`id`)
        ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table 18: notifications
CREATE TABLE `notifications` (
    `id` INT NOT NULL AUTO_INCREMENT,
    `electionId` INT NULL,
    `title` VARCHAR(200) NOT NULL,
    `message` TEXT NOT NULL,
    `type` VARCHAR(50) NOT NULL DEFAULT 'info',
    `isRead` TINYINT(1) NOT NULL DEFAULT 0,
    `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    INDEX `ix_notifications_electionId` (`electionId`),
    INDEX `ix_notifications_isRead` (`isRead`),
    CONSTRAINT `fk_notifications_electionId`
        FOREIGN KEY (`electionId`) REFERENCES `elections` (`id`)
        ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table 19: settings
CREATE TABLE `settings` (
    `id` INT NOT NULL AUTO_INCREMENT,
    `key` VARCHAR(100) NOT NULL,
    `value` TEXT NOT NULL,
    `group` VARCHAR(50) NOT NULL DEFAULT 'general',
    `label` VARCHAR(200) NOT NULL,
    `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `settings_key_key` (`key`),
    INDEX `ix_settings_key` (`key`),
    INDEX `ix_settings_group` (`group`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ==============================================================================
-- 8. INITIAL BASELINE SEED DATA
-- ==============================================================================

-- 8.1 System Settings
INSERT INTO `settings` (`key`, `value`, `group`, `label`) VALUES
('app_name', 'Smart EVM – Online Voting System', 'general', 'Application Name'),
('app_logo', '', 'general', 'Application Logo URL'),
('otp_expiry_minutes', '5', 'security', 'OTP Expiry (minutes)'),
('session_timeout_minutes', '480', 'security', 'Session Timeout (minutes)'),
('vvpat_display_seconds', '7', 'voting', 'VVPAT Display Duration (seconds)'),
('max_login_attempts', '5', 'security', 'Max Login Attempts');

-- 8.2 Chief Election Commissioner Admin Account (Password: Admin@12345)
INSERT INTO `users` (`id`, `email`, `passwordHash`, `role`, `isActive`) VALUES
(1, 'commissioner@evm.gov.in', '$2b$12$kX43uW.zY0pUdvLNqi06O.fufXmX13Q9nUWnJJmWD/QGG/MwmtfxW', 'COMMISSIONER', 1);

INSERT INTO `election_commissioners` (`id`, `userId`, `fullName`, `employeeId`, `phone`, `designation`) VALUES
(1, 1, 'Chief Election Commissioner', 'ECI-0001', '+91-9000000001', 'Chief Election Commissioner');

-- 8.3 Geographical Regions
INSERT INTO `regions` (`id`, `name`, `code`, `description`, `isActive`) VALUES
(1, 'National Capital Territory of Delhi', 'REG-DL', 'Delhi NCT Region', 1);

-- 8.4 Constituencies
INSERT INTO `constituencies` (`id`, `regionId`, `name`, `code`, `description`, `isActive`) VALUES
(1, 1, 'Central Delhi', 'DL-01', 'Central Delhi Parliamentary Constituency', 1);

-- 8.5 Polling Stations
INSERT INTO `polling_stations` (`id`, `constituencyId`, `name`, `code`, `address`, `capacity`, `totalBooths`, `machineStatus`, `isPollingActive`, `isActive`) VALUES
(1, 1, 'Government Primary School – Booth 1', 'PS-DL-001', '12, Rajendra Prasad Road, New Delhi – 110001', 1000, 1, 'IDLE', 0, 1);

-- 8.6 Polling Station Officer Account (Password: Officer@12345)
INSERT INTO `users` (`id`, `email`, `passwordHash`, `role`, `isActive`) VALUES
(2, 'officer1@evm.gov.in', '$2b$12$J2.fN.e/wNa./koD7IvHT.Y5LZt3NKksLkPjMS4lxk5XlU1pAe2tu', 'OFFICER', 1);

INSERT INTO `election_officers` (`id`, `userId`, `fullName`, `employeeId`, `phone`, `pollingStationId`) VALUES
(1, 2, 'Rajesh Kumar Singh', 'EO-DL-001', '+91-9000000002', 1);

-- 8.7 Elections
INSERT INTO `elections` (`id`, `name`, `description`, `electionType`, `scheduledDate`, `status`, `isResultPublished`, `officerId`) VALUES
(1, 'General Elections 2025', 'Indian General Elections – Lok Sabha 2025', 'General', '2025-04-15 08:00:00', 'DRAFT', 0, 1);

-- 8.8 Election Constituency Linkage
INSERT INTO `election_constituencies` (`id`, `electionId`, `constituencyId`) VALUES
(1, 1, 1);

-- 8.9 Political Parties
INSERT INTO `political_parties` (`id`, `name`, `abbreviation`, `symbol`, `color`, `foundedYear`, `isActive`) VALUES
(1, 'National Democratic Alliance', 'NDA', 'Lotus', '#FF6B35', 1998, 1),
(2, 'United Progressive Alliance', 'UPA', 'Hand', '#2196F3', 2004, 1),
(3, 'People\'s Progressive Party', 'PPP', 'Rising Sun', '#4CAF50', 2010, 1);

-- 8.10 Candidates
INSERT INTO `candidates` (`id`, `electionId`, `constituencyId`, `partyId`, `fullName`, `age`, `qualification`, `serialNumber`, `isIndependent`, `isActive`) VALUES
(1, 1, 1, 1, 'Amit Sharma', 52, 'MBA', 1, 0, 1),
(2, 1, 1, 2, 'Priya Malhotra', 45, 'LLB', 2, 0, 1),
(3, 1, 1, 3, 'Suresh Patel', 58, 'B.Com', 3, 0, 1),
(4, 1, 1, NULL, 'Independent Candidate', 40, 'Graduate', 4, 1, 1);

-- 8.11 Sample Voters (Eligible for Biometric EVM Simulation)
INSERT INTO `voters` (`id`, `constituencyId`, `pollingStationId`, `fullName`, `voterId`, `aadhaarHash`, `dateOfBirth`, `gender`, `address`, `phone`, `serialNumber`, `isActive`) VALUES
(1, 1, 1, 'Aarav Sharma', 'DL/01/001/0001', 'hash_000000000001', '1990-05-14 00:00:00', 'Male', '12/A, Rajendra Prasad Road, New Delhi', '+91-9000000001', 1, 1),
(2, 1, 1, 'Diya Patel', 'DL/01/001/0002', 'hash_000000000002', '1994-08-22 00:00:00', 'Female', '14/B, Rajendra Prasad Road, New Delhi', '+91-9000000002', 2, 1),
(3, 1, 1, 'Rohan Gupta', 'DL/01/001/0003', 'hash_000000000003', '1988-11-03 00:00:00', 'Male', '18, Connaught Place, New Delhi', '+91-9000000003', 3, 1),
(4, 1, 1, 'Priya Singh', 'DL/01/001/0004', 'hash_000000000004', '1996-01-30 00:00:00', 'Female', '22, Barakhamba Road, New Delhi', '+91-9000000004', 4, 1);

-- 8.12 Initial System Audit Log
INSERT INTO `audit_logs` (`userId`, `electionId`, `action`, `module`, `description`, `ipAddress`) VALUES
(1, 1, 'CREATE', 'System', 'Smart EVM schema generated and seeded with baseline administrative and electoral records.', '127.0.0.1');

-- ==============================================================================
-- 9. USEFUL ANALYTICAL & OPERATIONAL QUERIES
-- ==============================================================================

-- [Query 1]: Live Voter Turnout Statistics per Polling Station
-- SELECT 
--     ps.id AS stationId,
--     ps.name AS stationName,
--     ps.code AS stationCode,
--     ps.machineStatus,
--     COUNT(DISTINCT v.id) AS registeredVoters,
--     COUNT(DISTINCT vt.id) AS votesCast,
--     ROUND((COUNT(DISTINCT vt.id) / NULLIF(COUNT(DISTINCT v.id), 0)) * 100, 2) AS turnoutPercentage
-- FROM polling_stations ps
-- LEFT JOIN voters v ON v.pollingStationId = ps.id
-- LEFT JOIN votes vt ON vt.pollingStationId = ps.id
-- GROUP BY ps.id, ps.name, ps.code, ps.machineStatus;

-- [Query 2]: Real-Time Election Results Breakdown by Candidate & Party
-- SELECT 
--     c.id AS candidateId,
--     c.serialNumber,
--     c.fullName AS candidateName,
--     COALESCE(p.name, 'Independent') AS partyName,
--     COALESCE(p.symbol, 'N/A') AS symbol,
--     COUNT(v.id) AS totalVotes,
--     ROUND(COUNT(v.id) * 100.0 / NULLIF((SELECT COUNT(*) FROM votes WHERE electionId = 1), 0), 2) AS voteSharePercent
-- FROM candidates c
-- LEFT JOIN political_parties p ON c.partyId = p.id
-- LEFT JOIN votes v ON v.candidateId = c.id AND v.electionId = 1
-- WHERE c.electionId = 1
-- GROUP BY c.id, c.serialNumber, c.fullName, p.name, p.symbol
-- ORDER BY totalVotes DESC;
