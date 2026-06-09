const els = {
  infantry: document.getElementById('infantry'),
  cavalry: document.getElementById('cavalry'),
  archers: document.getElementById('archers'),
  joiners: document.getElementById('joiners'),
  allianceCap: document.getElementById('allianceCap'),
  includeLeader: document.getElementById('includeLeader'),
  leaderSettings: document.getElementById('leaderSettings'),
  leaderSize: document.getElementById('leaderSize'),
  priority: document.getElementById('priority'),
  ratingBadge: document.getElementById('ratingBadge'),
  recJoiners: document.getElementById('recJoiners'),
  recSize: document.getElementById('recSize'),
  recRatio: document.getElementById('recRatio'),
  recLeader: document.getElementById('recLeader'),
  recOutput: document.getElementById('recOutput'),
  primaryNote: document.getElementById('primaryNote'),
  goButton: document.getElementById('goButton'),
  details: document.getElementById('details'),
  joinArchers: document.getElementById('joinArchers'),
  joinInfantry: document.getElementById('joinInfantry'),
  joinCavalry: document.getElementById('joinCavalry'),
  joinTotal: document.getElementById('joinTotal'),
  leaderBreakdownCard: document.getElementById('leaderBreakdownCard'),
  leaderArchers: document.getElementById('leaderArchers'),
  leaderInfantry: document.getElementById('leaderInfantry'),
  leaderCavalry: document.getElementById('leaderCavalry'),
  leaderTotal: document.getElementById('leaderTotal'),
  leaderStatus: document.getElementById('leaderStatus'),
  planner: document.getElementById('planner'),
};

const VERSION = 'V8';
const PREFERRED_FLOOR = 32000;
const MIN_JOINERS = 3;
const MAX_JOINERS = 6;
const STEP = 50;
const IDEAL_JOINER_ARCHER = 0.70;
const MIN_JOINER_ARCHER = 0.50;
const LEADER_IDEAL_ARCHER = 0.80;
const MIN_LEADER_ARCHER = 0.50;

