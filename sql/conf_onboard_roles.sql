CREATE TABLE IF NOT EXISTS t_conf_onboard_state (
  VDNID int NOT NULL PRIMARY KEY,
  StateJson longtext NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS t_conf_onboard_audit (
  ID bigint NOT NULL AUTO_INCREMENT PRIMARY KEY,
  VDNID int NOT NULL,
  Actor varchar(255) NOT NULL,
  Action varchar(64) NOT NULL,
  Outcome varchar(24) NOT NULL,
  CreatedAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_onboard_vdn (VDNID, ID)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
INSERT IGNORE INTO t_conf_onboard_state (VDNID, StateJson) VALUES (0, '{}');

-- Dedicated tenant onboarding capability; does not grant SSO global administration.
INSERT INTO t_user_power (ID, SubSystemType, Value, Name, IsSystem, GroupName)
SELECT 10000, 0, 10000, 'VDN开通管理', 0, 'VDN管理'
WHERE NOT EXISTS (SELECT 1 FROM t_user_power WHERE ID = 10000);
