/* APX Tools Bear Hunt Optimizer v2.3.5 Beta Source
   Created by Valdrak. Production build is app.min.js. */

const VERSION = '2.3.5 Beta';
const ENGINE_VERSION = '2.3.5';
const BUILD_DATE = '2026-07-06';
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
const STEP = 10; // v2.3: finer troop rounding to maximize Archer usage without ugly numbers.
const MIN_MARCHES = 3;
const MAX_MARCHES = 6;
const DEFAULT_FLOOR = 32000;
const INFANTRY_SOFT_CAP = 0.10;
const MIN_INFANTRY_PER_FORMATION = 1;
const CAVALRY_FLOOR = 0.10;
const ARCHER_IDEAL = 0.70;
const JOINER_ARCHER_ELITE_CEILING = 0.90;
const JOINER_ARCHER_COACH_CEILING = 0.90;
const ARCHER_EXCELLENT = 0.68;
const ARCHER_OPTIMAL = 0.50;
const LEADER_ARCHER_IDEAL = 0.80;
const LEADER_ARCHER_ADVANCED = 0.90;
const LEADER_INF_TARGET = 0.10;
const LEADER_CAV_TARGET = 0.10;
const JOINER_SHARED_ARCHER_THRESHOLD = 0.80;

const STRATEGY_WEIGHTS = {
  joiners: {
    totalOutput: 38,
    archerRatio: 22,
    infantryDiscipline: 12,
    capUse: 12,
    leaderQuality: 8,
    joinerCount: 8,
  },
  leader: {
    totalOutput: 30,
    archerRatio: 12,
    infantryDiscipline: 12,
    capUse: 15,
    leaderQuality: 25,
    joinerCount: 6,
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
    return { infantry: 0, cavalry: 0, archers: 0, total: 0, ratio: 0, fillRatio: 0, status: 'Not configured', mode: 'standard', targetArcherRatio: LEADER_ARCHER_IDEAL };
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

  const infTarget = floorStep(targetSize * LEADER_INF_TARGET);
  const cavTarget = floorStep(targetSize * LEADER_CAV_TARGET);
  const archTarget = floorStep(targetSize * LEADER_ARCHER_IDEAL);

  infantry = Math.min(floorStep(available.infantry), infTarget);
  cavalry = Math.min(floorStep(available.cavalry), cavTarget);
  archers = Math.min(floorStep(available.archers), archTarget);

  let gap = targetSize - infantry - cavalry - archers;

  // If Archers cannot reach 80%, Cavalry is the preferred substitute.
  if (gap > 0) {
    const addCav = Math.min(floorStep(gap), Math.max(0, floorStep(available.cavalry - cavalry)));
    if (addCav > 0) cavalrySubstituted = true;
    cavalry += addCav;
    gap -= addCav;
  }

  // Infantry substitution is allowed only as a final fill option.
  if (gap > 0) {
    const addInf = Math.min(floorStep(gap), Math.max(0, floorStep(available.infantry - infantry)));
    if (addInf > 0) infantrySubstituted = true;
    infantry += addInf;
    gap -= addInf;
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

  return { infantry, cavalry, archers, total, ratio, fillRatio, requestedSize, targetSize, status, cavalrySubstituted, infantrySubstituted, mode: 'standard', targetArcherRatio: LEADER_ARCHER_IDEAL };
}

function buildBestLeaderMarch(leaderSize, available, joinerRatio = 0) {
  const standard = buildLeaderMarch(leaderSize, available, { advanced: false });
  const advanced = buildLeaderMarch(leaderSize, available, { advanced: true });

  // v2.3.2: Once joiners are strong enough, start sharing Archer growth with
  // the Rally Leader instead of continuing to feed all excess Archers into joiners.
  // Advanced Leader may only activate if joiners remain viable at 70%+ Archers.
  const joinersAreProtected = joinerRatio >= ARCHER_IDEAL;
  const joinersAreMature = joinerRatio >= JOINER_SHARED_ARCHER_THRESHOLD;
  const advancedIsUsable = advanced.total > 0 && advanced.fillRatio >= 0.95 && advanced.ratio >= LEADER_ARCHER_IDEAL;
  const advancedImprovesLeader = advanced.ratio > (standard.ratio || 0) + 0.02 || advanced.archers > (standard.archers || 0);

  if (joinersAreProtected && joinersAreMature && advancedIsUsable && advancedImprovesLeader) {
    return advanced;
  }
  return standard;
}

function buildJoinerComp(size, joiners, available) {
  const maxInf = Math.floor(available.infantry / joiners);
  const maxCav = floorStep(available.cavalry / joiners);
  const maxArch = floorStep(available.archers / joiners);

  // v2.3 Formation Integrity:
  // - Every Formation needs at least 1 Infantry when Infantry is available.
  // - Cavalry should be at least 10% when the player has enough Cavalry.
  // - Archers consume as much remaining capacity as possible, up to the practical 90% joiner milestone.
  if (maxInf < MIN_INFANTRY_PER_FORMATION) return null;

  let infantry = MIN_INFANTRY_PER_FORMATION;
  const cavFloor = floorStep(size * CAVALRY_FLOOR);
  let cavalry = Math.min(cavFloor, maxCav);
  let archers = 0;

  let gap = size - infantry - cavalry;
  if (gap < 0) return null;

  // Fill with Archers first, but do not chase beyond the 90% practical joiner ceiling.
  const archerCeiling = floorStep(size * JOINER_ARCHER_ELITE_CEILING);
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
  const comp = { infantry, cavalry, archers, total, ratio: archers / total, infRatio: infantry / total, cavRatio: cavalry / total };
  if (!canPay(comp, joiners, available)) return null;
  return comp;
}
function candidateMetrics(candidate, input) {
  const capUse = input.cap ? candidate.size / input.cap : 0;
  const archerRatio = candidate.comp.ratio;
  const infDiscipline = 1 - clamp((candidate.comp.infRatio - INFANTRY_SOFT_CAP) / 0.20, 0, 1);
  const leaderQuality = input.includeLeader ? qualityLeader(candidate.leader) : 1;
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
  return fill * 0.55 + ratio * 0.45;
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
  if (input.includeLeader && candidate.leader && candidate.leader.mode === 'advanced' && candidate.comp.ratio >= ARCHER_IDEAL) {
    score += input.strategy === 'leader' ? 8 : 5;
  }

  return Math.round(score * 100) / 100;
}

function generateCandidates(input, forceJoiners = null) {
  const candidates = [];
  const min = forceJoiners || MIN_MARCHES;
  const max = forceJoiners || input.maxMarches;

  for (let joiners = min; joiners <= max; joiners++) {
    for (let size = floorStep(input.cap); size >= STEP; size -= STEP) {
      if (input.includeLeader && input.strategy === 'leader') {
        // Leader Priority: test Standard and Advanced Leader reservations.
        const leaderOptions = [buildLeaderMarch(input.leaderSize, input.troops, { advanced: false }), buildLeaderMarch(input.leaderSize, input.troops, { advanced: true })];
        for (const leader of leaderOptions) {
          if (!leader || leader.total <= 0) continue;
          const availableForJoiners = subtractTroops(input.troops, leader, 1);
          const comp = buildJoinerComp(size, joiners, availableForJoiners);
          if (!comp) continue;
          // Advanced Leader is only allowed if the remaining joiners stay viable at 70%+ Archers.
          if (leader.mode === 'advanced' && comp.ratio < ARCHER_IDEAL) continue;
          const candidate = {
            joiners,
            size,
            comp,
            leader,
            totalOutput: comp.total * joiners,
            belowFloor: size < DEFAULT_FLOOR,
          };
          candidate.score = scoreCandidate(candidate, input);
          candidates.push(candidate);
        }
        continue;
      }

      let availableForJoiners = { ...input.troops };
      const comp = buildJoinerComp(size, joiners, availableForJoiners);
      if (!comp) continue;

      // Joiner Priority: optimize joiners first, then still generate a Rally Leader Formation reference
      // from remaining troops so players know what to send if they need to call a rally.
      const remaining = subtractTroops(input.troops, comp, joiners);
      const leader = buildBestLeaderMarch(input.leaderSize, remaining, comp.ratio);

      const candidate = {
        joiners,
        size,
        comp,
        leader,
        totalOutput: comp.total * joiners,
        belowFloor: size < DEFAULT_FLOOR,
      };
      candidate.score = scoreCandidate(candidate, input);
      candidates.push(candidate);
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

  return pool.reduce((best, cur) => {
    // If every candidate is below floor, choose the setup closest to the floor first.
    // This prevents 6 tiny marches from beating fewer, more usable marches.
    if (!aboveFloor.length && cur.size !== best.size) return cur.size > best.size ? cur : best;
    if (cur.score !== best.score) return cur.score > best.score ? cur : best;
    if (cur.totalOutput !== best.totalOutput) return cur.totalOutput > best.totalOutput ? cur : best;
    if (cur.comp.ratio !== best.comp.ratio) return cur.comp.ratio > best.comp.ratio ? cur : best;
    return cur.size > best.size ? cur : best;
  }, pool[0]);
}

function analyze(input) {
  const allCandidates = generateCandidates(input);
  const recommended = bestCandidate(allCandidates, input);
  const maxMarchCandidates = generateCandidates(input, input.maxMarches);
  const maxMarchSetup = bestCandidate(maxMarchCandidates, input);
  return { recommended, maxMarchSetup, allCandidates };
}

function gradeFromScore(score) {
  if (score >= 95) return { grade: 'S+', label: 'Excellent', stars: '★★★★★' };
  if (score >= 90) return { grade: 'S', label: 'Excellent', stars: '★★★★☆' };
  if (score >= 80) return { grade: 'A', label: 'Very Good', stars: '★★★★☆' };
  if (score >= 70) return { grade: 'B', label: 'Good', stars: '★★★☆☆' };
  if (score >= 60) return { grade: 'C', label: 'Fair', stars: '★★☆☆☆' };
  return { grade: 'D', label: 'Limited', stars: '★☆☆☆☆' };
}


function strategyLabel(value) {
  if (value === 'leader') return 'Prioritize Rally Leader';
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
  if (result.size < input.cap) return 'Your troop composition is solid. Continue growing all queues while keeping Archers as the main damage troop.';
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
  if (setup.belowFloor) {
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

  const grade = gradeFromScore(recommended.score);
  els.qualityStars.textContent = grade.stars;
  els.qualityLabel.textContent = `${grade.grade} Rank · ${grade.label}`;
  els.gradeBadge.textContent = grade.grade;
  els.recJoiners.textContent = fmt(recommended.joiners);
  els.recSize.textContent = fmt(recommended.size);
  els.recOutput.textContent = fmt(recommended.totalOutput);
  els.recRatio.textContent = pct(recommended.comp.ratio);
  els.recSummary.textContent = `${statusRatingText(recommended.comp.ratio)} Formation selected using ${strategyLabel(input.strategy)}. Score: ${recommended.score}/100.`;

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


function buildCopyRecommendationText() {
  const input = getInputs();
  const { recommended } = analyze(input);
  if (!recommended) {
    return 'APX Tools could not generate a supported Bear Hunt recommendation with the current inputs.';
  }
  const grade = gradeFromScore(recommended.score);
  const leaderLines = recommended.leader ? [
    '',
    '👑 Rally Leader Formation',
    `🏹 Archers: ${fmt(recommended.leader.archers)}`,
    `🐎 Cavalry: ${fmt(recommended.leader.cavalry)}`,
    `🛡 Infantry: ${fmt(recommended.leader.infantry)}`,
    `Total: ${fmt(recommended.leader.total)}`,
    `Status: ${recommended.leader.status}`,
  ] : [];

  return [
    '🐻 APX Tools - Bear Hunt Recommendation',
    '',
    `🏆 Quality: ${grade.grade} Rank · ${grade.label}`,
    `Priority: ${strategyLabel(input.strategy)}`,
    '',
    `⚔️ Joiners: ${fmt(recommended.joiners)}`,
    `👥 Troops per Joiner: ${fmt(recommended.size)}`,
    `📊 Total Joiner Output: ${fmt(recommended.totalOutput)}`,
    `🏹 Archer Ratio: ${pct(recommended.comp.ratio)}`,
    '',
    '⚔️ Joiner Formation',
    `🏹 Archers: ${fmt(recommended.comp.archers)}`,
    `🐎 Cavalry: ${fmt(recommended.comp.cavalry)}`,
    `🛡 Infantry: ${fmt(recommended.comp.infantry)}`,
    ...leaderLines,
    '',
    'Generated by APX Tools',
  ].join('\n');
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

for (const key of ['infantry', 'cavalry', 'archers', 'maxMarches', 'allianceCap', 'includeLeader', 'leaderSize']) {
  els[key].addEventListener('input', render);
  els[key].addEventListener('change', render);
}

for (const key of ['infantry', 'cavalry', 'archers', 'leaderSize']) {
  els[key].addEventListener('blur', () => {
    formatInputValue(els[key]);
    render();
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
