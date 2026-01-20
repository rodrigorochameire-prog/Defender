/**
 * Constantes e Opções de Seleção para Gestão de Pets
 * 
 * Este arquivo centraliza todas as opções de seleção usadas no sistema,
 * garantindo consistência entre formulários, logs e relatórios.
 * 
 * Estrutura: { value: string, label: string, icon?: string, color?: string }
 */

// ============================================
// 1. CADASTRO DO PET - DADOS BÁSICOS
// ============================================

export const PET_SPECIES = [
  { value: "dog", label: "Cachorro", icon: "🐕" },
  { value: "cat", label: "Gato", icon: "🐈" },
] as const;

export const PET_SIZES = [
  { value: "mini", label: "Mini (até 3kg)", icon: "🐾" },
  { value: "small", label: "Pequeno (3-10kg)", icon: "🐕" },
  { value: "medium", label: "Médio (10-25kg)", icon: "🐕" },
  { value: "large", label: "Grande (25-45kg)", icon: "🐕" },
  { value: "giant", label: "Gigante (+45kg)", icon: "🦮" },
] as const;

export const PET_COAT_TYPES = [
  { value: "short", label: "Pelo Curto", description: "Manutenção baixa" },
  { value: "medium", label: "Pelo Médio", description: "Escovação semanal" },
  { value: "long", label: "Pelo Longo", description: "Escovação diária" },
  { value: "wire", label: "Pelo Duro/Arame", description: "Stripping periódico" },
  { value: "curly", label: "Pelo Cacheado/Encaracolado", description: "Não solta pelo" },
  { value: "double", label: "Dupla Camada", description: "Não pode tosar curto" },
  { value: "hairless", label: "Sem Pelo", description: "Proteção solar necessária" },
] as const;

export const PET_GENDERS = [
  { value: "male", label: "Macho", icon: "♂️" },
  { value: "female", label: "Fêmea", icon: "♀️" },
] as const;

export const NEUTERED_STATUS = [
  { value: "yes", label: "Sim, castrado(a)" },
  { value: "no", label: "Não castrado(a)" },
  { value: "scheduled", label: "Castração agendada" },
] as const;

// ============================================
// 2. PERFIL COMPORTAMENTAL
// ============================================

export const ENERGY_LEVELS = [
  { value: "very_low", label: "Baixíssimo (Idoso/Zen)", icon: "😴", color: "blue" },
  { value: "low", label: "Baixo", icon: "🐢", color: "green" },
  { value: "moderate", label: "Moderado", icon: "🐕", color: "yellow" },
  { value: "high", label: "Alto", icon: "🏃", color: "orange" },
  { value: "hyperactive", label: "Hiperativo", icon: "🚀", color: "red" },
] as const;

export const DOG_SOCIABILITY = [
  { value: "social", label: "Sociável", description: "Brinca bem com todos", icon: "😊", color: "green" },
  { value: "selective", label: "Seletivo", description: "Escolhe amigos", icon: "🤔", color: "yellow" },
  { value: "reactive", label: "Reativo", description: "Precisa de espaço", icon: "⚠️", color: "orange" },
  { value: "antisocial", label: "Antissocial", description: "Guarda de recursos", icon: "🚫", color: "red" },
] as const;

export const HUMAN_SOCIABILITY = [
  { value: "friendly", label: "Amigável", description: "Adora pessoas", icon: "😊", color: "green" },
  { value: "cautious", label: "Cauteloso", description: "Precisa de tempo", icon: "🤔", color: "yellow" },
  { value: "fearful", label: "Medroso", description: "Foge de estranhos", icon: "😰", color: "orange" },
  { value: "reactive", label: "Reativo com estranhos", description: "Pode rosnar/latir", icon: "⚠️", color: "red" },
] as const;

