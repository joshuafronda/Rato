-- Every finished strip now goes to the online gallery (the guest is told on the finish
-- screen), so the per-strip online consent from 008 is no longer used.
ALTER TABLE strips DROP COLUMN online_ok;
