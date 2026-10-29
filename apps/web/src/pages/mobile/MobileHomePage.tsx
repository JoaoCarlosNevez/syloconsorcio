// Início do app do celular — um por perfil (ver lib/mobile-profile.ts).

import { useMobileProfile } from '../../hooks/useMobileProfile'
import { BackofficeHome } from './BackofficeHome'
import { ManagerHome } from './ManagerHome'
import { MasterHome } from './MasterHome'
import styles from './Mobile.module.css'
import { SellerHome } from './SellerHome'

export function MobileHomePage() {
  const { profile, isLoading } = useMobileProfile()
  if (isLoading) return <main className={styles.content} />
  if (profile === 'master') return <MasterHome />
  if (profile === 'gestao') return <ManagerHome />
  if (profile === 'adm') return <BackofficeHome />
  return <SellerHome />
}
