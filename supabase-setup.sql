-- Einmal im Supabase-Dashboard unter "SQL Editor" ausführen.

create table if not exists public.votes (
  id          bigint generated always as identity primary key,
  created_at  timestamptz not null default now(),
  dish_nr     integer not null check (dish_nr between 1 and 999),
  dish_name   text not null check (char_length(dish_name) <= 100),
  voter_name  text check (char_length(voter_name) <= 60),
  lang        text check (lang in ('de', 'ru'))
);

alter table public.votes enable row level security;

-- Jeder darf eine Stimme abgeben ...
drop policy if exists "anon can insert votes" on public.votes;
create policy "anon can insert votes"
  on public.votes for insert
  to anon
  with check (true);

-- ... und die Ergebnisse lesen (für results.html).
-- Wer die Ergebnisse privat halten will: diese Policy weglassen
-- und die Ergebnisse direkt im Supabase-Dashboard ansehen.
drop policy if exists "anon can read votes" on public.votes;
create policy "anon can read votes"
  on public.votes for select
  to anon
  using (true);

-- Kein update/delete für anon -> Stimmen können nicht verändert werden.
