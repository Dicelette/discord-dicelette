# Supprimer un personnage

- </delete_char:{{- delete_char }}> : Permet de supprimer un personnage de la base de données. Supprime le message de la feuille de personnage s'il est encore présent sur le serveur.

# Rôles automatiques

Ces deux commandes permettent d'ajouter automatiquement un rôle lors de la validation des fichiers :
- </config auto_role statistic:{{- stat}}> : Ajoute un rôle lors de la validation des statistiques (active </dbroll:{{- dbroll}}>).
- </config auto_role dice:{{- dice}}> : permet d'ajouter un rôle lorsqu'un dé est enregistré (active </dbd:{{- dbd}}>).

# Lancement de dé « maître de jeu

Les deux commandes suivantes permettent aux maîtres de jeu de lancer les dés pour tous les joueurs enregistrés.

- </gm dbroll:{{- gm.dbRoll}}> : Lance un dé de statistiques, similaire à </dbroll:{{- dbroll}}>.
- </gm dbd:{{- gm.dBd}}> : Lance un dé enregistré, similaire à </dbd:{{- dbd}}>.
- </gm calc:{{- gm.calc}}> : lance un dé de calcul, similaire à </calc:{{- calc}}>.

