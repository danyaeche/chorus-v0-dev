-- Chorus v0 — schema-validation seed (the TM-4 Bike Program, abbreviated).
--
-- Profile-referencing columns (owner_id, created_by, uploaded_by, …) are left
-- NULL because `profiles` rows must mirror Supabase-managed `auth.users`. The
-- full demo — with named brand + reviewer identities — lives in the TypeScript
-- seed (lib/db/seed.ts) that powers the running app. This file exists so the
-- migrations can be applied and exercised end-to-end against a real Postgres.

-- Fixed UUIDs for cross-references --------------------------------------------
-- org:  1, project: 1, parts: a1/a2, revisions: rA*/rB*/rC*, reviewers: v1/v2,
-- dfms: d1/d2, issues: i*, group: g1, signoffs: s1/s2.

insert into organizations (id, name, slug) values
  ('11111111-1111-1111-1111-111111111111', 'ALSO', 'also');

insert into projects (id, organization_id, name, description, status) values
  ('22222222-2222-2222-2222-222222222222',
   '11111111-1111-1111-1111-111111111111',
   'TM-4 Bike Program', 'Frame + drivetrain DFM for the TM-4 platform', 'active');

-- Parts ----------------------------------------------------------------------
insert into parts (id, organization_id, project_id, part_number, name, material,
                   finish, process, target_volume, target_cost, part_state, package_state)
values
  ('aaaaaaa1-0000-0000-0000-000000000001',
   '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222',
   'TM-4-2001', 'Battery enclosure — lower', 'PC-ABS (UL94 V-0)', 'Bead blast · matte',
   'injection_molded', 50000, 3.40, 'dfm_active', 'complete'),
  ('aaaaaaa2-0000-0000-0000-000000000002',
   '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222',
   'TM-4-1001', 'Top tube assembly', '6061-T6 Aluminum', 'Bead blast · clear anodize',
   'cnc', 5000, 4.20, 'draft', 'incomplete');

-- Revisions (battery enclosure: A, B, C) -------------------------------------
insert into part_revisions (id, part_id, rev_label, rev_index, change_summary, quote_amount) values
  ('rev00001-0000-0000-0000-00000000000a', 'aaaaaaa1-0000-0000-0000-000000000001',
   'A', 0, 'Initial package — CAD/STEP, 2D drawing, material spec, volume forecast.', 4.12),
  ('rev00001-0000-0000-0000-00000000000b', 'aaaaaaa1-0000-0000-0000-000000000001',
   'B', 1, 'Reworked parting line and relocated the gate; added ejector-pin relief.', 3.95),
  ('rev00001-0000-0000-0000-00000000000c', 'aaaaaaa1-0000-0000-0000-000000000001',
   'C', 2, 'Increased draft to 1.5 deg on the Class-A face; candidate fix for ejection.', 3.80);

update parts set current_revision_id = 'rev00001-0000-0000-0000-00000000000c'
  where id = 'aaaaaaa1-0000-0000-0000-000000000001';

-- Package items (battery enclosure — all complete; injection-molded list) -----
insert into package_items (part_id, key, label, required, complete) values
  ('aaaaaaa1-0000-0000-0000-000000000001', 'cad_step', '3D CAD / STEP', true, true),
  ('aaaaaaa1-0000-0000-0000-000000000001', 'drawing_2d_gdt', '2D Drawing with GD&T callouts', true, true),
  ('aaaaaaa1-0000-0000-0000-000000000001', 'material_spec', 'Material Spec / Approved Shortlist', true, true),
  ('aaaaaaa1-0000-0000-0000-000000000001', 'cosmetic_grades', 'Cosmetic Surface Grades', true, true),
  ('aaaaaaa1-0000-0000-0000-000000000001', 'volume_forecast', 'Volume Forecast + Initial Order Qty', true, true),
  ('aaaaaaa1-0000-0000-0000-000000000001', 'packaging_labeling', 'Packaging & Labeling Requirements', true, true),
  ('aaaaaaa1-0000-0000-0000-000000000001', 'regulatory', 'Regulatory Requirements', true, true);

-- Top tube (incomplete package: 3 of 5) --------------------------------------
insert into package_items (part_id, key, label, required, complete) values
  ('aaaaaaa2-0000-0000-0000-000000000002', 'cad_step', '3D CAD / STEP', true, true),
  ('aaaaaaa2-0000-0000-0000-000000000002', 'drawing_2d_gdt', '2D Drawing with GD&T callouts', true, true),
  ('aaaaaaa2-0000-0000-0000-000000000002', 'material_spec', 'Material Spec / Approved Shortlist', true, true),
  ('aaaaaaa2-0000-0000-0000-000000000002', 'volume_forecast', 'Volume Forecast + Initial Order Qty', true, false),
  ('aaaaaaa2-0000-0000-0000-000000000002', 'regulatory', 'Regulatory Requirements', false, false);

-- External reviewers (two providers, walled off) -----------------------------
insert into external_reviewers (id, organization_id, project_id, company, contact_name,
                                contact_email, provider_role, nda_status, confidentiality) values
  ('vvvvvvv1-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111',
   '22222222-2222-2222-2222-222222222222', 'Hsinchu Precision', 'Benjamin Chen',
   'benjamin.chen@hsinchu-precision.com', 'cm', 'signed', 'nda_required'),
  ('vvvvvvv2-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111',
   '22222222-2222-2222-2222-222222222222', 'Shenzhen Optics', 'Wei Liu',
   'wei.liu@shenzhen-optics.com', 'supplier', 'signed', 'standard');

