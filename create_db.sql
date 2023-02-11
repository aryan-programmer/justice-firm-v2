CREATE DATABASE IF NOT EXISTS `justice_firm`;

USE `justice_firm`;

SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS `user`;
DROP TABLE IF EXISTS `client`;
DROP TABLE IF EXISTS `lawyer`;
DROP TABLE IF EXISTS `administrator`;
DROP TABLE IF EXISTS `login_history`;
DROP TABLE IF EXISTS `case_type`;
DROP TABLE IF EXISTS `lawyer_specialization`;
DROP TABLE IF EXISTS `appointment`;
DROP TABLE IF EXISTS `case`;
DROP TABLE IF EXISTS `case_document`;
DROP TABLE IF EXISTS `group`;
DROP TABLE IF EXISTS `message`;
DROP TABLE IF EXISTS `user`;
SET FOREIGN_KEY_CHECKS = 1;

CREATE TABLE `user` (
	`id`            INT PRIMARY KEY AUTO_INCREMENT,
	`name`          VARCHAR(1024)                      NOT NULL,
	`email`         VARCHAR(1024)                      NOT NULL UNIQUE,
	`phone`         VARCHAR(1024),
	`address`       TEXT,
	`password_hash` VARCHAR(2048)                      NOT NULL,
	`photo_path`    VARCHAR(1024),
	`type`          ENUM ('client', 'lawyer', 'admin') NOT NULL DEFAULT 'client'
);

CREATE TABLE `client` (
	`id` INT PRIMARY KEY,
	FOREIGN KEY (`id`)
		REFERENCES `user` (`id`)
);

CREATE TABLE `lawyer` (
	`id`                 INT PRIMARY KEY,
	`latitude`           DECIMAL(6, 3) NOT NULL,
	`longitude`          DECIMAL(6, 3) NOT NULL,
	`certification_link` VARCHAR(1024) NOT NULL,
	`status`             ENUM ('waiting', 'rejected', 'confirmed') DEFAULT 'waiting',
	FOREIGN KEY (`id`)
		REFERENCES `user` (`id`)
);

CREATE TABLE `administrator` (
	`id`       INT PRIMARY KEY,
	`job_post` VARCHAR(1024) NOT NULL,
	FOREIGN KEY (`id`)
		REFERENCES `user` (`id`)
);

CREATE TABLE `login_history` (
	`id`        INT PRIMARY KEY AUTO_INCREMENT,
	`user_id`   INT      NOT NULL,
	`timestamp` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`user_id`)
		REFERENCES `user` (`id`)
);

CREATE TABLE `case_type` (
	`id`   INT PRIMARY KEY AUTO_INCREMENT,
	`name` VARCHAR(256) NOT NULL
);

CREATE TABLE `lawyer_specialization` (
	`id`           INT PRIMARY KEY AUTO_INCREMENT,
	`lawyer_id`    INT NOT NULL,
	`case_type_id` INT NOT NULL,
	FOREIGN KEY (`lawyer_id`)
		REFERENCES `lawyer` (`id`),
	FOREIGN KEY (`case_type_id`)
		REFERENCES `case_type` (`id`)
);

CREATE TABLE `appointment` (
	`id`          INT PRIMARY KEY AUTO_INCREMENT,
	`client_id`   INT                                       NOT NULL,
	`lawyer_id`   INT                                       NOT NULL,
	`group_id`    INT                                       NOT NULL,
	`case_id`     INT                                       NULL,
	`description` TEXT                                      NOT NULL,
	`timestamp`   DATETIME                                  NULL,
	`opened_on`   DATETIME                                  NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`status`      ENUM ('waiting', 'rejected', 'confirmed') NOT NULL DEFAULT 'waiting',
	FOREIGN KEY (`client_id`)
		REFERENCES `client` (`id`),
	FOREIGN KEY (`lawyer_id`)
		REFERENCES `lawyer` (`id`)
);

CREATE TABLE `case` (
	`id`          INT PRIMARY KEY AUTO_INCREMENT,
	`client_id`   INT                                NOT NULL,
	`lawyer_id`   INT                                NOT NULL,
	`type_id`     INT                                NOT NULL,
	`group_id`    INT                                NOT NULL,
	`description` TEXT                               NOT NULL,
	`opened_on`   DATETIME                           NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`status`      ENUM ('waiting', 'open', 'closed') NOT NULL DEFAULT 'waiting',
	FOREIGN KEY (`client_id`)
		REFERENCES `client` (`id`),
	FOREIGN KEY (`lawyer_id`)
		REFERENCES `lawyer` (`id`),
	FOREIGN KEY (`type_id`)
		REFERENCES `case_type` (`id`)
);

CREATE TABLE `case_document` (
	`id`            INT PRIMARY KEY AUTO_INCREMENT,
	`case_id`       INT           NOT NULL,
	`uploaded_on`   DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`document_link` VARCHAR(1024) NOT NULL,
	FOREIGN KEY (`case_id`)
		REFERENCES `case` (`id`)
);

CREATE TABLE `group` (
	`id`        INT PRIMARY KEY AUTO_INCREMENT,
	`case_id`   INT NULL,
	`client_id` INT NOT NULL,
	`lawyer_id` INT NOT NULL,
	FOREIGN KEY (`case_id`)
		REFERENCES `case` (`id`),
	FOREIGN KEY (`client_id`)
		REFERENCES `client` (`id`),
	FOREIGN KEY (`lawyer_id`)
		REFERENCES `lawyer` (`id`)
);

CREATE TABLE `message` (
	`id`              INT PRIMARY KEY AUTO_INCREMENT,
	`sender_id`       INT           NOT NULL,
	`group_id`        INT           NOT NULL,
	`text`            TEXT          NOT NULL,
	`timestamp`       DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`attachment_link` VARCHAR(1024) NULL,
	FOREIGN KEY (`sender_id`)
		REFERENCES `user` (`id`),
	FOREIGN KEY (`group_id`)
		REFERENCES `group` (`id`)
);

ALTER TABLE `appointment`
	ADD FOREIGN KEY (`group_id`)
		REFERENCES `group` (`id`);
ALTER TABLE `appointment`
	ADD FOREIGN KEY (`case_id`)
		REFERENCES `case` (`id`);
ALTER TABLE `case`
	ADD FOREIGN KEY (`group_id`)
		REFERENCES `group` (`id`);

INSERT INTO `case_type`(`name`)
VALUES ('Bankruptcy'),
       ('Business/Corporate'),
       ('Constitutional'),
       ('Criminal Defense'),
       ('Employment and Labor'),
       ('Entertainment'),
       ('Estate Planning'),
       ('Family'),
       ('Immigration'),
       ('Intellectual Property'),
       ('Personal Injury'),
       ('Tax');
