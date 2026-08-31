# Luma — It Girl Camera V1

PWA pensée pour iPhone / GitHub Pages.

## Inclus dans cette V1
- écran de déverrouillage à 6 chiffres
- caméra avant / arrière
- zoom matériel quand Safari expose la capacité de zoom
- boutons de zoom générés selon les capacités réelles du téléphone
- tap-to-focus lorsque le navigateur expose le focus
- grille 3x3
- mode Trace : photo de galerie en transparence sur la caméra
- filtres intégrés
- création, nommage et sauvegarde de filtres personnalisés
- prise de photo avec filtre
- import d'images
- galerie locale
- favoris
- comparateur 2 photos avant/après

## Mise en ligne
1. Décompresser le ZIP.
2. Envoyer tous les fichiers à la racine d'un dépôt GitHub.
3. Settings > Pages > Deploy from a branch > main / root.
4. Ouvrir l'URL GitHub Pages dans Safari sur iPhone.
5. Autoriser la caméra.
6. Safari > Partager > Ajouter à l'écran d'accueil.

## Limites connues / prévues pour une prochaine version
- iOS Safari ne donne pas forcément accès à tous les objectifs physiques 0.5x/1x/2x/etc. comme l'app Caméra native.
- la galerie V1 utilise un stockage local simple et limité : passage à IndexedDB prévu pour une grosse photothèque.
- albums, recaps vidéo, musique, Photo Diary, IA Match et AI Pick sont volontairement gardés pour les versions suivantes.
- pour un verrouillage réellement sécurisé, utiliser une vérification côté serveur : une PWA 100% statique ne peut pas protéger un secret contre quelqu'un qui inspecte le code.


## V2 corrections
- selfie preview mirrored naturally; saved photo no longer intentionally flipped
- new camera switch icon
- Overlay replaces the unclear Trace label, with Remove control
- visible shutter flash feedback
- Vintage filter with grain/fade/vignette
- richer iPhone-style filter editor: exposure, brilliance, highlights, shadows, contrast, brightness, black point, saturation, vibrance, warmth, tint, sharpness, definition, noise reduction, vignette, grain, fade
- gallery viewer, deletion, favorites section, albums
- A/B comparison: select two photos, A is shown by default, hold the image to reveal B
- import button wired to the device photo picker

## V2.1 cache fix
- force la mise à jour des fichiers sur GitHub Pages
- supprime les anciens caches Luma
- service worker en network-first sur index/CSS/JS
- numéro `v2.1` visible à côté du logo pour vérifier que la bonne version est chargée

## V2.2
- suppression du bouton + en bas à gauche de la caméra
- app verrouillée à la hauteur de l'écran : plus de scroll global de la page
- seuls la galerie et certains panneaux internes peuvent défiler
- interface des réglages refaite façon Photos iPhone
- réglages traduits en français
- un seul curseur actif à la fois avec bande horizontale de réglages
- affichage v2.2 à côté de Luma pour vérifier la version

## V2.3 hotfix
- corrige les identifiants HTML accidentellement traduits en V2.2
- rétablit tous les boutons et interactions JavaScript
- nouvelle version de cache v5
- numéro v2.3 visible dans l'interface

## V2.4 functional fix
- restaure tous les événements perdus : Créer un filtre, Comparer, Albums, Enregistrer le filtre, curseur actif
- corrige customFilterName
- rend toute la bande des réglages accessible au swipe horizontal sur iPhone
- preview caméra de l’éditeur forcée en object-fit: cover sans bande noire
- activation de l’éditeur relance explicitement la preview vidéo

## V2.5
- Grille et inversion visibles uniquement dans Caméra
- grande preview carrée dans Créer un filtre
- disposition plus proche de Photos iPhone
- réglages sous l'image sans chevauchement
- bouton Enregistrer toujours accessible

## V2.6 — base gelée
- curseur visible pour parcourir tous les réglages sur ordinateur
- synchronisation du curseur avec le scroll horizontal tactile
- bouton Retourner la caméra disponible dans Caméra et Filtres
- bouton Grille uniquement dans Caméra
- version prévue comme base stable avant ajout des nouvelles fonctions

## V2.7
- zoom au pincement sur la caméra quand Safari expose le zoom matériel
- affichage dynamique du niveau de zoom
- Réglages avec Apparence Auto / Clair / Sombre
- Français / English

## V2.8
- suppression complète de l'ancienne barre de zoom
- zoom uniquement au pincement
- prévention du zoom de page et des gestes plein écran
- niveau de zoom visible uniquement pendant le pincement
- bouton photo recentré
- points Réglages recentrés
- traduction anglaise des réglages photo
- répertoire Mes filtres avec favoris en tête et suppression

## V2.9
- clic sur un filtre dans Mes filtres => ouverture dans l'éditeur
- modification puis mise à jour du filtre existant
- sauvegarde des réglages détaillés pour les nouveaux filtres
- favoris de Mes filtres remontent en premier dans la barre de filtres caméra
- suppression conservée

## V3.0
- retardateur 0 / 3 / 5 / 10 s
- formats 4:3 / 1:1 / 16:9 / Plein
- exposition directement dans la caméra
- intensité du filtre directement dans la caméra
- compte à rebours visuel avant déclenchement

## V3.1
- expo/intensité déplacées dans un panneau compact ±
- exposition plus forte et visible
- formats appliqués au cadrage + au fichier final
- galerie en grille régulière
- heure sur chaque photo
- sélection multiple + suppression groupée

## V3.2
- caméra plein écran façon iPhone
- formats retirés de la PWA et gardés pour plus tard/native
- intensité des filtres retirée de la caméra
- exposition conservée seule dans le panneau ±
- photo enregistrée en plein cadre

## V3.4
- bouton Retoucher dans le viewer de la galerie
- application des filtres existants sur une photo déjà prise
- sauvegarde de l'original lors de la première retouche
- appui long sur la photo retouchée = affiche l'originale
- relâcher = revient à la version retouchée

## V3.5
- caméra non cliquable comme une vidéo
- blocage des interactions vidéo natives
- panneau Retoucher fixé dans la largeur du viewer
- suppression du décalage horizontal / blocage de page

## V3.6
- fonction Retoucher retirée de la PWA
- retouche avancée réservée à la future app native
- galerie simplifiée : Favori / Album / Supprimer

## V3.7
- Photo Roulette dans la galerie
- sélection aléatoire pondérée : favoris et photos peu revues ont plus de chances de ressortir
- date + heure dans la roulette
- bouton Encore
- bouton Ouvrir pour afficher la photo normalement

## V3.8
- galerie refaite dans l'esprit Photos iPhone
- Comparer toujours accessible
- barre d'actions horizontale défilable
- vraie grille 3 colonnes mobile / 5 colonnes desktop
- scroll vertical dédié à la galerie
- suppression des superpositions de photos
- compteur de photos
