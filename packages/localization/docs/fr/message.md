# :game_die: **Dicelette** :game_die:

- Trouvez le *bot* sur [GitHub](<https://github.com/Dicelette/discord-dicelette/blob/main/README.md>)
- [Documentation](<https://dicelette.github.io/en>)

# Utilisation
- </roll:{{- rollId}}> : Lancer un dé
- </scene:{{- sceneId}}> : crée un nouveau fil de discussion pour les dés. Cela archivera toutes les discussions précédentes.

Vous pouvez également créer une « bulle temporelle » avec le paramètre `/scene tempo:True`. Par défaut, le nom du thread sera la date du jour.

Vous pouvez utiliser le bot directement dans un message (**sans utiliser les commandes slash**), avec :
- __Un dé direct__ : `des`, comme `d6` ou `2d6`.
- __Un dé indirect__ : `mon message [dé]`, comme `*Phibi saute sur Wumpus et lui inflige [2d6] dégâts*`.
- __Un dé semi-direct__ : `1d100 mon message`, comme `1d100 Phibi saute sur Wumpus et lui inflige des dégâts`.

{{- dbCMD}}