import { useTheme } from '../contexts/ThemeContext'

export default function PrivacyPolicyPage() {
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
          Política de Privacidade — SafeCore
        </h1>
        <p className={`mt-2 text-sm ${muted}`}>Última atualização: 11 de setembro de 2026</p>

        <div className={`mt-8 space-y-6 text-sm leading-relaxed ${text}`}>
          <p>
            O SafeCore é um sistema de gestão de segurança para engenharia e obras, usado por
            empresas contratantes e suas equipes (engenheiros, técnicos e empresas contratadas)
            para registrar e acompanhar não conformidades e desvios de segurança em
            estabelecimentos e canteiros de obra. Esta política explica quais dados coletamos,
            por que coletamos, e como você pode exercer seus direitos sobre eles, em conformidade
            com a Lei Geral de Proteção de Dados (LGPD — Lei nº 13.709/2018).
          </p>

          <section>
            <h2 className={`text-lg font-semibold ${heading}`}>1. Quais dados coletamos</h2>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li><strong>Dados de conta:</strong> nome, e-mail e telefone, usados para autenticação e identificação dentro do sistema.</li>
              <li><strong>Dados de uso do app mobile:</strong> fotos e localização geográfica (GPS), coletadas apenas quando você registra uma ocorrência de não conformidade ou desvio, com sua ação explícita (tirar foto / confirmar localização).</li>
              <li><strong>Token de notificação push:</strong> um identificador técnico do dispositivo (via Firebase Cloud Messaging), usado só para enviar notificações sobre ocorrências relacionadas ao seu trabalho.</li>
              <li><strong>Dados de uso:</strong> registros de acesso e ações realizadas no sistema, para fins de auditoria e segurança.</li>
            </ul>
          </section>

          <section>
            <h2 className={`text-lg font-semibold ${heading}`}>2. Por que coletamos esses dados</h2>
            <p className="mt-2">
              Coletamos e usamos esses dados exclusivamente para operar o sistema: permitir login,
              associar ocorrências ao responsável correto, documentar não conformidades e desvios
              com evidência fotográfica e local exato, notificar as pessoas responsáveis por uma
              tratativa, e manter um histórico auditável de conformidade com normas regulamentadoras
              (como NR-35 e ISO 45001). Não usamos esses dados para publicidade, não os vendemos, e
              não os compartilhamos com terceiros fora do necessário para operar o serviço (ex:
              provedores de infraestrutura em nuvem que hospedam o sistema).
            </p>
          </section>

          <section>
            <h2 className={`text-lg font-semibold ${heading}`}>3. Onde os dados ficam armazenados</h2>
            <p className="mt-2">
              Os dados ficam armazenados em servidores próprios (banco de dados PostgreSQL) e em
              armazenamento de objetos compatível com S3 (Cloudflare R2), com acesso restrito à
              equipe técnica responsável pela operação do sistema.
            </p>
          </section>

          <section>
            <h2 className={`text-lg font-semibold ${heading}`}>4. Compartilhamento dentro do sistema</h2>
            <p className="mt-2">
              Dados de ocorrências (não conformidades e desvios) são visíveis apenas para os
              perfis com permissão de acesso: engenheiros e técnicos da empresa responsável pelo
              estabelecimento, e, quando aplicável, a empresa externa contratada responsável por
              aquela tratativa específica — nunca para o sistema inteiro.
            </p>
          </section>

          <section>
            <h2 className={`text-lg font-semibold ${heading}`}>5. Seus direitos</h2>
            <p className="mt-2">
              Você pode solicitar a qualquer momento acesso, correção ou exclusão dos seus dados
              pessoais, ou esclarecer dúvidas sobre como eles são tratados, entrando em contato com
              o administrador da sua empresa dentro do sistema, ou diretamente pelo e-mail abaixo.
            </p>
          </section>

          <section>
            <h2 className={`text-lg font-semibold ${heading}`}>6. Retenção de dados</h2>
            <p className="mt-2">
              Mantemos os dados enquanto sua conta estiver ativa e pelo período necessário para
              cumprir obrigações legais de auditoria de segurança do trabalho. Após a exclusão de
              uma conta, os dados pessoais associados são removidos ou anonimizados, exceto quando
              a retenção for exigida por lei.
            </p>
          </section>

          <section>
            <h2 className={`text-lg font-semibold ${heading}`}>7. Contato</h2>
            <p className="mt-2">
              Dúvidas sobre esta política ou sobre o tratamento dos seus dados: <strong>contato@safecoreteste.online</strong>
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
