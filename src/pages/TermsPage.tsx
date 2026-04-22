import { Link } from 'react-router-dom'
import { ArrowLeft, FileText } from 'lucide-react'

export function TermsPage() {
  return (
    <div className="min-h-dvh bg-surface-500 text-white py-10 px-4">
      <div className="max-w-3xl mx-auto">
        <Link to="/auth" className="inline-flex items-center gap-2 text-sm text-white/50 hover:text-white mb-6 transition-colors">
          <ArrowLeft size={14} /> Voltar
        </Link>

        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center">
            <FileText size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Termos de Uso</h1>
            <p className="text-sm text-white/50">Última atualização: {new Date().toLocaleDateString('pt-BR')}</p>
          </div>
        </div>

        <div className="prose prose-invert max-w-none text-sm text-white/70 leading-relaxed space-y-6">
          <section>
            <h2 className="text-lg font-semibold text-white mb-2">1. Aceitação dos Termos</h2>
            <p>
              Ao acessar e utilizar a plataforma Vyral AI, operada por <strong>{`{EMPRESA}`}</strong>, inscrita no CNPJ nº <strong>{`{CNPJ}`}</strong>,
              você concorda integralmente com estes Termos de Uso. Caso não concorde com qualquer cláusula, não utilize a plataforma.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">2. Descrição do Serviço</h2>
            <p>
              A Vyral AI é uma plataforma SaaS de geração de conteúdo com inteligência artificial voltada para afiliados do TikTok Shop,
              oferecendo ferramentas de criação de imagens UGC, vídeos, análise de produtos virais e outros recursos relacionados.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">3. Cadastro e Conta</h2>
            <p>
              Para utilizar a plataforma, o usuário deve realizar cadastro fornecendo dados verdadeiros e atualizados.
              O usuário é o único responsável pelas atividades realizadas em sua conta e pela confidencialidade de sua senha.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">4. Planos e Pagamento</h2>
            <p>
              Os planos vitalícios (Starter, Creator e Pro) são vendidos via plataformas parceiras (Hotmart e Stripe).
              Créditos adicionais podem ser adquiridos separadamente. Os créditos não expiram, são intransferíveis e não reembolsáveis após o consumo.
            </p>
            <ul className="list-disc list-inside mt-2 space-y-1 text-white/60">
              <li>Starter: R$ 147,00 — 600 créditos</li>
              <li>Creator: R$ 197,00 — 900 créditos</li>
              <li>Pro: R$ 297,00 — 1.500 créditos</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">5. Política de Reembolso</h2>
            <p>
              O usuário tem direito ao reembolso integral do valor pago nos primeiros 7 (sete) dias após a compra, conforme o Código de Defesa do Consumidor,
              desde que o crédito inicial ainda não tenha sido totalmente consumido. Reembolsos parciais podem ser concedidos a critério da Vyral AI.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">6. Uso Aceitável</h2>
            <p>É proibido utilizar a plataforma para:</p>
            <ul className="list-disc list-inside mt-2 space-y-1 text-white/60">
              <li>Criar conteúdo ilegal, ofensivo, discriminatório ou que viole direitos autorais de terceiros</li>
              <li>Gerar deepfakes não consentidos de pessoas reais</li>
              <li>Disseminar desinformação ou golpes</li>
              <li>Automatizar ou revender o serviço sem autorização escrita</li>
              <li>Realizar engenharia reversa da plataforma</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">7. Propriedade Intelectual</h2>
            <p>
              O conteúdo gerado pelo usuário através das ferramentas de IA pertence ao próprio usuário, que assume integralmente a responsabilidade pelo uso.
              A marca Vyral AI, o código-fonte, o design e as tecnologias da plataforma são de propriedade exclusiva da <strong>{`{EMPRESA}`}</strong>.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">8. Limitação de Responsabilidade</h2>
            <p>
              A Vyral AI não se responsabiliza por perdas ou danos decorrentes do uso da plataforma, incluindo mas não se limitando a: indisponibilidade temporária,
              falhas nas APIs de terceiros (Google Gemini, KIE AI, etc.), perdas financeiras ou reputacionais por uso inadequado do conteúdo gerado.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">9. Sistema de Indicações</h2>
            <p>
              O programa de indicações concede créditos ao usuário indicador após o indicado realizar a primeira compra. Os créditos são creditados automaticamente
              em até 48h após a confirmação do pagamento. A Vyral AI se reserva o direito de invalidar indicações suspeitas de fraude.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">10. Alterações nos Termos</h2>
            <p>
              Estes Termos podem ser atualizados a qualquer momento. Alterações significativas serão comunicadas por e-mail.
              O uso continuado da plataforma após as alterações implica aceitação dos novos Termos.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">11. Foro</h2>
            <p>
              Fica eleito o foro da Comarca de <strong>{`{CIDADE/UF}`}</strong> para dirimir quaisquer controvérsias decorrentes destes Termos,
              com renúncia expressa a qualquer outro, por mais privilegiado que seja.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">12. Contato</h2>
            <p>
              Dúvidas sobre estes Termos podem ser enviadas para <strong>{`{EMAIL_SUPORTE}`}</strong>.
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
