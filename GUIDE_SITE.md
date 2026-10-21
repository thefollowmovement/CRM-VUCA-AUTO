# Guide du site VUCA AUTO (vuca-auto.fr)

Le site public se pilote **entièrement depuis le CRM** (`https://crm.vuca-auto.fr`) : rien à installer, aucun code à toucher.
Tout ce qui est publié vient de deux endroits :

- l'onglet **Annonce** de chaque véhicule (photos, prix affiché, description, équipements) ;
- le menu **Site web** (nom, couleur, logo, WhatsApp, coordonnées, avis, textes, référencement, statistiques).

Le site ne montre **jamais** d'informations internes : ni prix d'achat, ni dépenses, ni marge, ni investisseurs, ni clients, ni numéro de série. L'immatriculation est masquée par défaut.

---

## Sommaire

1. [Mettre le site en ligne (la première fois)](#1-mettre-le-site-en-ligne-la-première-fois)
2. [Publier une voiture en 1 minute](#2-publier-une-voiture-en-1-minute)
3. [Voiture réservée, vendue ou retirée](#3-voiture-réservée-vendue-ou-retirée)
4. [Changer le numéro WhatsApp](#4-changer-le-numéro-whatsapp)
5. [Ajouter un avis client](#5-ajouter-un-avis-client)
6. [Les photos : choisir, ordonner, recadrer](#6-les-photos--choisir-ordonner-recadrer)
7. [Voir le site avant les visiteurs (aperçu)](#7-voir-le-site-avant-les-visiteurs-aperçu)
8. [Statistiques](#8-statistiques)
9. [Google et partage sur WhatsApp / Facebook](#9-google-et-partage-sur-whatsapp--facebook)
10. [Remettre le site en maintenance](#10-remettre-le-site-en-maintenance)
11. [En cas de problème](#11-en-cas-de-problème)

---

## 1. Mettre le site en ligne (la première fois)

Ouvrez **Site web → Général** : la carte **« Avant la mise en ligne »** liste ce qui reste à faire, dans l'ordre. Chaque ligne est un lien vers le bon réglage. Une coche verte = fait.

### Étape 0 — Brancher le domaine (une seule fois)

Si la carte affiche « Domaine du site branché » sans coche verte, dans le terminal du navigateur Hostinger (en root) :

```bash
bash /opt/vuca-crm/app/scripts/configurer-domaines.sh
```

Le script enregistre `vuca-auto.fr` et `crm.vuca-auto.fr` dans les réglages du serveur, redémarre l'application et vérifie les adresses ; il doit finir par « Terminé ».

### Étape 1 — Faire une sauvegarde (2 minutes, recommandé)

Une sauvegarde est faite automatiquement chaque nuit. Pour en faire une **juste avant** de retirer la démonstration :

1. Ouvrez le **terminal du navigateur** de votre serveur chez Hostinger (VPS → votre serveur KVM 2 → « Terminal » / « Browser terminal »).
2. Copiez-collez cette ligne puis appuyez sur Entrée :

   ```bash
   bash /opt/vuca-crm/app/scripts/sauvegarde-serveur.sh
   ```

3. Attendez le message de fin. La sauvegarde est rangée dans `/var/backups/vuca-crm`.

### Étape 2 — Retirer la démonstration

Les voitures, clients et investisseurs d'exemple (Peugeot 208, Karim Benali, Lucas Moreau…) doivent disparaître avant l'ouverture : le site ne doit montrer que **vos** voitures.

1. **Réglages → Démonstration** (réservé à l'administrateur).
2. Lisez la liste « Seront supprimés » : uniquement les fiches créées par la démonstration.
   Si un client ou un investisseur d'exemple a servi pour vos vraies données (un vrai contrat, un vrai véhicule…), il apparaît dans l'encadré orange **« Conservés »** et n'est pas supprimé.
3. Cliquez **Retirer la démonstration**, tapez `RETIRER`, puis **Retirer définitivement**.

C'est définitif ; la démonstration ne revient plus, même après une mise à jour. Le numéro WhatsApp fictif, les horaires et les moyens de paiement d'exemple sont aussi remis à zéro (sauf si vous les aviez déjà modifiés). Tant que la démonstration est présente, le CRM **refuse** la mise en ligne.

### Étape 3 — Vos informations

| Où | Quoi |
|---|---|
| **Site web → Contact & WhatsApp** | votre numéro WhatsApp, téléphone, email, adresse, horaires, délai de réponse |
| **Site web → Légal** | forme juridique, SIRET, adresse du siège (obligatoires pour un site professionnel) ; les textes des mentions légales et de la politique de confidentialité sont générés à partir de ces informations |
| **Site web → Général** | nom affiché, slogan, couleur (jaune par défaut), logos, icône d'onglet — sans logo envoyé, le site affiche automatiquement le logo VUCA AUTO (carré jaune au « V » de route) |
| **Site web → Confiance** | vos engagements (cochez uniquement ce que vous faites vraiment), prénom et photo de l'interlocuteur, moyens de paiement, livraison, reprise |
| **Site web → Contenu** | texte d'accueil, page « À propos », questions fréquentes |

### Étape 4 — Publier vos premières voitures

Voir la partie [2. Publier une voiture en 1 minute](#2-publier-une-voiture-en-1-minute).

### Étape 5 — Ouvrir le site

1. **Site web → Général** : activez **« Site en ligne »**, puis **Enregistrer**.
2. Ouvrez `https://vuca-auto.fr` sur votre téléphone : vos voitures doivent apparaître.
3. Faites un essai : bouton **« Écrire sur WhatsApp »** d'une voiture → WhatsApp s'ouvre avec un message pré-rempli vers votre numéro.

### Étape 6 — Prévenir Google (une seule fois, facultatif mais conseillé)

1. Allez sur [search.google.com/search-console](https://search.google.com/search-console) avec votre compte Google.
2. **Ajouter une propriété** → type **« Domaine »** → `vuca-auto.fr`. Google vous donne une ligne **TXT** à ajouter dans le DNS : chez Hostinger, **Domaines → vuca-auto.fr → DNS / Nameservers → Ajouter un enregistrement**, type `TXT`, nom `@`, valeur = celle donnée par Google.
3. Une fois validé : menu **Sitemaps** → saisissez `sitemap.xml` → **Envoyer**.

Google découvre alors toutes vos annonces (elles s'ajoutent toutes seules au plan du site à chaque publication).

---

## 2. Publier une voiture en 1 minute

Le véhicule doit avoir le statut **« En vente »** (ou « Réservé »).

1. **Véhicules** → ouvrez la voiture → onglet **Annonce**.
2. **Photos publiques** : dans « Autres photos du véhicule », cliquez **« Ajouter cette photo à l'annonce »** sur chaque photo à montrer. La première est la **photo de couverture** (voir [partie 6](#6-les-photos--choisir-ordonner-recadrer) pour l'ordre et le recadrage).
3. **Prix affiché** : prérempli avec le prix cible du véhicule ; corrigez si besoin et cochez **« Prix négociable »** si c'est le cas.
4. **Description** : cliquez **« Générer une description »** : un texte factuel est écrit à partir de la fiche (modèle, kilométrage, équipements, contrôle technique…). Relisez et ajustez.
5. Facultatif : cochez les **équipements** et les **points de confiance** (contrôle technique à jour, carnet d'entretien, première main…). Ne cochez que ce qui est vrai : c'est affiché tel quel.
6. Cliquez **« Publier sur le site »**.

C'est en ligne immédiatement. Le bouton **« Aperçu »** montre la page exactement comme un visiteur la verra.

Le CRM refuse la publication s'il manque le prix affiché ou une photo publique, ou si le véhicule n'est pas « En vente » / « Réservé ».

---

## 3. Voiture réservée, vendue ou retirée

Tout se fait **automatiquement** quand vous changez le statut du véhicule dans le CRM :

| Statut du véhicule | Sur le site |
|---|---|
| **En vente** | annonce visible avec le prix et le bouton WhatsApp |
| **Réservé** | annonce visible avec une pastille « Réservé » |
| **Vendu** | l'annonce sort de la liste ; sa page reste accessible avec un bandeau « Vendu », sans prix ni contact (utile pour Google et les liens déjà partagés). Réglage « Récemment vendues » dans Site web → Confiance |
| autre (en préparation, immobilisé, en location…) | annonce retirée du site |

Pour retirer une annonce à la main : onglet **Annonce** → **« Retirer du site »**.

---

## 4. Changer le numéro WhatsApp

1. **Site web → Contact & WhatsApp**.
2. **Numéro WhatsApp** : tapez votre numéro, par exemple `06 12 34 56 78` (il est converti tout seul au format international).
3. Vous pouvez aussi modifier les deux **messages pré-remplis** : celui du bouton général et celui des pages de voitures (le modèle, l'année, le prix et le lien de la voiture sont ajoutés automatiquement).
4. **Enregistrer**.

Tous les boutons WhatsApp du site (accueil, fiches, bouton flottant, barre du bas sur téléphone) utilisent immédiatement le nouveau numéro. Sans numéro, les boutons WhatsApp ne s'affichent pas.

---

## 5. Ajouter un avis client

Uniquement de **vrais** avis, recopiés fidèlement (Google, Leboncoin, message reçu…). Publier de faux avis est interdit et sanctionné.

1. **Site web → Avis clients** → **« Ajouter un avis »**.
2. Remplissez : **prénom et initiale** (ex. « Sophie M. »), **note** (1 à 5), **texte de l'avis**, **date**, **source** et, si vous le souhaitez, le **véhicule acheté**.
3. Cochez **« Je certifie que cet avis est authentique (rédigé par un vrai client) »** (obligatoire).
4. **Ajouter l'avis**.

Les flèches **Monter / Descendre** règlent l'ordre d'affichage. Sur l'accueil, la section « Ils nous ont fait confiance » n'apparaît que s'il y a au moins un avis. Dans **Site web → Confiance**, ajoutez le lien vers vos avis Google pour afficher « Voir tous nos avis sur Google ».

---

## 6. Les photos : choisir, ordonner, recadrer

- Seules les photos **ajoutées à l'annonce** sont publiques ; les autres (carte grise, dommages, justificatifs…) restent internes.
- **Ordre** : boutons **Avancer / Reculer** sur chaque photo (ou glisser-déposer sur ordinateur). La première est la couverture.
- **Recadrer** : le site affiche les photos au format 4:3. Le bouton **« Recadrer »** permet de choisir la zone visible (position et zoom).
- Sur le site, les photos sont automatiquement allégées et débarrassées de leurs informations cachées (position GPS, appareil…).

Conseils : 8 à 15 photos, prises de jour ; dans l'ordre : 3/4 avant, profil, 3/4 arrière, intérieur, tableau de bord avec le kilométrage, sièges arrière, coffre, détails.

---

## 7. Voir le site avant les visiteurs (aperçu)

- **Site web → « Aperçu du site »** : le vrai site, même en maintenance, réservé aux personnes connectées au CRM.
- Onglet **Annonce** d'un véhicule → **« Aperçu »** : la page de cette voiture.

Vos visites dans l'aperçu ne sont pas comptées dans les statistiques.

---

## 8. Statistiques

**Site web → Statistiques** (et la tuile « Site web (7 jours) » du tableau de bord) : visites, vues d'annonces, clics WhatsApp et « Appeler », taux de contact, détail par annonce, sur 7, 30 ou 90 jours.

Les compteurs sont anonymes et sans cookie : aucun bandeau à afficher. Les robots et les doubles comptes sont ignorés.

Pour une mesure plus complète, **Site web → Référencement** permet d'ajouter **Plausible** (sans cookie, recommandé) ou **Google Analytics** (qui ne se charge qu'après l'accord du visiteur, via un bandeau).

---

## 9. Google et partage sur WhatsApp / Facebook

- Chaque voiture a automatiquement son titre pour Google (« Peugeot 208 … 2020 – 64 350 km – 11 500 € | VUCA AUTO »), sa description et ses informations de prix et de kilométrage dans le format que Google comprend.
- **Site web → Référencement** : titre et description de l'accueil dans Google (avec aperçu), image de partage.
- Quand on partage le lien d'une voiture (WhatsApp, Facebook, SMS…), une image est créée automatiquement : photo de couverture, modèle, kilométrage, prix et votre nom.

Google met en général quelques jours à quelques semaines pour afficher un nouveau site.

---

## 10. Remettre le site en maintenance

**Site web → Général** : désactivez **« Site en ligne »** → **Enregistrer**. Les visiteurs voient « Notre site arrive bientôt » (avec votre bouton WhatsApp) ; plus aucune voiture n'est visible ni indexée par Google. Rien n'est perdu : réactivez quand vous voulez.

---

## 11. En cas de problème

| Problème | Solution |
|---|---|
| Une voiture n'apparaît pas | Vérifiez : statut « En vente » ou « Réservé », annonce publiée (onglet Annonce), site en ligne (Site web → Général) |
| Le bouton WhatsApp n'apparaît pas | Numéro absent : Site web → Contact & WhatsApp |
| La modification n'apparaît pas | Rechargez la page du site (tirez vers le bas sur téléphone) |
| Le site ne répond plus | Mettez à jour / redémarrez avec la commande ci-dessous, puis envoyez-moi ce qui s'affiche |

Mise à jour de l'application (terminal du navigateur Hostinger) :

```bash
bash /opt/vuca-crm/app/scripts/installer-hestia.sh
```

Vérifier que les trois adresses répondent :

```bash
for u in https://vuca-auto.fr https://www.vuca-auto.fr https://crm.vuca-auto.fr/connexion; do echo "$u → $(curl -s -o /dev/null -w '%{http_code}' $u)"; done
```

Réponses attendues : `200` pour vuca-auto.fr, `301` pour www (redirection vers vuca-auto.fr), `200` pour le CRM. Si vuca-auto.fr répond `307` (renvoi vers la connexion du CRM) ou si www ne répond pas, lancez : `bash /opt/vuca-crm/app/scripts/configurer-domaines.sh`.
