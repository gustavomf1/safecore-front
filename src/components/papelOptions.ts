export type TipoFiltro = 'TODOS' | 'DESVIO' | 'NAO_CONFORMIDADE'

export const PAPEL_OPTIONS: { value: string; label: string; tipos: TipoFiltro[] }[] = [
  { value: 'REGISTRANTE',              label: 'Sou o registrante',                   tipos: ['TODOS', 'NAO_CONFORMIDADE', 'DESVIO'] },
  { value: 'RESPONSAVEL_NC',           label: 'Responsável pela NC',                 tipos: ['TODOS', 'NAO_CONFORMIDADE'] },
  { value: 'RESPONSAVEL_TRATATIVA_NC', label: 'Responsável pela tratativa (NC)',     tipos: ['TODOS', 'NAO_CONFORMIDADE'] },
  { value: 'RESPONSAVEL_DESVIO',       label: 'Responsável pelo desvio',             tipos: ['TODOS', 'DESVIO'] },
  { value: 'RESPONSAVEL_TRATATIVA_DESVIO', label: 'Responsável pela tratativa (desvio)', tipos: ['TODOS', 'DESVIO'] },
]
