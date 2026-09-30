// Linha "Equipe de <organização>, <cidade>" do hero do Início e do Perfil.
// A cidade é a Localização que o usuário preencheu em Editar Perfil — sem ela,
// a linha fica só com a equipe (nada de cidade inventada).

export function teamLine(organizationName: string | null | undefined, location: string | null) {
  const team = `Equipe de ${organizationName ?? 'Sylo'}`
  const city = location?.trim()
  return city ? `${team}, ${city}` : team
}