export const PLAY_STYLES = [
  { value: "wrestling", label: "Luta Romana", description: "Contato físico alto" },
  { value: "chase", label: "Perseguição", description: "Adora correr" },
  { value: "fetch", label: "Buscar", description: "Bolinha/Brinquedos" },
  { value: "tug", label: "Cabo de Guerra", description: "Puxar brinquedos" },
  { value: "independent", label: "Independente", description: "Fica na dele" },
  { value: "observer", label: "Observador", description: "Prefere assistir" },
] as const;

export const CORRECTION_SENSITIVITY = [
  { value: "high", label: "Alta", description: "Um 'não' baixo basta" },
  { value: "medium", label: "Média", description: "Precisa de firmeza" },
  { value: "low", label: "Baixa", description: "Precisa de redirecionamento físico" },
] as const;

export const HUMAN_FOCUS_LEVEL = [
  { value: "low", label: "Baixo", description: "Ignora humanos" },
  { value: "medium", label: "Médio", description: "Equilibrado" },
  { value: "high", label: "Alto", description: "Pede atenção constante" },
] as const;

export const FEAR_TRIGGERS = [
  { value: "thunder", label: "Trovões/Fogos de artifício", icon: "⛈️" },
  { value: "dryer", label: "Soprador/Secador", icon: "💨" },
  { value: "broom", label: "Vassoura/Rodo", icon: "🧹" },
  { value: "men_hat", label: "Homens de chapéu/boné", icon: "🧢" },
  { value: "barking", label: "Outros cães latindo", icon: "🐕" },
  { value: "motorcycles", label: "Motos/Carros barulhentos", icon: "🏍️" },
  { value: "children", label: "Crianças", icon: "👶" },
  { value: "cats", label: "Gatos", icon: "🐈" },
  { value: "loud_noises", label: "Barulhos altos em geral", icon: "📢" },
  { value: "vacuum", label: "Aspirador de pó", icon: "🧹" },
  { value: "water", label: "Água/Banho", icon: "💧" },
  { value: "vet", label: "Veterinário/Clínicas", icon: "🏥" },
  { value: "car", label: "Andar de carro", icon: "🚗" },
  { value: "elevator", label: "Elevador", icon: "🛗" },
  { value: "stairs", label: "Escadas", icon: "🪜" },
] as const;

export const CALMING_METHODS = [
  { value: "treat", label: "Petisco", icon: "🦴" },
  { value: "chest_pet", label: "Carinho no peito", icon: "💆" },
  { value: "timeout", label: "Isolamento breve (Time-out positivo)", icon: "🚪" },
  { value: "specific_toy", label: "Brinquedo específico", icon: "🧸" },
  { value: "music", label: "Música calma", icon: "🎵" },
  { value: "thunder_shirt", label: "Roupa de compressão", icon: "👕" },
  { value: "crate", label: "Caixa de transporte (refúgio)", icon: "📦" },
] as const;

export const EQUIPMENT_RESTRICTIONS = [
  { value: "no_choke", label: "Não aceita enforcador" },
  { value: "harness_only", label: "Só usa peitoral" },
  { value: "no_over_head", label: "Medo de coleira por cima da cabeça" },
  { value: "no_muzzle", label: "Não aceita focinheira" },
  { value: "gentle_leader", label: "Usa Gentle Leader/Halti" },
] as const;

export const COEXISTENCE_RESTRICTIONS = [
  { value: "no_intact_males", label: "Não pode ficar com machos inteiros" },
  { value: "no_intact_females", label: "Não pode ficar com fêmeas no cio" },
  { value: "no_small_dogs", label: "Não brinca com cães muito pequenos" },
  { value: "no_large_dogs", label: "Não brinca com cães muito grandes" },
  { value: "resource_guarding", label: "Tem proteção de recursos (brinquedos/comida)" },
  { value: "food_guarding", label: "Protege comida agressivamente" },
  { value: "space_guarding", label: "Protege espaço de descanso" },
  { value: "same_sex_aggression", label: "Agressivo com mesmo sexo" },
  { value: "supervision_required", label: "Requer supervisão constante" },
] as const;

// ============================================
// 3. CENTRAL DE SAÚDE
// ============================================

