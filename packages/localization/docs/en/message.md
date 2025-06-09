# :game_die: **Dicelette** :game_die:

- Find the *bot* on [GitHub](<https://github.com/Dicelette/discord-dicelette/blob/main/README.md>)
- [Documentation](<https://dicelette.github.io/en>)

# Usage
- </roll:{{- rollId}}> : Roll a die
- </scene:{{- sceneId}}> : Creates a new thread for dice. This will archive all previous threads.
- </math: {{- mathId}}> : Perform a mathematical operation, like `2+2`, `3*4`, or `sqrt(16)`.

You can also create a "time bubble" with the parameters `/scene tempo:True`. By default, the thread name will be the current date.

You can use the bot directly in a message (**without using slash commands**), with :
- __A direct die__ : `des`, like `d6` or `2d6`.
- __An indirect die__ : `my message [dice]`, like `*Phibi jumps on Wumpus and inflicts [2d6] damage*`.
- __A semi-direct die__: `1d100 my message`, as `1d100 Phibi jumps on Wumpus and inflicts damage`.

{{- dbCMD}}