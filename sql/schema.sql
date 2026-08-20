-- State table for the Supabase backend (STATE_BACKEND=supabase).
-- Stores the keys of items already delivered, so digests never repeat news.
create table if not exists sent_items (
  item_key text primary key,
  sent_at  timestamptz not null default now()
);

-- loadSeen() pulls the most recent keys ordered by sent_at; this index keeps
-- that query cheap as the table grows.
create index if not exists sent_items_sent_at_idx on sent_items (sent_at desc);
