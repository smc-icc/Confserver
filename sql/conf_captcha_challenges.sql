-- Additive bootstrap for the shared login/VDN portal captcha store.
-- Apply to the ICC catalog used by ConfServer's db_smcicc connection.
-- If absent, the application creates this table before first use (CREATE permission required).
-- Pre-apply this migration to run with only SELECT/INSERT/DELETE privileges.
CREATE TABLE IF NOT EXISTS t_conf_captcha_challenges (
  ChallengeID char(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL PRIMARY KEY,
  AnswerHash char(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  ExpiresAt datetime(3) NOT NULL,
  KEY idx_captcha_expiry (ExpiresAt)
) ENGINE=InnoDB DEFAULT CHARSET=ascii;
