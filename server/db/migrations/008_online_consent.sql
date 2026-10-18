-- online_ok = 1: the guest shared this strip while the booth said it goes to the online
-- gallery. Only these strips are uploaded; strips shared before (laptop gallery only) and
-- strips an admin shows never are.
ALTER TABLE strips ADD COLUMN online_ok INTEGER NOT NULL DEFAULT 0 CHECK (online_ok IN (0, 1));
