# Handoff — Etapa 05: Corrigir erros Biome restantes

## Status
Design system (`packages/ui`) implementado completo — 22 componentes, testes passando.
Falta: limpar os 33 erros de lint Biome antes de fechar a Etapa 05.

## Erros a corrigir (por arquivo)

### 1. `packages/ui/src/components/avatar/Avatar.tsx` — linha 30
**Regra:** `lint/a11y/useAltText`
**Fix:** Adicionar biome-ignore (o `alt` é fornecido pelo consumer via `initials` ou `alt` prop):
```tsx
// biome-ignore lint/a11y/useAltText: alt is provided via alt prop or initials fallback
<img ... />
```

---

### 2. `packages/ui/src/components/divider/Divider.tsx` — linha 17
**Regras:** `lint/a11y/useFocusableInteractive`, `lint/a11y/useSemanticElements`
**Problema:** `<div role="separator">` — Biome quer `<hr>` para separador horizontal.
**Fix:** Trocar por `<hr>` para o caso horizontal; para vertical (que não tem `<hr>` semântico), usar biome-ignore:
```tsx
// Horizontal:
<hr className={...} aria-label={label ? undefined : undefined} />

// Vertical (manter div com biome-ignore):
{/* biome-ignore lint/a11y/useSemanticElements: vertical separator has no semantic HTML equivalent */}
<div role="separator" aria-orientation="vertical" className={...} />
```

---

### 3. `packages/ui/src/components/data-table/DataTable.tsx`

**a) linha 58 — `lint/a11y/useKeyWithClickEvents` no `<th onClick>`**
Fix: adicionar `onKeyDown` e `tabIndex={0}`:
```tsx
<th
  key={col.key}
  onClick={() => col.sortable && onSort?.(col.key)}
  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); col.sortable && onSort?.(col.key) } }}
  tabIndex={col.sortable ? 0 : undefined}
  ...
>
```

**b) `lint/a11y/noSvgWithoutTitle` — SVGs dos ícones de sort (3 ocorrências)**
Fix: adicionar `aria-hidden="true"` em cada SVG (eles são decorativos):
```tsx
<svg aria-hidden="true" ...>
```

**c) linha 93 — `lint/suspicious/noArrayIndexKey` no skeleton map**
Fix: adicionar biome-ignore:
```tsx
{Array.from({ length: 5 }).map((_, i) => (
  // biome-ignore lint/suspicious/noArrayIndexKey: skeleton rows have no unique identity
  <SkeletonTableRow key={i} columns={columns.length} />
))}
```

---

### 4. `packages/ui/src/components/drawer/Drawer.tsx`
**Regras:** `lint/a11y/useKeyWithClickEvents` (overlay div), `lint/a11y/useSemanticElements` (role="dialog" div)

**Fix overlay:** O overlay já fecha no click; adicionar `onKeyDown` ou trocar por biome-ignore (overlay não precisa ser interativo — é apenas área de clique externo):
```tsx
{/* biome-ignore lint/a11y/useKeyWithClickEvents: overlay closes on Escape via document listener */}
<div className={styles.overlay} onClick={onClose} aria-hidden="true" />
```

**Fix dialog div:**
```tsx
{/* biome-ignore lint/a11y/useSemanticElements: <dialog> lacks needed CSS animation support for drawer slide */}
<div role="dialog" ...>
```

---

### 5. `packages/ui/src/components/dropdown/Dropdown.tsx` — linha 121
**Regra:** `lint/a11y/useFocusableInteractive` — div com `role="group"` sendo usado como label
**Fix:** Trocar o `<div role="label">` por `<p>` ou `<span>` simples (sem role interativo):
```tsx
// Antes:
<div className={styles.label}>{item.label}</div>

// Depois (label de grupo não precisa de role):
<p className={styles.label}>{item.label}</p>
```

---

### 6. `packages/ui/src/components/modal/Modal.tsx` — linha 98
**Regra:** `lint/a11y/useSemanticElements`
**Fix:**
```tsx
{/* biome-ignore lint/a11y/useSemanticElements: <dialog> lacks needed CSS animation support for modal overlay pattern */}
<div role="dialog" ...>
```

---

### 7. `packages/ui/src/components/tooltip/Tooltip.test.tsx` — linha 32
**Regra:** `lint/style/noNonNullAssertion` — `!` no `.closest('span')!`
**Fix:** Usar optional chaining ou cast:
```tsx
// Opção A — optional chaining (pode retornar null, mas hover vai no elemento pai):
await user.hover(screen.getByText('Btn').closest('span') ?? screen.getByText('Btn'))

// Opção B — biome-ignore (mais simples, o span é garantido pela estrutura do Tooltip):
// biome-ignore lint/style/noNonNullAssertion: Tooltip always wraps children in a span
await user.hover(screen.getByText('Btn').closest('span')!)
```

---

## Validação final após os fixes

Rodar nesta ordem:

```bash
# 1. Biome deve estar limpo
pnpm biome check packages/ui/src

# 2. TypeScript deve estar limpo
pnpm --filter @sylocrm/ui exec tsc --noEmit

# 3. Todos os testes devem passar (143/143)
pnpm --filter @sylocrm/ui exec vitest run

# 4. Build deve funcionar
pnpm build

# 5. Arch tests ainda devem passar
pnpm --filter @sylocrm/testing exec vitest run
```

---

## Próximo passo após fechar Etapa 05
Etapa 06 — funcionalidades de negócio (a definir com o usuário).

---

## Nota sobre testes com CSS Modules
Testes que verificam classes CSS devem usar `.className.includes('nomeDaClasse')` ou `.toContain()`, **não** `toHaveClass('nomeDaClasse')` — o Vitest hasheia os nomes no ambiente de teste.
