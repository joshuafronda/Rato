-- A frame can bring its own photo windows (JSON [{x, y, width, height}] in the 600x1800
-- strip), detected from its see-through areas when uploaded. NULL = the layout's standard
-- holes. show_text = 0 leaves out the date and caption lines (the frame has its own text).
ALTER TABLE frames ADD COLUMN slots TEXT CHECK (slots IS NULL OR json_valid(slots));
ALTER TABLE frames ADD COLUMN show_text INTEGER NOT NULL DEFAULT 1 CHECK (show_text IN (0, 1));
