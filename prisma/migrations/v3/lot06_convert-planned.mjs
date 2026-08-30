// Lot 6 — conversion typée plan_sessions (v1) → planned_workouts (v3). Idempotent. Usage: DATABASE_URL=... node prisma/migrations/v3/lot06_convert-planned.mjs
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const parseDur = (s) => {
  if (!s || typeof s !== 'string') return null;
  const parts = s.trim().split(':').map(Number);
  if (parts.some(Number.isNaN)) return null;
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return null;
};
const parsePace = (s) => parseDur(s);
const kindOf = (t) => ({ warmup: 'warmup', effort: 'work', recovery: 'recovery', cooldown: 'cooldown' }[t] ?? 'other');

function familyOf(sessionType, details) {
  if (sessionType === 'Footing') return 'footing';
  if (sessionType === 'Sortie longue') return 'long';
  if (sessionType === 'Fractionné') {
    const wt = details?.workoutType;
    if (wt === 'SEUIL') return 'threshold';
    if (wt === 'TEMPO') return 'tempo';
    if (wt === 'VMA') {
      const effortKm = Number(details?.effortDistance) || 0;
      const effortS = parseDur(details?.effortDuration) || 0;
      return effortKm >= 0.6 || effortS >= 150 ? 'vma_long' : 'vma_short';
    }
    return 'other';
  }
  return null;
}

function stepToBlock(step, report) {
  const kind = kindOf(step.stepType);
  const durS = parseDur(step.duration);
  const paceS = parsePace(step.pace);
  const distKm = typeof step.distance === 'number' ? step.distance : null;
  let target;
  let choice = 'duration';
  if (kind === 'work' && distKm && paceS && durS) {
    const computedKm = durS / paceS;
    if (Math.abs(distKm - computedKm) / distKm > 0.05) {
      target = { distance_m: Math.round(distKm * 1000) };
      choice = 'distance';
    } else target = { duration_s: durS };
  } else if (durS) target = { duration_s: durS };
  else if (distKm) { target = { distance_m: Math.round(distKm * 1000) }; choice = 'distance'; }
  else target = { duration_s: 0 };
  if (kind === 'work') report.push(`${step.stepNumber ?? '?'}:${choice}`);
  const intensity = {};
  if (paceS) intensity.pace_s_km = paceS;
  if (typeof step.hr === 'number') intensity.hr_bpm = step.hr;
  return { type: kind, target, intensity };
}

function groupRepeats(blocks) {
  const out = [];
  let i = 0;
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  while (i < blocks.length) {
    const b = blocks[i];
    if (b.type === 'work' && blocks[i + 1]?.type === 'recovery') {
      const pair = [b, blocks[i + 1]];
      let times = 1;
      let j = i + 2;
      while (blocks[j]?.type === 'work' && blocks[j + 1]?.type === 'recovery' && same(blocks[j], pair[0]) && same(blocks[j + 1], pair[1])) { times++; j += 2; }
      if (times >= 2) { out.push({ type: 'repeat', times, blocks: pair }); i = j; continue; }
    }
    out.push(b); i++;
  }
  return out;
}

function derive(blocks) {
  let dur = 0, dist = 0;
  const walk = (bs, mult = 1) => {
    for (const b of bs) {
      if (b.type === 'repeat') { walk(b.blocks, mult * b.times); continue; }
      const pace = b.intensity?.pace_s_km;
      if (b.target.duration_s != null) { dur += mult * b.target.duration_s; if (pace) dist += mult * (b.target.duration_s / pace) * 1000; }
      else if (b.target.distance_m != null) { dist += mult * b.target.distance_m; if (pace) dur += mult * (b.target.distance_m / 1000) * pace; }
    }
  };
  walk(blocks);
  return { duration_s: Math.round(dur), distance_m: Math.round(dist) };
}

const rows = await prisma.$queryRawUnsafe(`
  SELECT ps.*, ("plannedDate" AT TIME ZONE 'Europe/Paris')::date AS planned_on, w.id AS workout_id
  FROM plan_sessions ps LEFT JOIN workouts w ON w."planSessionId" = ps.id ORDER BY ps."createdAt"`);

