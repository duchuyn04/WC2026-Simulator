# Head-to-Head (H2H) Feature Design

## Overview
A dedicated Head-to-Head page that allows users to compare the historical match statistics (Wins, Draws, Losses) between any two teams. 

## Scope
- A standalone page at `/h2h`
- Users can select two teams via dropdowns.
- The system displays the total number of matches, and the distribution of wins, draws, and losses.
- Advanced statistics (like xG, top scorers in H2H) are out of scope for this iteration and are reserved for future enhancements.

## Architecture & Components
This feature will be built as a Client Component page to allow highly interactive state changes without roundtripping to the server for every team selection.

### 1. Route
- **Path**: `src/app/h2h/page.tsx`
- **Role**: Serves as the main entry point. It hosts the layout and the state holding the currently selected `teamA` and `teamB`.

### 2. Components
- **`H2HTeamSelector`**: 
  - A dropdown component allowing users to search and select a country. 
  - Displays the country's flag and name.
- **`H2HSummary`**:
  - Takes `teamA` and `teamB` as props.
  - Renders a visual progress bar partitioned into 3 colors representing Team A Wins, Draws, and Team B Wins.
  - Displays the raw numbers clearly.

### 3. Data Flow
- **Data Source**: We will use the existing JSON datasets or API endpoints that contain match data.
- **Utility**: A new utility function `getH2HStats(teamA_id, teamB_id)` will be created. It will filter historical matches where `(home == A && away == B)` or `(home == B && away == A)`, calculate the outcomes, and return the aggregated data `{ total, winsA, draws, winsB }`.

## Edge Cases
- **Same Team Selected**: If `teamA === teamB`, the summary component will be hidden, and a message "Please select two different teams" will be displayed.
- **No Historical Data**: If `total === 0`, the summary component will display "No historical match data available between these two teams."

## Testing
- Ensure the `getH2HStats` correctly attributes a win to the correct team regardless of whether they played at home or away.
- Verify the layout is responsive on mobile devices (dropdowns should stack or size appropriately).
