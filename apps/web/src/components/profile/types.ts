import type { RouterOutputs } from '@bilardogo/api';

export type Profile = RouterOutputs['players']['profile'];
export type ProfileStats = Profile['stats'];
export type PracticeEntry = Profile['practice'][number];
export type Opponent = RouterOutputs['players']['opponents'][number];
export type HistoryMatch = RouterOutputs['matches']['history']['items'][number];
