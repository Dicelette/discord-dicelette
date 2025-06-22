# Supprimer un personnage
- **</delete_char:{{- delete_char }}>** : Supprime un personnage de la base de données. Si le message de la feuille de personnage est encore présent sur le serveur, il sera également supprimé.

# Rôles automatiques
Ces commandes permettent l'attribution automatique de rôles lors de la validation des fichiers :
- **</config auto_role statistics:{{- stat}}>** : Ajoute un rôle lors de la validation des statistiques.
- **</config auto_role dice:{{- dice}}>** : Ajoute un rôle lors de l'enregistrement d'un dé. 

Cela permet l'utilisation des commandes </dbroll:{{- dbroll}}>, </dbd:{{- dbd}}> et </calc:{{- calc}}> si elles sont restreintes aux utilisateurs ayant ces rôles.

# Lancers de dés « maître de jeu »
Ces commandes permettent aux maîtres de jeu de lancer des dés pour tous les joueurs enregistrés :
- **</gm dbroll:{{- gm.dbRoll}}>** : Lance un dé de statistiques, similaire à </dbroll:{{- dbroll}}>.
- **</gm dbd:{{- gm.dBd}}>** : Lance un dé enregistré, similaire à </dbd:{{- dbd}}>.
- **</gm calc:{{- gm.calc}}>** : Lance un dé de calcul, similaire à </calc:{{- calc}}>.

