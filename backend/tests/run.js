// Ejecuta las pruebas contra una BD aparte (publitours_test): recrea el esquema con migraciones y lanza node --test.
const { spawnSync } = require("child_process");
const path = require("path");

const env = { ...process.env, DB_NAME: process.env.TEST_DB_NAME || "publitours_test", NODE_ENV: "test", EMAIL_USER: "", EMAIL_PASS: "", ANTHROPIC_API_KEY: "" };
const root = path.join(__dirname, "..");
const run = (cmd, args) => spawnSync(cmd, args, { cwd: root, env, stdio: "inherit", shell: true });

for (const args of [["db:migrate:undo:all"], ["db:migrate"]]) {
  if (run("npx", ["sequelize-cli", ...args]).status !== 0) process.exit(1);
}
process.exit(run("node", ["--test", "--test-concurrency=1", "tests/*.test.js"]).status ?? 1);