export const CHRONIC_CONDITIONS = [
  { value: "cardiac", label: "Cardíaco", icon: "❤️" },
  { value: "renal", label: "Renal/Rins", icon: "🫘" },
  { value: "hepatic", label: "Hepático/Fígado", icon: "🫀" },
  { value: "epileptic", label: "Epilético", icon: "⚡" },
  { value: "diabetic", label: "Diabético", icon: "💉" },
  { value: "hypothyroid", label: "Hipotireoidismo", icon: "🦋" },
  { value: "hyperthyroid", label: "Hipertireoidismo", icon: "🦋" },
  { value: "arthritis", label: "Artrite/Artrose", icon: "🦴" },
  { value: "hip_dysplasia", label: "Displasia Coxofemoral", icon: "🦴" },
  { value: "allergies", label: "Alergias Crônicas", icon: "🤧" },
  { value: "cancer", label: "Câncer (em tratamento)", icon: "🎗️" },
  { value: "cushings", label: "Síndrome de Cushing", icon: "🔬" },
  { value: "addisons", label: "Doença de Addison", icon: "🔬" },
  { value: "megaesophagus", label: "Megaesôfago", icon: "🍽️" },
  { value: "blind", label: "Cegueira", icon: "👁️" },
  { value: "deaf", label: "Surdez", icon: "👂" },
] as const;

export const FOOD_ALLERGIES = [
  { value: "chicken", label: "Frango" },
  { value: "beef", label: "Carne Bovina" },
  { value: "pork", label: "Porco" },
  { value: "fish", label: "Peixe" },
  { value: "egg", label: "Ovo" },
  { value: "dairy", label: "Laticínios" },
  { value: "wheat", label: "Trigo/Glúten" },
  { value: "corn", label: "Milho" },
  { value: "soy", label: "Soja" },
  { value: "rice", label: "Arroz" },
  { value: "lamb", label: "Cordeiro" },
  { value: "duck", label: "Pato" },
] as const;

export const MEDICATION_ALLERGIES = [
  { value: "penicillin", label: "Penicilina" },
  { value: "sulfa", label: "Sulfas" },
  { value: "nsaids", label: "Anti-inflamatórios (AINES)" },
  { value: "anesthesia", label: "Anestésicos (especificar)" },
  { value: "vaccines", label: "Vacinas (especificar)" },
  { value: "flea_meds", label: "Antipulgas (especificar marca)" },
] as const;

export const MEDICATION_TIMES = [
  { value: "06:00", label: "06:00 - Manhã cedo" },
  { value: "08:00", label: "08:00 - Café da manhã" },
  { value: "10:00", label: "10:00 - Meio da manhã" },
  { value: "12:00", label: "12:00 - Almoço" },
  { value: "14:00", label: "14:00 - Meio da tarde" },
  { value: "16:00", label: "16:00 - Lanche" },
  { value: "18:00", label: "18:00 - Fim da tarde" },
  { value: "20:00", label: "20:00 - Jantar" },
  { value: "22:00", label: "22:00 - Noite" },
] as const;

export const MEDICATION_METHODS = [
  { value: "in_food", label: "No meio da ração", icon: "🥣" },
  { value: "with_treat", label: "Com petisco", icon: "🦴" },
  { value: "direct_mouth", label: "Direto na boca", icon: "💊" },
  { value: "with_paste", label: "Misturado em pasta", icon: "🥜" },
  { value: "injectable", label: "Injetável (staff treinado)", icon: "💉" },
  { value: "topical", label: "Tópico (pele/ouvido)", icon: "👂" },
  { value: "eye_drops", label: "Colírio", icon: "👁️" },
] as const;

export const PREVENTIVE_TYPES = [
  { value: "dewormer", label: "Vermífugo", icon: "💊" },
  { value: "flea_tick", label: "Antipulgas e Carrapatos", icon: "🐛" },
  { value: "heartworm", label: "Dirofilariose (Verme do Coração)", icon: "❤️" },
  { value: "giardia", label: "Giárdia", icon: "🦠" },
] as const;

