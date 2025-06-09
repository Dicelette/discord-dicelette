The bot has different administration commands that allow you to personalize your experience.

You will find [here](<https://dicelette.github.io/en/docs/config>) detailed explanations of the commands shown here:
- </config display:{{- display}}>: Display the server configuration
- </config logs:{{- logs}}>: Records a channel to display errors and modifications made to records.
- </config result_channel:{{- result}}>: Allows you to define a channel or enable/disable the automatic thread creation to receive the results of all dice rolls from the server.
- </config delete_after:{{- delete}}>: Allow to change the timer before result message deletion (only if </config result_channel:{{- result}}> is disabled). If set to `0`, messages won't be deleted. By default, message will be deleted after 3 minutes.
- </config timestamp:{{-timestamp}}> : Display (or not) the timestamp in the dice roll logs.
- </config self_register:{{- self_register}}> : Allow users to register themselves to the bot, when a template is set.
- </config change_language:{{- language}}> : Allows you to change the bot's language. The default language depends on the server's language, but is English if the server's language is not supported or not set.