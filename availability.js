const STORAGE_KEY = 'scrumCapacityData.v1';
function save(data) { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); }
function load() { try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || null; } catch { return null; } }
function clamp(n, min, max) { return Math.min(max, Math.max(min, n)); }
function toISODate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
function enumerateDatesInclusive(start, end) {
  const dates = [];
  const d = new Date(start.getTime());
  while (d <= end) {
    dates.push(new Date(d.getTime()));
    d.setDate(d.getDate() + 1);
  }
  return dates;
}
function formatHuman(d) {
  return d.toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
}

let state = load();
if (!state || !Array.isArray(state.teams) || state.teams.length === 0) {
  document.body.innerHTML = '<div style="padding:24px;color:#e5e7eb">No data found. Open <a href="./index.html">planner</a> to create a team first.</div>';
  throw new Error('no data');
}

const els = {
  teamList: document.getElementById('teamList'),
  teamTitle: document.getElementById('teamTitle'),
  tableContainer: document.getElementById('tableContainer')
};

function getSelectedTeam() {
  return state.teams.find(t => t.id === state.selectedTeamId) || state.teams[0];
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
    left.style.display = 'grid';
    left.style.gap = '4px';
    left.appendChild(name); left.appendChild(meta);
    item.appendChild(left);
    els.teamList.appendChild(item);
  });
}

function ensureOverridesMember(member) {
  if (!member.dailyOverrides) member.dailyOverrides = {};
}

const DATE_START = new Date('2025-12-04');
const DATE_END = new Date('2026-03-04');

function getSprintLabel(date) {
  // Sprint windows inclusive
  const s1Start = new Date('2025-12-04'); const s1End = new Date('2025-12-17'); // Sprint 1 aka 26.1-S1
  const s2Start = new Date('2025-12-18'); const s2End = new Date('2026-01-14'); // Sprint 26.1-S2
  const s3Start = new Date('2026-01-15'); const s3End = new Date('2026-01-28'); // Sprint 26.1-S3
  const s4Start = new Date('2026-01-29'); const s4End = new Date('2026-02-18'); // Sprint 26.1-S4
  const ipStart = new Date('2026-02-19'); const ipEnd = new Date('2026-03-04');  // Sprint 26.1-IP
  if (date >= s1Start && date <= s1End) return '26.1-S1';
  if (date >= s2Start && date <= s2End) return '26.1-S2';
  if (date >= s3Start && date <= s3End) return '26.1-S3';
  if (date >= s4Start && date <= s4End) return '26.1-S4';
  if (date >= ipStart && date <= ipEnd) return '26.1-IP';
  return '';
}

function renderTable(team) {
  const dates = enumerateDatesInclusive(DATE_START, DATE_END).filter(d => d.getDay() !== 0 && d.getDay() !== 6); // Mon-Fri only
  const table = document.createElement('table');
  table.className = 'avail-table';
  const thead = document.createElement('thead');
  const trh = document.createElement('tr');
  const hSprint = document.createElement('th'); hSprint.textContent = 'Sprint'; hSprint.className = 'sprint-cell';
  trh.appendChild(hSprint);
  const hWeekday = document.createElement('th'); hWeekday.textContent = 'Weekday'; hWeekday.className = 'weekday-cell';
  trh.appendChild(hWeekday);
  const hDate = document.createElement('th'); hDate.textContent = 'Date'; hDate.className = 'date-cell';
  trh.appendChild(hDate);
  team.members.forEach(member => {
    const th = document.createElement('th');
    th.textContent = member.name;
    th.className = 'member-col';
    trh.appendChild(th);
    ensureOverridesMember(member);
  });
  thead.appendChild(trh);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  dates.forEach(d => {
    const iso = toISODate(d);
    const tr = document.createElement('tr');

    const tdSprint = document.createElement('td');
    tdSprint.textContent = getSprintLabel(d);
    tdSprint.className = 'sprint-cell';
    tr.appendChild(tdSprint);

    const tdWeekday = document.createElement('td');
    tdWeekday.textContent = d.toLocaleDateString(undefined, { weekday: 'short' });
    tdWeekday.className = 'weekday-cell';
    tr.appendChild(tdWeekday);

    const tdDate = document.createElement('td');
    tdDate.textContent = formatHuman(d);
    tdDate.className = 'date-cell';
    tr.appendChild(tdDate);
    team.members.forEach(member => {
      const td = document.createElement('td');
      const select = document.createElement('select');
      const options = [
        { v: '1', label: '1 (full day)' },
        { v: '0.5', label: '0.5 (half day)' },
        { v: 'h', label: 'h (holiday)' },
        { v: 'p', label: 'p (public holiday)' },
        { v: 's', label: 's (sick)' }
      ];
      options.forEach(o => {
        const opt = document.createElement('option');
        opt.value = o.v; opt.textContent = o.label;
        select.appendChild(opt);
      });
      const current = member.dailyOverrides[iso] == null ? '1' : String(member.dailyOverrides[iso]);
      select.value = options.some(o => o.v === current) ? current : '1';
      select.onchange = () => {
        member.dailyOverrides[iso] = select.value;
        save(state);
      };
      td.appendChild(select);
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  els.tableContainer.innerHTML = '';
  els.tableContainer.appendChild(table);
}

function renderHeader(team) {
  els.teamTitle.textContent = team ? `${team.name} — Daily Availability` : 'Select a team';
}

function renderAll() {
  renderTeams();
  const team = getSelectedTeam();
  renderHeader(team);
  renderTable(team);
}

renderAll();


