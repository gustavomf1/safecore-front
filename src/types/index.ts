export type PerfilUsuario = 'ENGENHEIRO' | 'TECNICO' | 'EXTERNO'
export type NivelRisco = 'BAIXO' | 'MODERADO' | 'ALTO' | 'CRITICO'
export type StatusNaoConformidade =
  | 'ABERTA'
  | 'AGUARDANDO_TRATATIVA'
  | 'AGUARDANDO_APROVACAO_PLANO'
  | 'EM_AJUSTE_PELO_EXTERNO'
  | 'EM_EXECUCAO'
  | 'AGUARDANDO_VALIDACAO_FINAL'
  | 'CONCLUIDO'
  | 'EM_TRATAMENTO'   // legado
  | 'NAO_RESOLVIDA'   // legado

export type TipoAcaoHistorico =
  | 'CRIACAO'
  | 'SUBMISSAO_INVESTIGACAO'
  | 'APROVACAO_PLANO'
  | 'REJEICAO_PLANO'
  | 'SUBMISSAO_EVIDENCIAS'
  | 'APROVACAO_EVIDENCIAS'
  | 'REJEICAO_EVIDENCIAS'
export type StatusDesvio =
  | 'ABERTO'
  | 'AGUARDANDO_TRATATIVA'
  | 'AGUARDANDO_APROVACAO'
  | 'CONCLUIDO'
  | 'REGISTRADO'  // legado

export type TipoAcaoHistoricoDesvio =
  | 'CRIACAO'
  | 'TRATATIVA_SUBMETIDA'
  | 'APROVADO'
  | 'REPROVADO'

export interface HistoricoDesvioResponse {
  id: string
  tipo: TipoAcaoHistoricoDesvio
  usuarioNome?: string
  comentario?: string
  statusAnterior?: StatusDesvio
  statusAtual?: StatusDesvio
  snapshotObservacao?: string
  snapshotEvidenciaId?: string
  dataAcao: string
}
export type ParecerValidacao = 'APROVADO' | 'REPROVADO'

export interface LoginRequest {
  email: string
  senha: string
}

export interface LoginResponse {
  id: string
  token: string
  refreshToken: string
  nome: string
  email: string
  perfil: PerfilUsuario
  isAdmin: boolean
}

export interface CriarUsuarioDiretoRequest {
  nome: string
  email: string
  senha: string
  perfil: PerfilUsuario
  empresaId: string
  isAdmin: boolean
  telefone?: string
}

export interface Empresa {
  id: string
  razaoSocial: string
  cnpj: string
  nomeFantasia?: string
  email?: string
  telefone?: string
  empresaMaeId?: string
  empresaMaeNome?: string
  ativo: boolean
  exibirNoSeletor: boolean
  dtInativacao?: string
}

export interface EmpresaRequest {
  razaoSocial: string
  cnpj: string
  nomeFantasia?: string
  email?: string
  telefone?: string
  empresaMaeId?: string
}

export interface Estabelecimento {
  id: string
  nome: string
  codigo: string
  empresaId: string
  empresaNome: string
  cep?: string
  logradouro?: string
  numero?: string
  bairro?: string
  cidade?: string
  estado?: string
  ativo: boolean
  dtInativacao?: string
}

export interface EstabelecimentoRequest {
  nome: string
  codigo: string
  empresaId: string
  cep?: string
  logradouro?: string
  numero?: string
  bairro?: string
  cidade?: string
  estado?: string
}

export interface Usuario {
  id: string
  nome: string
  email: string
  perfil: PerfilUsuario
  empresaId: string
  empresaNome: string
  empresaCnpj?: string
  telefone?: string
  ativo: boolean
  isAdmin: boolean
  dtCriacao?: string
  dtInativacao?: string
}

export interface UsuarioRequest {
  nome: string
  email: string
  senha?: string
  perfil: PerfilUsuario
  empresaId: string
  telefone?: string
}

export interface DevolutivaResponse {
  id: string
  descricaoPlanoAcao: string
  dataDevolutiva: string
  engenheiroNome?: string
}

export interface ExecucaoAcaoResponse {
  id: string
  descricaoAcaoExecutada: string
  dataExecucao: string
  engenheiroNome?: string
}

export interface ValidacaoResponse {
  id: string
  parecer: ParecerValidacao
  observacao?: string
  dataValidacao: string
  engenheiroNome?: string
}

export interface Norma {
  id: string
  titulo: string
  descricao?: string
  conteudo?: string
  ativo: boolean
  dtInativacao?: string
  criadoEm: string
  criadoPorNome: string
  atualizadoEm: string
  atualizadoPorNome: string
  totalOcorrencias: number
  totalNcsAtivas: number
}

