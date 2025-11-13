const STORAGE_KEY = 'scrumCapacityData.v1';
function save(data) { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); }
function load() { try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || null; } catch { return null; } }
function clamp(n, min, max) { return Math.min(max, Math.max(min, n)); }

let state = load();
if (!state || !Array.isArray(state.teams) || state.teams.length === 0) {
  document.body.innerHTML = '<div style="padding:24px;color:#e5e7eb">No data found. Open <a href="./index.html">planner</a> to create a team first.</div>';
  throw new Error('no data');
}

const els = {
  teamList: document.getElementById('teamList'),
  teamTitle: document.getElementById('teamTitle'),
  tableContainer: document.getElementById('tableContainer'),
  newDevName: document.getElementById('newDevName'),
  addDevBtn: document.getElementById('addDevBtn')
};

function getSelectedTeam() {
  return state.teams.find(t => t.id === state.selectedTeamId) || state.teams[0];
}

function ensureMemberFields(member) {
  if (member.shortcut == null) member.shortcut = '';
  if (member.job == null) member.job = 'Fullstack'; // Backend, Frontend, Devops, Fullstack
  if (member.workRatioPct == null) member.workRatioPct = 100;
  if (member.hoursPerDay == null) member.hoursPerDay = 6;
  if (member.costPerHour == null) member.costPerHour = 0;
  if (member.overheadRatioPct == null) member.overheadRatioPct = 20;
  if (member.specialJobsRatioPct == null) member.specialJobsRatioPct = 0;
  if (member.productMaintainRatioPct == null) member.productMaintainRatioPct = 30;
  if (member.productDevelopmentRatioPct == null) member.productDevelopmentRatioPct = 50;
  if (member.velocitySpPerDay == null) member.velocitySpPerDay = 1;
}

function renderTeams() {
  els.teamList.innerHTML = '';
  state.teams.forEach(team => {
    const item = document.createElement('div');
    item.className = 'team-item' + (team.id === state.selectedTeamId ? ' active' : '');
    item.onclick = () => {
      state.selectedTeamId = team.id;
      save(state); renderAll();
    };
    const left = document.createElement('div');
    const name = document.createElement('div');
    name.className = 'name';
    name.textContent = team.name;
    const meta = document.createElement('div');
    meta.className = 'meta';
    meta.textContent = `${team.members.length} members`;
    left.style.display = 'grid'; left.style.gap = '4px';
    left.appendChild(name); left.appendChild(meta);
    item.appendChild(left);
    els.teamList.appendChild(item);
  });
}