export const PREVENTIVE_FREQUENCIES = [
  { value: "30", label: "Mensal (30 dias)" },
  { value: "60", label: "Bimestral (60 dias)" },
  { value: "90", label: "Trimestral (90 dias)" },
  { value: "180", label: "Semestral (180 dias)" },
  { value: "365", label: "Anual (365 dias)" },
] as const;

export const VACCINE_TYPES = [
  { value: "v8", label: "V8 (Óctupla)", icon: "💉" },
  { value: "v10", label: "V10 (Déctupla)", icon: "💉" },
  { value: "rabies", label: "Antirrábica", icon: "💉" },
  { value: "kennel_cough", label: "Gripe Canina (Tosse dos Canis)", icon: "💉" },
  { value: "giardia", label: "Giárdia", icon: "💉" },
  { value: "leishmania", label: "Leishmaniose", icon: "💉" },
  { value: "lyme", label: "Lyme (Borreliose)", icon: "💉" },
  { value: "leptospirosis", label: "Leptospirose (reforço)", icon: "💉" },
] as const;

// Checklist de Inspeção (Check-in)
export const SKIN_COAT_STATUS = [
  { value: "intact", label: "Íntegra", color: "green", icon: "✅" },
  { value: "parasites", label: "Presença de Ectoparasitas", color: "red", icon: "🐛" },
  { value: "hair_loss", label: "Falha de pelo", color: "yellow", icon: "⚠️" },
  { value: "wound", label: "Ferida crostosa", color: "red", icon: "🩹" },
  { value: "redness", label: "Vermelhidão", color: "orange", icon: "🔴" },
  { value: "hot_spot", label: "Hot Spot", color: "red", icon: "🔥" },
  { value: "dry", label: "Pele seca/descamando", color: "yellow", icon: "❄️" },
] as const;

export const EAR_STATUS = [
  { value: "clean", label: "Limpos", color: "green", icon: "✅" },
  { value: "odor", label: "Odor forte", color: "orange", icon: "👃" },
  { value: "discharge", label: "Secreção escura", color: "red", icon: "💧" },
  { value: "sensitivity", label: "Sensibilidade ao toque", color: "yellow", icon: "⚠️" },
  { value: "red", label: "Vermelhidão interna", color: "orange", icon: "🔴" },
] as const;

export const EYE_STATUS = [
  { value: "clean", label: "Limpos", color: "green", icon: "✅" },
  { value: "tearing", label: "Lacrimejamento excessivo", color: "yellow", icon: "💧" },
  { value: "opacity", label: "Opacidade", color: "orange", icon: "👁️" },
  { value: "redness", label: "Vermelhidão", color: "orange", icon: "🔴" },
  { value: "discharge", label: "Secreção (remela)", color: "yellow", icon: "💧" },
] as const;

export const PAW_STATUS = [
  { value: "normal", label: "Normal", color: "green", icon: "✅" },
  { value: "long_nails", label: "Unhas compridas", color: "yellow", icon: "✂️" },
  { value: "licking", label: "Lambedura excessiva", color: "orange", icon: "👅" },
  { value: "pad_injury", label: "Lesão em coxins", color: "red", icon: "🩹" },
  { value: "interdigital", label: "Lesão interdigital", color: "red", icon: "⚠️" },
] as const;

// ============================================
// 4. ALIMENTAÇÃO
// ============================================

export const FOOD_TYPES = [
  { value: "dry_kibble", label: "Ração Seca", icon: "🥣" },
  { value: "wet_food", label: "Ração Úmida/Patê", icon: "🥫" },
  { value: "natural_raw", label: "Alimentação Natural Crua (AN)", icon: "🥩" },
  { value: "natural_cooked", label: "Alimentação Natural Cozida", icon: "🍲" },
  { value: "mixed", label: "Mista (Ração + AN)", icon: "🍽️" },
  { value: "prescription", label: "Ração Terapêutica/Veterinária", icon: "💊" },
] as const;

