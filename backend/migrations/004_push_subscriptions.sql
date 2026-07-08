-- Notifications push (Web Push) — abonnements des appareils
create table if not exists push_subscriptions (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null,
  role         text not null,               -- 'adoptant' | 'shelter' | 'foster'
  endpoint     text not null unique,        -- identifiant unique de l'appareil
  subscription jsonb not null,              -- objet PushSubscription complet
  created_at   timestamptz default now()
);

create index if not exists idx_push_user on push_subscriptions (user_id, role);
