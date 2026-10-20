# Site web public VUCA AUTO — Phase 0 : proposition

> Objet : afficher les véhicules à vendre sur un site public, avec contact direct par WhatsApp, piloté depuis le CRM.
> Ce document propose le routage site / CRM, les nouveaux champs de la base et l'arborescence. **Rien n'est codé avant validation.**

---

## 1. Ce que j'ai relevé dans le code existant

| Constat | Conséquence |
|---|---|
| L'adresse `/` est déjà utilisée par le CRM (redirection vers la connexion ou le dashboard). | Un simple groupe `app/(site)` placerait l'accueil du site sur `/` : conflit avec le CRM. |
| Le `layout` racine charge le thème du CRM (mode sombre manuel), les notifications, le service worker et `robots: noindex`. | Le site a besoin de son propre habillage, de sa police, d'un mode sombre automatique et d'être indexé par Google. |
| Le middleware Auth.js protège toutes les pages sauf `/connexion` et les fichiers techniques. | Il faut une liste explicite de chemins publics. |
| Les photos sont déjà réencodées sans métadonnées (EXIF/GPS) à l'envoi (`lib/images.ts`). | La route photo publique réencodera quand même (4:3, WebP/AVIF) : double sécurité. |
| Le véhicule a `puissanceFiscale` (CV) mais pas de puissance en chevaux. | Nouveau champ « Puissance (ch) » sur l'annonce. |
| Le CRM a déjà `Compteur` (numérotation), `revalidatePath` partout, `sharp`, Playwright. | Réutilisés : référence `VA-0042`, cache, images, tests. |
| Serveur réel : Caddy tient les ports 80/443 et sert le CRM via un fichier qui lui est propre (`/etc/caddy/vuca-crm.caddy`). | Ajouter `vucaauto.fr` et `crm.vucaauto.fr` = modifier **uniquement ce fichier**, pas ceux de vos autres projets. |

---

## 2. Routage site / CRM (recommandé)

**Une seule application, une seule base, deux adresses.** Le middleware regarde le nom de domaine de chaque requête :

```
vucaauto.fr / www.vucaauto.fr   →  site public   (sans connexion)
crm.vucaauto.fr                 →  CRM           (avec connexion, comme aujourd'hui)
```

**Comment** : les pages du site sont rangées dans un dossier interne `src/app/site/…`. Sur le domaine public, le middleware **réécrit** chaque adresse vers ce dossier, sans que le visiteur le voie :

| Le visiteur tape | La page servie | Ce qu'il voit dans la barre d'adresse |
|---|---|---|
| `vucaauto.fr/` | `app/site/page.tsx` | `vucaauto.fr/` |
| `vucaauto.fr/voitures/peugeot-208-allure-2021-a1b2` | `app/site/voitures/[slug]/page.tsx` | inchangée |
| `vucaauto.fr/dashboard` (ou toute page du CRM) | page 404 du site | — le CRM est **invisible** sur le domaine public |

Sur le domaine du CRM, tout reste comme aujourd'hui. Les pages du site y sont aussi consultables, sans connexion, sous `/voitures…` (et l'accueil sous `/site`) : c'est l'aperçu avant la mise en ligne du domaine. **D'ici la Phase 6, le site sera donc visible à l'adresse actuelle du CRM** (`https://crm-vuca.72-61-164-158.sslip.io/site`).

**Pourquoi pas un simple groupe `(site)` ?** Il mettrait l'accueil du site et la racine du CRM à la même adresse `/`. Le dossier interne `site` + la réécriture règlent ce conflit, et les pages restent générées à l'avance et mises en cache (ISR) : le site est rapide et la mise à jour reste instantanée à chaque modification dans le CRM.

**Pourquoi pas `/admin` pour le CRM ?** Il faudrait déplacer toutes les pages du CRM et changer tous ses liens : risqué pour un gain nul.

**Réglage** : une variable `SITE_DOMAINES=vucaauto.fr,www.vucaauto.fr` dans le fichier `.env`. Tant qu'elle est vide, l'application se comporte comme aujourd'hui (+ l'aperçu du site).

**Habillage séparé** : le `layout` racine devient minimal (police système, `<html lang="fr">`) ; le thème du CRM (mode sombre manuel, notifications, service worker, `noindex`) passe dans les groupes du CRM ; le site a son propre `layout` (police, couleurs, navigation translucide, pied de page, indexable). Le CRM n'en voit aucune différence.

