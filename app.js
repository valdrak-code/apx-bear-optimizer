/* APX Tools Bear Hunt Optimizer v2.4.9 RC3 Source
   Created by Valdrak. Production build is app.min.js. */

const VERSION = '2.4.9 RC3';
const ENGINE_VERSION = '2.4.7';
const BUILD_DATE = '2026-07-10';
const ENGINE_NAME = 'Adaptive Formation Engine';
const ENGINE_MODEL = 'Unified Candidate Pool + Flexible Leader Targets';
const APP_CONFIG = {
  productName: 'APX Tools',
  toolName: 'Bear Hunt Optimizer',
  organization: 'APX',
  community: 'Kingdom 1886',
  website: 'apxtools.org',
  attribution: 'Originally developed by APX and Valdrak.',
};
const DEFAULTS = {
  infantry: 100000,
  cavalry: 100000,
  archers: 100000,
  maxMarches: 4,
  allianceCap: 70000,
  includeLeader: false,
  leaderSize: 100000,
};
let DEVELOPER_MODE = new URLSearchParams(window.location.search).get('dev') === '1' || localStorage.getItem('apxDeveloperMode') === 'true';
const STEP = 1; // v2.4.3: exact troop allocation; formatting handles readability.
const MARCH_SIZE_STEP = 50; // Candidate sizes scan in practical increments; troop allocation itself remains exact.
const MIN_MARCHES = 3;
const MAX_MARCHES = 6;
const DEFAULT_FLOOR = 32000;
const INFANTRY_SOFT_CAP = 0.10;
const MIN_INFANTRY_PER_FORMATION = 1;
const CAVALRY_FLOOR = 0.10;
const ARCHER_IDEAL = 0.70;
const JOINER_FLEX_TARGETS = [0.70, 0.65, 0.60, 0.55, 0.50]; // v2.3.13: evaluate lower Archer ratios when they preserve Leader/reference viability and fill cap.
const JOINER_ARCHER_ELITE_CEILING = 0.90;
const JOINER_ARCHER_COACH_CEILING = 0.90;
const ARCHER_EXCELLENT = 0.68;
const ARCHER_OPTIMAL = 0.50;
const LEADER_ARCHER_IDEAL = 0.80;
const LEADER_FLEX_TARGETS = [0.80, 0.75, 0.70, 0.65, 0.60, 0.55, 0.50];
const LEADER_ARCHER_ADVANCED = 0.90;
const LEADER_INF_TARGET = 0.10;
const LEADER_CAV_TARGET = 0.10;
const JOINER_SHARED_ARCHER_THRESHOLD = 0.80;
const LEADER_ADVANCED_MIN_FILL = 0.70; // Advanced Leader mode requires a meaningful Leader size.
const LEADER_REFERENCE_MIN_ARCHER = 0.45; // Joiner-priority advanced joiners must still leave a usable Leader reference.
const LEADER_REFERENCE_MIN_FILL = 0.70;
const UNDERFILLED_CAP_PENALTY_THRESHOLD = 0.95;

const STRATEGY_WEIGHTS = {
  joiners: {
    totalOutput: 38,
    archerRatio: 16,
    infantryDiscipline: 9,
    capUse: 19,
    leaderQuality: 14,
    joinerCount: 4,
  },
  leader: {
    // v2.4.3 AFE: Rally Leader Priority changes scoring weights only.
    // It strongly values Leader quality while still protecting viable joiner output.
    totalOutput: 26,
    archerRatio: 10,
    infantryDiscipline: 8,
    capUse: 12,
    leaderQuality: 40,
    joinerCount: 4,
  },
};

const els = {
  infantry: document.getElementById('infantry'),
  cavalry: document.getElementById('cavalry'),
  archers: document.getElementById('archers'),
  maxMarches: document.getElementById('maxMarches'),
  allianceCap: document.getElementById('allianceCap'),
  includeLeader: document.getElementById('includeLeader'),
  leaderSettings: document.getElementById('leaderSettings'),
  leaderSize: document.getElementById('leaderSize'),
  qualityStars: document.getElementById('qualityStars'),
  qualityLabel: document.getElementById('qualityLabel'),
  gradeBadge: document.getElementById('gradeBadge'),
  recJoiners: document.getElementById('recJoiners'),
  recSize: document.getElementById('recSize'),
  recOutput: document.getElementById('recOutput'),
  recRatio: document.getElementById('recRatio'),
  recSummary: document.getElementById('recSummary'),
  goButton: document.getElementById('goButton'),
  resetButton: document.getElementById('resetButton'),
  copyButton: document.getElementById('copyButton'),
  copyStatus: document.getElementById('copyStatus'),
  details: document.getElementById('details'),
  joinArchers: document.getElementById('joinArchers'),
  joinCavalry: document.getElementById('joinCavalry'),
  joinInfantry: document.getElementById('joinInfantry'),
  joinSize: document.getElementById('joinSize'),
  joinTotal: document.getElementById('joinTotal'),
  leaderBreakdownCard: document.getElementById('leaderBreakdownCard'),
  leaderArchers: document.getElementById('leaderArchers'),
  leaderArchersPct: document.getElementById('leaderArchersPct'),
  leaderCavalry: document.getElementById('leaderCavalry'),
  leaderCavalryPct: document.getElementById('leaderCavalryPct'),
  leaderInfantry: document.getElementById('leaderInfantry'),
  leaderInfantryPct: document.getElementById('leaderInfantryPct'),
  leaderTotal: document.getElementById('leaderTotal'),
  leaderStatus: document.getElementById('leaderStatus'),
  maxJoiners: document.getElementById('maxJoiners'),
  maxSize: document.getElementById('maxSize'),
  maxOutput: document.getElementById('maxOutput'),
  maxRatio: document.getElementById('maxRatio'),
  maxArchers: document.getElementById('maxArchers'),
  maxCavalry: document.getElementById('maxCavalry'),
  maxInfantry: document.getElementById('maxInfantry'),
  maxStatus: document.getElementById('maxStatus'),
  maxLeaderBreakdownCard: document.getElementById('maxLeaderBreakdownCard'),
  maxLeaderArchers: document.getElementById('maxLeaderArchers'),
  maxLeaderArchersPct: document.getElementById('maxLeaderArchersPct'),
  maxLeaderCavalry: document.getElementById('maxLeaderCavalry'),
  maxLeaderCavalryPct: document.getElementById('maxLeaderCavalryPct'),
  maxLeaderInfantry: document.getElementById('maxLeaderInfantry'),
  maxLeaderInfantryPct: document.getElementById('maxLeaderInfantryPct'),
  maxLeaderTotal: document.getElementById('maxLeaderTotal'),
  maxLeaderStatus: document.getElementById('maxLeaderStatus'),
  report: document.getElementById('report'),
  coach: document.getElementById('coach'),
  insights: document.getElementById('insights'),
};

