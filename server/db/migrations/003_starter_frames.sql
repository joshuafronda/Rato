-- Built-in frames so the booth works before any frame is uploaded. The files ship in
-- server/assets/frames/ and are copied into storage/frames/ at startup.
INSERT INTO frames (layout_id, name, image_path, sort_order)
SELECT id, 'Classic', 'starter-classic.svg', 1 FROM layouts WHERE orientation = 'vertical';

INSERT INTO frames (layout_id, name, image_path, sort_order)
SELECT id, 'Confetti', 'starter-confetti.svg', 2 FROM layouts WHERE orientation = 'vertical';
