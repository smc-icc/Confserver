-- VDN speech options. Safe for legacy zero dates and repeated execution.
SET @vdn_saved_sql_mode = @@SESSION.sql_mode;
SET SESSION sql_mode = '';
SET @vdn_speech_ddl = IF(EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 't_icc_vdn' AND COLUMN_NAME = 'RealTimeSpeechRecog'), 'SELECT 1', 'ALTER TABLE t_icc_vdn ADD COLUMN RealTimeSpeechRecog int(11) NOT NULL DEFAULT 0');
PREPARE vdn_speech_stmt FROM @vdn_speech_ddl;
EXECUTE vdn_speech_stmt;
DEALLOCATE PREPARE vdn_speech_stmt;
SET @vdn_speech_ddl = IF(EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 't_icc_vdn' AND COLUMN_NAME = 'AsrEngine'), 'SELECT 1', 'ALTER TABLE t_icc_vdn ADD COLUMN AsrEngine varchar(32) NOT NULL DEFAULT ''ali''');
PREPARE vdn_speech_stmt FROM @vdn_speech_ddl;
EXECUTE vdn_speech_stmt;
DEALLOCATE PREPARE vdn_speech_stmt;
SET SESSION sql_mode = @vdn_saved_sql_mode;
