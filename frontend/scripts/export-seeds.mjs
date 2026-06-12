import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dataDir = join(root, "data");

mkdirSync(join(dataDir, "shifts"), { recursive: true });

const vitalsSrc = readFileSync(join(root, "lib/mock/vitals.ts"), "utf8");
const samples = [];
const re =
  /sample\("(P\d+)", "([^"]+)",\s*(\d+),\s*(\d+),\s*(\d+),\s*(\d+),\s*(\d+)\)/g;
let match = re.exec(vitalsSrc);
while (match) {
  samples.push({
    patient_id: match[1],
    timestamp: match[2],
    heart_rate: Number(match[3]),
    respiratory_rate: Number(match[4]),
    systolic_bp: Number(match[5]),
    diastolic_bp: Number(match[6]),
    spo2: Number(match[7]),
  });
  match = re.exec(vitalsSrc);
}

writeFileSync(join(dataDir, "vitals.seed.json"), JSON.stringify(samples, null, 2));
console.log(`Exported ${samples.length} vital samples`);