-- Provider-specific DFMs — DIFFERENT revision pointers per provider -----------
insert into dfms (id, organization_id, project_id, part_id, external_reviewer_id,
                  provider_role, state, current_revision_id, confidential) values
  ('ddddddd1-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111',
   '22222222-2222-2222-2222-222222222222', 'aaaaaaa1-0000-0000-0000-000000000001',
   'vvvvvvv1-0000-0000-0000-000000000001', 'cm', 'awaiting_validation',
   'rev00001-0000-0000-0000-00000000000c', true),               -- Hsinchu on Rev C
  ('ddddddd2-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111',
   '22222222-2222-2222-2222-222222222222', 'aaaaaaa1-0000-0000-0000-000000000001',
   'vvvvvvv2-0000-0000-0000-000000000002', 'supplier', 'in_review',
   'rev00001-0000-0000-0000-00000000000b', true);               -- Shenzhen still on Rev B

-- Issues (per-provider; status derived by trigger) ---------------------------
insert into issues (organization_id, project_id, part_id, dfm_id, number, title, description,
                    type, category, severity, created_on_revision_id, created_by_reviewer_id,
                    recommendation, brand_decision, rejection_rationale,
                    implementation_state, implemented_in_revision_id, validation_state) values
  -- Hsinchu: insufficient draft, accepted + implemented in Rev C, awaiting validation
  ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222',
   'aaaaaaa1-0000-0000-0000-000000000001', 'ddddddd1-0000-0000-0000-000000000001',
   12, 'Insufficient draft for ejection',
   'Side walls carry only 0.5 deg draft on the textured Class-A face; risk of drag marks on ejection.',
   'show_stopper', 'geometry', 'critical', 'rev00001-0000-0000-0000-00000000000a',
   'vvvvvvv1-0000-0000-0000-000000000001', 'Open the draft to 1.5 deg on all textured faces.',
   'accepted', null, 'implemented', 'rev00001-0000-0000-0000-00000000000c', 'pending'),
  -- Hsinchu: thread callout missing, open
  ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222',
   'aaaaaaa1-0000-0000-0000-000000000001', 'ddddddd1-0000-0000-0000-000000000001',
   13, 'Boss wall thickness too thin',
   'Mounting boss walls at 1.0mm will sink; recommend coring out.',
   'finding', 'geometry', 'medium', 'rev00001-0000-0000-0000-00000000000c',
   'vvvvvvv1-0000-0000-0000-000000000001', 'Core out the boss and hold 1.5mm nominal wall.',
   null, null, 'not_started', null, 'pending'),
  -- Shenzhen: gate location conflict (same concern as #12, different provider)
  ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222',
   'aaaaaaa1-0000-0000-0000-000000000001', 'ddddddd2-0000-0000-0000-000000000002',
   14, 'Gate location drags on Class-A',
   'The current gate witness lands on the visible top face; recommend moving to the rib underside.',
   'finding', 'process', 'medium', 'rev00001-0000-0000-0000-00000000000b',
   'vvvvvvv2-0000-0000-0000-000000000002', 'Relocate gate to the underside rib, opposite the draft change.',
   null, null, 'not_started', null, 'pending');

-- Issue group (brand-side rollup of #12 + #14 with conflict flag) -------------
insert into issue_groups (id, organization_id, project_id, part_id, title, description, conflict_flag)
values ('ggggggg1-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111',
        '22222222-2222-2222-2222-222222222222', 'aaaaaaa1-0000-0000-0000-000000000001',
        'Class-A ejection / gate strategy',
        'Hsinchu wants more draft; Shenzhen wants the gate relocated. Brand must reconcile.', true);

insert into issue_group_links (issue_group_id, issue_id)
select 'ggggggg1-0000-0000-0000-000000000001', id
from issues where number in (12, 14)
  and project_id = '22222222-2222-2222-2222-222222222222';

-- Sign-offs (joint agreements) -----------------------------------------------
insert into signoffs (id, organization_id, project_id, part_id, topic, title, state, rationale) values
  ('sssssss1-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111',
   '22222222-2222-2222-2222-222222222222', 'aaaaaaa1-0000-0000-0000-000000000001',
   'parting_line', 'Parting line on the mid-flange', 'signed',
   'Agreed to run the parting line on the mid-flange to keep witness off the Class-A face.'),
  ('sssssss2-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111',
   '22222222-2222-2222-2222-222222222222', 'aaaaaaa1-0000-0000-0000-000000000001',
   'material_lock', 'Material lock — PC-ABS UL94 V-0', 'proposed', null);

insert into signoff_parties (signoff_id, party_type, external_reviewer_id, agreed) values
  ('sssssss1-0000-0000-0000-000000000001', 'reviewer', 'vvvvvvv1-0000-0000-0000-000000000001', true),
  ('sssssss2-0000-0000-0000-000000000002', 'reviewer', 'vvvvvvv1-0000-0000-0000-000000000001', false);
