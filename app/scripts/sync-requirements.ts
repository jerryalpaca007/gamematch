// Fills in the hardware columns (min_ram_gb, min_graphics, integrated_ok) for
// games that are already in the table, by reading each game's minimum system
// requirements from Steam. Run it once after adding the columns:
//   npm run sync-requirements
// Games it has already looked at are remembered in requirements-checked.json, so
// it can be stopped and started again.
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import * as path from "path";
import * as fs from "fs";
import { parseRequirements } from "../lib/requirements";

dotenv.config({ path: path.join(process.cwd(), ".env.local") });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const CHECKED_FILE = path.join(
  process.cwd(),
  "app/scripts/requirements-checked.json",
);
const checked = new Set<number>(
  fs.existsSync(CHECKED_FILE)
    ? (JSON.parse(fs.readFileSync(CHECKED_FILE, "utf8")) as number[])
    : [],
);
const saveChecked = () =>
  fs.writeFileSync(CHECKED_FILE, JSON.stringify([...checked]));

async function main() {
  const { error: probe } = await supabase
    .from("games")
    .select("min_ram_gb")
    .limit(1);
  if (probe) {
    throw new Error(
      "The table has no min_ram_gb column yet. Run the SQL from the chat in the Supabase SQL editor, then run this again.",
    );
  }

  const ids: number[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from("games")
      .select("steam_app_id")
      .order("steam_app_id")
      .range(from, from + 999);
    if (error) throw error;
    ids.push(...(data ?? []).map((g) => Number(g.steam_app_id)));
    if ((data ?? []).length < 1000) break;
  }
  const todo = ids.filter((id) => !checked.has(id));
  console.log(`${ids.length} games, ${todo.length} still to check.`);

  let done = 0;
  let failures = 0;
  for (const id of todo) {
    try {
      const res = await fetch(
        `https://store.steampowered.com/api/appdetails?appids=${id}&cc=us&l=english`,
      );
      if (res.status === 429 || res.status === 403) {
        console.log("Rate limited by Steam, waiting 60s");
        await sleep(60_000);
        continue; // this game is not marked as checked, so the next run picks it up
      }
      if (!res.ok) throw new Error(`Steam returned ${res.status}`);
      const json = (await res.json()) as Record<
        string,
        { success: boolean; data?: { pc_requirements?: { minimum?: string } } }
      >;
      const r = parseRequirements(
        json[String(id)]?.data?.pc_requirements?.minimum,
      );
      const { error } = await supabase
        .from("games")
        .update({
          min_ram_gb: r.minRamGb,
          min_graphics: r.minGraphics,
          integrated_ok: r.integratedOk,
        })
        .eq("steam_app_id", id);
      if (error) throw error;
      checked.add(id);
      failures = 0;
      done++;
      if (done % 25 === 0) {
        saveChecked();
        console.log(`[${done}/${todo.length}] checked`);
      }
    } catch (err) {
      failures++;
      console.error(`Skipping ${id}:`, (err as Error).message);
      if (failures >= 20)
        throw new Error("Too many failures in a row, stopping.");
      await sleep(5000);
    }
    await sleep(1500);
  }
  saveChecked();
  console.log(`Done. Checked ${done} games.`);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
