# Delete a Character
- **</delete_char:{{- delete_char }}>**: Deletes a character from the database. If the character sheet message is still present on the server, it will also be removed.

# Automatic Roles
These commands allow automatic role assignment during file validation:
- **</config auto_role statistics:{{- stat}}**: Adds a role when statistics are validated.
- **</config auto_role dice:{{- dice}}**: Adds a role when a die is registered. 

# This allows the use of the commands </dbroll:{{- dbroll}}>, </macro:{{- macro}}> and </calc:{{- calc}}> if they are restricted to users with these roles.

# "Game Master" Dice Rolls
These commands allow game masters to roll dice for all registered players:
- **</gm dbroll:{{- gm.dbRoll}}>**: Rolls a statistics die, similar to </dbroll:{{- dbroll}}>.
- **</gm macro:{{- gm.macro}}>**: Rolls a registered die, similar to </macro:{{- macro}}>.
- **</gm calc:{{- gm.calc}}>**: Rolls a calculation die, similar to </calc:{{- calc}}>.

