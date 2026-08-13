# Online Voting System — MySQL Database Schema

sql
-- ============================================================
-- ONLINE VOTING SYSTEM
-- MySQL Database Schema
-- ============================================================

Create database
CREATE DATABASE IF NOT EXISTS voting_system;

USE voting_system;


-- ============================================================
-- 1. USERS
-- ============================================================

CREATE TABLE IF NOT EXISTS users (
    id INT NOT NULL AUTO_INCREMENT,
    email VARCHAR(255) NOT NULL,
    passwordHash VARCHAR(255) NOT NULL,
    role ENUM('COMMISSIONER', 'OFFICER') NOT NULL,
    isActive BOOLEAN NOT NULL DEFAULT TRUE,
    lastLoginAt DATETIME(3) NULL,
    createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updatedAt DATETIME(3) NOT NULL,
    deletedAt DATETIME(3) NULL,

    PRIMARY KEY (id),
    UNIQUE KEY users_email_key (email),
    INDEX users_email_idx (email),
    INDEX users_role_idx (role)
) ENGINE=InnoDB;


-- ============================================================
-- 2. ELECTIONS
-- ============================================================

CREATE TABLE IF NOT EXISTS elections (
    id INT NOT NULL AUTO_INCREMENT,
    name VARCHAR(200) NOT NULL,
    description TEXT NULL,
    electionType VARCHAR(100) NOT NULL,
    scheduledDate DATETIME(3) NOT NULL,
    startTime DATETIME(3) NULL,
    endTime DATETIME(3) NULL,

    status ENUM(
        'DRAFT',
        'SCHEDULED',
        'ACTIVE',
        'PAUSED',
        'CLOSED',
        'RESULTS_PUBLISHED'
    ) NOT NULL DEFAULT 'DRAFT',

    isResultPublished BOOLEAN NOT NULL DEFAULT FALSE,
    createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updatedAt DATETIME(3) NOT NULL,
    deletedAt DATETIME(3) NULL,

    PRIMARY KEY (id),
    INDEX elections_status_idx (status),
    INDEX elections_scheduledDate_idx (scheduledDate)
) ENGINE=InnoDB;


-- ============================================================
-- 3. CONSTITUENCIES
-- ============================================================

