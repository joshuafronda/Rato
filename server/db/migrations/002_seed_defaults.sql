INSERT INTO layouts (name, shots, orientation) VALUES
  ('Classic duo', 2, 'vertical'),
  ('Triple strip', 3, 'vertical'),
  ('Four-shot strip', 4, 'vertical');

-- params are CSS-filter style values the composer and live preview both read.
INSERT INTO filters (name, params, is_default) VALUES
  ('Natural', '{}', 1),
  ('Soft glow', '{"brightness":1.08,"contrast":0.92,"blur":0.4}', 0),
  ('Black and white', '{"grayscale":1,"contrast":1.1}', 0),
  ('Film grain', '{"contrast":1.1,"sepia":0.15,"grain":0.25}', 0),
  ('Warm', '{"sepia":0.25,"saturate":1.2,"hueRotate":-10}', 0),
  ('Cool', '{"saturate":0.9,"hueRotate":15,"brightness":1.03}', 0),
  ('Pastel', '{"saturate":0.6,"brightness":1.12,"contrast":0.9}', 0);

INSERT INTO settings (key, value) VALUES
  ('countdown_seconds', '3'),
  ('caption_text', ''),
  ('date_format', 'MMM d, yyyy'),
  ('printer', ''),
  ('gallery_enabled', 'true'),
  ('auto_delete_days', '0');
