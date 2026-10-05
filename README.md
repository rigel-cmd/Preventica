# Preventica

Parcours de Victimes & Préjudices Avocats pour le salon Préventica Lyon, mardi 6 octobre 2026, à Eurexpo.

- `index.html` : la page à ouvrir sur téléphone. Elle fonctionne comme une petite application, avec cinq onglets en bas d'écran et un écran par onglet :
  - **Journée** : les 13 créneaux en carrousel, à faire glisser ou à choisir dans la frise horaire. Le jour du salon, le créneau en cours est signalé et le bouton « Maintenant » y mène. Les créneaux de stands ouvrent directement l'allée concernée ; les conférences donnent accès à leur synthèse Plaud.
  - **Stands** : les 53 stands, allée par allée (puces A à V, ou glisser à gauche et à droite), filtres « Prioritaires » et « Carte », stands vus à cocher. L'icône carte à côté de chaque stand enregistre une carte donnée.
  - **Cartes** : le registre des cartes du podcast « Hervé Gerbi raconte » données dans la journée (stock de 50 par défaut, modifiable). Pour chaque carte : le stand ou la conférence, l'interlocuteur (nom, fonction, société, téléphone, e-mail, note) et une photo de sa carte de visite. Les 16 cibles prioritaires restent en tête.
  - **Synthèses** : une fiche par conférence, où coller ou importer (TXT, Markdown) le résumé produit par Plaud, avec le lien de partage de l'enregistrement. Des conférences hors programme peuvent être ajoutées.
  - **Questions** : les trois questions à poser sur les stands, une par écran.
- `assets/` : recto et verso de la carte.

La page tient en un seul fichier HTML, avec les images à côté. Les polices viennent de Google Fonts.

## Données

Tout est enregistré dans le navigateur du téléphone (localStorage, et IndexedDB pour les photos), rien n'est envoyé ailleurs. Le volet « Exporter et sauvegarder » (onglet Cartes) permet de récupérer :

- les contacts pour Excel (CSV, séparateur point-virgule) ou pour le carnet d'adresses (vCard) ;
- les synthèses en un seul fichier Markdown ;
- une sauvegarde complète (JSON, photos comprises), qui se restaure sur un autre téléphone ou navigateur.

À faire à la fin de la journée : le navigateur peut effacer ces données au bout de quelques jours sans visite.

D'après le catalogue des exposants (export du 5 octobre 2026) et le programme papier du mardi.
