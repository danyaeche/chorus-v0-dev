/**
 * Process-specific package checklists.
 *
 * The package gate (Incomplete → Complete) is computed against the *required*
 * items for a part's manufacturing process. External reviewers cannot be
 * invited until every required item is complete.
 */

import type { PartProcess } from './enums';

export interface PackageChecklistItem {
  key: string;
  label: string;
  required: boolean;
  /** Short hint shown under the item in the package panel. */
  hint?: string;
}

/**
 * Injection-molded parts — the canonical v0 checklist from the product spec.
 */
const INJECTION_MOLDED: PackageChecklistItem[] = [
  { key: 'cad_step', label: '3D CAD / STEP', required: true, hint: 'Native or STEP solid model' },
  {
    key: 'drawing_2d_gdt',
    label: '2D Drawing with GD&T callouts',
    required: true,
    hint: 'Dimensioned drawing with tolerances',
  },
  {
    key: 'material_spec',
    label: 'Material Spec / Approved Shortlist',
    required: true,
    hint: 'Resin grade or approved shortlist',
  },
  {
    key: 'cosmetic_grades',
    label: 'Cosmetic Surface Grades',
    required: true,
    hint: 'SPI / class-A surface definition',
  },
  {
    key: 'volume_forecast',
    label: 'Volume Forecast + Initial Order Qty',
    required: true,
  },
  {
    key: 'packaging_labeling',
    label: 'Packaging & Labeling Requirements',
    required: true,
  },
  {
    key: 'regulatory',
    label: 'Regulatory Requirements',
    required: true,
    hint: 'Compliance / certification needs',
  },
];

/** A leaner default used by non-injection processes until each gets its own list. */
const GENERIC: PackageChecklistItem[] = [
  { key: 'cad_step', label: '3D CAD / STEP', required: true },
  { key: 'drawing_2d_gdt', label: '2D Drawing with GD&T callouts', required: true },
  { key: 'material_spec', label: 'Material Spec / Approved Shortlist', required: true },
  { key: 'volume_forecast', label: 'Volume Forecast + Initial Order Qty', required: true },
  { key: 'regulatory', label: 'Regulatory Requirements', required: false },
];

const CHECKLISTS: Record<PartProcess, PackageChecklistItem[]> = {
  injection_molded: INJECTION_MOLDED,
  cnc: GENERIC,
  sheet_metal: GENERIC,
  cast: GENERIC,
  other: GENERIC,
};

export function packageChecklistFor(process: PartProcess): PackageChecklistItem[] {
  return CHECKLISTS[process] ?? GENERIC;
}
