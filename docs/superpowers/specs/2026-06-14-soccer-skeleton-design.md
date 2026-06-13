# Spec: Soccer Skeleton Loading State with Bouncing Ball Animation

This specification outlines the design and implementation details for adding custom skeleton loading states with a bouncing soccer ball animation to the WC 2026 app.

## 1. Overview
The current application uses generic spinning loader rings while fetching data from ESPN (e.g., in Standings, Team Stats, and Match Details). To elevate the visual polish and theme consistency, we are replacing these spinners with high-fidelity skeleton layouts styled after their real components, accompanied by a custom, smooth-bouncing soccer ball animation.

## 2. Goals & Success Criteria
- **Consistent Theme**: Reusable `SoccerSkeleton` component reflecting the app's sporty aesthetics.
- **Micro-Animations**: Custom CSS-based keyframe animations simulating a bouncing soccer ball with a squash effect and synchronized scaling shadow.
- **Improved UX**: High-fidelity skeleton blocks mimicking actual structures (rows, columns, headers) to reduce perceived loading times.
- **Zero Redundancy**: A centralized component avoiding duplicate SVG and animation markup across pages.

## 3. Architecture & Components

### 3.1 Reusable component: `SoccerSkeleton`
- **File Location**: `src/components/SoccerSkeleton.tsx`
- **API Interface**:
  ```typescript
  interface SoccerSkeletonProps {
    variant: 'standings' | 'stats' | 'match-detail';
  }
  ```

#### Layout Variants:
1. **`standings`**: Mimics `EspnStandingsBoard`. Displays a grid of 6 groups. Each group has a header, followed by a table structure containing 4 team rows with columns for Team Name, Played (P), Win (W), Draw (D), Loss (L), Goals For (GF), Goals Against (GA), Goal Difference (GD), Points (PTS).
2. **`stats`**: Mimics `TeamStatsBoard`. Displays headers for Categories, and rows representing stats with bar graphs.
3. **`match-detail`**: Mimics `MatchStatsModal`. Displays header with Team Names and Score placeholders, followed by comparative bar charts for team stats (possession, shots, fouls, etc.).

### 3.2 Animation Definitions
Added to `src/app/globals.css`:
- `soccer-bounce`: Translates Y from `0px` to `-25px` and scales along Y and X axes to create a squash-on-impact effect.
- `soccer-shadow`: Scales down and fades out the shadow as the ball rises, and scales up/fades in as the ball lands.
- `shimmer`: Traditional pulse/shimmer animation for skeleton blocks using a light gray/zinc gradient moving across the background.

```css
@keyframes soccer-bounce {
  0%, 100% { transform: translateY(0) scaleY(1) scaleX(1); }
  50% { transform: translateY(-25px) scaleY(1.05) scaleX(0.95); }
  90% { transform: translateY(0) scaleY(0.95) scaleX(1.05); }
}

@keyframes soccer-shadow {
  0%, 100% { transform: scale(1); opacity: 0.25; }
  50% { transform: scale(0.6); opacity: 0.08; }
}

.animate-soccer-bounce {
  animation: soccer-bounce 1s infinite ease-in-out;
}

.animate-soccer-shadow {
  animation: soccer-shadow 1s infinite ease-in-out;
}
```

## 4. Integration Points

### 4.1 ESPN Standings Board (`src/components/EspnStandingsBoard.tsx`)
Replace:
```tsx
if (loading) {
  return (
    <div className="py-20 flex justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-zinc-800 border-t-emerald-500"></div>
    </div>
  );
}
```
With:
```tsx
if (loading) {
  return <SoccerSkeleton variant="standings" />;
}
```

### 4.2 Team Stats Board (`src/components/TeamStatsBoard.tsx`)
Replace:
```tsx
if (loading) {
  return (
    <div className="flex justify-center py-6 sm:py-12">
      <div className="w-8 h-8 border-4 border-[#6a041f] border-t-transparent rounded-full animate-spin"></div>
    </div>
  );
}
```
With:
```tsx
if (loading) {
  return <SoccerSkeleton variant="stats" />;
}
```

### 4.3 Match Stats Modal (`src/components/MatchStatsModal.tsx`)
Replace:
```tsx
{loading ? (
  <div className="flex h-64 flex-col items-center justify-center gap-3 text-sm text-zinc-500">
    <div className="h-9 w-9 animate-spin rounded-full border-4 border-zinc-800 border-t-emerald-500" />
    Đang tải thống kê...
  </div>
) : ...
```
With:
```tsx
{loading ? (
  <SoccerSkeleton variant="match-detail" />
) : ...
```
