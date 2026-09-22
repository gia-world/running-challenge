-- Optional free-text note on a certification (e.g. "나눠서 뛰었어요") —
-- shown in the feed like a caption, entered once at certify time.
alter table activities add column note text;