export const FOOD_PREPARATION = [
  { value: "dry_pure", label: "Ração Seca Pura" },
  { value: "dry_warm_water", label: "Ração com Água Morna" },
  { value: "dry_broth", label: "Ração com Caldo" },
  { value: "natural_cold", label: "Alimentação Natural Fria" },
  { value: "natural_heated", label: "Alimentação Natural Aquecida" },
  { value: "kibble_topping", label: "Ração com Topping (Patê)" },
  { value: "hand_feed", label: "Alimentação na mão (pet melindroso)" },
  { value: "slow_feeder", label: "Comedouro Lento/Interativo" },
  { value: "elevated", label: "Comedouro Elevado" },
] as const;

export const APPETITE_STATUS = [
  { value: "excellent", label: "Excelente - Comeu tudo rápido", icon: "🤩", color: "green" },
  { value: "good", label: "Bom - Comeu tudo", icon: "😊", color: "green" },
  { value: "moderate", label: "Moderado - Deixou um pouco", icon: "😐", color: "yellow" },
  { value: "poor", label: "Fraco - Comeu menos da metade", icon: "😕", color: "orange" },
  { value: "none", label: "Não quis comer", icon: "😔", color: "red" },
  { value: "stimulated", label: "Precisou de estímulo (na mão)", icon: "👋", color: "yellow" },
] as const;

export const WATER_INTAKE = [
  { value: "normal", label: "Normal", icon: "💧", color: "green" },
  { value: "increased", label: "Aumentada (bebeu muito)", icon: "💦", color: "yellow" },
  { value: "decreased", label: "Diminuída", icon: "🌵", color: "orange" },
  { value: "none", label: "Não bebeu água", icon: "⚠️", color: "red" },
] as const;

// ============================================
// 5. LOGS DIÁRIOS - BEM-ESTAR FÍSICO
// ============================================

export const STOOL_QUALITY = [
  { value: "type_1", label: "Tipo 1-2: Duro/Seco", icon: "💩", color: "orange", description: "Possível constipação" },
  { value: "type_3", label: "Tipo 3-4: Ideal", icon: "✅", color: "green", description: "Saudável e formado" },
  { value: "type_5", label: "Tipo 5: Mole", icon: "⚠️", color: "yellow", description: "Bordas irregulares" },
  { value: "type_6", label: "Tipo 6: Pastoso", icon: "⚠️", color: "orange", description: "Sem forma definida" },
  { value: "type_7", label: "Tipo 7: Líquido/Diarreia", icon: "🚨", color: "red", description: "Completamente líquido" },
  { value: "blood", label: "Com sangue", icon: "🩸", color: "red", description: "Atenção veterinária" },
  { value: "mucus", label: "Com muco", icon: "💧", color: "orange", description: "Possível irritação" },
  { value: "none", label: "Não fez cocô", icon: "❌", color: "yellow", description: "Monitorar" },
] as const;

export const URINE_QUALITY = [
  { value: "normal", label: "Normal - Amarelo claro", icon: "✅", color: "green" },
  { value: "dark", label: "Escuro/Forte", icon: "⚠️", color: "orange" },
  { value: "frequent", label: "Muitas vezes (poliúria)", icon: "🔄", color: "yellow" },
  { value: "straining", label: "Dificuldade para urinar", icon: "😣", color: "red" },
  { value: "blood", label: "Com sangue", icon: "🩸", color: "red" },
  { value: "none", label: "Não urinou", icon: "❌", color: "yellow" },
] as const;

export const PHYSICAL_INTEGRITY = [
  { value: "perfect", label: "Voltou sem marcas", icon: "✅", color: "green" },
  { value: "minor_scratch", label: "Pequeno arranhão de brincadeira", icon: "🩹", color: "yellow" },
  { value: "bite_mark", label: "Marca de mordida leve", icon: "🦷", color: "orange" },
  { value: "limping", label: "Mancando levemente", icon: "🦿", color: "orange" },
  { value: "skin_issue", label: "Observação de pele", icon: "👁️", color: "yellow" },
  { value: "ear_issue", label: "Observação de orelha", icon: "👂", color: "yellow" },
  { value: "injury", label: "Lesão que necessita atenção", icon: "🚨", color: "red" },
] as const;