**Fichiers techniques** :
- `robots.txt` et `sitemap.xml` différents selon le domaine (le CRM interdit l'indexation ; le site liste ses pages).
- Le service worker et le manifeste « VUCA AUTO CRM » restent réservés au domaine du CRM.

---

## 3. Base de données : nouveaux modèles et champs

Tout est **ajouté**, rien n'est modifié ni supprimé dans les tables existantes (une migration Prisma, sans risque pour les données).

### 3.1 `Annonce` (une par véhicule, créée à la première ouverture de l'onglet « Annonce »)

| Champ | Rôle |
|---|---|
| `vehiculeId` (unique) | Lien vers le véhicule |
| `reference` | Référence courte publique `VA-0042` (compteur `annonce`) |
| `slug` (unique) | `peugeot-208-allure-2021-a1b2` — figé à la première publication (les liens partagés ne cassent jamais) |
| `publiee`, `publieeLe`, `depublieeLe` | Interrupteur et dates |
| `titre` | Prérempli : `Peugeot 208 1.2 PureTech 100 Allure` |
| `prixAfficheCentimes`, `prixNegociable` | Prérempli depuis le prix cible |
| `puissanceCh` | Puissance en chevaux (absente du véhicule) |
| `description` | Texte simple : **gras** et listes uniquement (aucun HTML stocké) |
| `equipements` (JSON) | `{ confort: [], securite: [], multimedia: [], exterieur: [], autres: [] }` |
| Points de confiance | `ctAJour` + `ctDate`, `carnetEntretien`, `rapportHistovec`, `nombreProprietaires`, `premiereMain`, `garantieMois` + `garantieTexte`, `nonFumeur`, `reviseAvantVente` + `travauxRealises`, `kilometrageVerifie` + `sourceKilometrage` |
| `couvertureId` | Photo de couverture |
| `misAJourLe` | « Annonce mise à jour le … » : mis à jour automatiquement à chaque enregistrement |

Règles : publication possible seulement si le véhicule est **En vente** ou **Réservé**. **Dépublication automatique** au passage à Vendu (ou à tout statut hors vente) et à l'archivage. Un véhicule vendu garde sa page publique (bandeau « Ce véhicule a été vendu »).

### 3.2 Photos publiques (3 champs ajoutés à `Fichier`)

`publique` (case « publiée »), `ordrePublic` (ordre par glisser-déposer), `recadrage` (zone 4:3 choisie, en %). Une route publique dédiée sert **uniquement** les photos publiques d'une annonce publiée (ou vendue récemment affichée), redimensionnées en 4:3, en WebP/AVIF, réencodées sans aucune métadonnée. Le stockage du CRM (`/api/fichiers`) reste protégé.

### 3.3 `ReglagesSite` (ligne unique, comme les réglages du CRM)

Regroupe les sous-sections de l'onglet « Site web » :

- **Général** : site en ligne / en maintenance (hors ligne par défaut), nom affiché, slogan, couleur d'accent (`#0071E3`), logos clair / foncé, favicon.
- **Contact & WhatsApp** : numéro, les deux messages pré-remplis, téléphone, email, adresse, lien Maps, horaires (7 jours), délai de réponse, vendeur affiché (nom + photo).
- **Confiance** : SIRET, forme juridique, siège, engagements (icône, titre, phrase, **désactivés par défaut**), moyens de paiement, livraison + zone, reprise, lien des avis Google, véhicules vendus récemment (oui/non + jours), nombre de véhicules vendus (oui/non + seuil), année de création, affichage de l'immatriculation (**masquée par défaut**).
- **Contenu** : titre et sous-titre d'accueil, « À propos » (texte + photo), FAQ, bandeau, réseaux sociaux.
- **Référencement** : titre, description, image de partage, domaine, Plausible ou Google Analytics (bandeau cookies si GA).
- **Légal** : mentions légales et confidentialité (générées depuis les infos ci-dessus tant que vous ne les modifiez pas).

Listes (horaires, engagements, FAQ, réseaux, paiements) en JSON validé par Zod.

### 3.4 `AvisClient`

Prénom + initiale, note (1 à 5), texte, date, véhicule acheté, source (Google / Leboncoin / direct), actif, ordre. **La case « Je certifie que cet avis est authentique » est obligatoire** pour enregistrer. **Aucun avis dans les données de démo** (section vide).

### 3.5 `StatistiqueSite` (compteurs agrégés, aucune donnée personnelle)

Une ligne par jour × type (`VUE_ANNONCE`, `VUE_SITE`, `CLIC_WHATSAPP`, `CLIC_APPEL`) × annonce (ou « site »), avec un compteur. **Aucune adresse IP stockée.** Limitation de débit en mémoire (l'IP n'est jamais écrite) ; robots exclus.

---

## 4. Sécurité des données : la règle centrale

- **Une seule porte de sortie** : `lib/site/vehicule-public.ts` → `toPublicVehicle()` construit l'objet public à partir d'une **liste blanche** de champs.
- Les requêtes publiques (`server/site/`) ne sélectionnent elles-mêmes que ces champs (double protection) et ne renvoient jamais un objet Prisma brut.
- **Jamais publics** : prix d'achat, dépenses, coût de revient, marge, participations, investisseurs, partenaires, vendeur d'origine, provenance, notes, valeur estimée, documents, historique, clients, VIN.
- L'immatriculation n'est affichée que si vous l'activez.
- **Test unitaire obligatoire** : on remplit un véhicule avec toutes ses données internes, puis on vérifie que l'objet public ne contient aucun champ interdit et aucune de ces valeurs.
- Les pages et routes publiques sont dans `app/site/` et `app/api/site/` : un test vérifie qu'aucune n'importe le client Prisma directement.

---

## 5. Arborescence proposée

```
src/
├── middleware.ts                      routage par domaine + auth du CRM (inchangée pour le CRM)
├── app/
│   ├── layout.tsx                     racine minimale (html, police système)
│   ├── (app)/ (compte)/ (portail)/ (public)/   CRM (thème, notifications, service worker déplacés ici)
│   ├── (app)/vehicules/[id]/annonce/  onglet « Annonce » de la fiche véhicule
│   ├── (app)/site-web/                onglet principal « Site web » : général, contact, confiance,
│   │                                  contenu, référencement, légal, statistiques
│   ├── (app)/site-preview/            page de démonstration du style (Phase 2, protégée)
│   ├── site/                          SITE PUBLIC (servi par réécriture sur vucaauto.fr)
│   │   ├── layout.tsx                 police Inter auto-hébergée, styles, navigation, pied, WhatsApp flottant
│   │   ├── page.tsx                   accueil
│   │   ├── voitures/page.tsx          liste + filtres
│   │   ├── voitures/[slug]/page.tsx   fiche véhicule (+ opengraph-image.tsx : image de partage)
│   │   ├── a-propos/ contact/ mentions-legales/ confidentialite/
│   │   ├── not-found.tsx              404 sobre
│   │   ├── photos/[id]/[largeur]/route.ts   photo publique 4:3 (WebP/AVIF, sans métadonnées)
│   │   └── robots.txt/ sitemap.xml/   fichiers SEO du domaine public
│   └── api/site/{vue,clic}/route.ts   compteurs (POST légers, limités en débit)
├── lib/site/                          PUR ET TESTÉ
│   ├── vehicule-public.ts             toPublicVehicle() + liste blanche (+ .test.ts)
│   ├── whatsapp.ts                    lien wa.me, variables {marque}…{lien}, encodage (+ test)
│   ├── slug.ts                        slug + référence (+ test)
│   ├── filtres.ts                     lecture/écriture des filtres dans l'URL, tri (+ test)
│   ├── equipements.ts                 catalogue des équipements par catégorie
│   ├── description.ts                 génération de la description (ton factuel) (+ test)
│   └── format.ts                      12 490 € · 84 500 km
├── server/site/                       lectures publiques (via toPublicVehicle uniquement), actions du CRM
└── components/site/                   composants du site (boutons, cartes, galerie, filtres, feuille du bas…)
```

---

## 6. Points techniques retenus

- **Police** : pile système Apple, puis **Inter auto-hébergée** (paquet npm + `next/font/local`) : aucun appel à Google au chargement.
- **Images** : `next/image` avec un chargeur qui pointe vers la route photo publique (tailles adaptées, WebP/AVIF, flou de chargement, 1re photo prioritaire).
- **Cache** : pages générées à l'avance (ISR). Chaque modification d'une annonce ou d'un réglage revalide les pages concernées : visible immédiatement.
- **Description** : éditeur minimal (boutons Gras / Liste) sur un texte simple, affiché sans jamais injecter de HTML. Bouton « Générer » : texte construit à partir des caractéristiques (ton factuel, pas d'IA externe, aucune donnée envoyée ailleurs).
- **Vues** : comptées par un petit appel depuis la page (les pages étant en cache, le serveur ne voit pas chaque visite).
- **Mode sombre automatique** du site (`prefers-color-scheme`) : prévu, comme l'indique la section 5.
- **Tests** : unitaires (`toPublicVehicle`, WhatsApp, slug, filtres, description) + parcours Playwright, et les tests existants du CRM à chaque phase.

---

## 7. Questions (avec ma recommandation)

1. **Domaine** : possédez-vous déjà `vucaauto.fr` (et chez qui : Hostinger, OVH… ?). *Utile seulement en Phase 6 ; d'ici là, aperçu sur l'adresse actuelle.*
2. **Routage** : d'accord pour le dossier interne `site` + réécriture par domaine (section 2) ? *Recommandé.*
3. **Vendeur affiché** sur les fiches (« Vous avez une question ? ») : une seule personne (nom + photo) réglée dans « Site web » ? *Recommandé ; on pourra faire un vendeur par annonce plus tard.*
4. **Immatriculation** : un seul réglage global (masquée par défaut) ? *Recommandé.*
5. **Démo et mise en ligne** : 8 véhicules de démo publiés avec des photos d'exemple neutres, aucun avis. Comme votre serveur charge aussi la démo, le site sera **en maintenance par défaut** : rien n'est visible publiquement tant que vous ne cliquez pas sur « Site en ligne ». Avant ce clic, il faudra retirer les données de démo (je vous fournirai une méthode sûre en Phase 6). *Recommandé : rien d'inventé ne peut apparaître publiquement par erreur.*
