-- Fix SiteSettings sequence that was out of sync
-- This causes "Unique constraint failed on the fields: (`id`)" error when creating new records
SELECT setval('public."SiteSettings_id_seq"', (SELECT MAX(id) FROM public."SiteSettings") + 1);
