-- ICC VDN hierarchy and publish-node binding
-- 1) Add ParentId to t_icc_vdn, -1 means root VDN
-- 2) Add dedicated VDN -> Node binding table for IVR publish/hot-reload

-- Preserve legacy zero dates while adding the column; restore this connection's mode afterwards.
SET @vdn_saved_sql_mode = @@SESSION.sql_mode;
SET SESSION sql_mode = '';
SET @vdn_parent_ddl = IF(
    EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE()
           AND TABLE_NAME = 't_icc_vdn' AND COLUMN_NAME = 'ParentId'),
    'SELECT 1',
    'ALTER TABLE t_icc_vdn ADD COLUMN ParentId INT NOT NULL DEFAULT -1 COMMENT ''父VDN，-1表示根节点'''
);
PREPARE vdn_parent_stmt FROM @vdn_parent_ddl;
EXECUTE vdn_parent_stmt;
DEALLOCATE PREPARE vdn_parent_stmt;
SET SESSION sql_mode = @vdn_saved_sql_mode;

CREATE TABLE IF NOT EXISTS t_icc_vdn_node_bind (
    ID INT NOT NULL,
    VDNID INT NOT NULL,
    NodeID INT NOT NULL,
    TargetType VARCHAR(32) NOT NULL DEFAULT 'IVR_ADMIN',
    Enabled TINYINT(1) NOT NULL DEFAULT 1,
    Remark VARCHAR(255) NOT NULL DEFAULT '',
    CreateTime TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UpdateTime TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (ID),
    UNIQUE KEY uk_vdn_node_target (VDNID, NodeID, TargetType),
    KEY idx_vdn_target_enabled (VDNID, TargetType, Enabled)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='VDN到发布目标节点绑定';

-- Delete guard should be handled in business logic:
-- SELECT COUNT(1) FROM t_icc_vdn WHERE ParentId = :vdnId;
