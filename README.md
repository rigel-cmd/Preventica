# Preventica

Parcours de Victimes & Préjudices Avocats pour le salon Préventica Lyon, mardi 6 octobre 2026, à Eurexpo.

- `index.html` : la page à ouvrir sur téléphone, en version bilan depuis la fin du salon. Trois onglets en bas d'écran :
  - **Journée** : les 4 conférences suivies (9h45 travail en hauteur, 10h45 PPSPS, 11h15 UX-Forum exosquelettes, 14h00 santé au travail), en carrousel, avec leur synthèse Plaud et un bilan chiffré de la journée (conférences, synthèses, cartes données, stands visités).
  - **Cartes** : le registre des cartes du podcast « Hervé Gerbi raconte » données pendant le salon. Pour chaque carte : le lieu (stand ou conférence), l'interlocuteur (nom, fonction, société, téléphone, e-mail, note) et la photo de sa carte de visite.
  - **Synthèses** : la synthèse Plaud de chaque conférence suivie (coller ou importer un fichier TXT ou Markdown), lue avec sommaire, sections repliables et réglage de la taille du texte. Des conférences hors programme peuvent être ajoutées.
- `assets/` : recto et verso de la carte.

La page tient en un seul fichier HTML, avec les images à côté. Les polices viennent de Google Fonts (affichage non bloquant, polices du téléphone en attendant).

Les onglets Stands et Questions, et les conférences non suivies, ont été retirés après le salon. La liste des 53 stands reste dans la page (données JSON) pour afficher le lieu des cartes données ; les stands cochés pendant la journée sont conservés dans les données et la sauvegarde.

`sw.js` garde l'app utilisable sans réseau quand elle est servie en https : l'ouvrir une fois avec du réseau suffit (le volet « Exporter et sauvegarder » indique « Hors ligne : prêt »).

## Données publiées sur GitHub

Le dossier [`donnees/`](donnees/) rassemble, en clair et en public, ce qui a été réalisé au salon : bilan, synthèses, cartes données et interlocuteurs, photos des cartes de visite, stands visités.

1. Dans l'app : **Cartes** → **Exporter et sauvegarder** → **Sauvegarde complète**, puis s'envoyer le fichier.
2. Sur github.com, ouvrir `donnees/`, puis **Add file** → **Upload files**, déposer le fichier `sauvegarde-….json` et valider (**Commit changes**).
3. L'action GitHub « Publier les données du salon » (`.github/workflows/donnees.yml`, script `outils/publier-donnees.mjs`) régénère alors `donnees/README.md` (le bilan), `syntheses.md`, `contacts.csv`, `contacts-excel.csv`, `contacts.vcf` et `photos/` à partir de la sauvegarde la plus récente.

Sur un appareil qui n'a pas encore de données (un ordinateur, par exemple), le site propose de charger la dernière sauvegarde publiée.

### Fiches de synthèse PDF

[`donnees/fiches/`](donnees/fiches/) contient une fiche d'une page A4 par conférence suivie, au design du site, et un PDF qui les réunit toutes. Ce sont des versions condensées des synthèses de `donnees/syntheses.md`. Elles ne sont pas régénérées par l'action.

Le contenu condensé est dans `outils/fiches/fiches.json`. Le rendu passe par `outils/fiches/rendu.mjs` (Chromium via Playwright, polices Poppins et Open Sans) :

```sh
npm i --no-save playwright @fontsource/poppins @fontsource/open-sans
npx playwright install chromium
node outils/fiches/rendu.mjs outils/fiches/fiches.json donnees/fiches/fiches-preventica-lyon-2026.pdf --dossier donnees/fiches
```

Le script signale toute fiche qui ne tient plus sur une page (« DÉBORDE ») et sort alors en erreur.

## Données

Tout est enregistré dans le navigateur du téléphone (localStorage, et IndexedDB pour les photos), rien n'est envoyé ailleurs. Le volet « Exporter et sauvegarder » (onglet Cartes) permet de récupérer :

- les contacts pour Excel (CSV, séparateur point-virgule) ou pour le carnet d'adresses (vCard) ;
- les synthèses en un seul fichier Markdown ;
- une sauvegarde complète (JSON, photos comprises), qui se restaure sur un autre téléphone ou navigateur.

À faire à la fin de la journée : le navigateur peut effacer ces données au bout de quelques jours sans visite. L'état « Dernière sauvegarde » et le badge de l'onglet Cartes signalent ce qui n'est pas encore sauvegardé ; tant qu'une sauvegarde manque, un bandeau la propose dans l'onglet Journée. Ouvrir l'app toujours de la même façon (même navigateur, même adresse) : chaque accès a son propre stockage.

D'après le catalogue des exposants (export du 5 octobre 2026) et le programme papier du mardi.