export const MOOD_STATUS = [
  { value: "happy", label: "Feliz/Animado", icon: "😊", color: "green" },
  { value: "calm", label: "Calmo/Relaxado", icon: "😌", color: "blue" },
  { value: "playful", label: "Brincalhão", icon: "🎾", color: "green" },
  { value: "tired", label: "Cansado", icon: "😴", color: "blue" },
  { value: "anxious", label: "Ansioso", icon: "😰", color: "yellow" },
  { value: "agitated", label: "Agitado", icon: "🌀", color: "orange" },
  { value: "fearful", label: "Medroso", icon: "😨", color: "orange" },
  { value: "aggressive", label: "Agressivo/Reativo", icon: "😠", color: "red" },
  { value: "sick", label: "Aparentando doente", icon: "🤒", color: "red" },
  { value: "apathetic", label: "Apático/Sem interesse", icon: "😶", color: "orange" },
] as const;

export const NAP_QUALITY = [
  { value: "deep", label: "Dormiu profundamente", icon: "😴", color: "green" },
  { value: "rested", label: "Descansou mas alerta", icon: "😌", color: "blue" },
  { value: "restless", label: "Não conseguiu relaxar", icon: "😟", color: "orange" },
  { value: "none", label: "Não descansou", icon: "⚡", color: "yellow" },
] as const;

export const GROUP_ROLE = [
  { value: "leader", label: "Líder de brincadeira", icon: "👑" },
  { value: "follower", label: "Seguidor/Participativo", icon: "🤝" },
  { value: "peacemaker", label: "Pacificador (separa brigas)", icon: "☮️" },
  { value: "shadow", label: "Sombra (segue o staff)", icon: "👤" },
  { value: "loner", label: "Solitário (fica na dele)", icon: "🧘" },
  { value: "instigator", label: "Instigador (provoca brincadeiras)", icon: "🎭" },
] as const;

export const ACTIVITIES_PERFORMED = [
  { value: "free_play", label: "Brincadeira livre no pátio", icon: "🎾" },
  { value: "structured_play", label: "Brincadeira estruturada", icon: "🎯" },
  { value: "fetch", label: "Buscar bolinha/brinquedo", icon: "⚾" },
  { value: "tug", label: "Cabo de guerra", icon: "🪢" },
  { value: "running", label: "Corrida/Gasto energético", icon: "🏃" },
  { value: "swimming", label: "Banho de piscina", icon: "🏊" },
  { value: "hose_play", label: "Brincadeira com mangueira", icon: "💦" },
  { value: "enrichment", label: "Enriquecimento ambiental cognitivo", icon: "🧩" },
  { value: "sniffing", label: "Passeio de farejamento", icon: "👃" },
  { value: "relaxation", label: "Treino de relaxamento", icon: "🧘" },
  { value: "grooming", label: "Escovação/Higiene", icon: "✨" },
  { value: "training", label: "Sessão de treino", icon: "🎓" },
  { value: "socialization", label: "Socialização controlada", icon: "🤝" },
  { value: "agility", label: "Exercícios de agilidade", icon: "🏆" },
  { value: "massage", label: "Massagem relaxante", icon: "💆" },
] as const;

// ============================================
// 6. COMPORTAMENTO - MÉTRICAS
// ============================================

export const BEHAVIOR_METRICS = [
  { value: "group_interaction", label: "Interação com o Grupo", description: "Como se relaciona com outros cães" },
  { value: "relaxation", label: "Nível de Relaxamento", description: "Conseguiu descansar?" },
  { value: "obedience", label: "Obediência aos Comandos", description: "Responde bem às instruções" },
  { value: "barking", label: "Nível de Latido", description: "Frequência de latidos" },
  { value: "agitation", label: "Nível de Agitação", description: "Inquietação geral" },
] as const;

