// Persistent storage
const STORAGE_KEY = 'scrumCapacityData.v1';

/**
 * Data Shape
 * {
 *   teams: Array<{
 *     id: string,
 *     name: string,
 *     baseVelocity: number, // story points per sprint at ideal capacity
 *     dailyFocusHours: number, // per member focus hours per working day
 *     sprint: { name: string, workingDays: number, focusFactor: number },
 *     members: Array<{
 *       id: string,
 *       name: string,
 *       availabilityPct: number, // 0..100
 *       ptoDays: number,
 *       notes: string
 *     }>
 *   }>,
 *   selectedTeamId?: string
 * }
 */

// Utilities
function uid(prefix = 'id') {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}
function clamp(num, min, max) {
  return Math.min(max, Math.max(min, num));
}
function save(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}
function load() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

// Defaults
function createDefaultTeam(name = 'New Team') {
  return {
    id: uid('team'),
    name,
    baseVelocity: 30,
    dailyFocusHours: 6,
    sprint: {
      name: 'Sprint',
      workingDays: 10,
      focusFactor: 0.9
    },
    members: []
  };
}

// State
let state = load() || {
  teams: [createDefaultTeam('Team Alpha')],
  selectedTeamId: null
};
if (!state.selectedTeamId && state.teams.length > 0) {
  state.selectedTeamId = state.teams[0].id;
}
save(state);

// DOM
const els = {
  teamList: document.getElementById('teamList'),
  newTeamName: document.getElementById('newTeamName'),
  addTeamBtn: document.getElementById('addTeamBtn'),
  exportBtn: document.getElementById('exportBtn'),
  importInput: document.getElementById('importInput'),
  resetBtn: document.getElementById('resetBtn'),

  teamTitle: document.getElementById('teamTitle'),
  baseVelocity: document.getElementById('baseVelocity'),
  dailyFocusHours: document.getElementById('dailyFocusHours'),
  deleteTeamBtn: document.getElementById('deleteTeamBtn'),

  sprintName: document.getElementById('sprintName'),
  workingDays: document.getElementById('workingDays'),
  focusFactor: document.getElementById('focusFactor'),

  newMemberName: document.getElementById('newMemberName'),
  addMemberBtn: document.getElementById('addMemberBtn'),
  memberTable: document.getElementById('memberTable'),

  idealHours: document.getElementById('idealHours'),
  availableHours: document.getElementById('availableHours'),
  availabilityPct: document.getElementById('availabilityPct'),
  adjustedVelocity: document.getElementById('adjustedVelocity')
};

function getSelectedTeam() {
  return state.teams.find(t => t.id === state.selectedTeamId) || null;
}

// Render
function renderTeams() {
  els.teamList.innerHTML = '';
  state.teams.forEach(team => {
    const item = document.createElement('div');
    item.className = 'team-item' + (team.id === state.selectedTeamId ? ' active' : '');
    item.onclick = () => {
      state.selectedTeamId = team.id;
      save(state);
      renderAll();
    };

    const left = document.createElement('div');
    left.style.display = 'grid';
    left.style.gap = '4px';
    const name = document.createElement('div');
    name.className = 'name';
    name.textContent = team.name;
    const meta = document.createElement('div');
    meta.className = 'meta';
    meta.textContent = `${team.members.length} members`;
    left.appendChild(name);
    left.appendChild(meta);

    const right = document.createElement('div');
    right.className = 'meta';
    right.textContent = `${team.baseVelocity} pts`;

    item.appendChild(left);
    item.appendChild(right);
    els.teamList.appendChild(item);
  });
}

function renderTeamHeader(team) {
  if (!team) {
    els.teamTitle.textContent = 'Select or create a team';
    els.baseVelocity.value = '';
    els.dailyFocusHours.value = '';
    els.deleteTeamBtn.disabled = true;
    return;
  }
  els.teamTitle.textContent = team.name;
  els.baseVelocity.value = team.baseVelocity;
  els.dailyFocusHours.value = team.dailyFocusHours;
  els.deleteTeamBtn.disabled = false;
}

