-- Fix channel ID and API key by trimming whitespace
UPDATE "SiteSetting"
SET value = TRIM(value)
WHERE key LIKE 'stream.%' AND value != TRIM(value);

-- Verify
SELECT key, value, LENGTH(value) as len
FROM "SiteSetting"
WHERE key LIKE 'stream.%';