// Escala de 1 a 5 para métricas comportamentais
export const BEHAVIOR_SCALE = [
  { value: 1, label: "1 - Muito Baixo", color: "red" },
  { value: 2, label: "2 - Baixo", color: "orange" },
  { value: 3, label: "3 - Moderado", color: "yellow" },
  { value: 4, label: "4 - Bom", color: "green" },
  { value: 5, label: "5 - Excelente", color: "emerald" },
] as const;

export const TEMPERAMENT_METRICS = [
  { value: "confidence", label: "Confiança", min: "Medroso", max: "Muito Autoconfiante" },
  { value: "impulsivity", label: "Impulsividade", min: "Reflexivo", max: "Age sem pensar" },
  { value: "resilience", label: "Resiliência", min: "Demora a recuperar", max: "Recupera rápido" },
  { value: "focus", label: "Foco", min: "Disperso", max: "Muito focado" },
  { value: "frustration_tolerance", label: "Tolerância à Frustração", min: "Baixa", max: "Alta" },
] as const;

// ============================================
// 7. TREINAMENTO - SKILLS MATRIX
// ============================================

export const TRAINING_COMMANDS = [
  { value: "sit", label: "Senta", icon: "🪑", category: "basic" },
  { value: "down", label: "Deita", icon: "⬇️", category: "basic" },
  { value: "stay", label: "Fica", icon: "✋", category: "basic" },
  { value: "come", label: "Aqui/Vem (Recall)", icon: "🔙", category: "basic" },
  { value: "heel", label: "Junto (Heel)", icon: "🚶", category: "intermediate" },
  { value: "place", label: "Cesto/Lugar (Place)", icon: "🛏️", category: "intermediate" },
  { value: "leave_it", label: "Deixa", icon: "🚫", category: "intermediate" },
  { value: "drop_it", label: "Larga", icon: "👇", category: "intermediate" },
  { value: "wait", label: "Espera (porta/comida)", icon: "⏸️", category: "intermediate" },
  { value: "look", label: "Olha/Foco", icon: "👀", category: "basic" },
  { value: "shake", label: "Dá a Pata", icon: "🐾", category: "fun" },
  { value: "roll_over", label: "Rola", icon: "🔄", category: "fun" },
  { value: "spin", label: "Gira", icon: "💫", category: "fun" },
  { value: "touch", label: "Toca (Target)", icon: "👆", category: "intermediate" },
  { value: "back_up", label: "Recua", icon: "⬅️", category: "advanced" },
  { value: "crawl", label: "Rasteja", icon: "🐍", category: "advanced" },
  { value: "bow", label: "Reverência", icon: "🙇", category: "fun" },
  { value: "quiet", label: "Silêncio", icon: "🤫", category: "behavior" },
  { value: "crate", label: "Entra na Caixa", icon: "📦", category: "behavior" },
  { value: "settle", label: "Relaxa/Deita e Fica", icon: "😌", category: "behavior" },
] as const;

export const COMMAND_CATEGORIES = [
  { value: "basic", label: "Básico", color: "green" },
  { value: "intermediate", label: "Intermediário", color: "blue" },
  { value: "advanced", label: "Avançado", color: "purple" },
  { value: "fun", label: "Truques Divertidos", color: "pink" },
  { value: "behavior", label: "Comportamental", color: "orange" },
] as const;

export const COMMAND_PROFICIENCY = [
  { value: "not_started", label: "Não iniciado", icon: "⬜", color: "gray", percent: 0 },
  { value: "learning", label: "Entendendo o sinal", icon: "🟨", color: "yellow", percent: 25 },
  { value: "with_treat", label: "Faz com petisco", icon: "🟧", color: "orange", percent: 50 },
  { value: "reliable", label: "Dominado", icon: "🟩", color: "green", percent: 75 },
  { value: "proofed", label: "Dominado com distração", icon: "🌟", color: "emerald", percent: 100 },
] as const;