function renderSprint(team) {
  if (!team) {
    els.sprintName.value = '';
    els.workingDays.value = '';
    els.focusFactor.value = '';
    return;
  }
  els.sprintName.value = team.sprint.name;
  els.workingDays.value = team.sprint.workingDays;
  els.focusFactor.value = team.sprint.focusFactor;
}

function renderMembers(team) {
  // Clear existing rows (except header)
  const nodes = Array.from(els.memberTable.querySelectorAll('.member-row')).slice(1);
  nodes.forEach(n => n.remove());
  if (!team) return;

  team.members.forEach(member => {
    const row = document.createElement('div');
    row.className = 'member-row';

    const name = document.createElement('input');
    name.type = 'text';
    name.value = member.name;
    name.onchange = () => {
      member.name = name.value.trim() || 'Member';
      save(state); renderAll();
    };
    row.appendChild(name);

    const avail = document.createElement('input');
    avail.type = 'number';
    avail.min = '0'; avail.max = '100'; avail.step = '1';
    avail.value = member.availabilityPct;
    avail.oninput = () => {
      member.availabilityPct = clamp(Number(avail.value || 0), 0, 100);
      save(state); renderSummary(team);
    };
    row.appendChild(avail);

    const pto = document.createElement('input');
    pto.type = 'number';
    pto.min = '0'; pto.max = String(team.sprint.workingDays); pto.step = '0.5';
    pto.value = member.ptoDays;
    pto.oninput = () => {
      member.ptoDays = clamp(Number(pto.value || 0), 0, team.sprint.workingDays);
      save(state); renderSummary(team);
    };
    row.appendChild(pto);

    const notes = document.createElement('input');
    notes.type = 'text';
    notes.value = member.notes || '';
    notes.onchange = () => {
      member.notes = notes.value;
      save(state);
    };
    row.appendChild(notes);

    const actions = document.createElement('div');
    const del = document.createElement('button');
    del.className = 'danger';
    del.textContent = 'Remove';
    del.onclick = () => {
      team.members = team.members.filter(m => m.id !== member.id);
      save(state); renderAll();
    };
    actions.appendChild(del);
    row.appendChild(actions);

    els.memberTable.appendChild(row);
  });
}

function calcSummary(team) {
  if (!team) {
    return { idealHours: 0, availableHours: 0, availabilityRatio: 0, adjustedVelocity: 0 };
  }
  const workingDays = clamp(Number(team.sprint.workingDays || 0), 0, 30);
  const dailyHours = Math.max(0, Number(team.dailyFocusHours || 0));
  const focusFactor = clamp(Number(team.sprint.focusFactor || 0), 0, 1);
  const baseVelocity = Math.max(0, Number(team.baseVelocity || 0));

  const idealHours = team.members.length * dailyHours * workingDays;
  let availableHours = 0;
  team.members.forEach(m => {
    const hasOverrides = m.dailyOverrides && Object.values(m.dailyOverrides).some(v => v != null);
    if (hasOverrides) {
      const keys = Object.keys(m.dailyOverrides || {});
      const dateKeys = keys.filter(k => k.includes('-')); // ISO date keys
      if (dateKeys.length > 0) {
        dateKeys.forEach(k => {
          const ov = m.dailyOverrides[k];
          let pct;
          if (ov == null) {
            pct = clamp(Number(m.availabilityPct || 0), 0, 100);
          } else if (ov === '1') {
            pct = 100;
          } else if (ov === '0.5') {
            pct = 50;
          } else if (ov === 'h' || ov === 'p' || ov === 's') {
            pct = 0;
          } else {
            // Back-compat: if a numeric was stored
            pct = clamp(Number(ov || 0), 0, 100);
          }
          availableHours += dailyHours * (pct / 100);
        });
      } else {
        for (let d = 1; d <= workingDays; d++) {
          const ov = m.dailyOverrides?.[d];
          const pct = ov == null ? clamp(Number(m.availabilityPct || 0), 0, 100) : clamp(Number(ov || 0), 0, 100);
          availableHours += dailyHours * (pct / 100);
        }
      }
    } else {
      const availability = clamp(Number(m.availabilityPct || 0), 0, 100) / 100;
      const ptoDays = clamp(Number(m.ptoDays || 0), 0, workingDays);
      const memberDays = Math.max(0, workingDays - ptoDays);
      availableHours += memberDays * dailyHours * availability;
    }
  });
  const availabilityRatio = idealHours > 0 ? availableHours / idealHours : 0;
  const adjustedVelocity = Math.round((baseVelocity * availabilityRatio * focusFactor) * 100) / 100;
  return { idealHours, availableHours, availabilityRatio, adjustedVelocity };
}

