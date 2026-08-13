# GestionOpe — Comment l'app est construite (brief pour intégration des plannings)

Ce document décrit le modèle de données et la logique de l'app **GestionOpe** (gestion opérationnelle
d'agents de conciergerie sur plusieurs sites). Objectif : permettre d'intégrer proprement les
plannings réels récupérés, en respectant les structures existantes.

---

## 1. Vue d'ensemble

- App **mono-fichier HTML** (pas de framework, JS vanilla). Toutes les données vivent dans des
  **fichiers JSON** stockés dans un dossier **SharePoint d'équipe** (LCS33), lus/écrits via Microsoft
  Graph avec le compte de l'utilisateur connecté (MSAL / Azure AD, tenant unique).
- En local / aperçu, un **mode démo** (`#demo` ou iframe) charge des JSON d'exemple depuis `./data/`.
- 10 entités = 10 fichiers JSON : `sites`, `agents`, `affec`, `absences`, `rempl`, `pointage`,
  `permut`, `tournees`, `except`, `fermetures`.

Chaque enregistrement a un `id` string unique (généré par `DB.id()`).

---

## 2. Entités et schémas

### SITE (`sites.json`)
Un lieu où des agents interviennent.
```json
{
  "id": "…",
  "nom": "Aéroport de Bordeaux",
  "adresse": "Aéroport Bordeaux Mérignac",
  "client": "Bordeaux Métropole",      // badge informatif (facultatif) — regroupe des sites d'un même client
  "contact": "", "tel": "", "email": "", "notes": "",
  "creneaux": [                         // horaires d'OUVERTURE du site (récurrents), pas les affectations
    { "jours": ["Lun","Mar","Mer","Jeu","Ven"], "debut": "09:00", "fin": "12:00" },
    { "jours": ["Lun","Mar","Mer","Jeu","Ven"], "debut": "13:00", "fin": "17:00" }
  ]
}
```
> Note : un ancien champ `groupe` (texte libre) existe encore dans de vieilles données ; il est
> automatiquement recopié dans `client` à la migration. Ne plus l'utiliser.

### AGENT (`agents.json`)
```json
{
  "id": "…",
  "nom": "NIPHON Michael",
  "tel": "…", "email": "…", "notes": "…",
  "type": "accueil",           // "accueil" | "multisite" | "logistique" | "factotum" | "chantier"
  "remplacant": false,         // true = agent volant / remplaçant (typiquement type="multisite"), false = agent régulier
  "inactif": false             // true = agent archivé (supprimé côté UI) — historique conservé
}
```
> Le champ `type` est **implémenté** (5 valeurs ci-dessus, `AGENT_TYPES` dans le code) — ce document
> le signalait encore comme "envisagé", ce n'est plus le cas. Les 3 profils métier décrits
> précédemment (poste fixe / multisite remplaçant / logistique) se répartissent sur ces 5 valeurs :
> **Accueil** et **Chantier** = poste fixe, **Multisite** = remplaçant, **Logistique** = tournée,
> **Factotum** = intervention polyvalente multi-sites.

### AFFECTATION (`affec.json`) — LE CŒUR DU PLANNING
Lie un agent à un site, sur des jours de semaine récurrents.
```json
{
  "id": "…",
  "agentId": "…",
  "siteId": "…",
  "jours": ["Lun","Mer","Ven"],   // jours de semaine, valeurs: Lun Mar Mer Jeu Ven Sam Dim
  "debut": "09:00",
  "fin": "12:00",
  "semaine": "toutes",            // récurrence: "toutes" | "A" | "B"  (alternance semaine paire/impaire)
  "notes": ""
}
```
**Points clés :**
- Une affectation est **toujours récurrente** (jours + récurrence hebdo). Un même agent+site peut
  avoir **plusieurs affectations** (ex. matin/après-midi, ou horaires différents semaine A vs B).
- `semaine`: `"toutes"` = chaque semaine ; `"A"`/`"B"` = une semaine sur deux (alternance A/B
  calculée par `isWeekA(date)`).
- **⚠ Limite actuelle importante** : il n'existe **AUCUN moyen d'affecter sur une date précise
  ponctuelle** (ex. « le mardi 8 juillet seulement »). Tout est récurrent. Le seul mécanisme daté
  est la *permutation* (voir plus bas), réservée au remplacement d'une affectation existante.

### ABSENCE (`absences.json`)
```json
{ "id":"…", "agentId":"…", "debut":"2026-07-08", "fin":"2026-07-12", "motif":"Congés", "notes":"" }
```
Dates au format `YYYY-MM-DD`. Une absence masque les affectations de l'agent sur la période et
déclenche les besoins de remplacement.

### REMPLACEMENT (`rempl.json`)
Associe, pour une absence, un agent remplaçant à une affectation donnée (daté).

