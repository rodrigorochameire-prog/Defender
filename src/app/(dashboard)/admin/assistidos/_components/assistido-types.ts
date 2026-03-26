// Interface para o tipo Assistido usado na UI
export interface AssistidoUI {
  id: number;
  nome: string;
  cpf: string;
  rg: string;
  dataNascimento: string;
  naturalidade: string;
  statusPrisional: string;
  localPrisao: string;
  unidadePrisional: string;
  telefone: string;
  telefoneContato: string;
  nomeContato: string;
  endereco: string;
  photoUrl: string;
  observacoes: string;
  area: string;
  areas?: string[]; // Lista de areas para multiplas cores
  atribuicoes?: string[]; // Lista de atribuicoes para multiplas cores
  vulgo: string;
  crimePrincipal: string;
  defensor: string;
  processoPrincipal: string;
  processosAtivos?: number;
  demandasAbertas: number;
  proximoPrazo: string | null;
  prioridadeAI: string;
  createdAt: string;
  // Campos adicionais para compatibilidade com o componente
  testemunhasArroladas: Array<{ nome: string; ouvida: boolean }>;
  interrogatorioRealizado: boolean;
  tipoProximaAudiencia: string;
  proximaAudiencia: string | null;
  // Novos campos
  comarcas?: string[];
  comarcaNome?: string | null;
  scoreComplexidade?: number;
  ultimoEvento?: { tipo: string; data: string; titulo: string } | null;
  atoProximoPrazo?: string;
  dataPrisao?: string | null;
  numeroProcesso?: string;
  faseProcessual?: string;
  driveFolderId?: string | null;
  driveFilesCount?: number;
  nomeMae?: string;
  atribuicaoPrimaria?: string;
}
