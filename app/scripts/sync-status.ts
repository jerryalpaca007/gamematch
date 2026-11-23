// Prints a quick status report on the game sync: is it running, how far it is,
// the latest log lines, and how many games are stored.
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import * as path from "path";
import * as fs from "fs";
import { execSync } from "child_process";

dotenv.config({ path: path.join(process.cwd(), ".env.local") });

const scripts = path.join(process.cwd(), "app/scripts");
const countLines = (file: string) =>
  fs.existsSync(file)
    ? fs.readFileSync(file, "utf8").split("\n").filter(Boolean).length
    : 0;

function isRunning(): boolean {
  try {
    execSync("pgrep -f 'scripts/sync-steam.ts'", { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

async function main() {
  console.log(isRunning() ? "Sync: RUNNING" : "Sync: not running");

  const logFile = path.join(scripts, "sync.log");
  if (fs.existsSync(logFile)) {
    const lines = fs.readFileSync(logFile, "utf8").split("\n").filter(Boolean);
    const progress = [...lines].reverse().find((l) => /^\[\d+\/\d+\]/.test(l));
    const ago = Math.round((Date.now() - fs.statSync(logFile).mtimeMs) / 1000);
    console.log(`Progress: ${progress ?? "no games saved yet"}`);
    console.log(`Log last updated ${ago}s ago. Last lines:`);
    for (const line of lines.slice(-5)) console.log("  " + line);
  } else {
    console.log(
      "No app/scripts/sync.log yet (start the sync with `npm run sync-steam`).",
    );
  }

  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
  const { count } = await supabase
    .from("games")
    .select("*", { count: "exact", head: true });
  console.log(`Games stored: ${count}`);
  console.log(
    `Waiting for tags (needs-tags.txt): ${countLines(path.join(scripts, "needs-tags.txt"))}`,
  );
  const rejectedFile = path.join(scripts, "sync-rejected.json");
  console.log(
    `Remembered NSFW rejects: ${fs.existsSync(rejectedFile) ? (JSON.parse(fs.readFileSync(rejectedFile, "utf8")) as number[]).length : 0}`,
  );
}

main();