### EXCEPTION (`except.json`) — le mécanisme ponctuel/daté courant
Ajuste ou ajoute un créneau pour un agent sur **une seule journée**, sans toucher au planning
récurrent A/B. C'est la réponse au "ponctuel non géré" mentionné plus bas dans ce document.
```json
{
  "id":"…", "agentId":"…", "siteId":"…", "afId":"…",   // afId = affectation modifiée (absent si ajout)
  "dateStr":"2026-07-08",
  "type":"add",                 // "add" (créneau ajouté ce jour) | absent = modification/libération d'un créneau existant
  "debut":"09:00", "fin":"12:00", "notes":""
}
```
Un échange entre deux agents se fait avec **deux exceptions** (une par agent). Deux affichages :
« Créneau ponctuel » (ajout) ou « Ajusté ce jour » (modification).

### FERMETURE (`fermetures.json`)
Ferme un site sur une plage de dates (jour férié, travaux…) ; le site est considéré fermé en
entier sur toute la période, tous les agents qui y sont affectés voient leur créneau marqué « Fermé ».
```json
{ "id":"…", "siteId":"…", "dateDebut":"2026-07-08", "dateFin":"2026-07-08", "motif":"…", "notes":"" }
```

### PERMUTATION (`permut.json`) — mécanisme historique, redondant avec `except`
Échange de deux agents sur un site, soit pour un jour précis, soit pour une semaine.
```json
{
  "id":"…", "siteId":"…",
  "scope":"jour",              // "jour" | "semaine"
  "dateStr":"2026-07-08",      // présent si scope="jour"
  "weekKey":"2026-W28",        // clé semaine ISO
  "agent1Id":"…", "agent2Id":"…",
  "createdBy":"…", "createdAt":"…"
}
```
> **`permut` fait aujourd'hui le même travail que `except`** (un échange = deux exceptions), en plus
> limité (pas de "semaine" côté except). À retirer du modèle une fois les échanges migrés vers
> `except` — voir l'audit.

### POINTAGE (`pointage.json`)
Enregistrements de présence réelle (feuille de pointage).

### TOURNÉE (`tournees.json`) — NOUVEAU, en cours de design
```json
{
  "id":"…",
  "nom":"Tournée Michael",
  "agentId":"…",           // agent logistique attitré
  "siteIds":["…","…"],     // liste ORDONNÉE = ordre de passage
  "notes":""
}
```
- Concerne **uniquement les agents logistiques** (pas les postes fixes ni les multisites).
- Actuellement 3 tournées pré-créées : **Karima, Michael, Elvira**.
- **Question de design non tranchée** : la tournée doit-elle *stocker* sa liste de sites (risque de
  divergence avec le planning), ou être une *vue dérivée* des affectations de l'agent (toujours à
  jour, ordonnée par heure) ? Piste privilégiée = vue dérivée pour éviter la double saisie.

---

## 3. Logique du planning (comment un jour est calculé)

Pour savoir qui travaille où un jour J :
1. Déterminer le jour de semaine (`Lun`…`Dim`) et si c'est une **semaine A ou B** (`isWeekA(date)`).
2. Prendre les **affectations** dont `jours` contient ce jour ET dont `semaine` vaut `"toutes"` ou
   correspond à la semaine courante.
3. Retirer les agents **absents** ce jour-là (via `absences`) ; appliquer les **remplacements**.
4. Appliquer les **permutations** effectives (`getPermutationForDay(siteId, dateStr, weekKey)` — le
   jour précis prime sur la semaine).

Vues existantes : **Planning** (grille semaine), **Vue du jour**, **Sites**, **Agents**,
**Affectations**, **Tournées**, **Pointage**.

---

## 4. Ce qu'il faut savoir pour intégrer des plannings réels

1. **Format cible = affectations récurrentes.** Chaque ligne de planning « agent X, site Y, tel jour,
   tel horaire » devient une entrée `affec` avec `jours[]`, `debut`, `fin`, `semaine`.
2. **Alternance A/B.** Si le planning réel a une alternance une semaine sur deux, utiliser
   `semaine:"A"` / `"B"` ; sinon `"toutes"`.
3. **Créneaux multiples.** Matin + après-midi = deux affectations distinctes (ou deux `creneaux` côté
   site pour les horaires d'ouverture).
4. **Ponctuel = `except`.** Une intervention à date unique (non récurrente) est une entrée `except`
   de type `"add"`, pas une affectation.
5. **Profils d'agents.** Le champ `type` (accueil / multisite / logistique / factotum / chantier)
   est implémenté — le renseigner permet de distinguer qui a une tournée et qui a un poste fixe.
6. **Identité.** Faire correspondre agents et sites par `nom` (il n'y a pas d'identifiant externe
   stable pour l'instant ; à terme, bascule prévue vers Dataverse).

---

## 5. Format d'échange recommandé

Fournir les données sous forme des tableaux JSON ci-dessus (`sites[]`, `agents[]`, `affec[]`), en
respectant les noms de champs exacts. L'app les chargera tels quels. Les `id` peuvent être laissés
vides / regénérés, mais **les liens `agentId`/`siteId` doivent être cohérents** entre les tableaux.