CREATE TABLE IF NOT EXISTS constituencies (
    id INT NOT NULL AUTO_INCREMENT,
    electionId INT NOT NULL,
    name VARCHAR(200) NOT NULL,
    code VARCHAR(50) NOT NULL,
    state VARCHAR(100) NOT NULL,
    district VARCHAR(100) NOT NULL,
    totalVoters INT NOT NULL DEFAULT 0,
    createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updatedAt DATETIME(3) NOT NULL,
    deletedAt DATETIME(3) NULL,

    PRIMARY KEY (id),

    UNIQUE KEY constituencies_electionId_code_key
        (electionId, code),

    INDEX constituencies_electionId_idx
        (electionId),

    CONSTRAINT constituencies_electionId_fkey
        FOREIGN KEY (electionId)
        REFERENCES elections(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
) ENGINE=InnoDB;


-- ============================================================
-- 4. POLLING STATIONS
-- ============================================================

CREATE TABLE IF NOT EXISTS polling_stations (
    id INT NOT NULL AUTO_INCREMENT,
    constituencyId INT NOT NULL,
    name VARCHAR(200) NOT NULL,
    code VARCHAR(50) NOT NULL,
    address TEXT NOT NULL,
    totalBooths INT NOT NULL DEFAULT 1,

    machineStatus ENUM(
        'IDLE',
        'ACTIVE',
        'LOCKED',
        'PAUSED',
        'CLOSED'
    ) NOT NULL DEFAULT 'IDLE',

    isPollingActive BOOLEAN NOT NULL DEFAULT FALSE,
    createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updatedAt DATETIME(3) NOT NULL,
    deletedAt DATETIME(3) NULL,

    PRIMARY KEY (id),

    UNIQUE KEY polling_stations_constituencyId_code_key
        (constituencyId, code),

    INDEX polling_stations_constituencyId_idx
        (constituencyId),

    CONSTRAINT polling_stations_constituencyId_fkey
        FOREIGN KEY (constituencyId)
        REFERENCES constituencies(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
) ENGINE=InnoDB;


-- ============================================================
-- 5. ELECTION COMMISSIONERS
-- ============================================================

CREATE TABLE IF NOT EXISTS election_commissioners (
    id INT NOT NULL AUTO_INCREMENT,
    userId INT NOT NULL,
    fullName VARCHAR(150) NOT NULL,
    employeeId VARCHAR(50) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    designation VARCHAR(100) NOT NULL,
    createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updatedAt DATETIME(3) NOT NULL,

    PRIMARY KEY (id),

    UNIQUE KEY election_commissioners_userId_key
        (userId),

    UNIQUE KEY election_commissioners_employeeId_key
        (employeeId),

    INDEX election_commissioners_userId_idx
        (userId),

    CONSTRAINT election_commissioners_userId_fkey
        FOREIGN KEY (userId)
        REFERENCES users(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
) ENGINE=InnoDB;


-- ============================================================
-- 6. ELECTION OFFICERS
-- ============================================================

CREATE TABLE IF NOT EXISTS election_officers (
    id INT NOT NULL AUTO_INCREMENT,
    userId INT NOT NULL,
    fullName VARCHAR(150) NOT NULL,
    employeeId VARCHAR(50) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    pollingStationId INT NULL,
    createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updatedAt DATETIME(3) NOT NULL,
    deletedAt DATETIME(3) NULL,

    PRIMARY KEY (id),

    UNIQUE KEY election_officers_userId_key
        (userId),

    UNIQUE KEY election_officers_employeeId_key
        (employeeId),

    INDEX election_officers_userId_idx
        (userId),

    INDEX election_officers_pollingStationId_idx
        (pollingStationId),

    CONSTRAINT election_officers_userId_fkey
        FOREIGN KEY (userId)
        REFERENCES users(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,

    CONSTRAINT election_officers_pollingStationId_fkey
        FOREIGN KEY (pollingStationId)
        REFERENCES polling_stations(id)
        ON DELETE SET NULL
        ON UPDATE CASCADE
) ENGINE=InnoDB;


-- ============================================================
-- 7. POLITICAL PARTIES
-- ============================================================

CREATE TABLE IF NOT EXISTS political_parties (
    id INT NOT NULL AUTO_INCREMENT,
    name VARCHAR(200) NOT NULL,
    abbreviation VARCHAR(20) NOT NULL,
    symbol VARCHAR(255) NULL,
    symbolUrl VARCHAR(500) NULL,
    color VARCHAR(7) NOT NULL DEFAULT '#1a73e8',
    foundedYear INT NULL,
    isActive BOOLEAN NOT NULL DEFAULT TRUE,
    createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updatedAt DATETIME(3) NOT NULL,
    deletedAt DATETIME(3) NULL,

    PRIMARY KEY (id),

    INDEX political_parties_name_idx
        (name)
) ENGINE=InnoDB;


-- ============================================================
-- 8. CANDIDATES
-- ============================================================

CREATE TABLE IF NOT EXISTS candidates (
    id INT NOT NULL AUTO_INCREMENT,
    constituencyId INT NOT NULL,
    partyId INT NULL,
    fullName VARCHAR(150) NOT NULL,
    photoUrl VARCHAR(500) NULL,
    age INT NOT NULL,
    qualification VARCHAR(200) NULL,
    serialNumber INT NOT NULL,
    isIndependent BOOLEAN NOT NULL DEFAULT FALSE,
    isActive BOOLEAN NOT NULL DEFAULT TRUE,
    createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updatedAt DATETIME(3) NOT NULL,
    deletedAt DATETIME(3) NULL,

    PRIMARY KEY (id),

    INDEX candidates_constituencyId_idx
        (constituencyId),

    INDEX candidates_partyId_idx
        (partyId),

    CONSTRAINT candidates_constituencyId_fkey
        FOREIGN KEY (constituencyId)
        REFERENCES constituencies(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,

    CONSTRAINT candidates_partyId_fkey
        FOREIGN KEY (partyId)
        REFERENCES political_parties(id)
        ON DELETE SET NULL
        ON UPDATE CASCADE
) ENGINE=InnoDB;


-- ============================================================
-- 9. VOTERS
-- ============================================================

CREATE TABLE IF NOT EXISTS voters (
    id INT NOT NULL AUTO_INCREMENT,
    constituencyId INT NOT NULL,
    pollingStationId INT NOT NULL,
    fullName VARCHAR(150) NOT NULL,
    voterId VARCHAR(50) NOT NULL,
    aadhaarHash VARCHAR(64) NULL,
    dateOfBirth DATETIME(3) NOT NULL,
    gender VARCHAR(10) NOT NULL,
    address TEXT NOT NULL,
    phone VARCHAR(20) NULL,
    photoUrl VARCHAR(500) NULL,
    serialNumber INT NOT NULL,
    hasVoted BOOLEAN NOT NULL DEFAULT FALSE,
    votedAt DATETIME(3) NULL,
    isActive BOOLEAN NOT NULL DEFAULT TRUE,
    createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updatedAt DATETIME(3) NOT NULL,
    deletedAt DATETIME(3) NULL,

    PRIMARY KEY (id),

    UNIQUE KEY voters_voterId_key
        (voterId),

    INDEX voters_voterId_idx
        (voterId),

    INDEX voters_constituencyId_idx
        (constituencyId),

    INDEX voters_pollingStationId_idx
        (pollingStationId),

    INDEX voters_hasVoted_idx
        (hasVoted),

    CONSTRAINT voters_constituencyId_fkey
        FOREIGN KEY (constituencyId)
        REFERENCES constituencies(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,

    CONSTRAINT voters_pollingStationId_fkey
        FOREIGN KEY (pollingStationId)
        REFERENCES polling_stations(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
) ENGINE=InnoDB;


-- ============================================================
-- 10. VOTES
-- ============================================================

CREATE TABLE IF NOT EXISTS votes (
    id INT NOT NULL AUTO_INCREMENT,
    voterId INT NOT NULL,
    candidateId INT NOT NULL,
    pollingStationId INT NOT NULL,
    voteHash VARCHAR(64) NOT NULL,
    referenceNumber VARCHAR(50) NOT NULL,
    isVerified BOOLEAN NOT NULL DEFAULT FALSE,
    castAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (id),

    UNIQUE KEY votes_voterId_key
        (voterId),

    UNIQUE KEY votes_voteHash_key
        (voteHash),

    UNIQUE KEY votes_referenceNumber_key
        (referenceNumber),

    INDEX votes_candidateId_idx
        (candidateId),

    INDEX votes_pollingStationId_idx
        (pollingStationId),

    INDEX votes_castAt_idx
        (castAt),

    CONSTRAINT votes_voterId_fkey
        FOREIGN KEY (voterId)
        REFERENCES voters(id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,

    CONSTRAINT votes_candidateId_fkey
        FOREIGN KEY (candidateId)
        REFERENCES candidates(id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,

    CONSTRAINT votes_pollingStationId_fkey
        FOREIGN KEY (pollingStationId)
        REFERENCES polling_stations(id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE
) ENGINE=InnoDB;


-- ============================================================
-- 11. DIGITAL VVPAT
-- ============================================================

CREATE TABLE IF NOT EXISTS digital_vvpat (
    id INT NOT NULL AUTO_INCREMENT,
    voteId INT NOT NULL,
    candidateId INT NOT NULL,
    candidateName VARCHAR(150) NOT NULL,
    partyName VARCHAR(200) NOT NULL,
    partySymbolUrl VARCHAR(500) NULL,
    electionName VARCHAR(200) NOT NULL,
    referenceNumber VARCHAR(50) NOT NULL,
    voteHash VARCHAR(64) NOT NULL,
    timestamp DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (id),

    UNIQUE KEY digital_vvpat_voteId_key
        (voteId),

    INDEX digital_vvpat_voteId_idx
        (voteId),

    INDEX digital_vvpat_candidateId_idx
        (candidateId),

    CONSTRAINT digital_vvpat_voteId_fkey
        FOREIGN KEY (voteId)
        REFERENCES votes(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,

    CONSTRAINT digital_vvpat_candidateId_fkey
        FOREIGN KEY (candidateId)
        REFERENCES candidates(id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE
) ENGINE=InnoDB;


-- ============================================================
-- 12. OTP VERIFICATIONS
-- ============================================================

CREATE TABLE IF NOT EXISTS otp_verifications (
    id INT NOT NULL AUTO_INCREMENT,
    voterId INT NOT NULL,
    otp VARCHAR(6) NOT NULL,

    method ENUM(
        'AADHAAR',
        'VOTER_ID'
    ) NOT NULL,

    status ENUM(
        'PENDING',
        'VERIFIED',
        'FAILED'
    ) NOT NULL DEFAULT 'PENDING',

    expiresAt DATETIME(3) NOT NULL,
    verifiedAt DATETIME(3) NULL,
    createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (id),

    INDEX otp_verifications_voterId_idx
        (voterId),

    INDEX otp_verifications_otp_idx
        (otp),

    CONSTRAINT otp_verifications_voterId_fkey
        FOREIGN KEY (voterId)
        REFERENCES voters(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
) ENGINE=InnoDB;


-- ============================================================
-- 13. AUDIT LOGS
-- ============================================================

CREATE TABLE IF NOT EXISTS audit_logs (
    id INT NOT NULL AUTO_INCREMENT,
    userId INT NULL,
    electionId INT NULL,

    action ENUM(
        'LOGIN',
        'LOGOUT',
        'CREATE',
        'UPDATE',
        'DELETE',
        'VOTE_CAST',
        'VERIFY_VOTER',
        'LOCK_MACHINE',
        'UNLOCK_MACHINE',
        'PAUSE_POLLING',
        'RESUME_POLLING',
        'CLOSE_POLLING',
        'PUBLISH_RESULTS',
        'BACKUP',
        'RESTORE',
        'EXPORT'
    ) NOT NULL,

    module VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    ipAddress VARCHAR(45) NULL,
    userAgent VARCHAR(500) NULL,
    metadata JSON NULL,
    createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (id),

    INDEX audit_logs_userId_idx
        (userId),

    INDEX audit_logs_electionId_idx
        (electionId),

    INDEX audit_logs_action_idx
        (action),

    INDEX audit_logs_createdAt_idx
        (createdAt),

    CONSTRAINT audit_logs_userId_fkey
        FOREIGN KEY (userId)
        REFERENCES users(id)
        ON DELETE SET NULL
        ON UPDATE CASCADE,

    CONSTRAINT audit_logs_electionId_fkey
        FOREIGN KEY (electionId)
        REFERENCES elections(id)
        ON DELETE SET NULL
        ON UPDATE CASCADE
) ENGINE=InnoDB;


-- ============================================================
-- 14. LOGIN LOGS
-- ============================================================

CREATE TABLE IF NOT EXISTS login_logs (
    id INT NOT NULL AUTO_INCREMENT,
    userId INT NOT NULL,
    ipAddress VARCHAR(45) NOT NULL,
    userAgent VARCHAR(500) NULL,
    success BOOLEAN NOT NULL,
    createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (id),

    INDEX login_logs_userId_idx
        (userId),

    INDEX login_logs_createdAt_idx
        (createdAt),

    CONSTRAINT login_logs_userId_fkey
        FOREIGN KEY (userId)
        REFERENCES users(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
) ENGINE=InnoDB;


-- ============================================================
-- 15. NOTIFICATIONS
-- ============================================================

CREATE TABLE IF NOT EXISTS notifications (
    id INT NOT NULL AUTO_INCREMENT,
    electionId INT NULL,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) NOT NULL DEFAULT 'info',
    isRead BOOLEAN NOT NULL DEFAULT FALSE,
    createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (id),

    INDEX notifications_electionId_idx
        (electionId),

    INDEX notifications_isRead_idx
        (isRead),

    CONSTRAINT notifications_electionId_fkey
        FOREIGN KEY (electionId)
        REFERENCES elections(id)
        ON DELETE SET NULL
        ON UPDATE CASCADE
) ENGINE=InnoDB;


-- ============================================================
-- 16. SETTINGS
-- ============================================================

CREATE TABLE IF NOT EXISTS settings (
    id INT NOT NULL AUTO_INCREMENT,
    `key` VARCHAR(100) NOT NULL,
    `value` TEXT NOT NULL,
    `group` VARCHAR(50) NOT NULL DEFAULT 'general',
    label VARCHAR(200) NOT NULL,
    updatedAt DATETIME(3) NOT NULL,

    PRIMARY KEY (id),

    UNIQUE KEY settings_key_key
        (`key`),

    INDEX settings_key_idx
        (`key`),

    INDEX settings_group_idx
        (`group`)
) ENGINE=InnoDB;


-- ============================================================
-- END OF DATABASE SCHEMA
-- ============================================================