function renderSummary(team) {
  const s = calcSummary(team);
  els.idealHours.textContent = s.idealHours.toFixed(1);
  els.availableHours.textContent = s.availableHours.toFixed(1);
  els.availabilityPct.textContent = `${(s.availabilityRatio * 100).toFixed(1)}%`;
  els.adjustedVelocity.textContent = s.adjustedVelocity.toFixed(2);
}

function renderAll() {
  renderTeams();
  const team = getSelectedTeam();
  renderTeamHeader(team);
  renderSprint(team);
  renderMembers(team);
  renderSummary(team);
}

// Events
els.addTeamBtn.onclick = () => {
  const name = (els.newTeamName.value || '').trim() || 'New Team';
  const team = createDefaultTeam(name);
  state.teams.push(team);
  state.selectedTeamId = team.id;
  els.newTeamName.value = '';
  save(state); renderAll();
};
els.exportBtn.onclick = () => {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'scrum_capacity_data.json';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};
els.importInput.onchange = async (e) => {
  const file = e.target.files?.[0];
  if (!file) return;
  try {
    const text = await file.text();
    const parsed = JSON.parse(text);
    if (!parsed || !Array.isArray(parsed.teams)) throw new Error('Invalid file');
    state = parsed;
    save(state); renderAll();
  } catch (err) {
    alert('Failed to import data. Ensure the file was exported from this app.');
  } finally {
    e.target.value = '';
  }
};
els.resetBtn.onclick = () => {
  if (!confirm('Reset all data? This cannot be undone.')) return;
  state = { teams: [createDefaultTeam('Team Alpha')], selectedTeamId: null };
  state.selectedTeamId = state.teams[0].id;
  save(state); renderAll();
};

els.deleteTeamBtn.onclick = () => {
  const team = getSelectedTeam();
  if (!team) return;
  if (!confirm(`Delete team "${team.name}"?`)) return;
  state.teams = state.teams.filter(t => t.id !== team.id);
  state.selectedTeamId = state.teams[0]?.id || null;
  save(state); renderAll();
};

els.baseVelocity.oninput = () => {
  const team = getSelectedTeam(); if (!team) return;
  team.baseVelocity = Math.max(0, Number(els.baseVelocity.value || 0));
  save(state); renderSummary(team);
};
els.dailyFocusHours.oninput = () => {
  const team = getSelectedTeam(); if (!team) return;
  team.dailyFocusHours = Math.max(0, Number(els.dailyFocusHours.value || 0));
  save(state); renderSummary(team);
};

els.sprintName.onchange = () => {
  const team = getSelectedTeam(); if (!team) return;
  team.sprint.name = els.sprintName.value || 'Sprint';
  save(state); renderTeams();
};
els.workingDays.oninput = () => {
  const team = getSelectedTeam(); if (!team) return;
  team.sprint.workingDays = clamp(Number(els.workingDays.value || 0), 0, 30);
  // update max PTO for inputs
  renderMembers(team);
  save(state); renderSummary(team);
};
els.focusFactor.oninput = () => {
  const team = getSelectedTeam(); if (!team) return;
  team.sprint.focusFactor = clamp(Number(els.focusFactor.value || 0), 0, 1);
  save(state); renderSummary(team);
};

els.addMemberBtn.onclick = () => {
  const team = getSelectedTeam(); if (!team) return;
  const name = (els.newMemberName.value || '').trim() || `Member ${team.members.length + 1}`;
  team.members.push({
    id: uid('member'),
    name,
    availabilityPct: 100,
    ptoDays: 0,
    notes: ''
  });
  els.newMemberName.value = '';
  save(state); renderAll();
};

// Init
renderAll();


