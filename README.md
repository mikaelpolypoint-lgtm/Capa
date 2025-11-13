# Scrum Capacity Planner (Static Web App)

A lightweight, zero-backend web app to manage your Scrum team's sprint capacity. Runs entirely in your browser and saves data to localStorage. No installs required.

## Features
- Multiple teams with base velocity and daily focus hours
- Sprint settings: working days and focus factor
- Members: availability %, PTO days, notes
- Automatic capacity calculation:
  - Ideal hours = members × daily focus hours × working days
  - Available hours = sum((working days − PTO) × daily hours × availability%)
  - Adjusted velocity = base velocity × (available ÷ ideal) × focus factor
- Import/Export data as JSON
- Reset to defaults
- Dedicated Daily Availability page with per-member per-day overrides (0–100%)

## Usage
1. Open `index.html` in a modern browser (Chrome, Edge, Safari, Firefox).
2. Create a team and set:
   - Base velocity (points/sprint at full capacity)
   - Daily focus hours per member (e.g., 6)
3. Set sprint parameters:
   - Working days in the sprint
   - Focus factor (e.g., 0.8–0.95)
4. Add members with availability% and PTO days.
5. Review the capacity summary to plan sprint commitment.
6. For more granular planning, click “Edit Daily Availability” to open a table where each member’s availability can be overridden per day. These overrides take precedence over member availability% and PTO for capacity calculations.

## Data Model
Stored in `localStorage` as:
```json
{
  "teams": [
    {
      "id": "team_xxx",
      "name": "Team Alpha",
      "baseVelocity": 30,
      "dailyFocusHours": 6,
      "sprint": { "name": "Sprint", "workingDays": 10, "focusFactor": 0.9 },
      "members": [
        { "id": "member_xxx", "name": "Alice", "availabilityPct": 100, "ptoDays": 0, "notes": "", "dailyOverrides": { "1": 100, "2": null } }
      ]
    }
  ],
  "selectedTeamId": "team_xxx"
}
```

## Import/Export
- Export: Downloads a JSON file of your current data.
- Import: Loads a previously exported JSON file.
- Reset: Clears data and restores defaults.

## Customization Ideas
- Add public holiday calendars
- Track historical sprints and actual vs. planned
- Add per-role capacity or skills matrix
- Connect to a backend for multi-user sharing

## Development
This app is framework-free and static. Modify `index.html`, `styles.css`, and `app.js` directly.


# Capacity2k26
# Capacity2k26