export interface NormaRequest {
  titulo: string
  descricao?: string
  conteudo?: string
}

export interface NcTrechoNorma {
  id: string
  normaId: string
  normaTitulo: string
  clausulaReferencia?: string
  textoEditado: string
  dataVinculo: string
}

export interface Localizacao {
  id: string
  nome: string
  estabelecimentoId: string
  estabelecimentoNome: string
  ativo: boolean
  dtInativacao?: string
}

export interface LocalizacaoRequest {
  nome: string
  estabelecimentoId: string
}

export interface NcResumo {
  id: string
  codigo: string
  titulo: string
  dataRegistro: string
  status: StatusNaoConformidade
}

export interface AtividadeResponse {
  id: string
  titulo: string
  descricao: string
  ordem: number
  status: 'PENDENTE' | 'APROVADA' | 'REJEITADA'
  motivoRejeicao?: string
  descricaoExecucao?: string
  statusExecucao?: 'PENDENTE' | 'APROVADA' | 'REJEITADA'
  motivoRejeicaoExecucao?: string
  evidencias: Evidencia[]
}

export interface HistoricoNcResponse {
  id: string
  acao: TipoAcaoHistorico
  usuarioNome?: string
  comentario?: string
  statusAnterior?: StatusNaoConformidade
  statusAtual?: StatusNaoConformidade
  dataAcao: string
}

export interface NaoConformidade {
  id: string
  codigo: string
  estabelecimentoId: string
  estabelecimentoNome: string
  titulo: string
  localizacaoId: string
  localizacaoNome: string
  descricao: string
  dataRegistro: string
  tecnicoNome?: string
  regraDeOuro: boolean
  severidade: number | null
  probabilidade: number | null
  nivelRisco: NivelRisco
  responsavelTrativaId: string
  responsavelTrativaNome: string
  responsavelTrativaEmail: string
  responsavelTrativaPerfil?: string
  responsavelNcId: string
  responsavelNcNome: string
  responsavelNcEmail: string
  responsavelNcPerfil?: string
  dataLimiteResolucao: string | null
  usuarioCriacaoNome?: string
  usuarioCriacaoEmail?: string
  usuarioCriacaoId?: string
  status: StatusNaoConformidade
  vencida: boolean
  reincidencia: boolean
  ncAnteriorId?: string
  ncAnteriorTitulo?: string
  cadeiaReincidencias: NcResumo[]
  reincidencias: NcResumo[]
  // Investigação — pergunta + resposta por porquê
  porqueUm?: string
  porqueUmResposta?: string
  porqueDois?: string
  porqueDoisResposta?: string
  porqueTres?: string
  porqueTresResposta?: string
  porqueQuatro?: string
  porqueQuatroResposta?: string
  porqueCinco?: string
  porqueCincoResposta?: string
  causaRaiz?: string
  descricaoExecucao?: string
  atividades: AtividadeResponse[]
  historico: HistoricoNcResponse[]
  investigacaoSnapshots: InvestigacaoSnapshot[]
  execucaoSnapshots: ExecucaoSnapshot[]
  // Legado
  devolutivas: DevolutivaResponse[]
  execucoes: ExecucaoAcaoResponse[]
  validacoes: ValidacaoResponse[]
  normas: Norma[]
  empresaContratadaId?: string
  empresaContratadaNome?: string
}

export interface NaoConformidadeRequest {
  estabelecimentoId: string
  titulo: string
  localizacaoId: string
  descricao?: string
  severidade?: number
  probabilidade?: number
  responsavelTrativaId?: string
  responsavelNcId?: string
  regraDeOuro: boolean
  normaIds?: string[]
  reincidencia: boolean
  ncAnteriorId?: string
  emailsManuais?: string[]
  emailsPadraoExcluidos?: string[]
  empresaContratadaId?: string
}

export interface InvestigacaoRequest {
  porques: { pergunta: string; resposta: string }[]
  causaRaiz: string
  atividades: { titulo: string; descricao: string }[]
  emailsManuais?: string[]
}

export interface RevisarAtividadesRequest {
  decisoes: { atividadeId: string; status: 'APROVADA' | 'REJEITADA'; motivo?: string }[]
  comentario?: string
  emailsManuais?: string[]
  porqueRejeitado?: boolean
}

export interface AprovarRejeitarRequest {
  comentario?: string
  emailsManuais?: string[]
}

export interface SubmeterEvidenciasRequest {
  descricaoExecucao: string
  emailsManuais?: string[]
}

export interface SubmeterExecucaoRequest {
  atividades: { atividadeId: string; descricaoExecucao?: string }[]
  emailsManuais?: string[]
}

