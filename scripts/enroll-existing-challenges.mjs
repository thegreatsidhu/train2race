// One-off: sign every team member up for their team's approved challenges that haven't ended yet.
// New challenges already do this automatically (src/lib/challengeEnrollment.ts).
//
//   node scripts/enroll-existing-challenges.mjs           preview only, changes nothing
//   node scripts/enroll-existing-challenges.mjs --apply   make the change
import "dotenv/config";
import pg from "pg";

const apply = process.argv.includes("--apply");
const client = new pg.Client({ connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL });
await client.connect();

const { rows } = await client.query(`
  SELECT c."id", c."title", t."name" AS team,
         COUNT(m."userId") FILTER (WHERE NOT (m."userId" = ANY(c."acceptances")))::int AS "toAdd"
  FROM "team_challenges" c
  JOIN "teams" t ON t."id" = c."teamId"
  JOIN "team_members" m ON m."teamId" = c."teamId"
  WHERE c."status" = 'approved' AND c."endDate" > NOW()
  GROUP BY c."id", c."title", t."name"
  ORDER BY t."name"`);

const pending = rows.filter(r => r.toAdd > 0);
for (const r of rows) console.log(`${r.team} — "${r.title}": ${r.toAdd} member(s) to sign up`);
console.log(`\n${rows.length} running/upcoming challenge(s); ${pending.reduce((s, r) => s + r.toAdd, 0)} sign-up(s) to add.`);

if (!apply) {
  console.log("\nPreview only. Run again with --apply to make the change.");
} else if (pending.length) {
  const res = await client.query(`
    UPDATE "team_challenges" c
    SET "acceptances" = ARRAY(
      SELECT DISTINCT u FROM unnest(
        c."acceptances" || ARRAY(SELECT m."userId" FROM "team_members" m WHERE m."teamId" = c."teamId")
      ) AS u
    )
    WHERE c."status" = 'approved' AND c."endDate" > NOW()`);
  console.log(`\nDone. Updated ${res.rowCount} challenge(s).`);
}
await client.end();
