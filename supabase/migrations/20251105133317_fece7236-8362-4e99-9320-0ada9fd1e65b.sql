-- Insert delivery charges setting
INSERT INTO site_content (section, content)
VALUES ('settings', '{"delivery_charge": 0}')
ON CONFLICT DO NOTHING;