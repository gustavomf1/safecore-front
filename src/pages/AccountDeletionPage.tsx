import { useTheme } from '../contexts/ThemeContext'

export default function AccountDeletionPage() {
  const { theme } = useTheme()
  const dark = theme === 'dark'
  const bg = dark ? '#0a0e1a' : '#f8fafc'
  const text = dark ? 'text-white/80' : 'text-slate-700'
  const heading = dark ? 'text-white' : 'text-slate-900'
  const muted = dark ? 'text-white/50' : 'text-slate-500'

  return (
    <div className="w-full min-h-screen" style={{ background: bg }}>
      <div className="max-w-3xl mx-auto px-6 py-16">
        <h1 className={`text-3xl font-bold tracking-tight ${heading}`}>
          Exclusão de Conta e Dados — SafeCore
        </h1>
        <p className={`mt-2 text-sm ${muted}`}>Última atualização: 11 de setembro de 2026</p>

        <div className={`mt-8 space-y-6 text-sm leading-relaxed ${text}`}>
          <p>
            O SafeCore (desenvolvido por Gustavo Martins França) é usado dentro de empresas — cada
            conta pertence a um espaço de trabalho (empresa) e é administrada pelo responsável
            daquela empresa dentro do sistema. Por isso, a exclusão de conta é feita mediante
            solicitação, e não de forma automática pelo próprio usuário dentro do app.
          </p>

          <section>
            <h2 className={`text-lg font-semibold ${heading}`}>Como solicitar a exclusão</h2>
            <p className="mt-2">
              Para solicitar a exclusão da sua conta e dos seus dados pessoais, envie um e-mail
              para <strong>contato@safecoreteste.online</strong> a partir do e-mail cadastrado na
              sua conta, informando:
            </p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Nome completo cadastrado no sistema</li>
              <li>E-mail da conta que deseja excluir</li>
              <li>Empresa/estabelecimento ao qual sua conta está vinculada</li>
            </ul>
            <p className="mt-2">
              Alternativamente, você pode pedir ao administrador SafeCore da sua empresa para
              remover sua conta diretamente pelo painel de usuários.
            </p>
          </section>

          <section>
            <h2 className={`text-lg font-semibold ${heading}`}>O que é excluído</h2>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Dados de conta: nome, e-mail, telefone, senha</li>
              <li>Token de notificação push associado ao seu dispositivo</li>
              <li>Sua vinculação com a empresa/estabelecimento</li>
            </ul>
          </section>

          <section>
            <h2 className={`text-lg font-semibold ${heading}`}>O que é mantido, e por quê</h2>
            <p className="mt-2">
              Registros de não conformidade e desvio (ocorrências, evidências fotográficas e
              histórico de tratativa) que você criou ou aprovou são mantidos mesmo após a exclusão
              da sua conta, com seu nome desvinculado dos dados pessoais restantes (anonimizado).
              Isso é necessário porque esses registros fazem parte do histórico de auditoria de
              conformidade com normas regulamentadoras de segurança do trabalho (como NR-35) da
              empresa contratante, e sua remoção completa comprometeria a rastreabilidade exigida
              por essas normas.
            </p>
          </section>

          <section>
            <h2 className={`text-lg font-semibold ${heading}`}>Prazo</h2>
            <p className="mt-2">
              Solicitações de exclusão são processadas em até 15 dias úteis. Você recebe uma
              confirmação por e-mail quando a exclusão for concluída.
            </p>
          </section>

          <section>
            <h2 className={`text-lg font-semibold ${heading}`}>Contato</h2>
            <p className="mt-2">
              <strong>contato@safecoreteste.online</strong>
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
