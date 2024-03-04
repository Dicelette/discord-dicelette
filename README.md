# Dicelette

-> [FRENCH TRANSLATION](README.fr.md) <-

Allows you to throw dice and send the result in a thread.

Uses the [@diceRoller](https://dice-roller.github.io/documentation/) API to throw dice.

It also supports the rollem notation `4#(dice)` for bulk rolls.

[Invite the bot](https://discord.com/api/oauth2/authorize?client_id=1182819335878754385&permissions=395137215504&scope=bot+applications.commands)

## Behavior
### Logs Threads
The bot operates with threads. In the first roll, it will search for threads prefixed by `🎲`.
- If the thread doesn't exist, a new one will be created, and all future logs will be sent to it.
- If a thread exists, it will take the most recent and send the log to it.

> [!NOTE]
> If multiple thread logs are found, the bot will use the most recent and archive the others.

The commands can also work in threads. In this case, the bot will just send the result in it. This result can be found in channels whose name begins with `🎲`.

It is also possible to create a new thread with the command [Create a new scene](#create-a-new-scene).

> [!NOTE]
> The bot also works in the forums. The difference being :
> - Several logs can exist at the same time (unless they have exactly the same name).
> - Logs will be called by default `🎲 [topic name]` and the tag `🪡 Dice Roll` will be automatically applied (and created if it doesn't exist).
> - A post will be created instead of a thread.

### Channels

The bot will **also** send the result in the channel where the command was sent. The message:
- Will be deleted after 3 minutes.
- Contains a link to the logs message.

## Usage

The bot can be:
- Used with slash commands (see [Slash Commands](#slash-commands))
- But also directly in messages.

### Message Send

The message will detect the dice notation and send the result.

The dice notation can be in two ways:
- Direct, like `1d20`: In this case, the message "commands" will be deleted, and the result will be sent in the same channel (and in the logs).
- Indirect, in brackets, like: `my message content [1d20]`. In this case, the message will be preserved, and the content of the brackets will be rolled. You will get a reply with the result, and the log will be sent in the thread. The logs will contain a link to the original message.
- Semi-direct, as `1d20 My message` : Will have the same behavior as the direct method. The dice found at the beginning will be rolled, and the rest of the message will be sent to the log and considered as a comment.

### Slash Commands
#### Throw Dice

`/roll 1d20` for a roll.
It is possible to use the "semi-direct" notation by adding a comment: `/roll 1d20 My comment`. The "indirect" notation is not available in this mode.

#### Create a New Scene

`/scene <name>`

The bot will create a new thread, prefixed by `🎲`, and send the log to it. The thread will take the `scene` name, and all other threads prefixed by `🎲` will be archived.

#### Help

`/help`: Display the help message.

## Translation

The bot is fully translated into French and English.

Slash-commands will be automatically translated into the language of the client used.

> [!TIP]
> For example, an user with a client in Korean will get a reply in Korean, while an English user will get a English reply.

But, if you use the `on message` type of roll detection, the reply will be in the guild's language, which will only can be set for community guild. By default, the reply will be in English.


### Add a translation

To create your own translation, you need to copy and translate the [`en.ts`](./src/localizations/locales/en.ts) file.

> [!IMPORTANT]
> The name must follow the [Discord.js Locale](https://github.com/discordjs/discord-api-types/blob/main/rest/common.ts#L300)
> For example, `ChineseCN` for Chinese (China) or `ChineseTW` for Chinese (Taiwan).

You need, after that, to update the [`index.ts`](./src/localizations/index.ts) file to add your translation :
```
import newTranslation from "./locales/{translation}";

export const TRANSLATIONS = {
	//keep the other translations
	newTranslation,
}
```



