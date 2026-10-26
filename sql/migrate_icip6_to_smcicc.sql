-- Migrate ICC business catalog to smcicc (run after mysqldump import).
-- Usage:
--   1. CREATE DATABASE smcicc ...
--   2. mysqldump ICC | mysql smcicc
--   3. mysql smcicc < migrate_smcicc_to_smcicc.sql

-- Update ODBC records that still point at the old catalog name.
UPDATE t_icc_cfg_odbc SET DBName = 'smcicc' WHERE DBName = 'ICC';