export const TRAINING_3DS = [
  { value: "distance", label: "Distância", description: "A que distância funciona?" },
  { value: "duration", label: "Duração", description: "Por quanto tempo mantém?" },
  { value: "distraction", label: "Distração", description: "Funciona com distrações?" },
] as const;

// ============================================
// 8. CHECK-IN / CHECK-OUT
// ============================================

export const CHECKIN_OBSERVATIONS = [
  { value: "normal", label: "Pet em condições normais" },
  { value: "tired", label: "Pet parece cansado" },
  { value: "excited", label: "Pet muito excitado" },
  { value: "anxious", label: "Pet ansioso na separação" },
  { value: "medication_given", label: "Medicação administrada em casa" },
  { value: "no_breakfast", label: "Não tomou café da manhã" },
  { value: "diarrhea_home", label: "Teve diarreia em casa" },
  { value: "vomit_home", label: "Vomitou em casa" },
  { value: "limping", label: "Chegou mancando" },
  { value: "wound", label: "Chegou com ferida/arranhão" },
] as const;

export const CHECKOUT_OBSERVATIONS = [
  { value: "normal", label: "Dia normal, sem intercorrências" },
  { value: "great_day", label: "Dia excelente!" },
  { value: "tired", label: "Muito cansado (gastou energia)" },
  { value: "incident", label: "Houve incidente (ver log)" },
  { value: "medication", label: "Medicação administrada" },
  { value: "ate_well", label: "Comeu bem" },
  { value: "ate_little", label: "Comeu pouco" },
  { value: "diarrhea", label: "Teve diarreia" },
  { value: "vomit", label: "Vomitou" },
  { value: "new_friend", label: "Fez novo amigo" },
] as const;

export const PERIOD_TYPES = [
  { value: "full_day", label: "Dia Inteiro", hours: 8, icon: "☀️" },
  { value: "half_day_morning", label: "Meio Período (Manhã)", hours: 4, icon: "🌅" },
  { value: "half_day_afternoon", label: "Meio Período (Tarde)", hours: 4, icon: "🌇" },
  { value: "extended", label: "Horário Estendido", hours: 10, icon: "🌙" },
  { value: "overnight", label: "Pernoite", hours: 24, icon: "🏠" },
] as const;

// ============================================
// 9. TIPOS DE DOCUMENTOS
// ============================================

export const DOCUMENT_TYPES = [
  { value: "vaccine_card", label: "Carteira de Vacinação", icon: "💉" },
  { value: "exam_result", label: "Resultado de Exame", icon: "🔬" },
  { value: "prescription", label: "Receita Veterinária", icon: "📋" },
  { value: "medical_report", label: "Laudo Médico", icon: "📄" },
  { value: "contract", label: "Contrato de Serviço", icon: "📝" },
  { value: "authorization", label: "Autorização", icon: "✅" },
  { value: "photo", label: "Foto", icon: "📸" },
  { value: "video", label: "Vídeo", icon: "🎥" },
  { value: "certificate", label: "Certificado/Diploma", icon: "🏆" },
  { value: "pedigree", label: "Pedigree/RG", icon: "📜" },
  { value: "insurance", label: "Seguro Pet", icon: "🛡️" },
  { value: "other", label: "Outro", icon: "📎" },
] as const;

// ============================================
// HELPER FUNCTIONS
// ============================================

export type OptionValue<T extends readonly { value: string | number }[]> = T[number]["value"];

export function getOptionLabel<T extends readonly { value: string | number; label: string }[]>(
  options: T,
  value: T[number]["value"]
): string {
  const option = options.find(o => o.value === value);
  return option?.label || String(value);
}

export function getOptionByValue<T extends readonly { value: string | number }[]>(
  options: T,
  value: T[number]["value"]
): T[number] | undefined {
  return options.find(o => o.value === value);
}
