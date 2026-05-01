/** Icônes emoji par route — repère visuel “école des petits” */
export function navEmoji(to: string): string {
  const map: Record<string, string> = {
    '/': '🏠',
    '/ecole/parametres': '⚙️',
    '/eleves': '🎒',
    '/assiduite/marquage': '📋',
    '/bulletins': '📄',
    '/notes/saisie-classe': '✏️',
    '/finance': '💶',
    '/finance/bilan': '📊',
    '/finance/paiements': '💳',
    '/finance/depenses': '🧾',
    '/finance/factures': '📑',
    '/documents': '📁',
    '/enseignants': '👩‍🏫',
    '/emploi-du-temps': '📅',
    '/utilisateurs': '👥',
    '/communications/annonces': '📢',
    '/communications/audit': '🔍',
    '/parametrage/annees-scolaires': '📆',
    '/parametrage/niveaux': '🔢',
    '/parametrage/classes': '🚪',
    '/parametrage/matieres': '📚',
    '/parametrage/periodes': '⏱️',
    '/parametrage/salles': '🏫',
  }
  return map[to] ?? '✦'
}
