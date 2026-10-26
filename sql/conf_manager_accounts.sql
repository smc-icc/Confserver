-- Explicit additive migration after conf_vdn_access.sql. No password or business table changes.
CREATE TABLE IF NOT EXISTS t_conf_manager_accounts (
 UID varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL PRIMARY KEY,
 Name varchar(80) NOT NULL, Company varchar(200) NOT NULL DEFAULT '',
 Phone varchar(32) CHARACTER SET ascii COLLATE ascii_bin NULL,
 Email varchar(254) CHARACTER SET ascii COLLATE ascii_general_ci NULL,
 Status enum('pending','approved','rejected','disabled') NOT NULL DEFAULT 'pending',
 PhoneVerified tinyint NOT NULL DEFAULT 0, EmailVerified tinyint NOT NULL DEFAULT 0,
 Legacy tinyint NOT NULL DEFAULT 0, ReviewVersion int NOT NULL DEFAULT 0,
 Reviewer varchar(128) NULL, ReviewNote varchar(1000) NOT NULL DEFAULT '',
 ReviewDueAt datetime NOT NULL, CreatedAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
 UpdatedAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 UNIQUE KEY uk_manager_phone (Phone), KEY idx_manager_email (Email), KEY idx_manager_review (Status, CreatedAt)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS t_conf_registration_verifications (
 ID char(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL PRIMARY KEY,
 Phone varchar(32) CHARACTER SET ascii NOT NULL, Email varchar(254) CHARACTER SET ascii NOT NULL,
 SmsHash char(64) CHARACTER SET ascii NOT NULL, EmailHash char(64) CHARACTER SET ascii NOT NULL,
 State enum('sending','ready','consumed','failed') NOT NULL,
 Attempts int NOT NULL DEFAULT 0, ExpiresAt datetime(3) NOT NULL,
 CreatedAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
 KEY idx_registration_verify_expiry (ExpiresAt)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS t_conf_registration_rate (
 Bucket char(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL PRIMARY KEY,
 Count int NOT NULL, WindowStart datetime(3) NOT NULL,
 KEY idx_registration_rate_expiry (WindowStart)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS t_conf_registration_outbox (
 ID char(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL PRIMARY KEY,
 EventKey varchar(220) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 UID varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
 Purpose enum('submitted','approved','rejected','disabled') NOT NULL,
 Channel enum('sms','email') NOT NULL, Recipient varchar(254) CHARACTER SET ascii NOT NULL,
 State enum('pending','sending','sent','failed') NOT NULL DEFAULT 'pending',
 Attempts int NOT NULL DEFAULT 0, AvailableAt datetime(3) NOT NULL,
 LeaseToken char(36) CHARACTER SET ascii NULL, LeaseUntil datetime(3) NULL,
 LastError varchar(80) NOT NULL DEFAULT '', SentAt datetime(3) NULL,
 CreatedAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
 UNIQUE KEY uk_registration_event (EventKey), KEY idx_registration_dispatch (State, AvailableAt), KEY idx_registration_recipient (UID, State)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS t_conf_manager_vdn_creations (
 UID varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
 RequestID char(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 VDNID int NOT NULL, RequestedName varchar(40) NOT NULL,
 CreatedAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
 PRIMARY KEY (UID, RequestID), UNIQUE KEY uk_manager_created_vdn (VDNID)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS t_conf_manager_vdn_projects (
 VDNID int NOT NULL PRIMARY KEY, Revision int NOT NULL, Pending tinyint NOT NULL DEFAULT 1,
 UpdatedAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS t_conf_manager_schema (
 ID tinyint NOT NULL PRIMARY KEY, Bootstrapped tinyint NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
START TRANSACTION;
INSERT INTO t_conf_onboard_state (VDNID,StateJson) VALUES (0,'{}') ON DUPLICATE KEY UPDATE VDNID=VALUES(VDNID);
SELECT VDNID FROM t_conf_onboard_state WHERE VDNID=0 FOR UPDATE;
INSERT INTO t_conf_manager_schema (ID,Bootstrapped) VALUES (1,0) ON DUPLICATE KEY UPDATE ID=VALUES(ID);
-- Existing identities are grandfathered once; future legacy grants cannot replace account review.

INSERT IGNORE INTO t_conf_manager_accounts (UID,Name,Email,Status,Legacy,ReviewDueAt)
 SELECT p.UID,p.Name,p.Email,CASE WHEN p.Enabled<>1 THEN 'disabled'
 WHEN (SELECT Bootstrapped FROM t_conf_manager_schema WHERE ID=1)=0 AND EXISTS(SELECT 1 FROM t_conf_vdn_admin_grants g JOIN t_icc_vdn v ON v.ID=g.VDNID WHERE BINARY g.UID=BINARY p.UID AND g.State='active') THEN 'approved' ELSE 'pending' END,
 1,DATE_ADD(p.CreatedAt,INTERVAL 3 DAY) FROM t_conf_access_profiles p WHERE BINARY p.UID<>BINARY 'admin';
INSERT IGNORE INTO t_conf_manager_accounts (UID,Name,Email,Status,Legacy,ReviewDueAt)
 SELECT s.uid,LEFT(s.uid,80),NULLIF(s.email,''),'approved',1,UTC_TIMESTAMP()
 FROM `db_user_system`.`t_user_info` s JOIN t_conf_vdn_admin_grants g ON BINARY s.uid=BINARY g.UID AND g.State='active'
 JOIN t_icc_vdn v ON v.ID=g.VDNID WHERE BINARY s.uid<>BINARY 'admin' AND s.password IS NOT NULL AND s.password<>'' AND (SELECT Bootstrapped FROM t_conf_manager_schema WHERE ID=1)=0;
UPDATE t_conf_manager_schema SET Bootstrapped=1 WHERE ID=1;
COMMIT;
