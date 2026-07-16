-- Adoptly — table des rappels santé + étape "visite prévue" du pipeline
-- À exécuter une seule fois dans Supabase → SQL Editor

-- 1) Table des rappels santé (vaccin, stérilisation, vermifuge, visite véto)
create table if not exists animal_reminders (
  id          uuid primary key default gen_random_uuid(),
  animal_id   uuid not null references animals(id)  on delete cascade,
  shelter_id  uuid not null references shelters(id) on delete cascade,
  type        text not null,          -- 'vaccin' | 'sterilisation' | 'vermifuge' | 'visite'
  label       text,                   -- note libre (optionnel)
  due_date    date not null,
  done        boolean not null default false,
  created_at  timestamptz not null default now()
);
create index if not exists idx_animal_reminders_shelter on animal_reminders(shelter_id);
create index if not exists idx_animal_reminders_due      on animal_reminders(due_date);

-- 2) Étape "visite prévue" du pipeline (sans toucher au champ status contraint)
alter table matches add column if not exists pipeline_stage text;
