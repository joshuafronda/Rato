-- The strip footer reads: the date, then caption_text, then caption_line2.
INSERT INTO settings (key, value) VALUES ('caption_line2', 'JTFFC Batangas City');

-- The event's line, unless the admin already wrote a caption.
UPDATE settings SET value = 'Knowing Christ More!' WHERE key = 'caption_text' AND value = '';

-- The Classic frame's gold line moved below the new third text line. A new file name, since
-- frame files already in storage are never overwritten.
UPDATE frames SET image_path = 'starter-classic-v2.svg' WHERE image_path = 'starter-classic.svg';
