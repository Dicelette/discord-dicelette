# Delete a character

- </delete_char:{{- delete_char }}> : Allows to delete a character from the database. Will delete the message of the character sheet if it's still present on the server.

# Automatic roles

These two commands allow you to automatically add a role when validating files:
- </config auto_role statistic:{{- stat}}: Adds a role when statistics are validated (enables </dbroll:{{- dbroll}}>).
- </config auto_role dice:{{-dice}}> : Allows a role to be added when a die is registered (enables </dbd:{{- dbd}}>).

# "Game master" die roll

The following two commands allow game masters to roll dice for all registered players.

- </gm dbroll:{{- gm.dbRoll}}> : Rolls a statistics die, similar to </dbroll:{{- dbroll}}>.
- </gm dbd:{{- gm.dBd}}>: Rolls a registered die, similar to </dbd:{{- dbd}}>.
- </gm calc:{{- gm.calc}}> : Rolls a calculation die, similar to </calc:{{- calc}}>.

