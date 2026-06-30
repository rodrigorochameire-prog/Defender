// scripts/seed-drive-group-rodrigo.mjs
// Cria o drive_group do Rodrigo com as pastas atuais e vincula o usuário.
import { createClient } from "@supabase/supabase-js";

// ARRAYS — inclui as pastas primárias (ATRIBUICAO_FOLDER_IDS) E as extras
// (EXTRA_ATRIBUICAO_FOLDERS) de src/lib/utils/text-extraction.ts, para NÃO regredir
// o scan das pastas VVD-MPU / Substituição-cível / Grupo-Júri-extra.
const ATRIBUICAO_FOLDERS = {
  JURI: ["1_S-2qdqO0n1npNcs0PnoagBM4ZtwKhk-"],
  VVD: ["1fN2GiGlNzc61g01ZeBMg9ZBy1hexx0ti", "1D-tHrNqU0sAczQP4NAslm7ofthC73COe"], // Criminal + MPU
  EP: ["1-mbwgP3-ygVVjoN9RPTbHwnaicnBAv0q"],
  SUBSTITUICAO: ["1eNDT0j-5KQkzYXbqK6IBa9sIMT3QFWVU", "1ym7x4l3w3I8ox_FCpZo3I-miDJSZ3E46"], // criminal + cível
  GRUPO_JURI: ["1LUW4yauxm6iaJYCrjRgXAnSgTZIbel2j", "1sET3k_-5c2Mo8D7xF-cJCKzxgI_yh4dW"], // grupo + extra
  CRIMINAL: ["1xMwqXkBgEc3bsJkO3ioPt4u50D4lpJ5u"],
};

const RODRIGO_EMAIL = "rodrigorochameire@gmail.com";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

const { data: user, error: uErr } = await supabase
  .from("users").select("id, drive_group_id").eq("email", RODRIGO_EMAIL).single();
if (uErr) throw uErr;

if (user.drive_group_id) {
  console.log(`Usuário ${user.id} já tem drive_group_id=${user.drive_group_id}; nada a fazer.`);
  process.exit(0);
}

const { data: group, error: gErr } = await supabase
  .from("drive_groups")
  .insert({ owner_user_id: user.id, label: "9ª DP Camaçari", atribuicao_folders: ATRIBUICAO_FOLDERS })
  .select("id").single();
if (gErr) throw gErr;

const { error: linkErr } = await supabase
  .from("users").update({ drive_group_id: group.id }).eq("id", user.id);
if (linkErr) throw linkErr;

console.log(`OK: grupo ${group.id} criado e vinculado ao usuário ${user.id}.`);
