import { pickDemandaId } from "./backfill_ledger_demanda.mjs";
import assert from "node:assert";
assert.equal(pickDemandaId([{ id: 9 }, { id: 3 }, { id: 7 }]), 3, "tie-break = menor id");
assert.equal(pickDemandaId([{ id: 5 }]), 5);
assert.equal(pickDemandaId([]), null);
console.log("OK");
