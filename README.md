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

## Données

Tout est enregistré dans le navigateur du téléphone (localStorage, et IndexedDB pour les photos), rien n'est envoyé ailleurs. Le volet « Exporter et sauvegarder » (onglet Cartes) permet de récupérer :

- les contacts pour Excel (CSV, séparateur point-virgule) ou pour le carnet d'adresses (vCard) ;
- les synthèses en un seul fichier Markdown ;
- une sauvegarde complète (JSON, photos comprises), qui se restaure sur un autre téléphone ou navigateur.

À faire à la fin de la journée : le navigateur peut effacer ces données au bout de quelques jours sans visite. L'état « Dernière sauvegarde » et le badge de l'onglet Cartes signalent ce qui n'est pas encore sauvegardé ; tant qu'une sauvegarde manque, un bandeau la propose dans l'onglet Journée. Ouvrir l'app toujours de la même façon (même navigateur, même adresse) : chaque accès a son propre stockage.

D'après le catalogue des exposants (export du 5 octobre 2026) et le programme papier du mardi.
