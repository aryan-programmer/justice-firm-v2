CREATE DATABASE IF NOT EXISTS justice_firm;

USE justice_firm;

SET FOREIGN_KEY_CHECKS = 0;
DROP VIEW IF EXISTS lawyer_appointment_statistics;
DROP VIEW IF EXISTS lawyer_case_statistics;
DROP TABLE IF EXISTS user;
DROP TABLE IF EXISTS client;
DROP TABLE IF EXISTS lawyer;
DROP TABLE IF EXISTS administrator;
DROP TABLE IF EXISTS login_history;
DROP TABLE IF EXISTS case_type;
DROP TABLE IF EXISTS lawyer_specialization;
DROP TABLE IF EXISTS appointment;
DROP TABLE IF EXISTS `case`;
DROP TABLE IF EXISTS case_document;
DROP TABLE IF EXISTS `group`;
DROP TABLE IF EXISTS message;
DROP TABLE IF EXISTS user;
SET FOREIGN_KEY_CHECKS = 1;

CREATE TABLE user (
	id            INT PRIMARY KEY AUTO_INCREMENT,
	name          VARCHAR(1024)                      NOT NULL,
	email         VARCHAR(1024)                      NOT NULL UNIQUE,
	phone         VARCHAR(1024),
	address       TEXT,
	password_hash VARCHAR(2048)                      NOT NULL,
	photo_path    VARCHAR(1024),
	type          ENUM ('client', 'lawyer', 'admin') NOT NULL DEFAULT 'client',
	gender        VARCHAR(16)                        NOT NULL,
	FULLTEXT INDEX ft_name (name),
	FULLTEXT INDEX ft_email (email),
	FULLTEXT INDEX ft_address (address),
	INDEX i_type (type)
);

CREATE TABLE client (
	id INT PRIMARY KEY,
	FOREIGN KEY (id)
		REFERENCES user (id)
);

CREATE TABLE lawyer (
	id                 INT PRIMARY KEY,
	latitude           DECIMAL(6, 3) NOT NULL,
	longitude          DECIMAL(6, 3) NOT NULL,
	certification_link VARCHAR(1024) NOT NULL,
	status             ENUM ('waiting', 'rejected', 'confirmed') DEFAULT 'waiting',
	rejection_reason   VARCHAR(1024) NULL,
	FOREIGN KEY (id)
		REFERENCES user (id),
	INDEX i_status (status)
);

CREATE TABLE administrator (
	id       INT PRIMARY KEY,
	job_post VARCHAR(1024) NOT NULL,
	FOREIGN KEY (id)
		REFERENCES user (id)
);

CREATE TABLE login_history (
	id        INT PRIMARY KEY AUTO_INCREMENT,
	user_id   INT      NOT NULL,
	timestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (user_id)
		REFERENCES user (id)
);

CREATE TABLE case_type (
	id   INT PRIMARY KEY AUTO_INCREMENT,
	name VARCHAR(256) NOT NULL
);

CREATE TABLE lawyer_specialization (
	id           INT PRIMARY KEY AUTO_INCREMENT,
	lawyer_id    INT NOT NULL,
	case_type_id INT NOT NULL,
	FOREIGN KEY (lawyer_id)
		REFERENCES lawyer (id),
	FOREIGN KEY (case_type_id)
		REFERENCES case_type (id)
);

CREATE TABLE appointment (
	id          INT PRIMARY KEY AUTO_INCREMENT,
	client_id   INT                                       NOT NULL,
	lawyer_id   INT                                       NOT NULL,
	group_id    INT                                       NOT NULL,
	case_id     INT                                       NULL,
	description TEXT                                      NOT NULL,
	timestamp   DATETIME                                  NULL,
	opened_on   DATETIME                                  NOT NULL DEFAULT CURRENT_TIMESTAMP,
	status      ENUM ('waiting', 'rejected', 'confirmed') NOT NULL DEFAULT 'waiting',
	FOREIGN KEY (client_id)
		REFERENCES client (id),
	FOREIGN KEY (lawyer_id)
		REFERENCES lawyer (id),
	CONSTRAINT IfStatusConfirmedThenTimestampIsNotNullCheck CHECK ( status != 'confirmed' OR timestamp IS NOT NULL )
);

