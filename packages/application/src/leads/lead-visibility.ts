// applyLeadVisibility — oculta campos sensíveis de acordo com o DataScope.
//
// AGENTS.md §8: "A Incorporadora não visualiza dados sensíveis de leads
// (ex: telefones) por padrão." Data Visibility é uma camada distinta de
// DataScope — aqui aplicamos apenas a única regra hoje especificada,
// sem construir um sistema genérico de visibilidade por campo (evolução futura).

import { DataScope } from '@sylocrm/domain'
import type { LeadRecord } from '../ports/lead.repository'

export function applyLeadVisibility(lead: LeadRecord, dataScope: DataScope): LeadRecord {
  if (dataScope !== DataScope.INCORPORADORA) {
    return lead
  }

  return { ...lead, phone: '', email: null }
}
