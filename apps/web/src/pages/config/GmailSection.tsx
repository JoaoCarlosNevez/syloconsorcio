// GmailSection — Configurações → Minha conta → E-mail (Gmail): conecta a
// conta Google do usuário pra o CRM mandar a ficha de adesão pelo Gmail dele,
// com os documentos anexados. Só a permissão de enviar (o CRM não lê a caixa).

import { Skeleton, useToast } from '@sylocrm/ui'
import {
  useConnectGoogle,
  useDisconnectGoogle,
  useGoogleMailStatus,
} from '../../hooks/useGoogleMail'
import own from './AdministradorasSection.module.css'
import styles from './ConfigPage.module.css'

export function GmailSection() {
  const { toast } = useToast()
  const status = useGoogleMailStatus()
  const connect = useConnectGoogle()
  const disconnect = useDisconnectGoogle()

  function handleConnect() {
    const returnTo = `${window.location.origin}/app/config`
    connect.mutate(returnTo, {
      onError: (error) =>
        toast({
          type: 'error',
          title: 'Não foi possível abrir o Google',
          description: error instanceof Error ? error.message : undefined,
        }),
    })
  }

  function handleDisconnect() {
    disconnect.mutate(undefined, {
      onSuccess: () => toast({ type: 'success', title: 'Gmail desconectado.' }),
      onError: (error) =>
        toast({
          type: 'error',
          title: 'Não foi possível desconectar',
          description: error instanceof Error ? error.message : undefined,
        }),
    })
  }

  return (
    <div className={styles.settingsContent}>
      <div className={styles.settingsCard}>
        <div className={styles.settingsCardHeader}>
          <div className={styles.settingsCardTitle}>Enviar pelo meu Gmail</div>
          <div className={styles.settingsCardDesc}>
            Conecte sua conta Google e o botão "Enviar pra administradora" da ficha de adesão manda
            o e-mail na hora, pelo seu Gmail, com os documentos anexados. Ele fica na sua pasta
            Enviados e a resposta chega na sua caixa. O CRM só envia — não lê seus e-mails.
          </div>
        </div>
        <div className={styles.settingsCardBody}>
          {status.isLoading ? (
            <Skeleton width="100%" height={48} />
          ) : !status.data?.available ? (
            <p className={own.empty}>
              O envio pelo Gmail ainda não foi ativado no servidor. Enquanto isso, o botão da ficha
              abre o seu programa de e-mail já preenchido.
            </p>
          ) : status.data.connected ? (
            <div className={own.row}>
              <div className={own.info}>
                <span className={own.name}>Conectado</span>
                <span className={own.emails}>{status.data.email}</span>
              </div>
              <div className={own.rowActions}>
                <button
                  type="button"
                  className={styles.dangerOutlineBtn}
                  onClick={handleDisconnect}
                  disabled={disconnect.isPending}
                >
                  {disconnect.isPending ? 'Desconectando…' : 'Desconectar'}
                </button>
              </div>
            </div>
          ) : (
            <div className={own.row}>
              <div className={own.info}>
                <span className={own.name}>Nenhuma conta conectada</span>
                <span className={own.emails}>
                  O Google vai pedir sua autorização pra "enviar e-mails em seu nome".
                </span>
              </div>
              <div className={own.rowActions}>
                <button
                  type="button"
                  className={styles.primaryBtn}
                  onClick={handleConnect}
                  disabled={connect.isPending}
                >
                  {connect.isPending ? 'Abrindo o Google…' : 'Conectar Gmail'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
