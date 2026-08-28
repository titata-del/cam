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
