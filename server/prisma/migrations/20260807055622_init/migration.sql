-- CreateTable
CREATE TABLE `users` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `email` VARCHAR(255) NOT NULL,
    `passwordHash` VARCHAR(255) NOT NULL,
    `role` ENUM('COMMISSIONER', 'OFFICER') NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `lastLoginAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,

    UNIQUE INDEX `users_email_key`(`email`),
    INDEX `users_email_idx`(`email`),
    INDEX `users_role_idx`(`role`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `election_commissioners` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `fullName` VARCHAR(150) NOT NULL,
    `employeeId` VARCHAR(50) NOT NULL,
    `phone` VARCHAR(20) NOT NULL,
    `designation` VARCHAR(100) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `election_commissioners_userId_key`(`userId`),
    UNIQUE INDEX `election_commissioners_employeeId_key`(`employeeId`),
    INDEX `election_commissioners_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `election_officers` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `fullName` VARCHAR(150) NOT NULL,
    `employeeId` VARCHAR(50) NOT NULL,
    `phone` VARCHAR(20) NOT NULL,
    `pollingStationId` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,

    UNIQUE INDEX `election_officers_userId_key`(`userId`),
    UNIQUE INDEX `election_officers_employeeId_key`(`employeeId`),
    INDEX `election_officers_userId_idx`(`userId`),
    INDEX `election_officers_pollingStationId_idx`(`pollingStationId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `elections` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(200) NOT NULL,
    `description` TEXT NULL,
    `electionType` VARCHAR(100) NOT NULL,
    `scheduledDate` DATETIME(3) NOT NULL,
    `startTime` DATETIME(3) NULL,
    `endTime` DATETIME(3) NULL,
    `status` ENUM('DRAFT', 'SCHEDULED', 'ACTIVE', 'PAUSED', 'CLOSED', 'RESULTS_PUBLISHED') NOT NULL DEFAULT 'DRAFT',
    `isResultPublished` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,

    INDEX `elections_status_idx`(`status`),
    INDEX `elections_scheduledDate_idx`(`scheduledDate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `constituencies` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `electionId` INTEGER NOT NULL,
    `name` VARCHAR(200) NOT NULL,
    `code` VARCHAR(50) NOT NULL,
    `state` VARCHAR(100) NOT NULL,
    `district` VARCHAR(100) NOT NULL,
    `totalVoters` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,

    INDEX `constituencies_electionId_idx`(`electionId`),
    UNIQUE INDEX `constituencies_electionId_code_key`(`electionId`, `code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `polling_stations` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `constituencyId` INTEGER NOT NULL,
    `name` VARCHAR(200) NOT NULL,
    `code` VARCHAR(50) NOT NULL,
    `address` TEXT NOT NULL,
    `totalBooths` INTEGER NOT NULL DEFAULT 1,
    `machineStatus` ENUM('IDLE', 'ACTIVE', 'LOCKED', 'PAUSED', 'CLOSED') NOT NULL DEFAULT 'IDLE',
    `isPollingActive` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,

    INDEX `polling_stations_constituencyId_idx`(`constituencyId`),
    UNIQUE INDEX `polling_stations_constituencyId_code_key`(`constituencyId`, `code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `political_parties` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(200) NOT NULL,
    `abbreviation` VARCHAR(20) NOT NULL,
    `symbol` VARCHAR(255) NULL,
    `symbolUrl` VARCHAR(500) NULL,
    `color` VARCHAR(7) NOT NULL DEFAULT '#1a73e8',
    `foundedYear` INTEGER NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,

    INDEX `political_parties_name_idx`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `candidates` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `constituencyId` INTEGER NOT NULL,
    `partyId` INTEGER NULL,
    `fullName` VARCHAR(150) NOT NULL,
    `photoUrl` VARCHAR(500) NULL,
    `age` INTEGER NOT NULL,
    `qualification` VARCHAR(200) NULL,
    `serialNumber` INTEGER NOT NULL,
    `isIndependent` BOOLEAN NOT NULL DEFAULT false,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,

    INDEX `candidates_constituencyId_idx`(`constituencyId`),
    INDEX `candidates_partyId_idx`(`partyId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `voters` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `constituencyId` INTEGER NOT NULL,
    `pollingStationId` INTEGER NOT NULL,
    `fullName` VARCHAR(150) NOT NULL,
    `voterId` VARCHAR(50) NOT NULL,
    `aadhaarHash` VARCHAR(64) NULL,
    `dateOfBirth` DATETIME(3) NOT NULL,
    `gender` VARCHAR(10) NOT NULL,
    `address` TEXT NOT NULL,
    `phone` VARCHAR(20) NULL,
    `photoUrl` VARCHAR(500) NULL,
    `serialNumber` INTEGER NOT NULL,
    `hasVoted` BOOLEAN NOT NULL DEFAULT false,
    `votedAt` DATETIME(3) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,

    UNIQUE INDEX `voters_voterId_key`(`voterId`),
    INDEX `voters_voterId_idx`(`voterId`),
    INDEX `voters_constituencyId_idx`(`constituencyId`),
    INDEX `voters_pollingStationId_idx`(`pollingStationId`),
    INDEX `voters_hasVoted_idx`(`hasVoted`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `votes` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `voterId` INTEGER NOT NULL,
    `candidateId` INTEGER NOT NULL,
    `pollingStationId` INTEGER NOT NULL,
    `voteHash` VARCHAR(64) NOT NULL,
    `referenceNumber` VARCHAR(50) NOT NULL,
    `isVerified` BOOLEAN NOT NULL DEFAULT false,
    `castAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `votes_voterId_key`(`voterId`),
    UNIQUE INDEX `votes_voteHash_key`(`voteHash`),
    UNIQUE INDEX `votes_referenceNumber_key`(`referenceNumber`),
    INDEX `votes_candidateId_idx`(`candidateId`),
    INDEX `votes_pollingStationId_idx`(`pollingStationId`),
    INDEX `votes_castAt_idx`(`castAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `digital_vvpat` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `voteId` INTEGER NOT NULL,
    `candidateId` INTEGER NOT NULL,
    `candidateName` VARCHAR(150) NOT NULL,
    `partyName` VARCHAR(200) NOT NULL,
    `partySymbolUrl` VARCHAR(500) NULL,
    `electionName` VARCHAR(200) NOT NULL,
    `referenceNumber` VARCHAR(50) NOT NULL,
    `voteHash` VARCHAR(64) NOT NULL,
    `timestamp` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `digital_vvpat_voteId_key`(`voteId`),
    INDEX `digital_vvpat_voteId_idx`(`voteId`),
    INDEX `digital_vvpat_candidateId_idx`(`candidateId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `otp_verifications` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `voterId` INTEGER NOT NULL,
    `otp` VARCHAR(6) NOT NULL,
    `method` ENUM('AADHAAR', 'VOTER_ID') NOT NULL,
    `status` ENUM('PENDING', 'VERIFIED', 'FAILED') NOT NULL DEFAULT 'PENDING',
    `expiresAt` DATETIME(3) NOT NULL,
    `verifiedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `otp_verifications_voterId_idx`(`voterId`),
    INDEX `otp_verifications_otp_idx`(`otp`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `audit_logs` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NULL,
    `electionId` INTEGER NULL,
    `action` ENUM('LOGIN', 'LOGOUT', 'CREATE', 'UPDATE', 'DELETE', 'VOTE_CAST', 'VERIFY_VOTER', 'LOCK_MACHINE', 'UNLOCK_MACHINE', 'PAUSE_POLLING', 'RESUME_POLLING', 'CLOSE_POLLING', 'PUBLISH_RESULTS', 'BACKUP', 'RESTORE', 'EXPORT') NOT NULL,
    `module` VARCHAR(100) NOT NULL,
    `description` TEXT NOT NULL,
    `ipAddress` VARCHAR(45) NULL,
    `userAgent` VARCHAR(500) NULL,
    `metadata` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `audit_logs_userId_idx`(`userId`),
    INDEX `audit_logs_electionId_idx`(`electionId`),
    INDEX `audit_logs_action_idx`(`action`),
    INDEX `audit_logs_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `login_logs` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `ipAddress` VARCHAR(45) NOT NULL,
    `userAgent` VARCHAR(500) NULL,
    `success` BOOLEAN NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `login_logs_userId_idx`(`userId`),
    INDEX `login_logs_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `notifications` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `electionId` INTEGER NULL,
    `title` VARCHAR(200) NOT NULL,
    `message` TEXT NOT NULL,
    `type` VARCHAR(50) NOT NULL DEFAULT 'info',
    `isRead` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `notifications_electionId_idx`(`electionId`),
    INDEX `notifications_isRead_idx`(`isRead`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `settings` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `key` VARCHAR(100) NOT NULL,
    `value` TEXT NOT NULL,
    `group` VARCHAR(50) NOT NULL DEFAULT 'general',
    `label` VARCHAR(200) NOT NULL,
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `settings_key_key`(`key`),
    INDEX `settings_key_idx`(`key`),
    INDEX `settings_group_idx`(`group`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `election_commissioners` ADD CONSTRAINT `election_commissioners_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `election_officers` ADD CONSTRAINT `election_officers_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `election_officers` ADD CONSTRAINT `election_officers_pollingStationId_fkey` FOREIGN KEY (`pollingStationId`) REFERENCES `polling_stations`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `constituencies` ADD CONSTRAINT `constituencies_electionId_fkey` FOREIGN KEY (`electionId`) REFERENCES `elections`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `polling_stations` ADD CONSTRAINT `polling_stations_constituencyId_fkey` FOREIGN KEY (`constituencyId`) REFERENCES `constituencies`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `candidates` ADD CONSTRAINT `candidates_constituencyId_fkey` FOREIGN KEY (`constituencyId`) REFERENCES `constituencies`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `candidates` ADD CONSTRAINT `candidates_partyId_fkey` FOREIGN KEY (`partyId`) REFERENCES `political_parties`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `voters` ADD CONSTRAINT `voters_constituencyId_fkey` FOREIGN KEY (`constituencyId`) REFERENCES `constituencies`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `voters` ADD CONSTRAINT `voters_pollingStationId_fkey` FOREIGN KEY (`pollingStationId`) REFERENCES `polling_stations`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `votes` ADD CONSTRAINT `votes_voterId_fkey` FOREIGN KEY (`voterId`) REFERENCES `voters`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `votes` ADD CONSTRAINT `votes_candidateId_fkey` FOREIGN KEY (`candidateId`) REFERENCES `candidates`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `votes` ADD CONSTRAINT `votes_pollingStationId_fkey` FOREIGN KEY (`pollingStationId`) REFERENCES `polling_stations`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `digital_vvpat` ADD CONSTRAINT `digital_vvpat_voteId_fkey` FOREIGN KEY (`voteId`) REFERENCES `votes`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `digital_vvpat` ADD CONSTRAINT `digital_vvpat_candidateId_fkey` FOREIGN KEY (`candidateId`) REFERENCES `candidates`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `otp_verifications` ADD CONSTRAINT `otp_verifications_voterId_fkey` FOREIGN KEY (`voterId`) REFERENCES `voters`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `audit_logs` ADD CONSTRAINT `audit_logs_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `audit_logs` ADD CONSTRAINT `audit_logs_electionId_fkey` FOREIGN KEY (`electionId`) REFERENCES `elections`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `login_logs` ADD CONSTRAINT `login_logs_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `notifications` ADD CONSTRAINT `notifications_electionId_fkey` FOREIGN KEY (`electionId`) REFERENCES `elections`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
