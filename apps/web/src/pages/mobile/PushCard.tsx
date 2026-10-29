// Cartão "Avisos no celular": liga o Web Push neste aparelho, ou explica o
// que falta (instalar na tela de início no iPhone, permissão negada).

import { usePushNotifications } from '../../hooks/usePushNotifications'
import styles from './Mobile.module.css'

export function PushCard({ hideWhenOn = false }: { hideWhenOn?: boolean }) {
  const { status, busy, error, enable, disable } = usePushNotifications()
  if (status === null || (hideWhenOn && status === 'on')) return null

  return (
    <section className={`${styles.card} ${styles.pushCard}`}>
      {status === 'on' && (
        <>
          <b>Avisos ligados neste celular</b>
          <p className={styles.note}>
            Lead da fila, cliente que abriu a proposta e tarefas chegam aqui mesmo com o app
            fechado. Quais tipos viram aviso se escolhe no computador, em Configurações →
            Notificações.
          </p>
          <button
            type="button"
            className={`${styles.btn} ${styles.btnLine}`}
            onClick={disable}
            disabled={busy}
          >
            Desligar avisos
          </button>
        </>
      )}
      {status === 'off' && (
        <>
          <b>Ligue os avisos do celular</b>
          <p className={styles.note}>
            Sem isso, o lead da fila só chega com o app aberto, e o prazo pra aceitar é curto.
          </p>
          <button
            type="button"
            className={`${styles.btn} ${styles.btnPrimary}`}
            onClick={enable}
            disabled={busy}
          >
            {busy ? 'Ligando…' : 'Ligar avisos'}
          </button>
        </>
      )}
      {status === 'needs-install' && (
        <>
          <b>Instale o app pra receber avisos</b>
          <p className={styles.note}>
            No iPhone, toque em Compartilhar e depois em “Adicionar à Tela de Início”. Abra o
            SyloCRM pelo ícone novo e ligue os avisos.
          </p>
        </>
      )}
      {status === 'denied' && (
        <>
          <b>Os avisos estão bloqueados</b>
          <p className={styles.note}>
            Libere as notificações do SyloCRM nos ajustes do celular (ou do navegador) e volte aqui.
          </p>
        </>
      )}
      {status === 'unsupported' && (
        <>
          <b>Este navegador não recebe avisos</b>
          <p className={styles.note}>Use o Chrome no Android ou o Safari no iPhone.</p>
        </>
      )}
      {error && <p className={styles.error}>{error}</p>}
    </section>
  )
}