export interface RevisarExecucaoRequest {
  decisoes: { atividadeId: string; status: 'APROVADA' | 'REJEITADA'; motivo?: string }[]
  comentario?: string
  emailsManuais?: string[]
}

// Legado
export interface DevolutivaRequest {
  descricaoPlanoAcao: string
}

export interface ExecucaoAcaoRequest {
  descricaoAcaoExecutada: string
}

export interface ValidacaoRequest {
  parecer: ParecerValidacao
  observacao?: string
}

export type StatusTratativaDesvio = 'PENDENTE' | 'APROVADO' | 'REPROVADO'

export interface TrativaDesvioEvidencia {
  id: string
  nome: string
  url?: string
}

export interface TrativaDesvio {
  id: string
  titulo: string
  descricao: string
  evidencias: TrativaDesvioEvidencia[]
  status: StatusTratativaDesvio
  motivoReprovacao?: string
  numero: number
  rodada?: number
  dtCriacao: string
}

export interface Desvio {
  id: string
  codigo: string
  estabelecimentoId: string
  estabelecimentoNome: string
  titulo: string
  localizacaoId?: string
  localizacaoNome?: string
  descricao: string
  dataRegistro: string
  tecnicoNome?: string
  usuarioCriacaoNome?: string
  usuarioCriacaoEmail?: string
  usuarioCriacaoId?: string
  regraDeOuro: boolean
  orientacaoRealizada: string
  status: StatusDesvio
  responsavelDesvioId?: string
  responsavelDesvioNome?: string
  responsavelTratativaId?: string
  responsavelTrativaNome?: string
  observacaoTratativa?: string
  evidenciaTratativaId?: string
  evidenciaTrativaNome?: string
  evidenciaTrativaUrl?: string
  historico: HistoricoDesvioResponse[]
  tratativas: TrativaDesvio[]
  empresaContratadaId?: string
  empresaContratadaNome?: string
}

export interface DesvioRequest {
  estabelecimentoId: string
  titulo: string
  localizacaoId: string
  descricao: string
  orientacaoRealizada: string
  regraDeOuro: boolean
  responsavelDesvioId?: string
  responsavelTratativaId?: string
  empresaContratadaId?: string
}

export interface AdicionarTrativaRequest {
  titulo: string
  descricao: string
  evidenciaIds: string[]
}

export interface ReprovarTrativasDesvioRequest {
  itens: { trativaId: string; motivo: string }[]
  emailsManuais?: string[]
}

export interface AprovarDesvioRequest {
  comentario?: string
  emailsManuais?: string[]
}

export interface ReprovarDesvioRequest {
  motivo: string
}

export interface DashboardStats {
  totalOcorrencias: number
  totalDesvios: number
  totalNaoConformidades: number
  totalRegraDeOuro: number
  ncAbertas: number
  ncEmTratamento: number
  ncConcluidas: number
  ncNaoResolvidas: number
  totalDesviosConcluidos: number
}

export type StatusSnapshot = 'PENDENTE' | 'APROVADO' | 'REPROVADO'

export interface InvestigacaoSnapshot {
  id: string
  porqueUm: string
  porqueUmResposta: string
  porqueDois: string
  porqueDoisResposta: string
  porqueTres: string
  porqueTresResposta: string
  porqueQuatro: string
  porqueQuatroResposta: string
  porqueCinco: string
  porqueCincoResposta: string
  causaRaiz: string
  atividades: string[]
  dataSubmissao: string
  status: StatusSnapshot
  comentarioRevisao?: string
}

export interface ExecucaoSnapshot {
  id: string
  descricaoExecucao: string
  dataSubmissao: string
  status: StatusSnapshot
  comentarioRevisao?: string
  evidencias: Evidencia[]
  atividades: string[]
}

export type TipoEvidencia = 'OCORRENCIA' | 'TRATATIVA'

export interface Evidencia {
  id: string
  nomeArquivo: string
  urlArquivo: string
  dataUpload: string
  tipoEvidencia?: TipoEvidencia
}

export interface RejeitarRequest {
  motivo: string
  emailsManuais?: string[]
}

export interface EmailPadraoEscopo {
  estabelecimentoId: string
  estabelecimentoNome: string
  empresaId: string
  empresaNome: string
  emailCount: number
}

export interface EmailPadrao {
  id: string
  estabelecimentoId: string
  estabelecimentoNome: string
  empresaId: string
  empresaNome: string
  email: string
  descricao?: string
}

export interface EmailPadraoRequest {
  estabelecimentoId: string
  empresaId: string
  email: string
  descricao?: string
}

export interface SubmeterTrativaDesvioRequest {
  emailsManuais?: string[]
}

// Password reset
export interface VerificarOtpResponse {
  resetToken: string
}
