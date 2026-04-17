# P2P Leaderboard Implementation with GunDB

## Description
Implements a privacy-first P2P leaderboard system using GunDB for a React Native fasting app.

## Key Features
- **No server data storage**: Uses GunDB P2P network for decentralized data sync
- **Privacy-first**: Only public data (streak, completed days, merit) is synced; private data (weight, abstinence, notes) stays local
- **User control**: Users can enable/disable P2P sync at any time
- **Anonymous by default**: Auto-generated nickname based on user ID if not set
- **Multi-language support**: Chinese, English, Spanish
- **CCPA/GDPR friendly**: No data controller status since data is P2P

## Implementation Steps

### 1. Install Dependencies
```bash
npm install gun
```

### 2. Create P2P Service Layer (`src/services/p2p.ts`)
- Initialize GunDB with free public relay nodes
- Create `PublicUserData` interface for leaderboard data
- Implement `publishUserStats()` to sync public data only
- Implement `subscribeLeaderboard()` for real-time updates
- Implement `toggleP2P()` for user control
- Implement `setNickname()`, `getNickname()`, `getDisplayName()`
- Implement `removeUserFromP2P()` for data deletion
- Auto-generate anonymous nicknames with language prefixes

### 3. Integrate P2P into AppContext (`src/context/AppContext.tsx`)
- Add `p2pEnabled` state
- Add `toggleP2P()` and `publishToLeaderboard()` functions
- Auto-publish stats when they change
- Include P2P functions in context value

### 4. Create Leaderboard Screen (`src/screens/LeaderboardScreen.tsx`)
- P2P toggle card with privacy explanation
- Nickname setting with auto-generated display
- Current user rank card
- Leaderboard list with medals (🥇🥈🥉)
- Empty states for disabled/loading/no data

### 5. Add Navigation Tab (`src/navigation/Tabs.tsx`)
- Import `LeaderboardScreen`
- Add tab with 🏆 icon

### 6. Update Translations (`src/i18n/translations.ts`)
- Add leaderboard-related keys for all languages (zh/en/es)
- Avoid duplicate property names (use `leaderboardStreak`, `practiceMerit`, etc.)

### 7. Update Privacy Policy (`PRIVACY_POLICY.md`)
- Explain P2P decentralized architecture
- List local-only data (weight, abstinence, notes)
- List public data (streak, days, merit)
- Add all three language versions

## Important Notes

### Privacy-First Design
- **Local-only data**: weight, abstinence, meal details, notes
- **Public data**: userId (auto-generated), nickname (or auto-generated), streak, completedDays, totalMerit, lastUpdate
- No personal identity information is synced

### Translation Key Naming
- Avoid duplicates across sections
- Use prefixes like `leaderboardStreak`, `practiceMerit`, `timeMinutes`
- When accessing new translation keys, use fallback: `(t as any).key || 'default'`

### GunDB Specifics
- Uses free public relay nodes (heroku apps)
- `gun.get(key).put(value)` to publish
- `gun.get(key).on(callback)` to subscribe
- Handle `map()` function with type casting due to GunDB's loose typing

### Type Safety
- Add `rank?: number` as optional field to `PublicUserData`
- Use `as any` for GunDB callback types that don't match strict TypeScript
- Handle missing translation keys gracefully

## Files Modified
- `src/services/p2p.ts` (NEW)
- `src/context/AppContext.tsx` (add P2P state and functions)
- `src/screens/LeaderboardScreen.tsx` (NEW)
- `src/navigation/Tabs.tsx` (add leaderboard tab)
- `src/i18n/translations.ts` (add leaderboard keys)
- `PRIVACY_POLICY.md` (update with P2P info)

## Build and Deploy
```bash
eas build --platform ios --profile production
```
