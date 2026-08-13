# La Conciergerie Solidaire — Design System

## Configuration requise

Aucun provider wrapper requis. Tous les composants sont auto-contenus avec des styles inline. Les fonts et tokens se chargent via `styles.css` → `fonts/fonts.css` + `_ds_bundle.css`.

```jsx
// Exemple minimal — aucun wrapper nécessaire
import { Button, Heading, Card } from 'lcs-design-system';

function App() {
  return (
    <Card variant="cream">
      <Heading level={2}>Nos services</Heading>
      <Button variant="primary">Découvrir</Button>
    </Card>
  );
}
```

## Idiome de style — props uniquement

Ce design system utilise **uniquement des props React** pour le style. Pas de classes CSS utilitaires. Le seul CSS à ajouter pour votre propre layout vient des tokens CSS `var(--lcs-*)`.

| Token | Valeur |
|---|---|
| `--lcs-yellow` | `#FCD727` — couleur principale |
| `--lcs-black` | `#000000` |
| `--lcs-gray-dark` | `#505252` |
| `--lcs-cream` | `#FFF8DA` |
| `--lcs-gray-light` | `#CDCCCC` |
| `--lcs-white` | `#FFFFFF` |
| `--lcs-radius` | `20px` — arrondi signature LCS |
| `--lcs-radius-full` | `9999px` — pills/badges |
| `--lcs-space-sm/md/lg/xl` | `8/16/24/40px` |
| `--lcs-font-display` | `'DK Lemon Yellow Sun', cursive` — titres expressifs |
| `--lcs-font-body` | `'MuseoSans', sans-serif` — corps de texte |

## Props clés par groupe

**Typographie** — prop `color` accepte un hex. `weight` sur `Body` : `300|500|700|900`. `level` sur `Heading` : `1–4`. `variant` sur `Label` : `'yellow'|'black'|'cream'`.

**Boutons** — prop `variant` : `'primary'|'secondary'|'ghost'|'ghost-yellow'|'cream'`. Prop `size` : `'sm'|'md'|'lg'`. Fond jaune sur fond clair → `primary`. Fond jaune sur fond sombre → `ghost-yellow`.

**Cartes** — prop `variant` sur `Card` : `'white'|'cream'|'yellow'|'black'|'gray'`. `ServiceCard` avec `accent={true}` donne le fond jaune. `StatsCard` toujours sur fond noir.

**Navigation** — `Header` avec `dark={true}` pour la version fond noir. `SideNav` avec `activeHref` pour l'état actif (fond jaune). `Footer` toujours fond noir.

## Règles de la charte

- Logo jaune `#FCD727` = version principale, privilégier sur tous les supports
- Arrondi 20px (`--lcs-radius`) sur toutes les cartes et conteneurs — signature LCS
- DK Lemon Yellow Sun uniquement pour les titres courts, jamais les longs paragraphes
- Contraste : logo noir sur fond jaune ou blanc, logo jaune sur fond noir

## Exemple idiomatique

```jsx
// Page d'accueil typique LCS
<div>
  <Header dark navLinks={[...]} ctaLabel="Devis" />
  <div style={{ padding: 'var(--lcs-space-2xl)' }}>
    <DisplayHeading color="#FCD727">L'art de servir</DisplayHeading>
    <ButtonGroup>
      <Button variant="primary">Nos services</Button>
      <Button variant="ghost-yellow">En savoir plus</Button>
    </ButtonGroup>
  </div>
  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--lcs-space-md)' }}>
    <ServiceCard icon="🔔" title="Conciergerie" description="..." />
    <ServiceCard icon="⭐" title="Hospitalité" description="..." accent />
    <StatsCard value="500+" label="Collaborateurs" />
  </div>
  <Footer links={[...]} />
</div>
```

# LcsDesignSystem (lcs-design-system@1.0.0)

This design system is the published lcs-design-system React library, bundled as a single
browser global. All 19 components are the real upstream code.

## Where things are

- `_ds_bundle.js` — the whole-DS bundle at the project root; loads every component to `window.LcsDesignSystem`. First line is a `/* @ds-bundle: … */` metadata header.
- `styles.css` — the single stylesheet entry: it `@import`s the tokens, fonts, and component styles (`_ds_bundle.css`). Link this one file.
- `components/<group>/<Name>/<Name>.prompt.md` (example JSX + variants), `<Name>.d.ts` (types), `<Name>.html` (variant grid).
- `tokens/*.css` — CSS custom properties, names verbatim from upstream.
- `fonts/` — `@font-face` files + `fonts.css` (when the package ships fonts).

For a specific component, `read_file("components/<group>/<Name>/<Name>.prompt.md")`.

## Loading

Add these two lines to your page once (React must be on the page first):

```html
<link rel="stylesheet" href="styles.css">
<script src="_ds_bundle.js"></script>
```

Components are then available at `window.LcsDesignSystem.*`. Mount into a dedicated child node (e.g. `<div id="ds-root">`), not the host page's own React root, so the two trees don't collide:

```jsx
const { Body } = window.LcsDesignSystem;
ReactDOM.createRoot(document.getElementById('ds-root')).render(<Body />);
```

## Tokens

19 CSS custom properties from lcs-design-system. Names are
preserved verbatim from upstream. They are declared inside `_ds_bundle.css` (this DS ships one compiled stylesheet rather than separate token files).

- **spacing** (6): `--lcs-space-xs`, `--lcs-space-sm`, `--lcs-space-md`, …
- **typography** (2): `--lcs-font-display`, `--lcs-font-body`
- **radius** (3): `--lcs-radius`, `--lcs-radius-sm`, `--lcs-radius-full`
- **shadow** (2): `--lcs-shadow-sm`, `--lcs-shadow-md`
- **other** (6): `--lcs-yellow`, `--lcs-black`, `--lcs-gray-dark`, …

## Components

### typographie
- `Body`
- `Caption`
- `DisplayHeading`
- `Heading`
- `Label`
- `Quote`
- `Subheading`

### navigation
- `Breadcrumb`
- `Footer`
- `Header`
- `SideNav`

### boutons
- `Button`
- `ButtonGroup`
- `IconButton`

### cartes
- `Card`
- `HeroCard`
- `PhotoCard`
- `ServiceCard`
- `StatsCard`
