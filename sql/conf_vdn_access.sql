-- Run explicitly against the ICC MySQL schema after conf_onboard_roles.sql.
-- PREREQUISITE: t_icc_vdn must already use InnoDB. ensureSchema checks it
-- before any writes. Engine conversion requires a separate operator backup and
-- explicit ALTER, preserving live columns, charset and SQL-mode requirements.
-- SSO directory is read only. If deployed on a different catalog, substitute
-- `db_user_system`.`t_user_info` with that catalog's t_user_info before executing.
-- DDL is additive; the grant backfill is serialized and transactional. Rerunning
-- never replaces direct/request grants or explicit revocation tombstones.
CREATE TABLE IF NOT EXISTS t_conf_access_profiles (
  UID varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL PRIMARY KEY,
  Name varchar(80) NOT NULL,
  Email varchar(254) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,
  Enabled tinyint NOT NULL DEFAULT 1,
  VerificationStatus enum('pending','admin_verified') NOT NULL DEFAULT 'pending',
  CreatedAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UpdatedAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_access_profile_email (Email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS t_conf_vdn_access_requests (
  ID char(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL PRIMARY KEY,
  UID varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  Kind enum('existing','new') NOT NULL,
  TargetVDN int DEFAULT NULL,
  ProposedName varchar(40) NOT NULL DEFAULT '',
  Organization varchar(200) NOT NULL,
  Reason varchar(2000) NOT NULL,
  Status enum('pending','approved','rejected','withdrawn') NOT NULL DEFAULT 'pending',
  Reviewer varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  ReviewNote varchar(1000) NOT NULL DEFAULT '',
  ResultVDN int DEFAULT NULL,
  ProjectionPending tinyint NOT NULL DEFAULT 0,
  CreatedAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UpdatedAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_access_requests_owner (UID, Status, CreatedAt),
  KEY idx_access_requests_review (Status, CreatedAt)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS t_conf_vdn_admin_grants (
  UID varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  VDNID int NOT NULL,
  State enum('active','revoked') NOT NULL,
  Source enum('request','direct','legacy') NOT NULL,
  GrantedBy varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  IdentityVerified tinyint NOT NULL DEFAULT 0,
  CreatedAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UpdatedAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (UID, VDNID),
  KEY idx_access_grants_vdn (VDNID, State)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS t_conf_vdn_access_audit (
  ID bigint NOT NULL AUTO_INCREMENT PRIMARY KEY,
  Actor varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  Action varchar(40) NOT NULL,
  TargetUID varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  VDNID int DEFAULT NULL,
  RequestID char(36) CHARACTER SET ascii COLLATE ascii_bin DEFAULT NULL,
  Outcome varchar(24) NOT NULL,
  Method varchar(40) DEFAULT NULL,
  CreatedAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_access_audit_target (TargetUID, ID),
  KEY idx_access_audit_request (RequestID)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS t_conf_onboard_state (
  VDNID int NOT NULL PRIMARY KEY,
  StateJson longtext NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
START TRANSACTION;
INSERT INTO t_conf_onboard_state (VDNID, StateJson) VALUES (0, '{}')
  ON DUPLICATE KEY UPDATE VDNID = VALUES(VDNID);
SELECT VDNID FROM t_conf_onboard_state WHERE VDNID = 0 FOR UPDATE;
-- The small sequence lets SQL reproduce encodeURIComponent(WorkNO), including
-- non-ASCII or reserved bytes. Never grant a stale/reassigned work-number UID.
CREATE TEMPORARY TABLE conf_access_seed_candidates AS
SELECT DISTINCT s.uid AS UID, u.VDNID, u.ID AS SourceID, u.WorkNO
FROM `db_user_system`.`t_user_info` s
JOIN t_user_users u ON BINARY SUBSTRING_INDEX(s.uid, ':', 3) =
  BINARY CONCAT('conf-vdn:', u.VDNID, ':', u.ID)
JOIN t_icc_vdn v ON v.ID = u.VDNID AND v.ID > 0
JOIN t_user_grantpower g ON g.VDNID = v.ID AND g.PowerId = 10000 AND g.IsOwn = 1
WHERE u.IsValid = 1 AND s.password IS NOT NULL AND s.password <> '' AND (
  (g.OwnerType = 3 AND g.OwnerId = u.ID)
  OR (g.OwnerType = 1 AND EXISTS (SELECT 1 FROM t_user_usertorole r
    WHERE r.VDNID = v.ID AND r.UserID = u.ID AND r.RoleID = g.OwnerId))
  OR (g.OwnerType = 2 AND EXISTS (SELECT 1 FROM t_user_usertodepart d
    WHERE d.VDNID = v.ID AND d.UserID = u.ID AND d.departid = g.OwnerId))
);
INSERT INTO t_conf_vdn_admin_grants (UID, VDNID, State, Source, GrantedBy, IdentityVerified)
SELECT c.UID, c.VDNID, 'active', 'legacy', 'admin', 0
FROM conf_access_seed_candidates c
JOIN (SELECT a.n + b.n * 10 + d.n * 100 + 1 AS n
  FROM (SELECT 0 n UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4
    UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) a
  CROSS JOIN (SELECT 0 n UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4
    UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) b
  CROSS JOIN (SELECT 0 n UNION ALL SELECT 1) d) seq
  ON seq.n <= OCTET_LENGTH(c.WorkNO)
GROUP BY c.UID, c.VDNID, c.SourceID, c.WorkNO
HAVING BINARY c.UID = BINARY CONCAT('conf-vdn:', c.VDNID, ':', c.SourceID, ':',
  GROUP_CONCAT(CASE
    WHEN ORD(SUBSTRING(CAST(c.WorkNO AS BINARY), seq.n, 1)) BETWEEN 48 AND 57
      OR ORD(SUBSTRING(CAST(c.WorkNO AS BINARY), seq.n, 1)) BETWEEN 65 AND 90
      OR ORD(SUBSTRING(CAST(c.WorkNO AS BINARY), seq.n, 1)) BETWEEN 97 AND 122
      OR ORD(SUBSTRING(CAST(c.WorkNO AS BINARY), seq.n, 1)) IN (33,39,40,41,42,45,46,95,126)
    THEN CONVERT(SUBSTRING(CAST(c.WorkNO AS BINARY), seq.n, 1) USING utf8mb4)
    ELSE CONCAT('%', HEX(SUBSTRING(CAST(c.WorkNO AS BINARY), seq.n, 1))) END ORDER BY seq.n SEPARATOR ''))
ON DUPLICATE KEY UPDATE UID = t_conf_vdn_admin_grants.UID;
DROP TEMPORARY TABLE conf_access_seed_candidates;
COMMIT;