CREATE TABLE `case` (
	id          INT PRIMARY KEY AUTO_INCREMENT,
	client_id   INT                                NOT NULL,
	lawyer_id   INT                                NOT NULL,
	type_id     INT                                NOT NULL,
	group_id    INT                                NOT NULL,
	description TEXT                               NOT NULL,
	opened_on   DATETIME                           NOT NULL DEFAULT CURRENT_TIMESTAMP,
	status      ENUM ('waiting', 'open', 'closed') NOT NULL DEFAULT 'waiting',
	FOREIGN KEY (client_id)
		REFERENCES client (id),
	FOREIGN KEY (lawyer_id)
		REFERENCES lawyer (id),
	FOREIGN KEY (type_id)
		REFERENCES case_type (id)
);

CREATE TABLE case_document (
	id             INT PRIMARY KEY AUTO_INCREMENT,
	case_id        INT           NOT NULL,
	uploaded_on    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
	file_link      VARCHAR(2048) NOT NULL,
	file_mime      VARCHAR(1024) NOT NULL,
	file_name      VARCHAR(1024) NOT NULL,
	description    VARCHAR(1024) NOT NULL,
	uploaded_by_id INT           NOT NULL,
	FOREIGN KEY (case_id)
		REFERENCES `case` (id),
	FOREIGN KEY (uploaded_by_id)
		REFERENCES user (id)
);

CREATE TABLE `group` (
	id        INT PRIMARY KEY AUTO_INCREMENT,
	name      VARCHAR(1024) NOT NULL DEFAULT '',
	case_id   INT           NULL,
	client_id INT           NOT NULL,
	lawyer_id INT           NOT NULL,
	FOREIGN KEY (case_id)
		REFERENCES `case` (id),
	FOREIGN KEY (client_id)
		REFERENCES client (id),
	FOREIGN KEY (lawyer_id)
		REFERENCES lawyer (id)
);

# Moved to a NoSQL DynamoDB database.
# CREATE TABLE message (
# 	id              INT PRIMARY KEY AUTO_INCREMENT,
# 	sender_id       INT           NOT NULL,
# 	group_id        INT           NOT NULL,
# 	text            TEXT          NOT NULL,
# 	timestamp       DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
# 	attachment_link VARCHAR(1024) NULL,
# 	FOREIGN KEY (sender_id)
# 		REFERENCES user (id),
# 	FOREIGN KEY (group_id)
# 		REFERENCES `group` (id)
# );

ALTER TABLE appointment
	ADD FOREIGN KEY (group_id)
		REFERENCES `group` (id);
ALTER TABLE appointment
	ADD FOREIGN KEY (case_id)
		REFERENCES `case` (id);
ALTER TABLE `case`
	ADD FOREIGN KEY (group_id)
		REFERENCES `group` (id);

CREATE VIEW lawyer_case_statistics AS
SELECT l.id                        AS lawyer_id,
       COUNT(c.id)                 AS total_cases,
       COUNT(DISTINCT c.client_id) AS total_clients
FROM lawyer            l
LEFT OUTER JOIN `case` c ON l.id = c.lawyer_id
GROUP BY l.id;

CREATE VIEW lawyer_appointment_statistics AS
SELECT l.id        AS lawyer_id,
       COUNT(CASE
	             WHEN a.status = 'waiting' THEN a.id
             END)  AS waiting_appointments,
       COUNT(CASE
	             WHEN a.status = 'confirmed' THEN a.id
             END)  AS confirmed_appointments,
       COUNT(CASE
	             WHEN a.status = 'rejected' THEN a.id
             END)  AS rejected_appointments,
       COUNT(a.id) AS total_appointments
FROM lawyer                 l
LEFT OUTER JOIN appointment a ON l.id = a.lawyer_id
GROUP BY l.id;

INSERT INTO case_type(name)
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
