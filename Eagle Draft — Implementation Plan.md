# DraughtHood — Implementation Plan

## Product direction

Build **DraughtHood** as a native-first, portrait Expo game for Android sideloading, with Expo Web/Preview for fast play and review. The core experience is Nigerian International Draughts on a 10×10 mirrored board, supported by three CPU difficulty levels, a sequential five-hurdle challenge ladder, expressive but legible touch/capture/crown effects, offline saves, per-match reports and two-human same-device pass-and-play. Network matchmaking and online accounts are out of scope.

## Gameplay rules

Use the Nigerian 10×10 mirrored rules described by the Nigerian Draughts manual summary:

- 10×10 board; play on the 50 dark squares with 20 seeds per side.
- Men move one square diagonally forward; captures can be made forwards or backwards.
- A capture is required whenever one is available. When more than one capture path exists, the player may choose any path; the largest-capture rule is not imposed.
- A player may stop a multiple capture after a jump; if continuing, the same seed cannot be captured twice in one turn.
- A seed reaching the far backline becomes a king. Kings fly over any number of free diagonal squares and may capture at distance; a sequence of king captures may change direction.
- Win by capturing all opposing seeds or leaving the opponent with no legal move.

Sources consulted: [Nigerian Draughts rules summary](https://www.draftstechniques.com/2017/03/nigerian-draughts-rules-manuals.html) and [Learning how to play Draughts](https://www.nwanyiocha.ch/post/learning-how-to-play-draughts-1). The selected Nigerian rules differ from an 8×8 English-checkers ruleset.

## Architecture and project structure

Keep the fixed Expo Router / React Native / TypeScript / NativeWind starter and build on its installed packages. Gameplay, profile, sequential challenge progress, recent per-match reports and the active local match are stored with AsyncStorage so the app works offline. The bundled Express/tRPC/Drizzle server remains part of the starter runtime, but CPU and two-human pass-and-play turns require no network, account, or realtime service.

- `app/(tabs)/index.tsx` — home, difficulty picker, quick-start/resume, and local multiplayer launch.
- `app/(tabs)/challenges.tsx` — ordered hurdle ladder, lock/clear states, progress and challenge entry points.
- `app/(tabs)/records.tsx` — aggregate local records, individual match reports, rules and audio preference.
- `app/game.tsx` — playable board, mode-specific turn feedback, local handoff curtain, pause, undo, restart, report and result state.
- `lib/game/engine.ts` — pure board model, Nigerian move/capture legality, promotion and win detection.
- `lib/game/ai.ts` — Relaxed/random, Club/heuristic and Champion/minimax opponents.
- `lib/game/challenges.ts` — authored positions, stage prerequisites, difficulty tags and objective tracking.
- `lib/game/stats.ts` — pure move-history aggregation into per-game match reports.
- `lib/game/storage.ts` — typed offline AsyncStorage persistence for profile, reports and active game.
- `lib/game/store.tsx` — app-wide load/save, challenge progression, aggregate stats and report history.
- `components/game/*` — board, layered crown glyph, spring press/capture effects, badges, dialogs and buttons.
- `constants/palette.ts` — single source for DraughtHood colors, spacing and motion values.
- `assets/images/*` — preserve the established Eagle mascot/app icon while showing the new DraughtHood name.

Set the user-facing Expo display name and visible wordmark to **DraughtHood**; retain the Eagle mark as the existing game mascot. Keep the generated `appSlug`, URI scheme, iOS bundle identifier, Android package identifier and fixed Expo ports unchanged to preserve upgrade identity. Keep presses styled with `style`/`StyleSheet` where required by the starter's Pressable adapter. The starter already has TypeScript diagnostics registered.

## Design system

- **Design movement:** a contemporary Lagos night draughts club with tailored streetwear energy and crafted Nigerian textile detail, never a literal heritage collage.
- **Core principles:** readable at arm’s length; tactile, confident board play; culture in intentional details; purposeful motion that rewards a move without slowing it.
- **Color philosophy:** deep forest/palm green grounds the board; brighter DraughtGold marks crowns, focus and achievement; sunlit ivory keeps moves legible; restrained terracotta separates hazards and challenge states.
- **Layout paradigm:** portrait-first, vertically stacked play surface with a wide thumb-friendly board, compact status rail, and bottom navigation; action sheets rise from the lower edge.
- **Signature elements:** the established Eagle mascot as a nod to the original identity; a high-contrast sculpted three-point crown with an enamel gem; fine woven Aso-oke-inspired board/panel lines.
- **Interaction philosophy:** tapping a seed gives a sprung press and halo; legal destinations light up; a chosen move leaves a brief path trail. If capture routes share a landing square, offer each path. In pass-and-play, hide the board at handoff. Haptics and clear copy confirm captures, promotions and turn changes.
- **Animation:** use a 110 ms press-in spring, 170 ms selected-seed pulse, 220 ms landing/path sweep, short capture burst, 380 ms crown pop with one halo pulse, and a 500 ms victory sparkle. Keep effects transient, avoid loops, and honor reduced-motion preferences with static states.
- **Typography system:** native system sans for numbers, controls and compact labels; a restrained system serif such as Georgia for large game headings. Use concise labels with strong size/weight contrast.
- **Brand essence:** “Nigerian draughts with a bigger entrance and the same sharp play.” Personality: **bold, tactical, communal**.
- **Brand voice:** confident, brief and welcoming; use Nigerian everyday expression sparingly. Examples: “Take the crown.” and “The hood is yours.”
- **Wordmark & logo:** a distinctive DraughtHood wordmark alongside the existing Eagle crest as a retained mascot, with the crown as the new match-level hero symbol.
- **Signature brand color:** **DraughtGold `#F0BD52`**.

## Product behavior

- Home offers a quick match, a difficulty choice, a saved-game resume, a featured next challenge, and a separate **Play together** launch action. Every user-facing game name and the Android display name read **DraughtHood**.
- Difficulty categories are Relaxed, Club and Champion. Relaxed selects a legal move with a light preference for safe advancement; Club evaluates material, mobility and promotion; Champion searches ahead with alpha-beta minimax.
- Five challenges become a progressive sequence: The First Crown → The Fork → Clear the Field → Hold the Line → Kingmaker. The first hurdle is open; each next hurdle unlocks when the previous one is cleared. Show stage number, locked/open/cleared state and a concise unlock hint; preserve recorded completions. Hold the crown challenge still fails when its king is lost.
- Local multiplayer starts Player 1 on the near/bottom side; turns alternate with Player 2 on the far/top side. A privacy handoff overlay covers the board after each move and names the next player until they tap Ready. The player strip, turn status, and end-of-game result identify Player 1 or Player 2 accurately.
- Make board taps feel deliberate: tactile press compression/return, a clean selection ring and ripple, animated legal targets, path/landing feedback and a short capture spark. Rebuild the crown as a larger multi-layer gold insignia with a clear silhouette, gem, rim and restrained glow/pop against both seed colors.
- For every completed game, create a **Match Report** with outcome, mode, AI difficulty or challenge hurdle, elapsed time, moves, captures by each side, crowns earned, and remaining seeds. Show it immediately in the result sheet and save it into recent Reports on the Records screen.
- The board continues to show whose turn it is, legal squares, piece totals and promotion status; controls retain restart, pause, undo, rules and sound preference. Existing matches and saved progress survive the display-name and data-schema changes, and gameplay remains offline.
- Keep a sideloadable APK profile ready and preserve existing native brand assets/mascot unless changing the visual app identity is necessary. Native artifact builds happen through the WebDev Dashboard, not Sandbox.


## Global leaderboard and match endings

- Add a **Leaderboard** tab backed by the existing managed MySQL database through tRPC. A leaderboard entry is a player's submitted best score from a standard Classic match against the CPU; pass-and-play and challenge results remain local/unranked so the global table compares like-for-like games.
- Keep a personal best, its report, a user-editable nickname, and a random installation ID in AsyncStorage. The personal best remains available offline. Global scores are never uploaded automatically: the player sees their nickname and points, then explicitly taps **Post my best**. Explain that the submitted nickname and score become public; do not request an account or personal details. The server stores only a SHA-256 hash of the random device ID, nickname, score, difficulty, and timestamps, validates and bounds input, and retains one top entry per installation.
- Score a Classic win as `500 + captures×25 + crowns earned×75 + remaining seeds×15 + difficulty bonus` (Relaxed `0`, Club `150`, Champion `350`); non-wins and non-Classic modes are unranked (`0`). Show the current score and scoring explanation in results and the high-score/leaderboard surface.
- Distinguish a draughts win by elimination from a block/checkmate (the side to move has no legal move), and show an explicit game-over winner/result. During a live match, offer a confirmable **Declare a draw** action that records a draw report without a winner. The result sheet offers **Restart match**, which starts a clean game with the same mode, difficulty, and challenge while preserving records.
- Extend `drizzle/schema.ts` with one additive leaderboard table, `server/leaderboard.ts` with bounded database reads/upserts and pseudonymous device hashing, and the tRPC router with public top-score and explicit-submit procedures. Add pure score/input-validation tests; never seed or submit test entries to the shared development/production database.
- Project structure additions: `app/(tabs)/leaderboard.tsx` owns the ranked leaderboard and explicit submission flow; `lib/game/scoring.ts` owns deterministic scoring; `lib/game/leaderboard.ts` owns shared name/payload validation; `server/leaderboard.ts` owns server-only database operations; `drizzle/schema.ts` declares the additive persistence table. Extend `lib/game/engine.ts` and `app/game.tsx` for end reasons/draw declaration/restart, and evolve `lib/game/storage.ts`/`store.tsx` to migrate and save local personal bests.
