# RAWG Game Sync Setup

This guide explains how to sync PC games from RAWG API to your Supabase database.

## Prerequisites

1. **RAWG API Key**: Get one at https://rawgdb.com/api
2. **Supabase Project**: Create a project at https://supabase.com
3. **Environment Variables**: 
   - Copy `.env.example` to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```
   - Then fill in your actual keys in `.env.local`

## Database Schema

Create a `games` table in Supabase with this schema:

```sql
CREATE TABLE games (
  id BIGINT PRIMARY KEY,
  slug TEXT UNIQUE,
  title TEXT NOT NULL,
  released TEXT,
  metacritic INTEGER,
  rating REAL,
  cover_url TEXT,
  genres TEXT[],
  tags TEXT[]
);
```

## Running the Sync

```bash
# Run once to sync games
node -r tsx app/scripts/sync-rawg.ts

# Or with npm
npm run sync  # (add this script to package.json if needed)
```

## How It Works

1. **sync-rawg.ts**: Fetches PC games from RAWG API (ordered by recently added)
2. **db.ts**: Provides utilities to:
   - Fetch games from Supabase
   - Generate mood scores based on genres
   - Generate emojis and background colors
   - Enrich game data for the GameMatch component

## Integration

The GameMatch component can now be updated to:
1. Fetch games from Supabase instead of hardcoded data
2. Use the enriched game data with auto-generated mood scores

Example:

```typescript
// In Gamematch.tsx
import { fetchGamesFromSupabase, enrichGameData } from "@/app/lib/db";

// Replace hardcoded GAMES with:
const [games, setGames] = useState<Game[]>([]);

useEffect(() => {
  fetchGamesFromSupabase().then((rawgGames) => {
    const enrichedGames = rawgGames.map(enrichGameData);
    setGames(enrichedGames);
  });
}, []);
```

## Notes

- The sync script respects RAWG's rate limits with 500ms delays between requests
- Upsert operation ensures duplicates won't cause errors
- Games are fetched from PC platform only (platform ID: 4)
- Mood scores are auto-generated based on genres (can be manually tuned later)
