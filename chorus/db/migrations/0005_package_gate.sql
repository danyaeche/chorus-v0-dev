-- Chorus v0 — package-gate automation
--
-- The package is Complete when every *required* package_item is complete.
-- parts.package_state is kept in sync, and parts.part_state is nudged from
-- 'draft' -> 'package_complete' (and back) as the gate flips. This is the gate
-- that controls whether external reviewers may be invited (enforced in app +
-- below as a backstop on dfms insert).

create or replace function recompute_package_state(p_part_id uuid)
returns void as $$
declare
  v_missing integer;
  v_state package_state;
begin
  select count(*) into v_missing
  from package_items
  where part_id = p_part_id and required and not complete;

  v_state := case when v_missing = 0 then 'complete' else 'incomplete' end::package_state;

  update parts
  set package_state = v_state,
      part_state = case
        -- promote draft -> package_complete once the gate is met
        when v_state = 'complete' and part_state = 'draft' then 'package_complete'
        -- demote back if the gate breaks before any DFM activity
        when v_state = 'incomplete' and part_state = 'package_complete' then 'draft'
        else part_state
      end
  where id = p_part_id;
end;
$$ language plpgsql;

create or replace function trg_package_item_sync() returns trigger as $$
begin
  perform recompute_package_state(coalesce(new.part_id, old.part_id));
  return coalesce(new, old);
end;
$$ language plpgsql;

create trigger trg_package_items_gate
  after insert or update or delete on package_items
  for each row execute function trg_package_item_sync();

-- Backstop: a DFM (reviewer invite) cannot be created while the package gate
-- is open. The application enforces this earlier with a friendly error; this
-- guarantees the invariant at the data layer.
create or replace function trg_guard_dfm_package_gate() returns trigger as $$
declare
  v_pkg package_state;
begin
  select package_state into v_pkg from parts where id = new.part_id;
  if v_pkg <> 'complete' then
    raise exception 'Cannot invite a reviewer: part package is not Complete (part %)', new.part_id
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$ language plpgsql;

create trigger trg_dfms_package_gate
  before insert on dfms
  for each row execute function trg_guard_dfm_package_gate();
