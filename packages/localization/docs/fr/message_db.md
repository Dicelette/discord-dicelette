# Supprimer un personnage

### Aperçu des commandes :
- **</delete_char:{{- delete_char }}>** : Supprime un personnage de la base de données. Si le message de la feuille de personnage est encore présent sur le serveur, il sera également supprimé.

# Rôles automatiques

### Aperçu des commandes :
Ces commandes permettent l'attribution automatique de rôles lors de la validation des fichiers :
- **</config auto_role statistic:{{- stat}}>** : Ajoute un rôle lors de la validation des statistiques. Cela active l'utilisation de </dbroll:{{- dbroll}}>.
- **</config auto_role dice:{{- dice}}>** : Ajoute un rôle lors de l'enregistrement d'un dé. Cela active l'utilisation de </dbd:{{- dbd}}>.

# Lancers de dés « maître de jeu »

### Aperçu des commandes :
Ces commandes permettent aux maîtres de jeu de lancer des dés pour tous les joueurs enregistrés :
- **</gm dbroll:{{- gm.dbRoll}}>** : Lance un dé de statistiques, similaire à </dbroll:{{- dbroll}}>.
- **</gm dbd:{{- gm.dBd}}>** : Lance un dé enregistré, similaire à </dbd:{{- dbd}}>.
- **</gm calc:{{- gm.calc}}>** : Lance un dé de calcul, similaire à </calc:{{- calc}}>.

### Ressources supplémentaires :
Pour plus de détails sur ces commandes, consultez la [documentation](<https://dicelette.github.io/>).

