# CONTEXTE PROJET — GestionOpe (handoff pour reprise de conversation)

> À lire en début de nouvelle conversation. Résume l'état de l'app, l'architecture, et les chantiers en cours/à venir.

## C'est quoi
**GestionOpe** — app web de gestion opérationnelle pour Conciergerie Solidaire (Bordeaux) : gestion d'agents de conciergerie affectés à des sites, plannings, absences, remplacements, tournées logistiques. Utilisateur = Jonathan Garcia (jonathan.garcia@conciergerie-solidaire.fr). Familiarité OK, réponses concises.

## Fichiers clés
- **`Gestion Ope.html`** = LE fichier de travail principal (app complète mono-fichier, JS vanilla, ~3650 lignes). Toujours éditer celui-ci.
- **`hosting/index.html`** et **`deploy/index.html`** = copies à propager après CHAQUE modif validée (c'est ce qui est mis en ligne). Toujours faire : `copy_files` de `Gestion Ope.html` vers ces deux chemins en fin de tâche.
- **Hébergement = Netlify** (site « moyens généraux »). Mise à jour par l'utilisateur : glisser le fichier `deploy/index.html` (renommé `index.html`) dans le déploiement Netlify (onglet Deploys → drag & drop), OU déposer tout le dossier `deploy/`. Claude fournit le fichier via `present_fs_item_for_download`.
- **`data/*.json`** = données du mode démo (`sites`, `agents`, `affec`, `absences`, `rempl`, `pointage`, `permut`, `tournees`, `except`).
- **`data/_backup/`** = backups horodatés (retour arrière imports planning).
- **`MODELE-DONNEES-GestionOpe.md`** = brief technique complet du modèle de données. ⚠ À compléter : entité `except` (exceptions de planning) ajoutée récemment.
- **`Vue Pilotage - Maquettes.dc.html`** = 3 maquettes (1a/1b/1c) pour refondre la vue jour — EN ATTENTE de choix utilisateur (voir plus bas).
- Fichiers "sombre"/"autonome" = anciennes variantes, ignorer sauf demande.

## Architecture technique
- **Auth** : MSAL / Azure AD, tenant unique conciergerie-solidaire.fr (tenant ID `4dffba4f-a634-4907-bf2a-a4e013bbf6d3`, client ID `99c4bf43-6e9f-4b9d-839c-eab0e1716357`). Mode **redirection** (pas popup — popup casse en iframe).
- **Données** : fichiers JSON dans dossier SharePoint d'équipe **LCS33** (`LCS33-Equipe33`), lus/écrits via Microsoft Graph avec le token de l'utilisateur. Accès aux données = gouverné par les membres du dossier SharePoint.
- **Mode démo** : si `location.hash==='#demo'` OU si l'app tourne en iframe (aperçu), MSAL est court-circuité, données chargées depuis `./data/`, variable globale `DEMO_MODE=true`, sync SharePoint désactivée (affiche "Mode démo — modifications non enregistrées", plus de fausse erreur). Badge démo = pastille fixe en bas d'écran.
- **Pas de repli OneDrive perso** : si dossier LCS33 injoignable → écran "Accès refusé" (`showAccessDenied`).

## Modèle de données (résumé — détail dans MODELE-DONNEES-GestionOpe.md)
- **site** : `{id, nom, adresse, client (badge info), contact, tel, email, notes, creneaux:[{jours[],debut,fin}]}`. NB: ancien champ `groupe` migré auto vers `client`.
- **agent** : `{id, nom, tel, email, notes, remplacant:bool}`. ⚠ Évolution prévue : champ `type` (fixe / multisite / logistique) PAS encore implémenté.
- **affec** (cœur planning) : `{id, agentId, siteId, jours:["Lun"...], debut, fin, semaine:"toutes"|"A"|"B", notes}`. Toujours récurrent. ⚠ PAS d'affectation à date unique/ponctuelle (manque identifié).
- **absence** : `{id, agentId, debut:"YYYY-MM-DD", fin, motif, notes}`.
- **permut** : mécanisme daté ponctuel d'ÉCHANGE entre 2 agents : `{id, siteId, scope:"jour"|"semaine", dateStr, weekKey, agent1Id, agent2Id}`. Jugé trop rigide par l'utilisateur (échange obligatoire) → complété par les exceptions.
- **except** (NOUVEAU) : exception de planning ponctuelle, par date, posée par-dessus le récurrent A/B (SANS partenaire d'échange) : `{id, agentId, dateStr:"YYYY-MM-DD", type:"mod"|"del"|"add", affecId?, siteId?, debut?, fin?, notes?, createdBy, createdAt}`. `mod` = modifie horaires/site d'un créneau récurrent ce jour ; `del` = libère (retire l'agent de) ce créneau ce jour ; `add` = créneau ponctuel hors récurrent. `dateStr` en date LOCALE (`_ymd`). Ne touche jamais aux `affec`. Appliqué au rendu grille via `effectiveShifts()` ET aux exports via `computeAgentDays()`.
- **tournee** (nouveau) : `{id, nom, agentId (attitré), siteIds:[ordonné = ordre de passage], notes}`. 3 tournées : Karima, Michael, Elvira. Concerne UNIQUEMENT agents logistiques.

## 3 profils d'agents (discuté, PAS encore modélisé)
- **Poste fixe** (ex: Camille) : 1 site toujours le même.
- **Multisite remplaçant** (ex: Charlie) : pas de poste attitré, remplacements au cas par cas.
- **Logistique** (ex: Michael) : tournée de récupération de prestation (itinéraire ordonné) + permanences volantes.

## Vues existantes
Planning (grille semaine), Vue du jour, Sites, Agents, Affectations, Tournées, Pointage. Nav = rail latéral gauche (`showView('...')`).

7. **Nav épurée** : "Vue du jour" retirée de la nav (code conservé, bouton masqué `display:none`). "Absences" et "Retards & H.Sup" FUSIONNÉES sous une seule entrée "Absences & pointage" (`#nav-suivi`) avec un sélecteur haut-niveau `.suivi-seg` qui bascule les deux sous-vues (`showView('absences')`/`showView('pointage')`). Bande d'alerte : bouton "Absences à combler" → `goAbsencesToFill()` (liste filtrée "Sans remplaçant", toutes dates).
8. **Détection double-booking remplaçant** : `replacerConflict(candId, absence)` signale (approche souple) un remplaçant déjà occupé aux mêmes horaires — soit son poste fixe, soit un autre remplacement. Panneau "Attribuer" : libres d'abord, occupés en bas avec "⚠ déjà pris", note rouge à la sélection, confirm() de garde-fou. Réutilise `_affActiveOn`, `_timeOverlap`, `_absenceShifts`.
9. **Exceptions de planning** (voir entité `except`) : gérer les cas ponctuels sans permutation. Clic créneau existant → panneau détail → bouton "Modifier pour ce jour" (`panel-jour`). Clic cellule vide → `panel-jour` en mode ajout (toggle "Ce jour" / "Toutes les semaines…"). Édition par créneau : modifier / libérer / ajouter, avec case "Appliquer à toute la semaine (Lun→Ven)" et "↺ Revenir au planning normal". Barres d'exception = style bleu `.shift-except` + badge "!". ⚠ Grille unifiée sur `_ymd` (date locale) pour dateStr (permut.json était vide, pas de casse).

## Ce qui a été fait avant (chronologique)1. Vérifié/propagé la vue journée (existait déjà). Retiré bouton "Importer" du header.
2. Séparé Client (badge info) vs Tournée (entité logistique). Créé onglet Tournées (CRUD, ordre de passage ↑/↓, tri par horaire, agent attitré).
3. Auth : retiré repli OneDrive, écran Accès refusé, passé en mode redirection, mode démo auto en iframe.
4. Import plannings réels : fusion intelligente (règle = on ne remplace un ancien créneau QUE si le couple site+agent est ré-importé, sinon on conserve). Backups dans `data/_backup/`. ⚠ 2 agents distincts : Michael a23 (logistique) ≠ Michel a24 (Darwin). Sections `a_verifier` (trajets/logistique/multi-sites/agents obsolètes) PAS intégrées, en attente décision tournées.
5. Audit ergonomie complet. Lot 1-5 fait : démo sereine, badge repositionné, cartes planning début–fin, création affectation depuis cellule vide de la grille (bouton +, agent+jour pré-remplis via `addAffectFromGrid`), badge A/B coloré (A=violet, B=ambre).
6. Vue du jour compactée : stats en bandeau, sites en grille 2 colonnes, lignes denses, statut présent = pastille verte.

## EN COURS / EN ATTENTE DE DÉCISION
- **Vue Pilotage** : l'utilisateur trouve la vue jour actuelle inutile (fait doublon avec la semaine). 3 maquettes présentées dans `Vue Pilotage - Maquettes.dc.html` : **1a** résolution d'absence (comparateur de remplaçants avec dispos), **1b** tableau de bord d'exceptions (triage matinal par gravité, écran d'accueil), **1c** timeline/itinéraires (frises horaires par agent logistique). → ATTEND que Jonathan choisisse une direction (ou mélange) avant construction. Idée retenue : 1b comme accueil + bouton "Résoudre" ouvre 1a.

## Reste de l'audit (backlog, non commencé)
- Trous de couverture : sites ouverts (créneaux) sans agent affecté.
- Affectation ponctuelle à date précise (étendre `affec` avec mode ponctuel + dateStr, ou via permut).
- Vue jour "itinéraire par agent" (lié tournées logistiques).
- Clarifier bouton "Présent" (état vs action pointage).
- Historique/annulation (multi-utilisateurs = dernier qui sauve gagne, actions destructives irréversibles).
- Export planning hebdo imprimable (PDF par site/agent).
- **[À FAIRE ENSUITE]** Aide à la décision remplacements : pouvoir sélectionner plusieurs sites et/ou agents et croiser leurs plannings dans une vue calendrier semaine unifiée (voir qui est libre/occupé sur un créneau donné). Réutiliser `expWeekCalendar()` (vue calendrier 7h30→19h déjà en place dans l'aperçu d'extraction planning d'un agent).

## Rappels admin en attente
- Demande d'autorisation admin Azure AD envoyée à Llona (admin). Lien admin consent : `https://login.microsoftonline.com/4dffba4f-a634-4907-bf2a-a4e013bbf6d3/adminconsent?client_id=99c4bf43-6e9f-4b9d-839c-eab0e1716357`.
- Recommandé pour verrouiller l'accès : Azure AD → App d'entreprise GestionOpe → "Affectation requise" = Oui + assigner un groupe de sécurité.

## Conventions de travail
- Éditer `Gestion Ope.html`, tester en mode démo (`#demo` ou iframe), propager vers `hosting/` + `deploy/`.
- Toujours faire un backup avant un import/opération destructive sur les données.
- Réponses concises, tutoiement OK.
