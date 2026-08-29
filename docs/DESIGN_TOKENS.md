# ZunoPlay — Design Tokens v1

## Status

🟡 **IMPLEMENTADO, NÃO VALIDADO** no código.

O projeto já possuía tokens de fundação em `zuno-design-system.css`. Esta versão adiciona uma camada semântica canônica `--zuno-*` sem remover os tokens legados `--z-*`, reduzindo risco de regressão durante a migração.

A criação/sincronização de Variables no Figma depende de acesso de edição ao arquivo oficial e permanece separada da implementação de código.

## Fonte de valores

Os valores abaixo **não foram reinventados**. Eles apontam para os tokens de fundação já existentes no projeto.

### Cores semânticas

| Token canônico | Fonte existente |
| --- | --- |
| `--zuno-color-primary` | `--z-purple` |
| `--zuno-color-secondary` | `--z-purple-2` |
| `--zuno-color-accent` | `--z-cyan` |
| `--zuno-color-background` | `--z-bg` |
| `--zuno-color-background-deep` | `--z-bg-deep` |
| `--zuno-color-surface` | `--z-surface` |
| `--zuno-color-surface-elevated` | `--z-surface-2` |
| `--zuno-color-surface-glass` | `--z-surface-glass` |
| `--zuno-color-text-primary` | `--z-text` |
| `--zuno-color-text-secondary` | `--z-text-2` |
| `--zuno-color-text-tertiary` | `--z-text-3` |
| `--zuno-color-border` | `--z-border` |
| `--zuno-color-border-active` | `--z-border-active` |
| `--zuno-color-success` | `--z-green` |
| `--zuno-color-warning` | `--z-gold` |
| `--zuno-color-info` | `--z-cyan` |
| `--zuno-color-online` | `--z-green` |

### Espaçamento

| Token canônico | Fonte existente |
| --- | --- |
| `--zuno-space-xs` | `--z-space-1` = 4px |
| `--zuno-space-sm` | `--z-space-2` = 8px |
| `--zuno-space-md` | `--z-space-4` = 16px |
| `--zuno-space-lg` | `--z-space-6` = 24px |
| `--zuno-space-xl` | `--z-space-8` = 32px |

Os tokens intermediários legados de 12px e 20px continuam disponíveis. A escala semântica v1 foi mantida curta para não criar novos valores.

### Raios

- `--zuno-radius-sm` → `--z-radius-sm`
- `--zuno-radius-md` → `--z-radius-md`
- `--zuno-radius-lg` → `--z-radius-lg`
- `--zuno-radius-xl` → `--z-radius-xl`

### Efeitos

- `--zuno-shadow-default` → `--z-shadow`
- `--zuno-glow-primary` → `--z-glow-purple`
- `--zuno-glow-accent` → `--z-glow-cyan`
- `--zuno-gradient-brand` → `--z-gradient-brand`
- `--zuno-gradient-surface` → `--z-gradient-surface`
- `--zuno-gradient-background` → `--z-gradient-cosmic`

### Tipografia

- `--zuno-font-family-base` → `--z-font`

## Tokens deliberadamente pendentes

O Design System oficial prevê `Error` e `Offline`, mas o arquivo de tokens atual não contém valores de fundação aprovados e inequívocos para esses papéis. Eles não foram inventados.

Também existe uma paleta específica de marca em `zuno-brand-official.css` (`--zuno-brand-*`). Ela permanece separada até que o design aprovado/Figma determine formalmente a relação entre tokens de marca e tokens semânticos da interface.

## Convenção para Figma Variables

Quando houver acesso de edição ao arquivo oficial, usar nomes equivalentes por grupos:

- `Color/Primary`
- `Color/Secondary`
- `Color/Accent`
- `Color/Background`
- `Color/Background Deep`
- `Color/Surface`
- `Color/Surface Elevated`
- `Color/Text Primary`
- `Color/Text Secondary`
- `Color/Text Tertiary`
- `Color/Border`
- `Color/Border Active`
- `Color/Success`
- `Color/Warning`
- `Color/Info`
- `Color/Online`
- `Space/XS`
- `Space/SM`
- `Space/MD`
- `Space/LG`
- `Space/XL`
- `Radius/SM`
- `Radius/MD`
- `Radius/LG`
- `Radius/XL`

Não criar `Error` ou `Offline` no Figma antes de os valores serem aprovados.

## Estratégia de migração

1. Não remover os tokens `--z-*` existentes.
2. Novos componentes devem preferir os aliases semânticos `--zuno-*`.
3. Migrar CSS legado de forma incremental, tela por tela.
4. Não substituir cores específicas de gameplay/branding automaticamente.
5. Validar visualmente cada lote antes de ampliar a migração.
6. Só considerar a migração concluída após regressão visual/mobile.

## Bootstrap crítico

`index.html` ainda contém variáveis e cores inline para a renderização crítica inicial. Elas não foram alteradas nesta etapa para evitar flash/boot regressions antes do carregamento de `zuno-design-system.css`.

## Critério de validação

Para promover esta camada a ✅ VALIDADO:

- confirmar que o CSS carrega sem erro;
- verificar Home em mobile e desktop;
- verificar pelo menos uma tela social, mensagens, salas e jogo;
- confirmar ausência de mudança visual involuntária;
- validar foco/acessibilidade relevante;
- verificar produção após merge/deploy;
- sincronizar/validar as Variables no Figma quando houver acesso de edição.
