# :game_die: Getting started with Dicelette

No command needed: the bot reads your messages and rolls any dice it finds.

## Rolling a die
- **Direct**: `1d20` → your message is replaced by the result.
- **Indirect**: `I force the door [1d20]` → your message is kept, only what is inside the brackets is rolled.
- **Semi-direct**: `1d20 I force the door` → the text after the die becomes a comment.

The </roll:{{- rollId}}> command works too: `/roll 1d20+3`.

## Success and failure
- **Comparison**: `1d100<=50` tells you whether the roll is a success or a failure.
- **Opposition**: `1d100>20>10` adds a second comparison (the last one).
- **Criticals**: `{cs:…}` (success) and `{cf:…}` (failure), attached to the die. Example: `1d100<=50{cs:<=5}{cf:>=96}`.

## Multiple rolls
- **Identical**: `[number]#[dice]` → `4#1d6` rolls `1d6` four times.
- **Different**: separate the dice with `;`, with no space around it → `1d20;1d6+2`.
- **One die, several formulas**: `&` stands for the result of the first die → `1d20;&+5;&*2` rolls a single `1d20`, then shows the result with `+5` and with `*2`.

## Comments
- After the die and a space: `1d100<=50 Attack`.
- Multiple rolls: `[comment]` for each die (preceded by a space) and `#comment` for the whole roll → `1d20 [Attack];1d8+3 [Damage] #Sword strike`.
- To edit a comment: reply to the bot's result with `/// New comment` (default prefix, can be changed).

More details in the [documentation](<https://dicelette.github.io/en/>).
