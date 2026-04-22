import { Link } from 'react-router-dom'
import { ArrowLeft, Shield } from 'lucide-react'

export function PrivacyPage() {
  return (
    <div className="min-h-dvh bg-surface-500 text-white py-10 px-4">
      <div className="max-w-3xl mx-auto">
        <Link to="/auth" className="inline-flex items-center gap-2 text-sm text-white/50 hover:text-white mb-6 transition-colors">
          <ArrowLeft size={14} /> Voltar
        </Link>

        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center">
            <Shield size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Política de Privacidade</h1>
            <p className="text-sm text-white/50">Última atualização: {new Date().toLocaleDateString('pt-BR')}</p>
          </div>
        </div>

        <div className="prose prose-invert max-w-none text-sm text-white/70 leading-relaxed space-y-6">
          <section>
            <h2 className="text-lg font-semibold text-white mb-2">1. Controlador dos Dados</h2>
            <p>
              O controlador dos dados pessoais coletados por esta plataforma é <strong>{`{EMPRESA}`}</strong>,
              inscrita no CNPJ <strong>{`{CNPJ}`}</strong>, em conformidade com a Lei Geral de Proteção de Dados (LGPD — Lei nº 13.709/2018).
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">2. Dados Coletados</h2>
            <p>Coletamos e tratamos os seguintes dados:</p>
            <ul className="list-disc list-inside mt-2 space-y-1 text-white/60">
              <li><strong>Cadastro:</strong> nome, e-mail e senha (criptografada)</li>
              <li><strong>Pagamento:</strong> dados de transação processados pelos parceiros Hotmart e Stripe</li>
              <li><strong>Uso:</strong> histórico de gerações, créditos consumidos, ferramentas utilizadas</li>
              <li><strong>Técnicos:</strong> IP, navegador, dispositivo, páginas visitadas (via cookies e analytics)</li>
              <li><strong>Conteúdo:</strong> imagens e prompts enviados ao Studio IA e Boosters</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">3. Finalidades do Tratamento</h2>
            <p>Utilizamos seus dados para:</p>
            <ul className="list-disc list-inside mt-2 space-y-1 text-white/60">
              <li>Prestar o serviço contratado e processar pagamentos</li>
              <li>Enviar comunicações transacionais (confirmação de cadastro, recuperação de senha)</li>
              <li>Melhorar a plataforma com base no uso agregado</li>
              <li>Prevenir fraudes e abusos</li>
              <li>Cumprir obrigações legais e fiscais</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">4. Base Legal</h2>
            <p>
              O tratamento dos seus dados é baseado em: <strong>execução de contrato</strong> (Art. 7º, V da LGPD),
              <strong>cumprimento de obrigação legal</strong> (Art. 7º, II), <strong>legítimo interesse</strong> (Art. 7º, IX) e,
              quando aplicável, <strong>consentimento</strong> (Art. 7º, I).
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">5. Compartilhamento com Terceiros</h2>
            <p>Seus dados podem ser compartilhados com:</p>
            <ul className="list-disc list-inside mt-2 space-y-1 text-white/60">
              <li><strong>Supabase</strong> — hospedagem de banco de dados e autenticação</li>
              <li><strong>Railway</strong> — hospedagem da aplicação</li>
              <li><strong>Google Gemini / KIE AI</strong> — processamento de prompts e geração de mídia</li>
              <li><strong>Stripe / Hotmart</strong> — processamento de pagamentos</li>
              <li><strong>Resend</strong> — envio de e-mails transacionais</li>
              <li>Autoridades competentes, quando legalmente requerido</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">6. Cookies</h2>
            <p>
              Utilizamos cookies essenciais para funcionamento da plataforma (sessão, autenticação) e cookies analíticos para entender padrões de uso.
              Você pode desativar cookies nas configurações do navegador, porém algumas funcionalidades podem não funcionar corretamente.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">7. Retenção de Dados</h2>
            <p>
              Dados de cadastro são mantidos enquanto a conta estiver ativa. Dados de transações financeiras são retidos por <strong>5 anos</strong>
              após a operação, conforme legislação fiscal brasileira. Dados técnicos (logs) são mantidos por até <strong>12 meses</strong>.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">8. Seus Direitos (LGPD)</h2>
            <p>Você tem direito a:</p>
            <ul className="list-disc list-inside mt-2 space-y-1 text-white/60">
              <li>Confirmação da existência de tratamento</li>
              <li>Acesso aos seus dados</li>
              <li>Correção de dados incompletos, inexatos ou desatualizados</li>
              <li>Anonimização, bloqueio ou eliminação de dados desnecessários</li>
              <li>Portabilidade dos dados</li>
              <li>Eliminação dos dados tratados com base em consentimento</li>
              <li>Revogação do consentimento</li>
            </ul>
            <p className="mt-2">Para exercer esses direitos, envie e-mail para <strong>{`{EMAIL_DPO}`}</strong>.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">9. Segurança</h2>
            <p>
              Adotamos medidas técnicas e organizacionais para proteger seus dados: criptografia em trânsito (HTTPS/TLS),
              senhas armazenadas com hash bcrypt, isolamento por linha no banco (RLS do Supabase) e backups regulares.
              Ainda assim, nenhum sistema é 100% seguro — em caso de incidente, notificaremos a ANPD e você conforme a LGPD.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">10. Menores de Idade</h2>
            <p>
              A plataforma não é destinada a menores de 18 anos. Não coletamos conscientemente dados de menores.
              Se identificarmos um cadastro de menor, ele será removido.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">11. Alterações nesta Política</h2>
            <p>
              Esta Política pode ser atualizada periodicamente. Alterações relevantes serão comunicadas por e-mail ou aviso dentro da plataforma.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">12. Contato</h2>
            <p>
              Encarregado pelo Tratamento de Dados (DPO): <strong>{`{NOME_DPO}`}</strong> — <strong>{`{EMAIL_DPO}`}</strong>.
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