function renderTable(team) {
  const table = document.createElement('table');
  table.className = 'dev-table';
  const thead = document.createElement('thead');
  const trh = document.createElement('tr');
  [
    { k: 'Name', cls: 'col-name' },
    { k: 'Shortcut', cls: 'col-short' },
    { k: 'Job', cls: 'col-job' },
    { k: 'Work ratio %', cls: 'col-num' },
    { k: 'Hours/day', cls: 'col-num' },
    { k: 'Cost/hour', cls: 'col-num' },
    { k: 'Overhead %', cls: 'col-num' },
    { k: 'Special jobs %', cls: 'col-num' },
    { k: 'Maintain %', cls: 'col-num' },
    { k: 'Development %', cls: 'col-num' },
    { k: 'Velocity SP/day', cls: 'col-num' },
    { k: '', cls: 'row-actions' }
  ].forEach(col => {
    const th = document.createElement('th'); th.textContent = col.k; if (col.cls) th.className = col.cls;
    trh.appendChild(th);
  });
  thead.appendChild(trh);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  team.members.forEach(member => {
    ensureMemberFields(member);
    const tr = document.createElement('tr');
    // Name
    const tdName = document.createElement('td'); tdName.className = 'col-name';
    const inName = document.createElement('input'); inName.type = 'text'; inName.value = member.name || '';
    inName.onchange = () => { member.name = inName.value.trim() || 'Member'; save(state); renderTeams(); };
    tdName.appendChild(inName); tr.appendChild(tdName);
    // Shortcut
    const tdShort = document.createElement('td'); tdShort.className = 'col-short';
    const inShort = document.createElement('input'); inShort.type = 'text'; inShort.value = member.shortcut || '';
    inShort.onchange = () => { member.shortcut = inShort.value.trim(); save(state); };
    tdShort.appendChild(inShort); tr.appendChild(tdShort);
    // Job
    const tdJob = document.createElement('td'); tdJob.className = 'col-job';
    const selJob = document.createElement('select');
    ['Backend', 'Frontend', 'Devops', 'Fullstack'].forEach(job => {
      const opt = document.createElement('option'); opt.value = job; opt.textContent = job; selJob.appendChild(opt);
    });
    selJob.value = member.job;
    selJob.onchange = () => { member.job = selJob.value; save(state); };
    tdJob.appendChild(selJob); tr.appendChild(tdJob);
    // Work ratio %
    const tdWork = document.createElement('td'); tdWork.className = 'col-num';
    const inWork = document.createElement('input'); inWork.type = 'number'; inWork.min = '0'; inWork.max = '100'; inWork.step = '1'; inWork.value = String(member.workRatioPct);
    inWork.oninput = () => { member.workRatioPct = clamp(Number(inWork.value || 0), 0, 100); save(state); };
    tdWork.appendChild(inWork); tr.appendChild(tdWork);
    // Hours/day
    const tdHours = document.createElement('td'); tdHours.className = 'col-num';
    const inHours = document.createElement('input'); inHours.type = 'number'; inHours.min = '0'; inHours.step = '0.5'; inHours.value = String(member.hoursPerDay);
    inHours.oninput = () => { member.hoursPerDay = Math.max(0, Number(inHours.value || 0)); save(state); };
    tdHours.appendChild(inHours); tr.appendChild(tdHours);
    // Cost/hour
    const tdCost = document.createElement('td'); tdCost.className = 'col-num';
    const inCost = document.createElement('input'); inCost.type = 'number'; inCost.min = '0'; inCost.step = '1'; inCost.value = String(member.costPerHour);
    inCost.oninput = () => { member.costPerHour = Math.max(0, Number(inCost.value || 0)); save(state); };
    tdCost.appendChild(inCost); tr.appendChild(tdCost);
    // Overhead %
    const tdOver = document.createElement('td'); tdOver.className = 'col-num';
    const inOver = document.createElement('input'); inOver.type = 'number'; inOver.min = '0'; inOver.max = '100'; inOver.step = '1'; inOver.value = String(member.overheadRatioPct);
    inOver.oninput = () => { member.overheadRatioPct = clamp(Number(inOver.value || 0), 0, 100); save(state); };
    tdOver.appendChild(inOver); tr.appendChild(tdOver);
    // Special jobs %
    const tdSpec = document.createElement('td'); tdSpec.className = 'col-num';
    const inSpec = document.createElement('input'); inSpec.type = 'number'; inSpec.min = '0'; inSpec.max = '100'; inSpec.step = '1'; inSpec.value = String(member.specialJobsRatioPct);
    inSpec.oninput = () => { member.specialJobsRatioPct = clamp(Number(inSpec.value || 0), 0, 100); save(state); };
    tdSpec.appendChild(inSpec); tr.appendChild(tdSpec);
    // Maintain %
    const tdMain = document.createElement('td'); tdMain.className = 'col-num';
    const inMain = document.createElement('input'); inMain.type = 'number'; inMain.min = '0'; inMain.max = '100'; inMain.step = '1'; inMain.value = String(member.productMaintainRatioPct);
    inMain.oninput = () => { member.productMaintainRatioPct = clamp(Number(inMain.value || 0), 0, 100); save(state); };
    tdMain.appendChild(inMain); tr.appendChild(tdMain);
    // Development %
    const tdDev = document.createElement('td'); tdDev.className = 'col-num';
    const inDev = document.createElement('input'); inDev.type = 'number'; inDev.min = '0'; inDev.max = '100'; inDev.step = '1'; inDev.value = String(member.productDevelopmentRatioPct);
    inDev.oninput = () => { member.productDevelopmentRatioPct = clamp(Number(inDev.value || 0), 0, 100); save(state); };
    tdDev.appendChild(inDev); tr.appendChild(tdDev);
    // Velocity
    const tdVel = document.createElement('td'); tdVel.className = 'col-num';
    const inVel = document.createElement('input'); inVel.type = 'number'; inVel.min = '0'; inVel.step = '0.1'; inVel.value = String(member.velocitySpPerDay);
    inVel.oninput = () => { member.velocitySpPerDay = Math.max(0, Number(inVel.value || 0)); save(state); };
    tdVel.appendChild(inVel); tr.appendChild(tdVel);
    // Actions
    const tdAct = document.createElement('td'); tdAct.className = 'row-actions';
    const del = document.createElement('button'); del.className = 'danger'; del.textContent = 'Remove';
    del.onclick = () => {
      team.members = team.members.filter(m => m.id !== member.id);
      save(state); renderAll();
    };
    tdAct.appendChild(del); tr.appendChild(tdAct);
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  els.tableContainer.innerHTML = '';
  els.tableContainer.appendChild(table);
}

function renderAll() {
  renderTeams();
  const team = getSelectedTeam();
  els.teamTitle.textContent = team ? `${team.name} — Developers` : 'Select a team';
  renderTable(team);
}

els.addDevBtn.onclick = () => {
  const team = getSelectedTeam(); if (!team) return;
  const name = (els.newDevName.value || '').trim() || `Member ${team.members.length + 1}`;
  const member = {
    id: `member_${Math.random().toString(36).slice(2,10)}`,
    name,
    availabilityPct: 100,
    ptoDays: 0,
    notes: '',
    dailyOverrides: {},
    shortcut: '',
    job: 'Fullstack',
    workRatioPct: 100,
    hoursPerDay: 6,
    costPerHour: 0,
    overheadRatioPct: 20,
    specialJobsRatioPct: 0,
    productMaintainRatioPct: 30,
    productDevelopmentRatioPct: 50,
    velocitySpPerDay: 1
  };
  team.members.push(member);
  els.newDevName.value = '';
  save(state); renderAll();
};

renderAll();


