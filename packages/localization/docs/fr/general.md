# :game_die: Bien débuter avec Dicelette

Pas besoin de commande : le bot lit vos messages et lance les dés qu'il y trouve.

## Lancer un dé
- **Direct** : `1d20` → votre message est remplacé par le résultat.
- **Indirect** : `Je force la porte [1d20]` → votre message est conservé, seul le contenu des crochets est lancé.
- **Semi-direct** : `1d20 Je force la porte` → le texte après le dé devient un commentaire.

La commande </roll:{{- rollId}}> fonctionne aussi : `/roll 1d20+3`.

## Réussite et échec
- **Comparaison** : `1d100<=50` indique si le jet est un succès ou un échec.
- **Opposition** : `1d100>20>10` ajoute une seconde comparaison (la dernière).
- **Critiques** : `{cs:…}` (réussite) et `{cf:…}` (échec), collés au dé. Exemple : `1d100<=50{cs:<=5}{cf:>=96}`.

## Plusieurs jets
- **Identiques** : `[nombre]#[dé]` → `4#1d6` lance quatre fois `1d6`.
- **Différents** : séparez les dés par `;`, sans espace autour → `1d20;1d6+2`.
- **Un seul dé, plusieurs formules** : `&` représente le résultat du premier dé → `1d20;&+5;&*2` lance un seul `1d20`, puis affiche le résultat avec `+5` et avec `*2`.

## Commentaires
- Après le dé et un espace : `1d100<=50 Attaque`.
- Plusieurs jets : `[commentaire]` pour chaque dé (précédé d'un espace) et `#commentaire` pour l'ensemble → `1d20 [Attaque];1d8+3 [Dégâts] #Coup d'épée`.
- Pour modifier un commentaire : répondez au résultat du bot avec `/// Nouveau commentaire` (préfixe par défaut, modifiable).

Plus de détails dans la [documentation](<https://dicelette.github.io/>).
