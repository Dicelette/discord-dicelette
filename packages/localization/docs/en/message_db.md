# Delete a Character

### Command Overview:
- **</delete_char:{{- delete_char }}>**: Deletes a character from the database. If the character sheet message is still present on the server, it will also be removed.

# Automatic Roles

### Command Overview:
These commands allow automatic role assignment during file validation:
- **</config auto_role statistic:{{- stat}}**: Adds a role when statistics are validated. This enables the use of </dbroll:{{- dbroll}}>.
- **</config auto_role dice:{{- dice}}**: Adds a role when a die is registered. This enables the use of </dbd:{{- dbd}}>.

# "Game Master" Dice Rolls

### Command Overview:
These commands allow game masters to roll dice for all registered players:
- **</gm dbroll:{{- gm.dbRoll}}>**: Rolls a statistics die, similar to </dbroll:{{- dbroll}}>.
- **</gm dbd:{{- gm.dBd}}>**: Rolls a registered die, similar to </dbd:{{- dbd}}>.
- **</gm calc:{{- gm.calc}}>**: Rolls a calculation die, similar to </calc:{{- calc}}>.

### Additional Resources:
For more details on these commands, consult the [documentation](<https://dicelette.github.io/en/>).