function num(el) {
  const n = Number(el.value);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function fmt(n) {
  if (!Number.isFinite(n)) return '—';
  return Math.floor(n).toLocaleString('en-US');
}

function floorStep(n, step = STEP) {
  return Math.max(0, Math.floor(n / step) * step);
}

function rate(ratio) {
  if (ratio >= 0.68) return { label: 'Excellent', cls: 'excellent' };
  if (ratio >= 0.50) return { label: 'Optimal', cls: 'optimal' };
  return { label: 'Participate Anyway', cls: 'participate' };
}

function subtractTroops(troops, comp, count = 1) {
  return {
    infantry: troops.infantry - comp.infantry * count,
    cavalry: troops.cavalry - comp.cavalry * count,
    archers: troops.archers - comp.archers * count,
  };
}

function canPay(comp, count, troops) {
  return comp.archers * count <= troops.archers
    && comp.infantry * count <= troops.infantry
    && comp.cavalry * count <= troops.cavalry;
}

function makeJoinerComp(size, joiners, available) {
  const maxArchPer = floorStep(available.archers / joiners);
  const maxInfPer = floorStep(available.infantry / joiners);
  const maxCavPer = floorStep(available.cavalry / joiners);

  // Start as close as possible to the 15/15/70 ideal.
  let archers = Math.min(floorStep(size * IDEAL_JOINER_ARCHER), maxArchPer);
  let remaining = size - archers;
  let infantry = Math.min(floorStep(remaining / 2), maxInfPer);
  let cavalry = Math.min(floorStep(remaining / 2), maxCavPer);

  let total = archers + infantry + cavalry;
  let gap = size - total;

  // If one side troop is short, fill with the other side troop first.
  if (gap > 0) {
    const addCav = Math.min(floorStep(gap), Math.max(0, maxCavPer - cavalry));
    cavalry += addCav;
    gap -= addCav;
  }
  if (gap > 0) {
    const addInf = Math.min(floorStep(gap), Math.max(0, maxInfPer - infantry));
    infantry += addInf;
    gap -= addInf;
  }
  // If both side troops are short, allow extra archers to fill. This can exceed 70%,
  // which is acceptable because archers are the damage troop.
  if (gap > 0) {
    const addArch = Math.min(floorStep(gap), Math.max(0, maxArchPer - archers));
    archers += addArch;
    gap -= addArch;
  }

  total = archers + infantry + cavalry;
  if (total < size) return null;
  if (!canPay({ archers, infantry, cavalry }, joiners, available)) return null;

  return { archers, infantry, cavalry, total, ratio: total ? archers / total : 0 };
}

function leaderComp(leaderSize, available, minArcherRatio = 0) {
  const requestedSize = floorStep(leaderSize);
  let targetSize = requestedSize;
  if (targetSize <= 0) return { archers: 0, infantry: 0, cavalry: 0, total: 0, ratio: 0, status: 'Not configured', targetSize: 0, requestedSize: floorStep(leaderSize) };

  // If a minimum archer ratio is required, cap the Leader march size instead of
  // stuffing it full with infantry/cavalry and creating a weak leader march.
  if (minArcherRatio > 0) {
    const maxByArchers = floorStep(floorStep(available.archers) / minArcherRatio);
    targetSize = Math.min(targetSize, maxByArchers);
  }

  targetSize = Math.min(targetSize, floorStep(available.infantry + available.cavalry + available.archers));

  const targetInf = floorStep(targetSize * 0.10);
  const targetCav = floorStep(targetSize * 0.10);
  const targetArch = floorStep(targetSize * LEADER_IDEAL_ARCHER);

  let infantry = Math.min(targetInf, floorStep(available.infantry));
  let cavalry = Math.min(targetCav, floorStep(available.cavalry));
  let archers = Math.min(targetArch, floorStep(available.archers));

  let total = infantry + cavalry + archers;
  let gap = targetSize - total;

  // If archers are short, cavalry can substitute first, then infantry.
  if (gap > 0) {
    const extraCav = Math.min(floorStep(gap), Math.max(0, floorStep(available.cavalry - cavalry)));
    cavalry += extraCav;
    gap -= extraCav;
  }
  if (gap > 0) {
    const extraInf = Math.min(floorStep(gap), Math.max(0, floorStep(available.infantry - infantry)));
    infantry += extraInf;
    gap -= extraInf;
  }
  if (gap > 0) {
    const extraArch = Math.min(floorStep(gap), Math.max(0, floorStep(available.archers - archers)));
    archers += extraArch;
    gap -= extraArch;
  }

  total = infantry + cavalry + archers;
  const ratio = total ? archers / total : 0;
  let status = 'Ideal';
  if (total < targetSize) status = 'Unable to fully fill';
  else if (archers < targetArch) status = 'Archer-light, cavalry/infantry substituted';

  return { archers, infantry, cavalry, total, ratio, status, targetSize, requestedSize };
}

function candidateLeaderOk(leader, includeLeader, strictLeaderRatio) {
  if (!includeLeader) return true;
  if (!leader || leader.total <= 0) return false;
  const leaderFloor = Math.min(PREFERRED_FLOOR, leader.requestedSize || PREFERRED_FLOOR);
  if (leader.total < leaderFloor) return false;
  if (strictLeaderRatio && leader.ratio < MIN_LEADER_ARCHER) return false;
  return true;
}

function generateCandidates(troops, cap, includeLeader, leaderSize, options) {
  const { allowBelowFloor, requireJoinerRatio, requireLeaderRatio } = options;
  const minSize = allowBelowFloor ? STEP : Math.min(PREFERRED_FLOOR, cap);
  const maxUserJoiners = Math.min(MAX_JOINERS, Math.max(MIN_JOINERS, Number(els.joiners.value) || MIN_JOINERS));
  const desired = maxUserJoiners;
  const candidates = [];

  // Maximum Marches is a hard cap based on what the player can actually send.
  // We can recommend fewer, but never more than this selected maximum.
  for (let joiners = MIN_JOINERS; joiners <= maxUserJoiners; joiners++) {
    for (let size = floorStep(cap); size >= minSize; size -= STEP) {
      const comp = makeJoinerComp(size, joiners, troops);
      if (!comp) continue;
      if (requireJoinerRatio && comp.ratio < MIN_JOINER_ARCHER) continue;

      let leader = null;
      if (includeLeader) {
        const afterJoiners = subtractTroops(troops, comp, joiners);
        leader = leaderComp(leaderSize, afterJoiners, requireLeaderRatio ? MIN_LEADER_ARCHER : 0);
        if (!candidateLeaderOk(leader, includeLeader, requireLeaderRatio)) continue;
      }

      const totalOutput = comp.total * joiners;
      candidates.push({
        joiners,
        size,
        comp,
        leader,
        totalOutput,
        belowFloor: size < PREFERRED_FLOOR,
        desiredDelta: Math.abs(joiners - desired),
      });
    }
  }
  return candidates;
}

function scoreCandidate(c, priority, includeLeader, leaderSize) {
  const leaderFill = includeLeader && leaderSize ? Math.min(1, c.leader.total / floorStep(leaderSize)) : 1;
  const leaderRatio = includeLeader ? c.leader.ratio : 1;

  // Use a weighted score so tiny invalid-looking rallies cannot beat reasonable floor options.
  // Primary filters handle floor/ratio first; this score ranks the valid options.
  let score = 0;

  if (priority === 'leader' && includeLeader) {
    score += leaderFill * 10_000_000;
    score += leaderRatio * 2_000_000;
    score += c.totalOutput * 10;
    score += c.joiners * 1_000;
    score += c.size;
  } else {
    score += c.totalOutput * 20;
    score += c.joiners * 100_000;
    score += c.comp.ratio * 1_000_000;
    score += leaderRatio * 500_000;
    score += leaderFill * 250_000;
    score += c.size;
  }

  // Mild preference for using the player's selected maximum when two setups are very close,
  // without allowing the optimizer to exceed their available march count.
  score -= c.desiredDelta * 250;
  return score;
}

function bestOf(candidates, priority, includeLeader, leaderSize) {
  if (!candidates.length) return null;
  return candidates.reduce((best, cur) => {
    return scoreCandidate(cur, priority, includeLeader, leaderSize) > scoreCandidate(best, priority, includeLeader, leaderSize) ? cur : best;
  }, candidates[0]);
}

function findBestJoinerSetup(troops, cap, includeLeader, priority, leaderSize) {
  // Strict phases first. Below-floor or sub-50% joiner setups are only true last resorts.
  const phases = [
    { allowBelowFloor: false, requireJoinerRatio: true, requireLeaderRatio: true },
    { allowBelowFloor: false, requireJoinerRatio: true, requireLeaderRatio: false },
    { allowBelowFloor: false, requireJoinerRatio: false, requireLeaderRatio: false },
    { allowBelowFloor: true, requireJoinerRatio: true, requireLeaderRatio: true },
    { allowBelowFloor: true, requireJoinerRatio: true, requireLeaderRatio: false },
    { allowBelowFloor: true, requireJoinerRatio: false, requireLeaderRatio: false },
  ];

  for (const phase of phases) {
    const candidates = generateCandidates(troops, cap, includeLeader, leaderSize, phase);
    const best = bestOf(candidates, priority, includeLeader, leaderSize);
    if (best) return { ...best, phase };
  }
  return null;
}

function planner(result, troops, includeLeader, leaderSize) {
  const items = [];
  if (!result) {
    items.push(['Recommendation', 'Train more troops across all three types.']);
    return items;
  }

  const idealArchPerJoiner = floorStep(result.size * IDEAL_JOINER_ARCHER);
  const archGap = Math.max(0, idealArchPerJoiner - result.comp.archers) * result.joiners;
  const capGap = Math.max(0, Number(els.allianceCap.value) - result.size);

  items.push(['Total Joiner Output', fmt(result.totalOutput)]);

  if (archGap > 0) items.push(['Priority Training', `Archers +${fmt(archGap)} to move closer to 70% joiners.`]);
  else items.push(['Priority Training', 'Keep all troop queues running; archers remain your key damage troop.']);

  if (capGap > 0) items.push(['Next Goal', `Grow toward ${fmt(Number(els.allianceCap.value))} joiner size while preserving total output.`]);
  if (result.belowFloor) items.push(['Caution', 'Below preferred 32,000 joiner size. Participate for rewards and continue training.']);
  if (result.comp.ratio < MIN_JOINER_ARCHER) items.push(['Caution', 'Joiner archer ratio is below 50%. Participate anyway, but train more archers.']);

  if (includeLeader && result.leader) {
    if (result.leader.total < floorStep(leaderSize)) items.push(['Rally Leader', `Leader march is limited to ${fmt(result.leader.total)}. Train more troops to fully support ${fmt(leaderSize)}.`]);
    if (result.leader.ratio < MIN_LEADER_ARCHER) items.push(['Rally Leader', 'Leader march is archer-light. Train more archers before increasing joiner load.']);
  }

  return items;
}

function render() {
  const troops = {
    infantry: num(els.infantry),
    cavalry: num(els.cavalry),
    archers: num(els.archers),
  };
  const cap = num(els.allianceCap);
  const includeLeader = els.includeLeader.checked;
  const priority = els.priority.value;
  const leaderSize = num(els.leaderSize);

  els.leaderSettings.style.display = includeLeader ? 'block' : 'none';
  els.leaderBreakdownCard.style.display = includeLeader ? 'block' : 'none';

  const result = findBestJoinerSetup(troops, cap, includeLeader, priority, leaderSize);

  if (!result) {
    els.recJoiners.textContent = '—';
    els.recSize.textContent = '—';
    els.recRatio.textContent = '—';
    els.recLeader.textContent = includeLeader ? 'Not supported' : 'Off';
    els.recOutput.textContent = '—';
    els.ratingBadge.textContent = 'No Setup';
    els.ratingBadge.className = 'badge bad';
    els.primaryNote.textContent = 'No supported setup found. Reduce Rally Leader size, reduce requirements, or train more troops.';
    return;
  }

  const rating = rate(result.comp.ratio);
  els.ratingBadge.textContent = rating.label;
  els.ratingBadge.className = `badge ${rating.cls}`;
  els.recJoiners.textContent = fmt(result.joiners);
  els.recSize.textContent = fmt(result.size);
  els.recRatio.textContent = `${(result.comp.ratio * 100).toFixed(1)}%`;
  els.recLeader.textContent = includeLeader ? (result.leader?.total >= floorStep(leaderSize) ? 'Supported' : 'Limited') : 'Off';
  els.recOutput.textContent = fmt(result.totalOutput);

  const notes = [];
  if (result.belowFloor) notes.push('Below preferred 32,000 joiner size. Participate for rewards and continue training troops.');
  else notes.push('Recommendation maximizes total joiner output while keeping joiners at or above the preferred 32,000 floor when possible.');
  if (includeLeader && priority === 'leader') notes.push('Rally Leader quality is weighted first, then joiner output.');
  if (includeLeader && priority === 'joiners') notes.push('Joiner output is weighted first, while protecting the Rally Leader from being drained too low.');
  if (includeLeader && result.leader?.ratio < MIN_LEADER_ARCHER) notes.push('Leader march is archer-light; consider reducing joiner load or training archers.');
  els.primaryNote.textContent = notes.join(' ');

  els.joinArchers.textContent = fmt(result.comp.archers);
  els.joinInfantry.textContent = fmt(result.comp.infantry);
  els.joinCavalry.textContent = fmt(result.comp.cavalry);
  els.joinTotal.textContent = fmt(result.totalOutput);

  if (includeLeader && result.leader) {
    els.leaderArchers.textContent = fmt(result.leader.archers);
    els.leaderInfantry.textContent = fmt(result.leader.infantry);
    els.leaderCavalry.textContent = fmt(result.leader.cavalry);
    els.leaderTotal.textContent = fmt(result.leader.total);
    els.leaderStatus.textContent = `${result.leader.status} (${(result.leader.ratio * 100).toFixed(1)}% archers)`;
  } else {
    els.leaderArchers.textContent = '—';
    els.leaderInfantry.textContent = '—';
    els.leaderCavalry.textContent = '—';
    els.leaderTotal.textContent = '—';
    els.leaderStatus.textContent = 'Off';
  }

  els.planner.innerHTML = '';
  for (const [label, value] of planner(result, troops, includeLeader, leaderSize)) {
    const div = document.createElement('div');
    div.className = 'planner-item';
    div.innerHTML = `<span>${label}</span><strong>${value}</strong>`;
    els.planner.appendChild(div);
  }
}

for (const key of ['infantry','cavalry','archers','joiners','allianceCap','includeLeader','leaderSize','priority']) {
  els[key].addEventListener('input', render);
  els[key].addEventListener('change', render);
}

els.goButton.addEventListener('click', () => {
  els.details.classList.toggle('hidden');
  els.details.classList.add('highlight');
  els.details.scrollIntoView({ behavior: 'smooth', block: 'start' });
  setTimeout(() => els.details.classList.remove('highlight'), 900);
});

render();
