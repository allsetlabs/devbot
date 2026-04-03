create table commands (
  id text primary key,
  name text not null,
  description text not null,
  type text not null check (type in ('skill', 'builtin', 'command')),
  updated_at timestamptz default now()
);
