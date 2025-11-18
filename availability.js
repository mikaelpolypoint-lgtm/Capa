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
  tableContainer: document.getElementById('tableContainer'),
  csvUploadInput: document.getElementById('csvUploadInput')
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

function parseCSV(text) {
  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  if (lines.length < 2) throw new Error('CSV must have at least 2 rows');
  
  // Parse CSV lines (handling semicolons and commas as delimiters, and quoted fields)
  const rows = lines.map(line => {
    const result = [];
    let current = '';
    let inQuotes = false;
    // Check if line uses semicolons or commas
    const hasSemicolon = line.includes(';');
    const delimiter = hasSemicolon ? ';' : ',';
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === delimiter && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  });
  
  return rows;
}

function parseDate(dateStr) {
  // Try various date formats (prioritize DD.MM.YY as it's most common in the example)
  const formats = [
    /^(\d{2})\.(\d{2})\.(\d{2})$/, // DD.MM.YY (e.g., 04.12.25 = Dec 4, 2025)
    /^(\d{2})\.(\d{2})\.(\d{4})$/, // DD.MM.YYYY
    /^(\d{4})-(\d{2})-(\d{2})$/, // YYYY-MM-DD
    /^(\d{2})\/(\d{2})\/(\d{4})$/, // MM/DD/YYYY
    /^(\d{2})\/(\d{2})\/(\d{2})$/, // MM/DD/YY
  ];
  
  for (const format of formats) {
    const match = dateStr.match(format);
    if (match) {
      if (format === formats[0]) {
        // DD.MM.YY (e.g., 04.12.25 = Dec 4, 2025)
        const year = 2000 + parseInt(match[3]);
        return new Date(year, parseInt(match[2]) - 1, parseInt(match[1]));
      } else if (format === formats[1]) {
        // DD.MM.YYYY
        return new Date(parseInt(match[3]), parseInt(match[2]) - 1, parseInt(match[1]));
      } else if (format === formats[2]) {
        // YYYY-MM-DD
        return new Date(parseInt(match[1]), parseInt(match[2]) - 1, parseInt(match[3]));
      } else if (format === formats[3] || format === formats[4]) {
        // MM/DD/YYYY or MM/DD/YY
        const year = match[3].length === 2 ? 2000 + parseInt(match[3]) : parseInt(match[3]);
        return new Date(year, parseInt(match[1]) - 1, parseInt(match[2]));
      }
    }
  }
  
  // Fallback to Date constructor
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) throw new Error(`Invalid date format: ${dateStr}`);
  return date;
}

function parseValue(value) {
  if (!value || value.trim() === '') return 'h'; // Default to unavailable
  
  const val = String(value).trim().toLowerCase();
  
  // Check for "1" (exact match)
  if (val === '1' || val === '1.0' || val === '1.00') return '1';
  
  // Check for "0.5" (exact match or contains 0.5, e.g., "0.5/x", "0.5/p", "x/0.5", "h/0.5")
  // This takes priority over public holiday
  if (val === '0.5' || val.includes('0.5')) return '0.5';
  
  // Check for public holiday "p" (standalone or in combinations like "p", "h/p")
  // Note: "0.5/p" is already handled above
  if (val === 'p' || val.includes('/p')) return 'p';
  
  // Everything else is unavailable (h, x, c, etc.)
  return 'h';
}

function importCSV(csvText) {
  const team = getSelectedTeam();
  if (!team) {
    alert('Please select a team first');
    return;
  }
  
  try {
    const rows = parseCSV(csvText);
    
    if (rows.length < 2) {
      throw new Error('CSV must have at least 2 rows (header + data)');
    }
    
    // Row 1 contains developer shortcuts in columns (skip column 1 which is date header)
    const headerRow = rows[0];
    if (headerRow.length < 2) {
      throw new Error('CSV must have at least 2 columns (date + at least one developer)');
    }
    
    // Map column indices to developers by matching shortcuts
    const columnToDeveloper = new Map();
    for (let colIdx = 1; colIdx < headerRow.length; colIdx++) {
      const headerValue = String(headerRow[colIdx] || '').trim();
      if (!headerValue) continue;
      
      // Find developer with matching shortcut
      const developer = team.members.find(m => {
        const shortcut = String(m.shortcut || '').trim().toUpperCase();
        return shortcut === headerValue.toUpperCase();
      });
      
      if (developer) {
        columnToDeveloper.set(colIdx, developer);
        ensureOverridesMember(developer);
      }
    }
    
    if (columnToDeveloper.size === 0) {
      alert('No matching developers found. Make sure the CSV header row contains developer shortcuts that match your developers.');
      return;
    }
    
    // Process data rows (starting from row 2, index 1)
    let updatedCount = 0;
    for (let rowIdx = 1; rowIdx < rows.length; rowIdx++) {
      const row = rows[rowIdx];
      if (row.length < 2) continue;
      
      // Column 1 is the date
      const dateStr = String(row[0] || '').trim();
      if (!dateStr) continue;
      
      try {
        const date = parseDate(dateStr);
        const isoDate = toISODate(date);
        
        // Update each developer's availability for this date
        columnToDeveloper.forEach((developer, colIdx) => {
          if (colIdx < row.length) {
            const value = row[colIdx];
            const parsedValue = parseValue(value);
            developer.dailyOverrides[isoDate] = parsedValue;
            updatedCount++;
          }
        });
      } catch (err) {
        console.warn(`Skipping row ${rowIdx + 1}: ${err.message}`);
      }
    }
    
    save(state);
    renderAll();
    alert(`Successfully imported ${updatedCount} availability entries for ${columnToDeveloper.size} developer(s).`);
  } catch (err) {
    alert(`Error importing CSV: ${err.message}`);
    console.error(err);
  }
}

function renderAll() {
  renderTeams();
  const team = getSelectedTeam();
  renderHeader(team);
  renderTable(team);
}

// CSV upload handler
if (els.csvUploadInput) {
  els.csvUploadInput.onchange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    try {
      const text = await file.text();
      importCSV(text);
    } catch (err) {
      alert(`Failed to read CSV file: ${err.message}`);
    } finally {
      e.target.value = '';
    }
  };
}

renderAll();