function parseNumber(value) {
  const cleaned = String(value || '').replace(/[^0-9]/g, '');
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function num(el) {
  return parseNumber(el.value);
}

function setFormattedInput(el, value) {
  el.value = Number(value || 0).toLocaleString('en-US');
}

function formatInputValue(el) {
  const value = parseNumber(el.value);
  el.value = value ? value.toLocaleString('en-US') : '';
}

function fmt(n) {
  if (!Number.isFinite(n)) return '—';
  return Math.floor(n).toLocaleString('en-US');
}

function pct(n, decimals = 1) {
  if (!Number.isFinite(n)) return '—';
  return `${(n * 100).toFixed(decimals)}%`;
}

function formationPct(part, total) {
  if (!Number.isFinite(part) || !Number.isFinite(total) || total <= 0) return '—';
  return pct(part / total, 1);
}

function floorStep(n, step = STEP) {
  return Math.max(0, Math.floor(n / step) * step);
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function applyDefaults() {
  setFormattedInput(els.infantry, DEFAULTS.infantry);
  setFormattedInput(els.cavalry, DEFAULTS.cavalry);
  setFormattedInput(els.archers, DEFAULTS.archers);
  els.maxMarches.value = DEFAULTS.maxMarches;
  els.allianceCap.value = DEFAULTS.allianceCap;
  els.includeLeader.checked = DEFAULTS.includeLeader;
  setFormattedInput(els.leaderSize, DEFAULTS.leaderSize);
}

function getInputs() {
  const prioritizeLeader = els.includeLeader.checked;
  return {
    troops: {
      infantry: num(els.infantry),
      cavalry: num(els.cavalry),
      archers: num(els.archers),
    },
    maxMarches: clamp(Number(els.maxMarches.value) || MIN_MARCHES, MIN_MARCHES, MAX_MARCHES),
    cap: num(els.allianceCap),
    includeLeader: prioritizeLeader,
    leaderSize: num(els.leaderSize),
    strategy: prioritizeLeader ? 'leader' : 'joiners',
  };
}

function canPay(comp, count, troops) {
  return comp.infantry * count <= troops.infantry
    && comp.cavalry * count <= troops.cavalry
    && comp.archers * count <= troops.archers;
}

function subtractTroops(troops, comp, count = 1) {
  return {
    infantry: Math.max(0, troops.infantry - comp.infantry * count),
    cavalry: Math.max(0, troops.cavalry - comp.cavalry * count),
    archers: Math.max(0, troops.archers - comp.archers * count),
  };
}

function troopTotal(troops) {
  return troops.infantry + troops.cavalry + troops.archers;
}

function buildLeaderMarch(leaderSize, available, options = {}) {
  const requestedSize = floorStep(leaderSize);
  if (requestedSize <= 0) {
    return { infantry: 0, cavalry: 0, archers: 0, total: 0, ratio: 0, fillRatio: 0, status: 'Not configured', mode: 'standard', targetArcherRatio: leaderArcherTarget };
  }

  const advanced = options.advanced === true;
  const availableTotal = floorStep(troopTotal(available));
  let targetSize = Math.min(requestedSize, availableTotal);
  if (options.maxLeaderSize) targetSize = Math.min(targetSize, floorStep(options.maxLeaderSize));

  let infantry = 0;
  let cavalry = 0;
  let archers = 0;
  let cavalrySubstituted = false;
  let infantrySubstituted = false;

  if (advanced) {
    // Advanced milestone: 1 Infantry, ~10% Cavalry, remainder Archers (roughly 90%).
    // This mode is only selected automatically when joiners can remain 70%+ Archers.
    const infTarget = available.infantry >= 1 ? 1 : 0;
    const cavTarget = floorStep(targetSize * LEADER_CAV_TARGET);
    const archTarget = Math.max(0, targetSize - infTarget - cavTarget);

    infantry = infTarget;
    cavalry = Math.min(floorStep(available.cavalry), cavTarget);
    archers = Math.min(floorStep(available.archers), floorStep(archTarget));

    let gap = targetSize - infantry - cavalry - archers;
    if (gap > 0) {
      const addArch = Math.min(floorStep(gap), Math.max(0, floorStep(available.archers - archers)));
      archers += addArch;
      gap -= addArch;
    }
    if (gap > 0) {
      const addCav = Math.min(floorStep(gap), Math.max(0, floorStep(available.cavalry - cavalry)));
      if (addCav > 0) cavalrySubstituted = true;
      cavalry += addCav;
      gap -= addCav;
    }

    const total = infantry + cavalry + archers;
    const ratio = total ? archers / total : 0;
    const fillRatio = requestedSize ? total / requestedSize : 0;
    let status = 'Advanced milestone';
    if (total <= 0) status = 'Not supported';
    else if (fillRatio < 0.95) status = 'Advanced milestone limited';
    else if (ratio < LEADER_ARCHER_ADVANCED - 0.02) status = 'Advanced milestone, Archer-light';

    return { infantry, cavalry, archers, total, ratio, fillRatio, requestedSize, targetSize, status, cavalrySubstituted, infantrySubstituted, mode: 'advanced', targetArcherRatio: LEADER_ARCHER_ADVANCED };
  }

  const leaderArcherTarget = clamp(Number(options.archerTarget || LEADER_ARCHER_IDEAL), 0.20, LEADER_ARCHER_IDEAL);
  const infTarget = floorStep(targetSize * LEADER_INF_TARGET);
  const cavTarget = floorStep(targetSize * LEADER_CAV_TARGET);
  const archTarget = floorStep(targetSize * leaderArcherTarget);

  infantry = Math.min(floorStep(available.infantry), infTarget);
  cavalry = Math.min(floorStep(available.cavalry), cavTarget);
  archers = Math.min(floorStep(available.archers), archTarget);

  let gap = targetSize - infantry - cavalry - archers;

  // v2.3.18: 10/10/80 is an ideal target, not a hard shrink rule.
  // If Archers cannot reach 80%, Cavalry may safely backfill toward the
  // requested Leader target as long as Cavalry does not overtake Archers.
  if (gap > 0) {
    const addCav = Math.min(
      floorStep(gap),
      Math.max(0, floorStep(available.cavalry - cavalry)),
      Math.max(0, archers - cavalry)
    );
    if (addCav > 0) cavalrySubstituted = true;
    cavalry += addCav;
    gap -= addCav;
  }

  // Infantry substitution is allowed only after safe Cavalry backfill. This
  // keeps the Leader more viable without forcing a tiny perfect-ratio march.
  if (gap > 0) {
    const addInf = Math.min(
      floorStep(gap),
      Math.max(0, floorStep(available.infantry - infantry)),
      Math.max(0, Math.max(archers, cavalry) - infantry)
    );
    if (addInf > 0) infantrySubstituted = true;
    infantry += addInf;
    gap -= addInf;
  }

  // If safe fill still left a small remainder, allow exact Cavalry then
  // Infantry fill inside the same guardrails.
  if (gap > 0 && gap < STEP) {
    const addCavExact = Math.min(gap, Math.max(0, available.cavalry - cavalry), Math.max(0, archers - cavalry));
    if (addCavExact > 0) cavalrySubstituted = true;
    cavalry += addCavExact;
    gap -= addCavExact;
  }
  if (gap > 0 && gap < STEP) {
    const addInfExact = Math.min(gap, Math.max(0, available.infantry - infantry), Math.max(0, Math.max(archers, cavalry) - infantry));
    if (addInfExact > 0) infantrySubstituted = true;
    infantry += addInfExact;
    gap -= addInfExact;
  }

  const tinyArcherThreshold = Math.max(500, Math.floor(targetSize * 0.005));
  if (archers > 0 && archers < tinyArcherThreshold) {
    let tinyGap = archers;
    archers = 0;
    const addCavTiny = Math.min(floorStep(tinyGap), Math.max(0, floorStep(available.cavalry - cavalry)));
    cavalry += addCavTiny;
    tinyGap -= addCavTiny;
    const addInfTiny = Math.min(floorStep(tinyGap), Math.max(0, floorStep(available.infantry - infantry)));
    infantry += addInfTiny;
  }

  const total = infantry + cavalry + archers;
  const ratio = total ? archers / total : 0;
  const fillRatio = requestedSize ? total / requestedSize : 0;
  let status = 'Ideal';
  if (total <= 0) {
    status = 'Not supported';
  } else if (total < requestedSize) {
    status = 'Limited';
  } else if (archers < archTarget && cavalrySubstituted && infantrySubstituted) {
    status = 'Archer-light, Cavalry and Infantry substituted';
  } else if (archers < archTarget && cavalrySubstituted) {
    status = 'Archer-light, Cavalry substituted';
  } else if (archers < archTarget && infantrySubstituted) {
    status = 'Archer-light, Infantry substituted';
  }

  return { infantry, cavalry, archers, total, ratio, fillRatio, requestedSize, targetSize, status, cavalrySubstituted, infantrySubstituted, mode: 'standard', targetArcherRatio: leaderArcherTarget };
}

function buildBestLeaderMarch(leaderSize, available, joinerRatio = 0, joinerCapUse = 0) {
  // v2.3.10: Rally Leader reference uses the target size as an ideal, not a hard display size.
  // When joiners are optimized first, test smaller practical Leader targets so the reference
  // does not become a full-size Cavalry/Infantry dump just because the entered target was larger.
  const requestedLeader = floorStep(leaderSize);
  const fractions = [1, 0.95, 0.9, 0.85, 0.8, 0.75, 0.7, 0.65, 0.6, 0.55, 0.5];
  const targets = [...new Set(fractions.map(f => floorStep(requestedLeader * f)).filter(v => v > 0))];
  if (requestedLeader > DEFAULT_FLOOR) targets.push(DEFAULT_FLOOR);

  const joinersAreProtected = joinerRatio >= ARCHER_IDEAL;
  const joinersAreMature = joinerRatio >= JOINER_SHARED_ARCHER_THRESHOLD;
  const joinersAreNearCap = joinerCapUse >= 0.95;

  let best = null;
  let bestScore = -Infinity;

  for (const target of targets) {
    const options = [
      ...LEADER_FLEX_TARGETS.map(archerTarget => buildLeaderMarch(leaderSize, available, { advanced: false, maxLeaderSize: target, archerTarget })),
      buildLeaderMarch(leaderSize, available, { advanced: true, maxLeaderSize: target })
    ];

    for (const leader of options) {
      if (!leader || leader.total <= 0) continue;

      // Advanced Leader only inherits true surplus after joiners are mature and near cap.
      if (leader.mode === 'advanced') {
        const advancedIsUsable = leader.fillRatio >= LEADER_ADVANCED_MIN_FILL && leader.ratio >= LEADER_ARCHER_IDEAL;
        if (!(joinersAreProtected && joinersAreMature && joinersAreNearCap && advancedIsUsable)) continue;
      }

      // v2.3.18: Leader reference scoring now favors practical viability.
      // A fuller Leader Formation with safe Cavalry backfill should beat a tiny
      // perfect-ratio Leader when it creates a stronger usable rally option.
      const ratioScore = clamp(leader.ratio / LEADER_ARCHER_IDEAL, 0, 1);
      const fillScore = clamp(leader.fillRatio, 0, 1);
      const sizeScore = requestedLeader ? clamp(leader.total / requestedLeader, 0, 1) : 0;
      let score = fillScore * 45 + sizeScore * 40 + ratioScore * 15;

      if (leader.ratio >= LEADER_REFERENCE_MIN_ARCHER) score += 5;
      if (leader.ratio < 0.20) score -= 45;
      if (leader.total < DEFAULT_FLOOR) score -= 10;
      if (leader.mode === 'advanced') score += 3;

      if (score > bestScore) {
        bestScore = score;
        best = leader;
      }
    }
  }

  return best || buildLeaderMarch(leaderSize, available, { advanced: false });
}

function buildJoinerComp(size, joiners, available, options = {}) {
  const maxInf = Math.floor(available.infantry / joiners);
  const maxCav = floorStep(available.cavalry / joiners);
  const maxArch = floorStep(available.archers / joiners);

  // v2.3 Formation Integrity:
  // - Every Formation needs at least 1 Infantry when Infantry is available.
  // - Cavalry should be at least 10% when the player has enough Cavalry.
  // - Archers consume as much remaining capacity as possible, up to the practical 90% joiner milestone.
  if (maxInf < MIN_INFANTRY_PER_FORMATION) return null;

  const cavFloor = floorStep(size * CAVALRY_FLOOR);

  // v2.3.6: 1-Infantry joiners are an advanced tactic, not the default.
  // Use the 1-Infantry approach only when the account can support an
  // 80%+ Archer joiner formation after keeping Cavalry near 10%.
  // Otherwise, keep a standard ~10% Infantry floor so smaller accounts do
  // not appear to be in advanced mode simply because they barely reached 70%.
  const maxArcherWithAdvancedInf = Math.min(maxArch, Math.max(0, size - MIN_INFANTRY_PER_FORMATION - Math.min(cavFloor, maxCav)));
  const allowAdvancedJoiner = options.allowAdvanced !== false;
  const advancedJoinerReady = allowAdvancedJoiner && (maxArcherWithAdvancedInf / size) >= JOINER_SHARED_ARCHER_THRESHOLD;
  let infantry = advancedJoinerReady ? MIN_INFANTRY_PER_FORMATION : Math.min(floorStep(size * INFANTRY_SOFT_CAP), maxInf);
  if (infantry < MIN_INFANTRY_PER_FORMATION) infantry = MIN_INFANTRY_PER_FORMATION;

  let cavalry = Math.min(cavFloor, maxCav);
  let archers = 0;

  let gap = size - infantry - cavalry;
  if (gap < 0) return null;

  // v2.3.10: Standard joiners target the 70% viable Archer core, then Cavalry backfills toward cap.
  // Advanced joiners may climb toward the practical 90% ceiling only when truly supported.
  const requestedArcherTarget = clamp(Number(options.archerTarget || ARCHER_IDEAL), ARCHER_OPTIMAL, JOINER_ARCHER_ELITE_CEILING);
  const standardArcherTarget = Math.min(ARCHER_IDEAL, requestedArcherTarget);
  const archerCeiling = floorStep(size * (advancedJoinerReady ? JOINER_ARCHER_ELITE_CEILING : standardArcherTarget));
  const firstArch = Math.min(gap, maxArch, archerCeiling);
  archers += floorStep(firstArch);
  gap = size - infantry - cavalry - archers;

  // Cavalry fills dead space, while respecting Cavalry <= Archers whenever possible.
  if (gap > 0) {
    const addCav = Math.min(floorStep(gap), Math.max(0, maxCav - cavalry), Math.max(0, archers - cavalry));
    cavalry += addCav;
    gap -= addCav;
  }

  // More Archers can unlock more Cavalry filler and improve the Formation.
  if (gap > 0) {
    const addArch = Math.min(floorStep(gap), Math.max(0, maxArch - archers), Math.max(0, archerCeiling - archers));
    archers += addArch;
    gap -= addArch;
  }
  if (gap > 0) {
    const addCav = Math.min(floorStep(gap), Math.max(0, maxCav - cavalry), Math.max(0, archers - cavalry));
    cavalry += addCav;
    gap -= addCav;
  }

  // Infantry above 1 is a last resort. Keep it below or near 10% whenever possible.
  if (gap > 0) {
    const infSoft = floorStep(size * INFANTRY_SOFT_CAP);
    const addInfSoft = Math.min(floorStep(gap), Math.max(0, Math.min(maxInf, infSoft) - infantry));
    infantry += addInfSoft;
    gap -= addInfSoft;
  }

  // Final fill if otherwise the candidate cannot exist.
  if (gap > 0) {
    const addArch = Math.min(floorStep(gap), Math.max(0, maxArch - archers), Math.max(0, archerCeiling - archers));
    archers += addArch;
    gap -= addArch;
  }
  if (gap > 0) {
    const addCav = Math.min(floorStep(gap), Math.max(0, maxCav - cavalry), Math.max(0, archers - cavalry));
    cavalry += addCav;
    gap -= addCav;
  }
  if (gap > 0) {
    const addInf = Math.min(floorStep(gap), Math.max(0, maxInf - infantry));
    infantry += addInf;
    gap -= addInf;
  }

  // v2.3.1: With the 1-Infantry minimum and 10-troop rounding, exact march sizes
  // can leave a tiny remainder such as 9 troops. Fill that tiny remainder exactly
  // so high-Archer formations are not rejected just because 1 + rounded values
  // cannot equal a clean cap number.
  if (gap > 0 && gap < STEP) {
    const addArchExact = Math.min(gap, Math.max(0, maxArch - archers), Math.max(0, archerCeiling - archers));
    archers += addArchExact;
    gap -= addArchExact;
  }
  if (gap > 0 && gap < STEP) {
    const addCavExact = Math.min(gap, Math.max(0, maxCav - cavalry), Math.max(0, archers - cavalry));
    cavalry += addCavExact;
    gap -= addCavExact;
  }
  if (gap > 0 && gap < STEP) {
    const addInfExact = Math.min(gap, Math.max(0, maxInf - infantry));
    infantry += addInfExact;
    gap -= addInfExact;
  }

  const total = infantry + cavalry + archers;
  if (total < size) return null;
  if (infantry < MIN_INFANTRY_PER_FORMATION) return null;
  if (maxCav >= cavFloor && cavalry < cavFloor) return null;
  if (cavalry > archers) return null;
  if (infantry > archers && infantry > cavalry) return null;
  const comp = { infantry, cavalry, archers, total, ratio: archers / total, infRatio: infantry / total, cavRatio: cavalry / total, mode: advancedJoinerReady ? 'advanced' : 'standard' };
  if (!canPay(comp, joiners, available)) return null;
  return comp;
}
function candidateMetrics(candidate, input) {
  const capUse = input.cap ? candidate.size / input.cap : 0;
  const archerRatio = candidate.comp.ratio;
  const infDiscipline = 1 - clamp((candidate.comp.infRatio - INFANTRY_SOFT_CAP) / 0.20, 0, 1);
  const leaderQuality = (input.leaderSize > 0 && candidate.leader) ? qualityLeader(candidate.leader) : 1;
  const totalPossibleOutput = input.maxMarches * input.cap;
  const totalOutputScore = totalPossibleOutput ? candidate.totalOutput / totalPossibleOutput : 0;
  const joinerCountScore = input.maxMarches ? candidate.joiners / input.maxMarches : 0;

  return {
    capUse: clamp(capUse, 0, 1),
    archerRatio: clamp(archerRatio / JOINER_ARCHER_ELITE_CEILING, 0, 1),
    rawArcherRatio: archerRatio,
    infDiscipline: clamp(infDiscipline, 0, 1),
    leaderQuality: clamp(leaderQuality, 0, 1),
    totalOutputScore: clamp(totalOutputScore, 0, 1),
    joinerCountScore: clamp(joinerCountScore, 0, 1),
  };
}

function qualityLeader(leader) {
  if (!leader || !leader.requestedSize) return 1;
  const fill = clamp(leader.fillRatio, 0, 1);
  const ratio = clamp(leader.ratio / (leader.targetArcherRatio || LEADER_ARCHER_IDEAL), 0, 1);
  const cavalrySafe = leader.cavalry <= leader.archers ? 1 : 0;
  const usefulArcher = clamp(leader.ratio / LEADER_REFERENCE_MIN_ARCHER, 0, 1);
  // AFE v2.4.3: Leader quality favors usable/full formations first, then Archer strength.
  // This prevents tiny perfect-ratio Leaders from beating fuller practical Leaders.
  return fill * 0.46 + ratio * 0.28 + usefulArcher * 0.18 + cavalrySafe * 0.08;
}

function scoreCandidate(candidate, input) {
  const weights = STRATEGY_WEIGHTS[input.strategy] || STRATEGY_WEIGHTS.joiners;
  const m = candidateMetrics(candidate, input);
  let score =
    m.totalOutputScore * weights.totalOutput +
    m.archerRatio * weights.archerRatio +
    m.infDiscipline * weights.infantryDiscipline +
    m.capUse * weights.capUse +
    m.leaderQuality * weights.leaderQuality +
    m.joinerCountScore * weights.joinerCount;

  // v2.3.3: Advanced Leader candidates should not shrink joiners just to
  // preserve an 80%+ joiner Archer ratio. Once joiners remain viable at 70%+,
  // reward the advanced Leader path and let total output/cap usage compete.
  // This keeps joiners closer to the Alliance Rally Cap when Cavalry can fill.
  if (input.includeLeader && candidate.leader && candidate.leader.mode === 'advanced' && candidate.comp.ratio >= JOINER_SHARED_ARCHER_THRESHOLD && candidate.size / input.cap >= 0.95) {
    score += input.strategy === 'leader' ? 8 : 5;
  }

  // v2.3.12: Archer % is a scoring checkpoint, not a hard stop.
  // A fuller march with safe Cavalry backfill should be allowed to beat a cleaner
  // 70% Archer march when the total Bear Hunt contribution is stronger.
  if (candidate.comp.ratio < ARCHER_OPTIMAL) score -= input.strategy === 'leader' ? 24 : 18;
  else if (candidate.comp.ratio < 0.60) score -= input.strategy === 'leader' ? 12 : 8;
  else if (candidate.comp.ratio < 0.65) score -= input.strategy === 'leader' ? 5 : 4;
  else if (candidate.comp.ratio < ARCHER_IDEAL) score -= input.strategy === 'leader' ? 1.5 : 1;

  // Penalize candidates that leave useful Alliance Rally Cap space unused.
  // This is intentionally separate from Archer ratio so a clean 70% setup does not
  // receive an inflated score by leaving safe Cavalry fill unused.
  const capUseForPenalty = input.cap ? candidate.size / input.cap : 1;
  if (capUseForPenalty < 0.99) {
    score -= (0.99 - capUseForPenalty) * 70;
  }

  // If a Rally Leader Formation is being displayed, prevent the winner from
  // treating it as garbage leftovers when a slightly smaller joiner setup
  // would support a meaningful Leader reference.
  if (candidate.leader && input.leaderSize > 0 && candidate.leader.total > 0) {
    if (candidate.leader.ratio < 0.20) score -= 18;
    else if (candidate.leader.ratio < LEADER_REFERENCE_MIN_ARCHER) score -= 8;
    if (candidate.leader.fillRatio < 0.50) score -= 5;
    if (input.strategy === 'leader') {
      const lq = qualityLeader(candidate.leader);
      // v2.4.3: Leader Priority favors a meaningful, fuller Leader Formation.
      // Ratio matters, but it should not trap the engine into a tiny 10/10/80 march.
      score += lq * 28;
      score += clamp(candidate.leader.fillRatio, 0, 1) * 18;
      score += clamp(candidate.leader.total / Math.max(1, input.leaderSize), 0, 1) * 18;
      if (candidate.path === 'leader-first') score += 10;
      if (candidate.leader.fillRatio >= 0.70) score += 8;
      if (candidate.leader.fillRatio >= 0.85) score += 6;
      if (candidate.leader.ratio >= LEADER_REFERENCE_MIN_ARCHER) score += 3;
      if (candidate.leader.fillRatio < LEADER_ADVANCED_MIN_FILL) score -= 34;
      if (candidate.leader.ratio < LEADER_REFERENCE_MIN_ARCHER) score -= 20;
    }

    // v2.3.9: In Joiner Priority, do not let 1/10/90-style advanced joiners
    // consume Archers so aggressively that the Rally Leader reference becomes
    // a Cavalry/Infantry dump. Advanced joiners are allowed only when the
    // Leader reference remains meaningful.
    if (input.strategy === 'joiners' && candidate.comp.mode === 'advanced') {
      if (candidate.leader.ratio < LEADER_REFERENCE_MIN_ARCHER) score -= 24;
      if (candidate.leader.fillRatio < LEADER_REFERENCE_MIN_FILL) score -= 10;
    }
  }

  return Math.round(score * 100) / 100;
}

function generateCandidates(input, forceJoiners = null) {
  // v2.4.0 Refactor: candidate construction is unified.
  // The engine now generates both joiner-first and leader-first candidate paths
  // whenever a Rally Leader Target Size is provided. The Rally Leader toggle no
  // longer changes how formations are built; it only changes how candidates are
  // scored through STRATEGY_WEIGHTS.
  const candidates = [];
  const min = forceJoiners || MIN_MARCHES;
  const max = forceJoiners || input.maxMarches;
  const requestedLeader = floorStep(input.leaderSize || 0);
  const leaderFractions = requestedLeader > 0
    ? [1, 0.95, 0.9, 0.85, 0.8, 0.75, 0.7, 0.65, 0.6, 0.55, 0.5]
    : [];
  const leaderTargets = requestedLeader > 0
    ? [...new Set(leaderFractions.map(f => floorStep(requestedLeader * f)).filter(v => v > 0))]
    : [];
  if (requestedLeader > DEFAULT_FLOOR) leaderTargets.push(DEFAULT_FLOOR);

  function pushCandidate(candidate, keySet) {
    if (!candidate || !candidate.comp || candidate.comp.total <= 0) return;
    const leaderKey = candidate.leader ? `${candidate.leader.mode}-${candidate.leader.total}-${candidate.leader.infantry}-${candidate.leader.cavalry}-${candidate.leader.archers}` : 'noLeader';
    const key = `${candidate.path}-${candidate.joiners}-${candidate.size}-${candidate.comp.mode}-${candidate.comp.infantry}-${candidate.comp.cavalry}-${candidate.comp.archers}-${leaderKey}`;
    if (keySet.has(key)) return;
    keySet.add(key);
    candidate.score = scoreCandidate(candidate, input);
    candidates.push(candidate);
  }

  for (let joiners = min; joiners <= max; joiners++) {
    for (let size = floorStep(input.cap); size >= STEP; size -= MARCH_SIZE_STEP) {
      const seen = new Set();

      // Path A: Joiner-first. Build joiners from full troop pool, then build a
      // practical Rally Leader reference from remaining troops.
      const joinerOptions = [
        ...JOINER_FLEX_TARGETS.map(target => buildJoinerComp(size, joiners, input.troops, { allowAdvanced: false, archerTarget: target })),
        buildJoinerComp(size, joiners, input.troops, { allowAdvanced: true, archerTarget: JOINER_ARCHER_ELITE_CEILING }),
      ].filter(Boolean);

      const seenJoinerComps = new Set();
      for (const comp of joinerOptions) {
        const compKey = `${comp.infantry}-${comp.cavalry}-${comp.archers}`;
        if (seenJoinerComps.has(compKey)) continue;
        seenJoinerComps.add(compKey);

        const remaining = subtractTroops(input.troops, comp, joiners);
        const leader = requestedLeader > 0
          ? buildBestLeaderMarch(input.leaderSize, remaining, comp.ratio, size / input.cap)
          : null;

        // Advanced joiners may compete, but not if they completely destroy the
        // Leader reference. This preserves the v2.3 lesson without making Leader
        // construction branch-specific.
        if (comp.mode === 'advanced' && leader && leader.total > 0) {
          if (leader.ratio < 0.20 && leader.fillRatio < 0.95) continue;
        }

        pushCandidate({
          path: 'joiner-first',
          joiners,
          size,
          comp,
          leader,
          totalOutput: comp.total * joiners,
          belowFloor: size < DEFAULT_FLOOR,
        }, seen);
      }

      // Path B: Leader-first. Build a Leader Formation first using the same
      // Leader builder/backfill logic, then build joiners from what remains.
      // The toggle does not enable/disable this path; it only makes these
      // candidates score higher when Rally Leader Priority is ON.
      // v2.4.3: When showing Maximum Marches with Joiner Priority, do not let
      // the comparison steal from forced joiners just to make a stronger Leader reference.
      if (requestedLeader > 0 && !(forceJoiners !== null && input.strategy === 'joiners')) {
        for (const leaderTarget of leaderTargets) {
          const leaderOptions = [
            ...LEADER_FLEX_TARGETS.map(archerTarget => buildLeaderMarch(input.leaderSize, input.troops, { advanced: false, maxLeaderSize: leaderTarget, archerTarget })),
            buildLeaderMarch(input.leaderSize, input.troops, { advanced: true, maxLeaderSize: leaderTarget }),
          ].filter(Boolean);

          for (const leader of leaderOptions) {
            if (!leader || leader.total <= 0) continue;
            const availableForJoiners = subtractTroops(input.troops, leader, 1);

            const joinerTargets = leader.mode === 'advanced'
              ? [JOINER_SHARED_ARCHER_THRESHOLD]
              : JOINER_FLEX_TARGETS;

            const seenLeaderFirstComps = new Set();
            for (const target of joinerTargets) {
              const comp = buildJoinerComp(size, joiners, availableForJoiners, {
                allowAdvanced: leader.mode === 'advanced',
                archerTarget: target,
              });
              if (!comp) continue;
              const compKey = `${comp.infantry}-${comp.cavalry}-${comp.archers}`;
              if (seenLeaderFirstComps.has(compKey)) continue;
              seenLeaderFirstComps.add(compKey);

              // Advanced Leader should inherit surplus from mature/near-cap joiners,
              // not outrun them. Standard Leader candidates remain available.
              if (leader.mode === 'advanced') {
                if (comp.ratio < JOINER_SHARED_ARCHER_THRESHOLD) continue;
                if ((size / input.cap) < 0.95) continue;
                if (leader.fillRatio < LEADER_ADVANCED_MIN_FILL) continue;
              }

              pushCandidate({
                path: 'leader-first',
                joiners,
                size,
                comp,
                leader,
                totalOutput: comp.total * joiners,
                belowFloor: size < DEFAULT_FLOOR,
              }, seen);
            }
          }
        }
      }
    }
  }
  return candidates;
}

function bestCandidate(candidates, input) {
  if (!candidates.length) return null;

  // V2.0.2: Do not discard lower-ratio candidates too early.
  // Cavalry filler may intentionally lower Archer % while increasing total useful output.
  // Bad compositions are rejected in buildJoinerComp; scoring decides among valid options.
  const aboveFloor = candidates.filter(c => !c.belowFloor);
  const pool = aboveFloor.length ? aboveFloor : candidates;

  const scoreWinner = pool.reduce((best, cur) => {
    // If every candidate is below floor, choose the setup closest to the floor first.
    // This prevents 6 tiny marches from beating fewer, more usable marches.
    if (!aboveFloor.length && cur.size !== best.size) return cur.size > best.size ? cur : best;
    if (cur.score !== best.score) return cur.score > best.score ? cur : best;
    if (input.strategy === 'leader' && cur.leader && best.leader) {
      const curL = qualityLeader(cur.leader);
      const bestL = qualityLeader(best.leader);
      if (Math.abs(curL - bestL) > 0.02) return curL > bestL ? cur : best;
      if (Math.abs(curL - bestL) <= 0.02 && cur.leader.total !== best.leader.total) return cur.leader.total > best.leader.total ? cur : best;
    }
    if (cur.totalOutput !== best.totalOutput) return cur.totalOutput > best.totalOutput ? cur : best;
    if (cur.comp.ratio !== best.comp.ratio) return cur.comp.ratio > best.comp.ratio ? cur : best;
    return cur.size > best.size ? cur : best;
  }, pool[0]);

  // v2.3.12: Filled-variant safety pass.
  // If the score winner is an underfilled 70-ish Archer candidate, allow a fuller
  // same-joiner candidate to beat it when the Archer drop is modest and the Leader
  // reference is not meaningfully worse. This prevents APX Recommended from clinging
  // to a clean ratio while the Maximum Marches path correctly fills toward cap.
  const winnerLeaderQuality = qualityLeader(scoreWinner.leader);
  const filledVariant = pool
    .filter(c =>
      c.joiners === scoreWinner.joiners &&
      c.size > scoreWinner.size &&
      c.comp.ratio >= Math.max(0.58, scoreWinner.comp.ratio - 0.08) &&
      qualityLeader(c.leader) >= winnerLeaderQuality - 0.08 &&
      (!scoreWinner.leader || !c.leader || c.leader.ratio >= Math.max(0.20, scoreWinner.leader.ratio - 0.12)) &&
      c.score >= scoreWinner.score - 6
    )
    .sort((a, b) => {
      if (b.size !== a.size) return b.size - a.size;
      if (b.score !== a.score) return b.score - a.score;
      return b.comp.ratio - a.comp.ratio;
    })[0];

  return filledVariant || scoreWinner;
}

function cloneCandidate(candidate, extra = {}) {
  if (!candidate) return null;
  return {
    ...candidate,
    comp: candidate.comp ? { ...candidate.comp } : null,
    leader: candidate.leader ? { ...candidate.leader } : null,
    ...extra,
  };
}

function analyze(input) {
  const allCandidates = generateCandidates(input);
  const recommended = bestCandidate(allCandidates, input);
  const maxMarchCandidates = generateCandidates(input, input.maxMarches);
  let maxMarchSetup = bestCandidate(maxMarchCandidates, input);

  // v2.4.7: If the APX Recommendation already uses the selected Maximum Marches,
  // the Maximum Marches comparison must be the same package. Do not rebuild a
  // separate Leader/Joiner split that can conflict with the recommendation.
  if (recommended && recommended.joiners === input.maxMarches) {
    maxMarchSetup = cloneCandidate(recommended, { sameAsRecommendation: true });
  }

  return { recommended, maxMarchSetup, allCandidates };
}

function gradeFromScore(score) {
  if (score >= 96) return { grade: 'S+', label: 'Excellent', stars: '★★★★★' };
  if (score >= 91) return { grade: 'S', label: 'Excellent', stars: '★★★★☆' };
  if (score >= 83) return { grade: 'A', label: 'Very Good', stars: '★★★★☆' };
  if (score >= 73) return { grade: 'B', label: 'Good', stars: '★★★☆☆' };
  if (score >= 62) return { grade: 'C', label: 'Fair', stars: '★★☆☆☆' };
  return { grade: 'D', label: 'Limited', stars: '★☆☆☆☆' };
}



function formationQualityGrade(candidate, input) {
  if (!candidate) return { grade: 'D', label: 'Limited', stars: '★☆☆☆☆', score: 0 };
  const ratio = candidate.comp.ratio || 0;
  const capUse = input && input.cap ? candidate.size / input.cap : 0;

  // v2.4.7 RC1: Visible quality is now a JOINER FORMATION grade.
  // The hidden optimizer score can still consider Leader quality, but the badge shown to players
  // should not downgrade elite/full-cap joiners because the Leader reference is weaker.
  let quality = 0;
  if (ratio >= 0.90) quality += 60;
  else if (ratio >= 0.80) quality += 50;
  else if (ratio >= 0.70) quality += 40;
  else if (ratio >= 0.60) quality += 30;
  else if (ratio >= 0.50) quality += 20;
  else quality += 8;

  if (capUse >= 0.98) quality += 25;
  else if (capUse >= 0.90) quality += 20;
  else if (capUse >= 0.80) quality += 14;
  else if (capUse >= 0.70) quality += 8;
  else quality += 3;

  if (candidate.comp.cavalry <= candidate.comp.archers) quality += 8;
  if (candidate.comp.infantry <= (INFANTRY_SOFT_CAP + 0.03)) quality += 7;
  else if (candidate.comp.infantry <= 0.20) quality += 3;

  quality = Math.min(100, Math.round(quality));
  if (quality >= 93) return { grade: 'S', label: 'Excellent', stars: '★★★★★', score: quality };
  if (quality >= 82) return { grade: 'A', label: 'Very Good', stars: '★★★★☆', score: quality };
  if (quality >= 70) return { grade: 'B', label: 'Good', stars: '★★★☆☆', score: quality };
  if (quality >= 58) return { grade: 'C', label: 'Fair', stars: '★★☆☆☆', score: quality };
  return { grade: 'D', label: 'Limited', stars: '★☆☆☆☆', score: quality };
}

function strategyLabel(value) {
  if (value === 'leader') return 'Prioritize Rally Leader Formation';
  return 'Prioritize Joiners';
}

function ratingText(ratio) {
  if (ratio >= ARCHER_EXCELLENT) return 'Recommended';
  if (ratio >= ARCHER_OPTIMAL) return 'Recommended';
  return 'Playable, but Not Optimal';
}

function statusRatingText(ratio) {
  if (ratio >= ARCHER_EXCELLENT) return 'Recommended';
  if (ratio >= ARCHER_OPTIMAL) return 'Recommended';
  return 'Playable, but Not Optimal';
}

function buildReport(result, input) {
  if (!result) return [{ type: 'bad', text: 'No supported setup found with the current inputs.' }];
  const report = [];
  if (result.comp.ratio >= 0.85) report.push({ type: 'good', text: '🏹 Elite Archer-heavy Formation for high-end Bear Hunt damage.' });
  else if (result.comp.ratio >= ARCHER_EXCELLENT) report.push({ type: 'good', text: '🏹 Excellent Archer ratio for strong Bear Hunt damage.' });
  else if (result.comp.ratio >= ARCHER_OPTIMAL) report.push({ type: 'good', text: '🏹 Archer ratio is in the optimal range.' });
  else report.push({ type: 'warn', text: '🏹 Archer ratio is below optimal. Participate anyway, but train more Archers.' });

  if (result.comp.infRatio <= INFANTRY_SOFT_CAP + 0.01) report.push({ type: 'good', text: '🛡️ Infantry stayed near the 10% soft cap.' });
  else report.push({ type: 'warn', text: '🛡️ Infantry exceeded the 10% soft cap because it was needed to build a usable Formation.' });

  if (result.comp.cavRatio >= CAVALRY_FLOOR - 0.01) report.push({ type: 'good', text: '🐎 Cavalry maintained the 10% Formation floor.' });
  else report.push({ type: 'warn', text: '🐎 Cavalry fell below 10% because available Cavalry was limited.' });

  const capUse = result.size / input.cap;
  if (capUse >= 0.95) report.push({ type: 'good', text: '⚔️ Joiner Formation is close to the Alliance Rally Cap Limit.' });
  else if (capUse >= 0.70) report.push({ type: 'warn', text: '⚔️ Joiner Formation is below the Alliance Rally Cap Limit but still usable.' });
  else report.push({ type: 'warn', text: '⚔️ Joiner Formation is significantly below the Alliance Rally Cap Limit.' });

  if (result.comp.ratio < ARCHER_IDEAL && capUse >= 0.95 && result.comp.cavRatio >= CAVALRY_FLOOR) {
    report.push({ type: 'good', text: '🐎 Cavalry backfilled open space to improve total march output, even though it lowered Archer percentage.' });
  }

  if (result.leader) {
    if (result.leader.mode === 'advanced') report.push({ type: 'good', text: '👑 Advanced Rally Leader milestone detected automatically.' });
    else if (result.leader.fillRatio >= 0.95) report.push({ type: 'good', text: '👑 Rally Leader Formation is strongly supported.' });
    else report.push({ type: 'warn', text: '👑 Rally Leader Formation is shown from remaining troops after joiner optimization.' });
  }
  return report;
}

function buildCoach(result, input) {
  if (!result) return 'Train more troops across all three types, with extra focus on Archers.';
  const eliteArchPer = floorStep(result.size * JOINER_ARCHER_COACH_CEILING);
  const archGap = Math.max(0, eliteArchPer - result.comp.archers) * result.joiners;
  if (result.comp.ratio < ARCHER_IDEAL && archGap > 0) return `Focus speedups on Archers. About ${fmt(archGap)} more Archers would move this setup closer to the 70%+ viable joiner target.`;
  if (result.comp.ratio >= ARCHER_IDEAL && result.comp.ratio < JOINER_ARCHER_COACH_CEILING && archGap > 0) return `Strong Formation. Additional Archers can improve future recommendations, but APX Coach will not chase beyond the 90% joiner milestone.`;
  if (result.comp.ratio >= JOINER_ARCHER_COACH_CEILING) return 'Elite Archer-heavy Formation. Do not reduce marches just to chase 100% Archers; this setup is already beyond the practical joiner target.';
  if (result.comp.infRatio > INFANTRY_SOFT_CAP + 0.03) return 'Your setup needed extra Infantry. Future training should emphasize Archers and Cavalry for better Bear Hunt efficiency.';
  if (input.includeLeader && input.strategy === 'leader' && result.joiners < input.maxMarches) return 'Rally Leader Priority reduced joiner count to strengthen your Rally Leader Formation while keeping joiners viable.';
  if (result.leader && result.leader.mode === 'advanced') return 'Advanced Rally Leader milestone achieved while preserving 70%+ Archer joiners. Maintain Archer growth to keep this setup viable.';
  if (result.size < input.cap) return 'Your troop composition is solid, but unused Rally Cap space remains. More Archers and Cavalry will improve future recommendations.';
  if (result.comp.ratio < ARCHER_IDEAL) return 'Cavalry was used to fill march space for stronger overall output. Continue training Archers to raise future Archer percentage without shrinking march size.';
  return 'Excellent setup. Keep all troop queues running while maintaining Archer-heavy march composition.';
}

function buildInsights(result, maxSetup, input, allCandidates) {
  const insights = [];
  if (!result) return [{ type: 'warn', text: 'No viable insights because no setup was found.' }];

  // v2.3: Do not encourage dropping marches once the current Formation is already elite.
  // March reduction advice should help weak/solid setups reach viability, not chase 100% Archers.
  if (result.comp.ratio < JOINER_SHARED_ARCHER_THRESHOLD) {
    const ratioCandidates = [...allCandidates]
      .filter(c => c.comp.ratio <= JOINER_ARCHER_COACH_CEILING && c.comp.ratio > result.comp.ratio + 0.03)
      .sort((a, b) => b.comp.ratio - a.comp.ratio);
    const bestByRatio = ratioCandidates[0];
    if (bestByRatio && bestByRatio.joiners !== result.joiners) {
      insights.push({ type: 'warn', text: `Reducing to ${bestByRatio.joiners} marches would improve Archer ratio to ${pct(bestByRatio.comp.ratio)} without chasing beyond the 90% joiner target.` });
    }
  }

  if (maxSetup && maxSetup.joiners !== result.joiners) {
    insights.push({ type: 'warn', text: `Using all ${input.maxMarches} marches is possible, but APX recommends ${result.joiners} based on overall quality and output.` });
  } else if (maxSetup) {
    insights.push({ type: 'good', text: `Your selected Maximum Marches aligns with the APX Recommendation.` });
  }

  if (result.leader && input.leaderSize > 0) {
    insights.push({ type: 'good', text: `Your Rally Leader uses ${pct(result.leader.archers / Math.max(1, input.troops.archers))} of your available Archers.` });
  }

  if (insights.length < 2) insights.push({ type: 'good', text: `Your account currently performs best with ${result.joiners} joiner marches.` });
  return insights;
}

function renderList(container, items) {
  container.innerHTML = '';
  for (const item of items) {
    const div = document.createElement('div');
    div.className = item.type || 'good';
    div.textContent = `${item.type === 'warn' ? '⚠' : item.type === 'bad' ? '✖' : '✓'} ${item.text}`;
    container.appendChild(div);
  }
}

function setStatus(el, text, type = 'neutral') {
  if (!el) return;
  el.textContent = text;
  el.classList.remove('status-ready', 'status-caution', 'status-danger', 'status-neutral');
  el.classList.add(`status-${type}`);
}

function leaderStatusType(status) {
  if (!status || status === '—') return 'neutral';
  if (/not supported|no go|n\/a/i.test(status)) return 'danger';
  if (/limited|substituted|archer-light/i.test(status)) return 'caution';
  return 'ready';
}

function maxStatusType(status, setup) {
  if (!status || /n\/a|no go|not enough/i.test(status)) return 'danger';
  if (setup && setup.belowFloor) return 'danger';
  if (/participate|lower quality|below|limited/i.test(status)) return 'caution';
  return 'ready';
}

function renderMaxSetup(setup, recommendation, input) {
  const showLeader = input && input.leaderSize > 0;
  if (els.maxLeaderBreakdownCard) els.maxLeaderBreakdownCard.style.display = showLeader ? 'block' : 'none';

  if (!setup) {
    els.maxJoiners.textContent = 'N/A';
    els.maxSize.textContent = '—';
    els.maxOutput.textContent = '—';
    els.maxRatio.textContent = '—';
    if (els.maxArchers) els.maxArchers.textContent = '—';
    if (els.maxCavalry) els.maxCavalry.textContent = '—';
    if (els.maxInfantry) els.maxInfantry.textContent = '—';
    setStatus(els.maxStatus, 'N/A — not enough troops to support this march count. Use the APX Recommended Setup.', 'danger');
    if (showLeader && els.maxLeaderArchers) {
      els.maxLeaderArchers.textContent = '—';
      if (els.maxLeaderArchersPct) els.maxLeaderArchersPct.textContent = '—';
      els.maxLeaderCavalry.textContent = '—';
      if (els.maxLeaderCavalryPct) els.maxLeaderCavalryPct.textContent = '—';
      els.maxLeaderInfantry.textContent = '—';
      if (els.maxLeaderInfantryPct) els.maxLeaderInfantryPct.textContent = '—';
      els.maxLeaderTotal.textContent = '—';
      setStatus(els.maxLeaderStatus, 'N/A', 'danger');
    }
    return;
  }

  els.maxJoiners.textContent = fmt(setup.joiners);
  els.maxSize.textContent = fmt(setup.size);
  els.maxOutput.textContent = fmt(setup.totalOutput);
  els.maxRatio.textContent = pct(setup.comp.ratio);
  if (els.maxArchers) els.maxArchers.textContent = fmt(setup.comp.archers);
  if (els.maxCavalry) els.maxCavalry.textContent = fmt(setup.comp.cavalry);
  if (els.maxInfantry) els.maxInfantry.textContent = fmt(setup.comp.infantry);

  let status = statusRatingText(setup.comp.ratio);
  if (setup.sameAsRecommendation) {
    status = 'Same as APX Recommendation.';
  } else if (setup.belowFloor) {
    status = 'Not Recommended — below the 32,000 preferred floor. Use the APX Recommended Setup.';
  } else {
    if (recommendation && setup.score + 5 < recommendation.score) status += ' — lower quality than APX Recommendation.';
  }
  setStatus(els.maxStatus, status, maxStatusType(status, setup));

  if (showLeader && setup.leader && els.maxLeaderArchers) {
    els.maxLeaderArchers.textContent = fmt(setup.leader.archers);
    if (els.maxLeaderArchersPct) els.maxLeaderArchersPct.textContent = formationPct(setup.leader.archers, setup.leader.total);
    els.maxLeaderCavalry.textContent = fmt(setup.leader.cavalry);
    if (els.maxLeaderCavalryPct) els.maxLeaderCavalryPct.textContent = formationPct(setup.leader.cavalry, setup.leader.total);
    els.maxLeaderInfantry.textContent = fmt(setup.leader.infantry);
    if (els.maxLeaderInfantryPct) els.maxLeaderInfantryPct.textContent = formationPct(setup.leader.infantry, setup.leader.total);
    els.maxLeaderTotal.textContent = fmt(setup.leader.total);
    setStatus(els.maxLeaderStatus, setup.leader.status, leaderStatusType(setup.leader.status));
  }
}


function candidateRejectReason(c) {
  if (!c) return 'No candidate';
  if (c.belowFloor) return 'Below 32,000 preferred floor';
  if (c.comp.cavalry > c.comp.archers) return 'Cavalry exceeds Archers';
  if (c.comp.infantry > c.comp.archers && c.comp.infantry > c.comp.cavalry) return 'Infantry dominant';
  return 'Valid candidate';
}

function renderDeveloperMode(allCandidates, recommended, maxMarchSetup, input, elapsedMs) {
  if (!DEVELOPER_MODE) return;
  let panel = document.getElementById('developerModePanel');
  if (!panel) {
    panel = document.createElement('section');
    panel.id = 'developerModePanel';
    panel.className = 'card report-card';
    panel.innerHTML = '<h2>🛠 Developer Mode</h2><p class="note">Toggle with Ctrl + Shift + D</p><div id="developerModeBody" class="report-list"></div>';
    document.querySelector('.app-shell').appendChild(panel);
  }
  const body = document.getElementById('developerModeBody');
  const sorted = [...allCandidates].sort((a, b) => b.score - a.score).slice(0, 12);
  const rejectedCount = allCandidates.filter(c => c.belowFloor).length;
  body.innerHTML = '';
  const summary = document.createElement('div');
  summary.className = 'good';
  summary.textContent = `UI ${VERSION} | Engine ${ENGINE_VERSION} | Build ${BUILD_DATE} | Priority ${strategyLabel(input.strategy)} | Candidates ${allCandidates.length} | Rejected/Below Floor ${rejectedCount} | Winner Score ${recommended ? recommended.score : 'N/A'} | Calc ${elapsedMs.toFixed(2)} ms`;
  body.appendChild(summary);
  for (const c of sorted) {
    const div = document.createElement('div');
    const marker = c === recommended ? '🏆 Winner' : c === maxMarchSetup ? '⚔ Max Marches' : 'Candidate';
    div.className = c.belowFloor ? 'warn' : 'good';
    div.textContent = `${marker}: ${c.joiners} marches @ ${fmt(c.size)} | score ${c.score}/100 | ratio ${pct(c.comp.ratio)} | output ${fmt(c.totalOutput)} | ${candidateRejectReason(c)}`;
    body.appendChild(div);
  }
}

function render() {
  const input = getInputs();
  els.leaderSettings.style.display = 'block';
  els.leaderBreakdownCard.style.display = 'block';

  const analysisStart = performance.now();
  const { recommended, maxMarchSetup, allCandidates } = analyze(input);
  const analysisElapsed = performance.now() - analysisStart;

  if (!recommended) {
    const grade = gradeFromScore(0);
    els.qualityStars.textContent = grade.stars;
    els.qualityLabel.textContent = 'No Setup';
    els.gradeBadge.textContent = grade.grade;
    els.recJoiners.textContent = '—';
    els.recSize.textContent = '—';
    els.recOutput.textContent = '—';
    els.recRatio.textContent = '—';
    els.recSummary.textContent = 'No supported setup found. Lower requirements or train more troops.';
    renderList(els.report, buildReport(null, input));
    els.coach.textContent = buildCoach(null, input);
    renderList(els.insights, []);
    renderMaxSetup(null, null, input);
    return;
  }

  const grade = formationQualityGrade(recommended, input);
  els.qualityStars.textContent = grade.stars;
  els.qualityLabel.textContent = `${grade.grade} Rank · ${grade.label}`;
  els.gradeBadge.textContent = grade.grade;
  els.recJoiners.textContent = fmt(recommended.joiners);
  els.recSize.textContent = fmt(recommended.size);
  els.recOutput.textContent = fmt(recommended.totalOutput);
  els.recRatio.textContent = pct(recommended.comp.ratio);
  els.recSummary.textContent = `${statusRatingText(recommended.comp.ratio)} Formation selected using ${strategyLabel(input.strategy)}. Formation Quality: ${grade.score}/100. Optimizer Score: ${recommended.score}/100.`;

  els.joinArchers.textContent = fmt(recommended.comp.archers);
  els.joinCavalry.textContent = fmt(recommended.comp.cavalry);
  els.joinInfantry.textContent = fmt(recommended.comp.infantry);
  els.joinSize.textContent = fmt(recommended.size);
  els.joinTotal.textContent = fmt(recommended.totalOutput);

  if (recommended.leader) {
    els.leaderArchers.textContent = fmt(recommended.leader.archers);
    if (els.leaderArchersPct) els.leaderArchersPct.textContent = formationPct(recommended.leader.archers, recommended.leader.total);
    els.leaderCavalry.textContent = fmt(recommended.leader.cavalry);
    if (els.leaderCavalryPct) els.leaderCavalryPct.textContent = formationPct(recommended.leader.cavalry, recommended.leader.total);
    els.leaderInfantry.textContent = fmt(recommended.leader.infantry);
    if (els.leaderInfantryPct) els.leaderInfantryPct.textContent = formationPct(recommended.leader.infantry, recommended.leader.total);
    els.leaderTotal.textContent = fmt(recommended.leader.total);
    setStatus(els.leaderStatus, recommended.leader.status, leaderStatusType(recommended.leader.status));
  }

  renderMaxSetup(maxMarchSetup, recommended, input);
  renderDeveloperMode(allCandidates, recommended, maxMarchSetup, input, analysisElapsed);
  renderList(els.report, buildReport(recommended, input));
  els.coach.textContent = buildCoach(recommended, input);
  renderList(els.insights, buildInsights(recommended, maxMarchSetup, input, allCandidates));
}


function formatFormationForCopy(title, comp, totalLabel = 'Total') {
  if (!comp) return [`${title}: N/A`];
  const total = comp.total || (comp.archers + comp.cavalry + comp.infantry);
  return [
    title,
    `🏹 Archers: ${fmt(comp.archers)}${total ? ` (${formationPct(comp.archers, total)})` : ''}`,
    `🐎 Cavalry: ${fmt(comp.cavalry)}${total ? ` (${formationPct(comp.cavalry, total)})` : ''}`,
    `🛡 Infantry: ${fmt(comp.infantry)}${total ? ` (${formationPct(comp.infantry, total)})` : ''}`,
    `${totalLabel}: ${fmt(total)}`,
    comp.status ? `Status: ${comp.status}` : null,
  ].filter(Boolean);
}

function formatJoinerSetupForCopy(title, setup, input, recommendation = null) {
  if (!setup) {
    return [
      title,
      'N/A — not enough troops to support this setup.',
    ];
  }
  const grade = formationQualityGrade(setup, input);
  let status = statusRatingText(setup.comp.ratio);
  if (setup.belowFloor) {
    status = 'Not Recommended — below the 32,000 preferred floor.';
  } else if (recommendation && setup.score + 5 < recommendation.score) {
    status += ' — lower quality than APX Recommendation.';
  }
  return [
    title,
    `Quality: ${grade.grade} Rank · ${grade.label}`,
    `Joiners: ${fmt(setup.joiners)}`,
    `Troops per Joiner: ${fmt(setup.size)}`,
    `Total Joiner Output: ${fmt(setup.totalOutput)}`,
    `Archer Ratio: ${pct(setup.comp.ratio)}`,
    `Status: ${status}`,
    ...formatFormationForCopy('Joiner Formation', setup.comp, 'Per Joiner Total'),
  ];
}

function buildCopyRecommendationText() {
  const input = getInputs();
  const { recommended, maxMarchSetup } = analyze(input);
  if (!recommended) {
    return 'APX Tools could not generate a supported Bear Hunt recommendation with the current inputs.';
  }

  const lines = [
    '🐻 APX Tools - Bear Hunt Optimizer Output',
    `Version: ${VERSION}`,
    `Engine: ${ENGINE_VERSION} (${ENGINE_NAME})`,
    `Priority: ${strategyLabel(input.strategy)}`,
    '',
    'Inputs',
    `🛡 Infantry: ${fmt(input.troops.infantry)}`,
    `🐎 Cavalry: ${fmt(input.troops.cavalry)}`,
    `🏹 Archers: ${fmt(input.troops.archers)}`,
    `Maximum Marches: ${fmt(input.maxMarches)}`,
    `Alliance Rally Cap: ${fmt(input.cap)}`,
    `Rally Leader Target Size: ${fmt(input.leaderSize)}`,
    '',
    ...formatJoinerSetupForCopy('🏆 APX Recommended Setup', recommended, input),
  ];

  if (recommended.leader) {
    lines.push('', ...formatFormationForCopy('👑 Recommended Rally Leader Formation', recommended.leader, 'Leader Total'));
  }

  lines.push('', ...formatJoinerSetupForCopy('⚔️ Maximum Marches Setup', maxMarchSetup, input, recommended));

  if (maxMarchSetup && maxMarchSetup.leader) {
    lines.push('', ...formatFormationForCopy('👑 Maximum Marches Rally Leader Formation', maxMarchSetup.leader, 'Leader Total'));
  } else if (input.leaderSize > 0) {
    lines.push('', '👑 Maximum Marches Rally Leader Formation', 'N/A');
  }

  lines.push('', 'Generated by APX Tools');
  return lines.join('\n');
}
async function copyRecommendation() {
  const text = buildCopyRecommendationText();
  try {
    await navigator.clipboard.writeText(text);
    if (els.copyStatus) els.copyStatus.textContent = 'Copied recommendation to clipboard.';
    if (els.copyButton) {
      els.copyButton.classList.add('is-complete');
      els.copyButton.textContent = '✔ Copied!';
      setTimeout(() => {
        els.copyButton.classList.remove('is-complete');
        els.copyButton.textContent = '📋 Copy Recommendation';
      }, 1200);
    }
  } catch (error) {
    if (els.copyStatus) els.copyStatus.textContent = 'Copy failed. You can still screenshot or manually copy the recommendation.';
  }
}

// v2.4.9 RC3 input performance patch:
// Do not run the full optimizer on every keystroke. Text/select/toggle changes only
// mark the visible result as stale; the engine runs when LET'S GOOOO! is pressed.
function markResultsDirty() {
  setGoButtonState('idle');
  if (els.copyStatus) els.copyStatus.textContent = "Inputs changed. Press LET'S GOOOO! to update the results.";
}

for (const key of ['infantry', 'cavalry', 'archers', 'maxMarches', 'allianceCap', 'leaderSize']) {
  els[key].addEventListener('input', markResultsDirty);
  els[key].addEventListener('change', markResultsDirty);
}

// Priority switching is a deliberate action rather than free-form typing.
// Re-render immediately so users can compare modes without pressing LET'S GOOOO! again.
els.includeLeader.addEventListener('change', () => {
  render();
  els.details.classList.remove('hidden');
  if (els.copyStatus) els.copyStatus.textContent = '';
});

for (const key of ['infantry', 'cavalry', 'archers', 'leaderSize']) {
  els[key].addEventListener('blur', () => {
    formatInputValue(els[key]);
  });
}


els.resetButton.addEventListener('click', () => {
  applyDefaults();
  els.details.classList.add('hidden');
  if (els.copyStatus) els.copyStatus.textContent = '';
  render();
});

if (els.copyButton) {
  els.copyButton.addEventListener('click', copyRecommendation);
}

function setGoButtonState(state) {
  els.goButton.classList.remove('is-working', 'is-complete');
  if (state === 'working') {
    els.goButton.classList.add('is-working');
    els.goButton.textContent = '⚙️ Optimizing...';
  } else if (state === 'complete') {
    els.goButton.classList.add('is-complete');
    els.goButton.textContent = '✔ Optimized!';
  } else {
    els.goButton.textContent = '🔥 LET\'S GOOO!';
  }
}

els.goButton.addEventListener('click', () => {
  setGoButtonState('working');

  window.setTimeout(() => {
    // Run the optimizer once, after the user finishes entering values.
    render();
    if (els.copyStatus) els.copyStatus.textContent = '';

    // LET'S GOOOO is an open-and-scroll action, not a collapse toggle.
    // Results stay open after the first click so users can repeatedly jump back to the recommendation.
    els.details.classList.remove('hidden');
    els.details.classList.add('highlight');
    els.details.scrollIntoView({ behavior: 'smooth', block: 'start' });

    setGoButtonState('complete');
    setTimeout(() => els.details.classList.remove('highlight'), 900);
    setTimeout(() => setGoButtonState('idle'), 1200);
  }, 180);
});

// Hidden Developer Mode toggle for future testing/debugging.
// Press Ctrl + Shift + D to toggle, or add ?dev=1 to the URL.
document.addEventListener('keydown', (event) => {
  if (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === 'd') {
    const next = localStorage.getItem('apxDeveloperMode') !== 'true';
    localStorage.setItem('apxDeveloperMode', next ? 'true' : 'false');
    window.location.reload();
  }
});

// Apply APX baseline defaults on initial load.
applyDefaults();
render();
