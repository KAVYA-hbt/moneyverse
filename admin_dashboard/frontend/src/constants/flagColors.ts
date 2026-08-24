import type { FlagKind } from '../types/api';

// Single source of truth for FlagKind -> color mapping. Import this everywhere
// a flag/badge is rendered instead of re-declaring the mapping locally.
//
// Two visual weights are provided because the wireframes use flags in two
// places with different emphasis: a compact pill (tables, header rows) and a
// bolder "chip" (the RM quick-scan view's flag row). Both derive from the
// same semantic kind -> color mapping so they never drift apart.
export const FLAG_COLORS: Record<
  FlagKind,
  { bg: string; text: string; border: string; dot: string }
> = {
  mismatch: {
    bg: 'bg-amber-50',
    text: 'text-amber-800',
    border: 'border-amber-300',
    dot: 'bg-amber-500',
  },
  distress: {
    bg: 'bg-red-50',
    text: 'text-red-800',
    border: 'border-red-300',
    dot: 'bg-red-500',
  },
  compliance: {
    bg: 'bg-purple-50',
    text: 'text-purple-800',
    border: 'border-purple-300',
    dot: 'bg-purple-500',
  },
};

// Bolder chip treatment matching player_profile_fast_read_view/code.html's
// "Visual Flag Badges" row (tertiary-fixed tones for mismatch, error-container
// for distress, surface-tint/indigo for compliance).
export const FLAG_CHIP_COLORS: Record<
  FlagKind,
  { bg: string; text: string; border: string }
> = {
  mismatch: {
    bg: 'bg-tertiary-fixed',
    text: 'text-on-tertiary-fixed-variant',
    border: 'border-tertiary-fixed-dim',
  },
  distress: {
    bg: 'bg-error-container',
    text: 'text-on-error-container',
    border: 'border-[#ffb4ab]',
  },
  compliance: {
    bg: 'bg-surface-tint',
    text: 'text-on-primary',
    border: 'border-on-primary-fixed-variant',
  },
};

export const FLAG_ICONS: Record<FlagKind, string> = {
  mismatch: 'warning',
  distress: 'error',
  compliance: 'gavel',
};

export const FLAG_LABELS: Record<FlagKind, string> = {
  mismatch: 'Mismatch',
  distress: 'Distress',
  compliance: 'Compliance',
};
