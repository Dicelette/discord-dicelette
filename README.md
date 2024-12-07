# Dicelette

⇾ [Invite the bot](https://discord.com/api/oauth2/authorize?client_id=1182819335878754385&permissions=395137215504&scope=bot+applications.commands)


⇾ [Documentation](https://dicelette.github.io/en/) ⇽

## Translation

The bot is fully translated into French and English.

Slash-commands will be automatically translated into the language of the client used.

> [!TIP]
> For example, a user with a client in Korean will get a reply in Korean, while an English user will get a English reply.

But, if you use the `on message` type of roll detection, the reply will be in the guild's language, which will only can be set for community guild. By default, the reply will be in English.

### Add a translation

To create your own translation, you need to copy and translate the [`en.ts`](./src/localizations/locales/en.ts) file.

> [!IMPORTANT]
> The name must follow the [Discord.js Locale](https://github.com/discordjs/discord-api-types/blob/main/rest/common.ts#L300)
> For example, `ChineseCN` for Chinese (China) or `ChineseTW` for Chinese (Taiwan).

You need, after that, to update the [`database.ts`](./src/localizations/index.ts) file to add your translation :
```ts
import newTranslation from "./locales/{translation}";

export const TRANSLATIONS = {
	//keep the other translations
	newTranslation,
}
```



