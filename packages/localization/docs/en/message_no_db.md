The bot has different administration commands that allow you to personalize your experience.

You can change the bot's settings directly from the [Dashboard](<https://dashboard.dicelette.app/>) or by using the commands below:
- </admin display general:{{- display}}>: Display the server configuration
- </admin logs:{{- logs}}>: Records a channel to display errors and modifications made to records.
- </admin result_channel:{{- result}}>: Allows you to define a channel or enable/disable the automatic thread creation to receive the results of all dice rolls from the server.
- </admin delete_after:{{- delete}}>: Allow to change the timer before result message deletion (only if </admin result_channel:{{- result}}> is disabled). If set to `0`, messages won't be deleted. By default, message will be deleted after 3 minutes.
- </admin timestamp:{{-timestamp}}> : Display (or not) the timestamp in the dice roll logs.
- </admin self_register:{{- self_register}}> : Allow users to register themselves to the bot, when a template is set, and with the option to restrict validation to moderators only and prevent users from creating in channels other than the default one.
- </admin change_language:{{- language}}> : Allows you to change the bot's language. The default language depends on the server's language, but is English if the server's language is not supported or not set. 

You can find [here](<https://www.dicelette.app/en/docs/config>) detailed explanations about the configuration.