console.log(`plan_sessions to convert: ${rows.length}`);
let converted = 0;
const reportLines = [];
for (const r of rows) {
  const details = r.intervalDetails ?? null;
  const family = familyOf(r.sessionType, details);
  const paceS = parsePace(r.targetPace);
  const hr = r.targetHeartRateBpm != null && r.targetHeartRateBpm !== '' ? Number(r.targetHeartRateBpm) : null;
  const report = [];
  let blocks;
  let kind;
  if (details?.steps?.length) {
    blocks = groupRepeats(details.steps.map((s) => stepToBlock(s, report)));
    kind = 'interval';
  } else {
    const target = r.targetDuration ? { duration_s: r.targetDuration * 60 } : r.targetDistance ? { distance_m: Math.round(r.targetDistance * 1000) } : { duration_s: 0 };
    const intensity = {};
    if (paceS) intensity.pace_s_km = paceS;
    if (hr) intensity.hr_bpm = hr;
    blocks = [{ type: 'work', target, intensity }];
    kind = 'continuous';
  }
  const structure = { kind, family, blocks };
  const d = derive(blocks);
  const oldDur = r.targetDuration ? r.targetDuration * 60 : null;
  const oldDist = r.targetDistance ? Math.round(r.targetDistance * 1000) : null;
  const durDelta = oldDur && d.duration_s ? Math.round(((d.duration_s - oldDur) / oldDur) * 100) : null;
  const distDelta = oldDist && d.distance_m ? Math.round(((d.distance_m - oldDist) / oldDist) * 100) : null;
  reportLines.push(`${r.id.slice(-6)} ${r.planned_on ?? 'no-date '} ${String(r.status).padEnd(9)} ${String(family).padEnd(9)} ${kind.padEnd(10)} old ${oldDur ?? '-'}s/${oldDist ?? '-'}m → v3 ${d.duration_s}s/${d.distance_m}m (Δ ${durDelta ?? '-'}% / ${distDelta ?? '-'}%) work:[${report.join(' ')}]`);

  await prisma.$executeRawUnsafe(`
    INSERT INTO planned_workouts (id, user_id, legacy_plan_session_id, planned_on, family, structure, structure_legacy,
      target_duration_s, target_distance_m, target_pace_s_km, target_hr_bpm, target_rpe, origin, recommendation_id, status, notes, session_number, workout_id, created_at, updated_at)
    VALUES ($1, $2, $1, $3::date, $4::workout_family, $5::jsonb, $6::jsonb, $7, $8, $9, $10, $11, $12::planned_origin, $13, $14::plan_status, $15, $16, $17, $18, $19)
    ON CONFLICT (id) DO UPDATE SET family = EXCLUDED.family, structure = EXCLUDED.structure, structure_legacy = EXCLUDED.structure_legacy,
      target_duration_s = EXCLUDED.target_duration_s, target_distance_m = EXCLUDED.target_distance_m, target_pace_s_km = EXCLUDED.target_pace_s_km,
      target_hr_bpm = EXCLUDED.target_hr_bpm, target_rpe = EXCLUDED.target_rpe, origin = EXCLUDED.origin, status = EXCLUDED.status,
      planned_on = EXCLUDED.planned_on, workout_id = EXCLUDED.workout_id, updated_at = now()`,
    r.id, r.userId, r.planned_on ? new Date(r.planned_on).toISOString().slice(0, 10) : null, family, JSON.stringify(structure),
    details ? JSON.stringify(details) : null, (oldDur ?? d.duration_s) || null, (oldDist ?? d.distance_m) || null, paceS, hr, r.targetRPE,
    r.recommendationId ? 'coach' : 'manual', r.recommendationId, r.status === 'completed' ? 'completed' : 'planned', r.comments ?? '',
    r.sessionNumber, r.workout_id, r.createdAt, r.updatedAt);
  converted++;
}
console.log(reportLines.join('\n'));
console.log(`converted: ${converted}`);
await prisma.$disconnect();
