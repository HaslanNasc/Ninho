-- ============================================================
-- NINHO — Políticas de segurança (RLS)
-- Execute DEPOIS de schema.sql
-- Regra geral: cada pessoa vê os PRÓPRIOS registros (owner_id = auth.uid())
-- e os registros COMPARTILHADOS do seu household (shared = true e is_member()).
-- ============================================================

-- Habilita RLS em tudo
do $$ declare t text; begin
  foreach t in array array['profiles','households','household_members','household_invites',
    'accounts','debts','goals','payments','inventory_items','reforms','reform_items',
    'events','pets','pet_care','purchases']
  loop execute format('alter table %I enable row level security;', t); end loop;
end $$;

-- ---------- PERFIS ----------
create policy prof_self_all on profiles for all using (id = auth.uid()) with check (id = auth.uid());
-- Permitir ver o perfil (nome/foto) de quem divide o mesmo household
create policy prof_read_housemates on profiles for select using (
  exists(select 1 from household_members m1 join household_members m2
    on m1.household_id = m2.household_id
    where m1.profile_id = auth.uid() and m2.profile_id = profiles.id));

-- ---------- HOUSEHOLDS ----------
create policy hh_member_read on households for select using (is_member(id) or created_by = auth.uid());
create policy hh_create on households for insert with check (created_by = auth.uid());
create policy hh_update on households for update using (is_member(id));

create policy hm_read on household_members for select using (
  profile_id = auth.uid() or is_member(household_id));
create policy hm_insert on household_members for insert with check (
  profile_id = auth.uid() or is_member(household_id));
create policy hm_delete on household_members for delete using (is_member(household_id));

create policy hi_read on household_invites for select using (true);
create policy hi_insert on household_invites for insert with check (is_member(household_id));
create policy hi_update on household_invites for update using (true);

-- ---------- Macro para tabelas pessoais+compartilhadas ----------
-- (owner vê tudo seu; membros veem o que é shared)

-- accounts
create policy acc_rw on accounts for all
  using (owner_id = auth.uid() or (shared and is_member(household_id)))
  with check (owner_id = auth.uid());
-- debts
create policy debt_rw on debts for all
  using (owner_id = auth.uid() or (shared and is_member(household_id)))
  with check (owner_id = auth.uid());
-- goals
create policy goal_read on goals for select
  using (owner_id = auth.uid() or (shared and is_member(household_id)));
create policy goal_write on goals for insert with check (owner_id = auth.uid());
create policy goal_update on goals for update
  using (owner_id = auth.uid() or (shared and is_member(household_id)));
create policy goal_delete on goals for delete using (owner_id = auth.uid());
-- payments (contribuições: membros podem contribuir em caixinha compartilhada)
create policy pay_read on payments for select
  using (owner_id = auth.uid() or payer_id = auth.uid() or (shared and is_member(household_id)));
create policy pay_write on payments for insert
  with check (payer_id = auth.uid() or owner_id = auth.uid());
create policy pay_delete on payments for delete using (payer_id = auth.uid() or owner_id = auth.uid());
-- purchases
create policy pur_rw on purchases for all
  using (owner_id = auth.uid() or (shared and is_member(household_id)))
  with check (owner_id = auth.uid());

-- ---------- Tabelas compartilhadas do household ----------
create policy inv_rw on inventory_items for all
  using (is_member(household_id)) with check (is_member(household_id));
create policy reform_rw on reforms for all
  using (is_member(household_id)) with check (is_member(household_id));
create policy reformit_rw on reform_items for all
  using (exists(select 1 from reforms r where r.id = reform_id and is_member(r.household_id)))
  with check (exists(select 1 from reforms r where r.id = reform_id and is_member(r.household_id)));
create policy pet_rw on pets for all
  using (is_member(household_id)) with check (is_member(household_id));
create policy petcare_rw on pet_care for all
  using (exists(select 1 from pets p where p.id = pet_id and is_member(p.household_id)))
  with check (exists(select 1 from pets p where p.id = pet_id and is_member(p.household_id)));

-- events: pessoais (owner) + compartilhados do household
create policy ev_rw on events for all
  using (owner_id = auth.uid() or (shared and is_member(household_id)))
  with check (owner_id = auth.uid() or is_member(household_id));

-- ---------- Gatilho: cria perfil + household ao registrar ----------
create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into profiles(id, display_name, phone)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name','Usu\u00e1ria'),
          new.raw_user_meta_data->>'phone')
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function handle_new_user();

-- ---------- Storage (fotos/comprovantes) ----------
-- Crie no painel um bucket chamado 'ninho' (PUBLIC = off) e rode:
-- (as políticas abaixo liberam leitura/escrita apenas para usuários logados)
do $$ begin
  if exists (select 1 from pg_tables where schemaname='storage' and tablename='objects') then
    begin
      execute $p$create policy ninho_read on storage.objects for select to authenticated using (bucket_id = 'ninho');$p$;
    exception when duplicate_object then null; end;
    begin
      execute $p$create policy ninho_write on storage.objects for insert to authenticated with check (bucket_id = 'ninho');$p$;
    exception when duplicate_object then null; end;
  end if;
end $$;
