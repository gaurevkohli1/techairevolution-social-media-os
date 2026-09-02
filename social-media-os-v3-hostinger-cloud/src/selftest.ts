import fs from "node:fs/promises";
import { db } from "./db.js";
import { config } from "./config.js";

const checks:any[] = [];

async function check(name:string, fn:()=>Promise<void>) {
  try { await fn(); checks.push({name,status:"PASS"}); }
  catch (err:any) { checks.push({name,status:"FAIL",detail:err?.message||String(err)}); }
}

await check("database", async () => { await db.query("SELECT 1"); });
await check("brand dna", async () => { JSON.parse(await fs.readFile(new URL("../brand/creative-dna.json", import.meta.url),"utf8")); });
await check("prompts", async () => {
  for (const p of ["discovery.md","editorial.md","creative.md","visual-qa.md","caption.md"]) {
    const txt = await fs.readFile(new URL(`../prompts/${p}`, import.meta.url),"utf8");
    if (txt.length < 100) throw new Error(`${p} too short`);
  }
});
checks.push({name:"autopilot safe default",status: config.AUTOPILOT_ENABLED ? "WARN":"PASS"});
checks.push({name:"meta safe default",status: config.META_WRITE_ENABLED ? "WARN":"PASS"});

console.log(JSON.stringify({
  app:"TechAIrevolution Social Media OS V3",
  checks,
  secretsPrinted:false
},null,2));

await db.end();
if (checks.some(x => x.status === "FAIL")) process.exit(1);
