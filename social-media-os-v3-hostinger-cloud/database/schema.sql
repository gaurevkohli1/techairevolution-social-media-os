CREATE TABLE IF NOT EXISTS settings (
  setting_key VARCHAR(128) PRIMARY KEY,
  setting_value TEXT NOT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS campaigns (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  campaign_key VARCHAR(128) NOT NULL UNIQUE,
  brand VARCHAR(128) NOT NULL DEFAULT 'TechAIrevolution',
  local_date DATE NOT NULL,
  target_publish_at_utc DATETIME NULL,
  status VARCHAR(64) NOT NULL,
  story_title TEXT NULL,
  current_attempt INT NOT NULL DEFAULT 0,
  failure_code VARCHAR(128) NULL,
  failure_detail TEXT NULL,
  result_unknown TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_campaign_date (local_date),
  INDEX idx_campaign_status (status)
);

CREATE TABLE IF NOT EXISTS campaign_events (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  campaign_id BIGINT UNSIGNED NOT NULL,
  event_type VARCHAR(128) NOT NULL,
  event_json JSON NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_event_campaign (campaign_id),
  CONSTRAINT fk_event_campaign FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS artifacts (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  campaign_id BIGINT UNSIGNED NOT NULL,
  artifact_type VARCHAR(128) NOT NULL,
  artifact_key VARCHAR(128) NOT NULL,
  payload_json JSON NULL,
  text_payload LONGTEXT NULL,
  external_url TEXT NULL,
  sha256 CHAR(64) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_campaign_artifact (campaign_id, artifact_type, artifact_key),
  CONSTRAINT fk_artifact_campaign FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS generation_jobs (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  campaign_id BIGINT UNSIGNED NOT NULL,
  slide_no INT NOT NULL,
  variant_no INT NOT NULL,
  provider VARCHAR(64) NOT NULL,
  model VARCHAR(128) NOT NULL,
  provider_request_id VARCHAR(255) NULL,
  status VARCHAR(64) NOT NULL,
  prompt LONGTEXT NOT NULL,
  result_url TEXT NULL,
  result_sha256 CHAR(64) NULL,
  error_detail TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_generation_variant (campaign_id, slide_no, variant_no),
  INDEX idx_generation_status (status),
  CONSTRAINT fk_generation_campaign FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS qa_results (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  campaign_id BIGINT UNSIGNED NOT NULL,
  qa_type VARCHAR(128) NOT NULL,
  status VARCHAR(64) NOT NULL,
  score DECIMAL(6,2) NULL,
  result_json JSON NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_qa_campaign (campaign_id),
  CONSTRAINT fk_qa_campaign FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS publish_receipts (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  campaign_id BIGINT UNSIGNED NOT NULL,
  platform VARCHAR(32) NOT NULL,
  status VARCHAR(64) NOT NULL,
  external_id VARCHAR(255) NULL,
  permalink TEXT NULL,
  request_fingerprint CHAR(64) NULL,
  receipt_json JSON NULL,
  published_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_publish_platform (campaign_id, platform),
  CONSTRAINT fk_receipt_campaign FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS analytics_snapshots (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  campaign_id BIGINT UNSIGNED NOT NULL,
  platform VARCHAR(32) NOT NULL,
  checkpoint_hours INT NOT NULL,
  snapshot_json JSON NOT NULL,
  captured_at DATETIME NOT NULL,
  UNIQUE KEY uq_analytics_checkpoint (campaign_id, platform, checkpoint_hours),
  CONSTRAINT fk_analytics_campaign FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS learning_memory (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  memory_key VARCHAR(191) NOT NULL,
  confidence DECIMAL(5,4) NOT NULL DEFAULT 0.5000,
  sample_size INT NOT NULL DEFAULT 0,
  memory_json JSON NOT NULL,
  active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_learning_key (memory_key)
);

INSERT INTO settings(setting_key, setting_value)
VALUES
  ('autopilot_enabled', 'false'),
  ('meta_write_enabled', 'false')
ON DUPLICATE KEY UPDATE setting_value = setting_value;
