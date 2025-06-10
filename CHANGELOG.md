# Changelog

All notable changes to this project will be documented in this file. See [commit-and-tag-version](https://github.com/absolute-version/commit-and-tag-version) for commit guidelines.

## [1.48.0](https://github.com/Dicelette/discord-dicelette/compare/1.47.1...1.48.0) (2025-06-10)


### Features

* exit the bot on uncaught error + send a message via webhook for alert ([24aabc2](https://github.com/Dicelette/discord-dicelette/commit/24aabc24e61fb1d9651b08baa22ddc09bf6bd3d4))

## [1.47.1](https://github.com/Dicelette/discord-dicelette/compare/1.47.0...1.47.1) (2025-06-09)

## [1.47.0](https://github.com/Dicelette/discord-dicelette/compare/1.46.1...1.47.0) (2025-06-08)


### Features

* allow self registration  ([deda85e](https://github.com/Dicelette/discord-dicelette/commit/deda85e08944d5e9bad24088ef3e47c7b3d9aa75))

## [1.46.1](https://github.com/Dicelette/discord-dicelette/compare/1.46.0...1.46.1) (2025-06-08)


### Bug Fixes

* **chainedRoll:** better take into account the comments on_message_send.ts ([ec18748](https://github.com/Dicelette/discord-dicelette/commit/ec187488dbff23130103f5e38f78fd23fda769aa))

## [1.46.0](https://github.com/Dicelette/discord-dicelette/compare/1.45.3...1.46.0) (2025-06-08)


### Features

* **threshold:** allow to use "simple" number to replace the original threshold (if any) ([362386b](https://github.com/Dicelette/discord-dicelette/commit/362386b3dd149d53b6eb6464cf2ae03606c2ccdf))

## [1.45.3](https://github.com/Dicelette/discord-dicelette/compare/1.45.2...1.45.3) (2025-06-08)


### Bug Fixes

* **lang:** update the lang in memory too ([7bda09c](https://github.com/Dicelette/discord-dicelette/commit/7bda09ca97d86000c8f49712610aba21f5a70994))
* should calculate points on all stats, not only the "page" stats. ([7be5803](https://github.com/Dicelette/discord-dicelette/commit/7be58037fa1ec24fe4e94cad1d987a031fd4ae77))

## [1.45.2](https://github.com/Dicelette/discord-dicelette/compare/1.45.1...1.45.2) (2025-06-06)


### Bug Fixes

* add silent option to suppress error messages in getTemplate function when loading the first time ([2bf6270](https://github.com/Dicelette/discord-dicelette/commit/2bf6270b27419825be88da84ee17aa234d0e78ca))
* better zod error (prevent crash if too much error) ([508c7f5](https://github.com/Dicelette/discord-dicelette/commit/508c7f53a02f923a4d1258ef54cebeb656c73c0e))
* **export:** fetch correctly avatar & channel when asked ([e63fee9](https://github.com/Dicelette/discord-dicelette/commit/e63fee9b6c3063a2c4f2ea8432c2549318a8a7a3))
* **import:** allow to delete old char via an option in the cmd ([d28da76](https://github.com/Dicelette/discord-dicelette/commit/d28da769a128355bd519a6db9da8ce3a5b68a0ec))
* **import:** standardize header with new lib ([22f32b7](https://github.com/Dicelette/discord-dicelette/commit/22f32b7f7f9bb7baf67c041d5feecfe0604c6d19))
* should not throw error when a min/max is 0 ([6a6dcd3](https://github.com/Dicelette/discord-dicelette/commit/6a6dcd3b055f2cc16ca13f6ede308bdd68af2c68))
* skip not found when ready ([aef4c4c](https://github.com/Dicelette/discord-dicelette/commit/aef4c4c0d2ff3e48c727db6c891798a6c3631150))
* **translate:** import error ([5b9f6e0](https://github.com/Dicelette/discord-dicelette/commit/5b9f6e0530c138e685e7fc5ca7027dfb70ffe038))
* use new version of verify template (without checking roll) while caching ([8f1aa73](https://github.com/Dicelette/discord-dicelette/commit/8f1aa73682279c6ea3235b3d89260c1b6dd3aceb))
* user not found when the username has number (like myname124) ([62fbbfd](https://github.com/Dicelette/discord-dicelette/commit/62fbbfd69781a03325afba24fa15235517536dfa))

## [1.45.1](https://github.com/Dicelette/discord-dicelette/compare/1.45.0...1.45.1) (2025-05-29)


### Bug Fixes

* no permission to send the welcome so fallback to DM ([5309d76](https://github.com/Dicelette/discord-dicelette/commit/5309d762cca9683f85367ef0ce9fe56c2e2ed8b4))

## [1.45.0](https://github.com/Dicelette/discord-dicelette/compare/1.44.0...1.45.0) (2025-05-17)


### Features

* add basic maths function ([#15](https://github.com/Dicelette/discord-dicelette/issues/15)) ([8c81b27](https://github.com/Dicelette/discord-dicelette/commit/8c81b278c210dab8148f781a7623fce2280499ab))

## [1.44.0](https://github.com/Dicelette/discord-dicelette/compare/1.43.2...1.44.0) (2025-05-09)


### Features

* **mj:** allow roll on global dice if exists ([ac50687](https://github.com/Dicelette/discord-dicelette/commit/ac50687dcaf27b9b95e97ea82be32c1305fd2859))

## [1.43.2](https://github.com/Dicelette/discord-dicelette/compare/1.43.1...1.43.2) (2025-05-08)


### Bug Fixes

* correct condition for generating stats dice in custom criticals ([a25bf6f](https://github.com/Dicelette/discord-dicelette/commit/a25bf6fa3eef30e87c0a3c74a11fcf3d5e78030b))

## [1.43.1](https://github.com/Dicelette/discord-dicelette/compare/1.43.0...1.43.1) (2025-05-08)


### Bug Fixes

* crash when starting the bot when the template is not found ([2fdcf37](https://github.com/Dicelette/discord-dicelette/commit/2fdcf37d7bd30f73942b5a1b6ac45928880822fb))

## [1.43.0](https://github.com/Dicelette/discord-dicelette/compare/1.42.4...1.43.0) (2025-05-08)


### Features

* allow "global" dbd & dbroll if the template allow it ([#13](https://github.com/Dicelette/discord-dicelette/issues/13)) ([b3d01d9](https://github.com/Dicelette/discord-dicelette/commit/b3d01d948242cf6c39713d1c413b1665f08fb7a5))

## [1.42.4](https://github.com/Dicelette/discord-dicelette/compare/1.42.3...1.42.4) (2025-04-12)


### Bug Fixes

* unknow message while creating a new user (and probably other modal / button interaction) ([86619c6](https://github.com/Dicelette/discord-dicelette/commit/86619c6a0b5bd5903d4f9e3b3b5398fd5778679b))
* unknown message while creating a new user (and probably other modal / button interaction) ([4a7e9f0](https://github.com/Dicelette/discord-dicelette/commit/4a7e9f04a8177d426e036fe774ad8512490e77d7))

## [1.42.3](https://github.com/Dicelette/discord-dicelette/compare/1.42.2...1.42.3) (2025-03-30)


### Bug Fixes

* **interactions:** handle expired interactions and add permission checks for modal replies ([4dced5a](https://github.com/Dicelette/discord-dicelette/commit/4dced5a7475eeaa51e7d68615eb0ae92d796ea94))
* **logging:** improve error logging format and add ephemeral replies for user feedback ([51f1a10](https://github.com/Dicelette/discord-dicelette/commit/51f1a105139ff6be1edb43667ae4b02bb0c1e141))

## [1.42.2](https://github.com/Dicelette/discord-dicelette/compare/1.42.1...1.42.2) (2025-03-16)


### Bug Fixes

* **channels:** enhance channel type checks to exclude non-text channels ([920f6f3](https://github.com/Dicelette/discord-dicelette/commit/920f6f3eab3eb6c49b0351f9ccc885c2ed90b3b7))
* **configuration:** remove unused disabledLogs variable ([bbd0a4d](https://github.com/Dicelette/discord-dicelette/commit/bbd0a4d60f338ed729a1276a0cd0f71a8e5921cd))
* **dependencies:** update discord.js to latest version ([f547642](https://github.com/Dicelette/discord-dicelette/commit/f547642b42fd2b290d60ef133fab4e903be24211))
* **embeds:** specify message type as Djs.Message<boolean> ([a7f488f](https://github.com/Dicelette/discord-dicelette/commit/a7f488fc1858e31762ca5fcfbb3a23ea4633d201))
* **errors:** add missing permission error messages for bot access ([e69da26](https://github.com/Dicelette/discord-dicelette/commit/e69da2618287515c925ff0bd64537e55df09cf70))
* remove log ([045acaf](https://github.com/Dicelette/discord-dicelette/commit/045acaf280c3cf97f9907b22cfd2d83a0475f5c9))
* **reply:** ensure proper handling of reply options for edited responses ([491e1dc](https://github.com/Dicelette/discord-dicelette/commit/491e1dcfa5f162751fc703ca7999eedea53d1bf9))

## [1.42.1](https://github.com/Dicelette/discord-dicelette/compare/1.42.0...1.42.1) (2025-03-04)


### Bug Fixes

* **whitespace:** starting with the space for align ([ccb8aa3](https://github.com/Dicelette/discord-dicelette/commit/ccb8aa32a75360309f9af3ca0f81e77c3b63f02b))

## [1.42.0](https://github.com/Dicelette/discord-dicelette/compare/1.41.2...1.42.0) (2025-02-23)


### Features

* **help:** enhance help message with new configuration options and commands ([c8b17b3](https://github.com/Dicelette/discord-dicelette/commit/c8b17b30b1aa439db8ee2f3758d23bf95e084aec))

## [1.41.2](https://github.com/Dicelette/discord-dicelette/compare/1.41.1...1.41.2) (2025-02-22)


### Bug Fixes

* **configuration:** add option to disable thread creation and refactor related functions ([a37dc02](https://github.com/Dicelette/discord-dicelette/commit/a37dc02e8f8587ccb2378714b5f50e8b42407a1a))

## [1.41.1](https://github.com/Dicelette/discord-dicelette/compare/1.41.0...1.41.1) (2025-02-18)

## [1.41.0](https://github.com/Dicelette/discord-dicelette/compare/1.40.0...1.41.0) (2025-02-18)


### Features

* **error-handling:** improve error reporting with detailed messages ([08f698a](https://github.com/Dicelette/discord-dicelette/commit/08f698a18904712aade1bd270b0ae6540d235690))


### Bug Fixes

* **stats:edit:** combination starting with number is not a NaN ([233374a](https://github.com/Dicelette/discord-dicelette/commit/233374a3b08069c64a9dd4b4486225cae10fff9c))

## [1.40.0](https://github.com/Dicelette/discord-dicelette/compare/1.39.1...1.40.0) (2025-02-12)


### Features

* **dice:** support for dollars values in expression ([b2d6b43](https://github.com/Dicelette/discord-dicelette/commit/b2d6b43a0dd0f0065532e803d983d41f35d5fa66))

## [1.39.1](https://github.com/Dicelette/discord-dicelette/compare/1.39.0...1.39.1) (2025-02-12)


### Bug Fixes

* **dice:** expression should be also converted even used in {exp} ([9fec858](https://github.com/Dicelette/discord-dicelette/commit/9fec858c0dce36183ecb65f9e87c951b2f24ae35))
* **dice:** use {exp} to prevent colliding with {{exp}} stats name ([3732260](https://github.com/Dicelette/discord-dicelette/commit/373226062fb91c0e71ab979874ac53167a39e96d))
* **roll:** evaluate expressions in dice rolls and update modificator handling ([43a9697](https://github.com/Dicelette/discord-dicelette/commit/43a9697eea402f0688638b225c840de807c8a8e2))

## [1.39.0](https://github.com/Dicelette/discord-dicelette/compare/1.38.2...1.39.0) (2025-02-11)


### Features

* **dbd:** allow using {{exp}} in dice for replace with the expression ([719d883](https://github.com/Dicelette/discord-dicelette/commit/719d88357712d534f85428110f674790560f5d73))


### Bug Fixes

* **buttons:** button disappear when register dice ([7cfdf44](https://github.com/Dicelette/discord-dicelette/commit/7cfdf443a4f8a93ec751755034d38b06671da17c))
* **i18n:** translation not found ([44bf1e9](https://github.com/Dicelette/discord-dicelette/commit/44bf1e9ed185aaaef5f379246874d97bfdbde0a8))
* if the select menu disappear, make it appear with the button ([f69a154](https://github.com/Dicelette/discord-dicelette/commit/f69a15457a8e6bd86de81a2cef76dd9edbd715bf))

## [1.38.2](https://github.com/Dicelette/discord-dicelette/compare/1.38.1...1.38.2) (2025-02-11)


### Bug Fixes

* **interaction:** make resetButton asynchronous and improve select handling ([d407024](https://github.com/Dicelette/discord-dicelette/commit/d4070241b52fcc59efd8ffa9d5b5e9988595860d))

## [1.38.1](https://github.com/Dicelette/discord-dicelette/compare/1.38.0...1.38.1) (2025-02-11)


### Bug Fixes

* **dice:records:** in first records, embed was not updated ([a63b84c](https://github.com/Dicelette/discord-dicelette/commit/a63b84c0e55ed3216c232c51e98e33b38a13459e))

## [1.38.0](https://github.com/Dicelette/discord-dicelette/compare/1.37.0...1.38.0) (2025-02-11)


### Features

* **logger:** improve logging format and add deleteByMessageIds function ([513189a](https://github.com/Dicelette/discord-dicelette/commit/513189a84dba18eb8383bbe329cffbea1bd61982))
* **validation:** update error message for user not found and improve condition for hidden output ([a281943](https://github.com/Dicelette/discord-dicelette/commit/a281943cc990fb0ae7debb4991045909cf430f40))


### Bug Fixes

* **avatar:** validate avatar URL ([2fba310](https://github.com/Dicelette/discord-dicelette/commit/2fba3108fe644135658f6ae8978b0494556a2408))

## [1.37.0](https://github.com/Dicelette/discord-dicelette/compare/1.36.0...1.37.0) (2025-02-11)


### Features

* **channelName:** allow to detect emoji while channel starts with special ascii characters ([57e4f44](https://github.com/Dicelette/discord-dicelette/commit/57e4f44322596dcb432c7bddebe117147bb038a7))
* **timer:** better displaying time ([ec5f4fe](https://github.com/Dicelette/discord-dicelette/commit/ec5f4fef473209bf42ccb0c60b74ed3a41c258fe))


### Bug Fixes

* **avatar:** discord use different domains for media/cdn ([e5173e8](https://github.com/Dicelette/discord-dicelette/commit/e5173e842c0e9273f6833003c789ec3fed5bab77))
* char is not iterable ([8fc36ea](https://github.com/Dicelette/discord-dicelette/commit/8fc36eaa72572a51251bf946ce23fc0416a7a540))

## [1.36.0](https://github.com/Dicelette/discord-dicelette/compare/1.34.2...1.36.0) (2025-02-05)


### Features

* **avatar:** allow using cdn image ! ([778b254](https://github.com/Dicelette/discord-dicelette/commit/778b254fcae7ad7e6b98f9db738db6e426a90449))

## [1.35.0](https://github.com/Dicelette/discord-dicelette/compare/1.34.2...1.35.0) (2025-02-05)


### Features

* **avatar:** allow using cdn image ! ([778b254](https://github.com/Dicelette/discord-dicelette/commit/778b254fcae7ad7e6b98f9db738db6e426a90449))

## [1.35.0](https://github.com/Dicelette/discord-dicelette/compare/1.34.2...1.35.0) (2025-02-05)


### Features

* **avatar:** allow using cdn image ! ([778b254](https://github.com/Dicelette/discord-dicelette/commit/778b254fcae7ad7e6b98f9db738db6e426a90449))

## [1.34.2](https://github.com/Dicelette/discord-dicelette/compare/1.34.1...1.34.2) (2025-02-05)


### Bug Fixes

* disable ping on graph (asked by user) ([44b193e](https://github.com/Dicelette/discord-dicelette/commit/44b193e8f960685b9e4d57053a1aea048123759e))

## [1.34.1](https://github.com/Dicelette/discord-dicelette/compare/1.35.0...1.34.1) (2025-01-13)


### Bug Fixes

* **diceRoll:** do not trimAll in baseRoll (because it breaks comments!) ([02712e5](https://github.com/Dicelette/discord-dicelette/commit/02712e5446078bd49ed2035caa80f38bca9afa7c))
* forgot to remove a param in rollWithInteraction ([9f3dd4c](https://github.com/Dicelette/discord-dicelette/commit/9f3dd4c842981655236c776f43a97e0a7f7e32aa))
* **send:** urgent fix - wrong message deleted ([6ff718b](https://github.com/Dicelette/discord-dicelette/commit/6ff718bdefa1bcda67cb07e0ac661e7329c3c28a))

## [1.35.0](https://github.com/Dicelette/discord-dicelette/compare/1.34.0...1.35.0) (2025-01-03)


### Features

* **calc:** set calc result as other roll, allowing better "forwarding" with anchor and logUrl ([499d5dd](https://github.com/Dicelette/discord-dicelette/commit/499d5ddaaf937021837fee45bf8d37ddb9d21070))
* if the server have a template ⇒ enable by default the commands ID when the bot is ready ([73748eb](https://github.com/Dicelette/discord-dicelette/commit/73748ebb7a8cb0021166033b492a8f40d4243c2d))

## [1.33.0](https://github.com/Dicelette/discord-dicelette/compare/1.32.0...1.33.0) (2024-12-31)


### Features

* **commands:** improve sign handling in roll and calc commands ([9c6eb7d](https://github.com/Dicelette/discord-dicelette/commit/9c6eb7df65bf3f052ffff87f45afdabcd5562152))

## [1.31.0](https://github.com/Dicelette/discord-dicelette/compare/1.30.2...1.31.0) (2024-12-31)


### Features

* **calc:** enhance calc sign with allowing >= and ⩾ ascii ([37cc9a1](https://github.com/Dicelette/discord-dicelette/commit/37cc9a1a4b3dec855541e65fd6892e600ed8b32a))


### Bug Fixes

* **calc:** uniformize when rolling the expression ([d91f5a1](https://github.com/Dicelette/discord-dicelette/commit/d91f5a18adc58b107bfb269908d4ed3c3e022a03))

## [1.30.2](https://github.com/Dicelette/discord-dicelette/compare/1.31.0...1.30.2) (2024-12-30)


### Bug Fixes

* **calc:** better result in chained expression ([9f65ff8](https://github.com/Dicelette/discord-dicelette/commit/9f65ff8c35579d0329d2707989baa4b41d0e682b))

## [1.31.0](https://github.com/Dicelette/discord-dicelette/compare/1.29.0...1.31.0) (2024-12-30)


### Features

* **calc:** add calc commands based on statistics ([6260c34](https://github.com/Dicelette/discord-dicelette/commit/6260c34aa1e30e2eb26cf27e15482f2743c230fb))
* **utils:** integrate capitalizeParenthesis for enhanced text formatting ([96a1586](https://github.com/Dicelette/discord-dicelette/commit/96a1586555ccce3584e398fd8dbffe4cae4f2c4c))


### Bug Fixes

* **bot:** enhance dice roll with stat replacement ([1b82161](https://github.com/Dicelette/discord-dicelette/commit/1b8216109a9910fb1217672ac5bbd9a66bb16c5d))
* **db:** move uniformization of user records to correct location ([a9f2edc](https://github.com/Dicelette/discord-dicelette/commit/a9f2edc0473612ef991adcbd20ea3d7c636ac2d0))
* **diceRoll:** affectskill should only works if dollarsValue is defined ([da22ba1](https://github.com/Dicelette/discord-dicelette/commit/da22ba1f3cec6cecf2840eef6b2aee817f308ba3))
* **diceRoll:** comments for dice allowing "&" and main comments ([c970115](https://github.com/Dicelette/discord-dicelette/commit/c970115ddac64beb45b3943e39187ed7d76d857a))
* **parse-result:** do not add the comparator if the symbol for not is here ([c83226f](https://github.com/Dicelette/discord-dicelette/commit/c83226ff6f3d8cafe70a2dc795a97ef6476d1f29))
* **parse-result:** enhanced the comments handling of shared rolls ([eb90736](https://github.com/Dicelette/discord-dicelette/commit/eb907362ded6edda643c270c82d0ca151c50a2ad))
* **parse-result:** finally i fixed these too much space in res ([dc99507](https://github.com/Dicelette/discord-dicelette/commit/dc9950758944e7a14ca4684514cdc42794e50f2c))
* **parse-result:** message for success should only be used on "exact" result ([5f257e8](https://github.com/Dicelette/discord-dicelette/commit/5f257e8bfb45d953326123331088b8c8bc6ec54d))
* **parse-result:** modify the message formatting in `result_as_text.ts` to ensure `successOrFailure` is prepended correctly ([5dffb86](https://github.com/Dicelette/discord-dicelette/commit/5dffb8655715415b9b805755dcb5028dd27fbc8d))
* **parse-result:** should keeps the comments between [] as if ([69d1ef5](https://github.com/Dicelette/discord-dicelette/commit/69d1ef5db1eec22ca80fe4029dcd4232d6adac4f))
* **parse-result:** trimAll on roll commands ([49a8166](https://github.com/Dicelette/discord-dicelette/commit/49a8166ef56fe3f5234821d92f9bdac18abe383f))
* **roll:** ensure comparator is checked before processing dollarValue ([5a64c7d](https://github.com/Dicelette/discord-dicelette/commit/5a64c7d0419bb090d5649c68808a648491c650b4))
* **template:** add missing space in embed message ([d3aab8f](https://github.com/Dicelette/discord-dicelette/commit/d3aab8f3f74ecd71020d0c9ba83547274805d19d))
* **utils:** enhance `capitalizeBetweenPunct` function ([59e3c5e](https://github.com/Dicelette/discord-dicelette/commit/59e3c5e39299a5911774a95036207905612d67b8))

## [1.30.1](https://github.com/Dicelette/discord-dicelette/compare/1.29.0...1.30.1) (2024-12-15)


### Features

* **utils:** integrate capitalizeParenthesis for enhanced text formatting ([96a1586](https://github.com/Dicelette/discord-dicelette/commit/96a1586555ccce3584e398fd8dbffe4cae4f2c4c))


### Bug Fixes

* **bot:** enhance dice roll with stat replacement ([1b82161](https://github.com/Dicelette/discord-dicelette/commit/1b8216109a9910fb1217672ac5bbd9a66bb16c5d))
* **db:** move uniformization of user records to correct location ([a9f2edc](https://github.com/Dicelette/discord-dicelette/commit/a9f2edc0473612ef991adcbd20ea3d7c636ac2d0))
* **roll:** ensure comparator is checked before processing dollarValue ([5a64c7d](https://github.com/Dicelette/discord-dicelette/commit/5a64c7d0419bb090d5649c68808a648491c650b4))
* **template:** add missing space in embed message ([d3aab8f](https://github.com/Dicelette/discord-dicelette/commit/d3aab8f3f74ecd71020d0c9ba83547274805d19d))
* **utils:** enhance `capitalizeBetweenPunct` function ([59e3c5e](https://github.com/Dicelette/discord-dicelette/commit/59e3c5e39299a5911774a95036207905612d67b8))

## [1.30.0](https://github.com/Dicelette/discord-dicelette/compare/1.24.0...1.30.0) (2024-12-13)


### Features

* **dbroll:** allow to exclude a statistiques from dbroll ([d3e551f](https://github.com/Dicelette/discord-dicelette/commit/d3e551fa4452cf5f72ddc1c9e57cc7dedc1d59b5))
* **parse-result:** enhance compareValue to format originalDice output ([238caaa](https://github.com/Dicelette/discord-dicelette/commit/238caaa8ba3a2dd999be0e06d1a052a6660d4544))
* **parse-result:** replace roll function with getRoll in custom critical ([a75e6da](https://github.com/Dicelette/discord-dicelette/commit/a75e6da4db704f142bf89239cfb3df47ea393433))
* **parser:** improve handling of custom critical rolls and comparisons ([89e5f78](https://github.com/Dicelette/discord-dicelette/commit/89e5f782f88776b955d654e830c381709c5e43e0))
* refactor custom critical handling in embeds ([40da490](https://github.com/Dicelette/discord-dicelette/commit/40da49036f83bdb8564fb82f3fe970c075989d36))
* **roll:** add exclusion of specific statistics ([7fbd036](https://github.com/Dicelette/discord-dicelette/commit/7fbd036106fe2e54e18dd0bcf114ecbc07cf3522))
* **roll:** enhance dice roll logic with dynamic modificators and comparaison ([fe93226](https://github.com/Dicelette/discord-dicelette/commit/fe93226e276682341680c3160dbf1cbb2dc774db))
* update dotenv configuration for production environment ([d72d6a1](https://github.com/Dicelette/discord-dicelette/commit/d72d6a1dee6074a2f99c66a9da486546feed9509))
* **utils:** add isNumber utility function for value validation ([ad200a2](https://github.com/Dicelette/discord-dicelette/commit/ad200a2d9401113e0bdb15762c713296d8e1e372))


### Bug Fixes

* **commands:** correct client parameter in bulkDeleteCharacters call ([50e86fb](https://github.com/Dicelette/discord-dicelette/commit/50e86fb11e1b04a52e87c5955020c3438258ceba))
* **custom_critical:** correct value assignment in custom critical logic ([ea7827f](https://github.com/Dicelette/discord-dicelette/commit/ea7827feaf80ac9c44e3f69bc9ccf0661390b408))
* **custom-critical:** allow dice also in custom critical compared to a dice to be rolled (prevent also errors :clown:) ([249146c](https://github.com/Dicelette/discord-dicelette/commit/249146c6fecfa2719458d81048858f8afc4471b2))
* **custom-critical:** fix name trimmed in the database and also the affect skill and onNatural dice that have no effect ([5e9c1f2](https://github.com/Dicelette/discord-dicelette/commit/5e9c1f20f6cec7f70824fd6deb0a3f780e262188))
* **delete:** delete message and memory DB ([4f435e1](https://github.com/Dicelette/discord-dicelette/commit/4f435e1bf1baa5c9c27c289477821b354fba5904))
* **edit:** bulk edit memory when editing template ([cb15d29](https://github.com/Dicelette/discord-dicelette/commit/cb15d297dfecf203b36e1bbe51fdc423f5bd8a6a))
* improve critical hit handling and modify import paths ([b0b2176](https://github.com/Dicelette/discord-dicelette/commit/b0b21763eec10345c3132321edd5efa3c78c513c))
* **memory-database:** make updateCharactersDb call awaitable in thread message handling ([c2e5707](https://github.com/Dicelette/discord-dicelette/commit/c2e5707ace7a6fd08772dddbbae5eb16e70c2acb))
* **parse-result:** add custom critical value evaluation in the /dbd ([a351c7e](https://github.com/Dicelette/discord-dicelette/commit/a351c7e8d3c00939860b5c4022fd20098b350c9d))
* **parse-result:** handle undefined statistics in convertNameToValue function ([e70edae](https://github.com/Dicelette/discord-dicelette/commit/e70edaeb071fe25d1d166e127d7e674e7fcceaa9))
* **parse-result:** handle when cc used without $ value & allow them ([8fd5b8a](https://github.com/Dicelette/discord-dicelette/commit/8fd5b8a9abcd3742f1fcc3b240395faff57caf5a))
* **skill:** improve dice validation and parsing in bot ([bfc5522](https://github.com/Dicelette/discord-dicelette/commit/bfc5522d1c13dc7833e700159c239330e04aceb0))
* **utils:** add uniformization for record keys and values ([56cf1f7](https://github.com/Dicelette/discord-dicelette/commit/56cf1f71f65d3e44d9d15273245026a77153a2b0))
* **validation:** correct logic for stat value number check ([60d8455](https://github.com/Dicelette/discord-dicelette/commit/60d84557bd5e399fdae5b69e40df9537871830a3))
* wrong data dir in enmap ([6fc00a8](https://github.com/Dicelette/discord-dicelette/commit/6fc00a8a98fcdc1ef60a9b6dae661193d9f11340))

## [1.29.0](https://github.com/Dicelette/discord-dicelette/compare/1.24.0...1.29.0) (2024-12-13)


### Features

* **dbroll:** allow to exclude a statistiques from dbroll ([d3e551f](https://github.com/Dicelette/discord-dicelette/commit/d3e551fa4452cf5f72ddc1c9e57cc7dedc1d59b5))
* **parse-result:** enhance compareValue to format originalDice output ([238caaa](https://github.com/Dicelette/discord-dicelette/commit/238caaa8ba3a2dd999be0e06d1a052a6660d4544))
* **parse-result:** replace roll function with getRoll in custom critical ([a75e6da](https://github.com/Dicelette/discord-dicelette/commit/a75e6da4db704f142bf89239cfb3df47ea393433))
* **parser:** improve handling of custom critical rolls and comparisons ([89e5f78](https://github.com/Dicelette/discord-dicelette/commit/89e5f782f88776b955d654e830c381709c5e43e0))
* refactor custom critical handling in embeds ([40da490](https://github.com/Dicelette/discord-dicelette/commit/40da49036f83bdb8564fb82f3fe970c075989d36))
* **roll:** add exclusion of specific statistics ([7fbd036](https://github.com/Dicelette/discord-dicelette/commit/7fbd036106fe2e54e18dd0bcf114ecbc07cf3522))
* **roll:** enhance dice roll logic with dynamic modificators and comparaison ([fe93226](https://github.com/Dicelette/discord-dicelette/commit/fe93226e276682341680c3160dbf1cbb2dc774db))
* update dotenv configuration for production environment ([d72d6a1](https://github.com/Dicelette/discord-dicelette/commit/d72d6a1dee6074a2f99c66a9da486546feed9509))
* **utils:** add isNumber utility function for value validation ([ad200a2](https://github.com/Dicelette/discord-dicelette/commit/ad200a2d9401113e0bdb15762c713296d8e1e372))


### Bug Fixes

* **commands:** correct client parameter in bulkDeleteCharacters call ([50e86fb](https://github.com/Dicelette/discord-dicelette/commit/50e86fb11e1b04a52e87c5955020c3438258ceba))
* **custom_critical:** correct value assignment in custom critical logic ([ea7827f](https://github.com/Dicelette/discord-dicelette/commit/ea7827feaf80ac9c44e3f69bc9ccf0661390b408))
* **custom-critical:** allow dice also in custom critical compared to a dice to be rolled (prevent also errors :clown:) ([249146c](https://github.com/Dicelette/discord-dicelette/commit/249146c6fecfa2719458d81048858f8afc4471b2))
* **custom-critical:** fix name trimmed in the database and also the affect skill and onNatural dice that have no effect ([5e9c1f2](https://github.com/Dicelette/discord-dicelette/commit/5e9c1f20f6cec7f70824fd6deb0a3f780e262188))
* **delete:** delete message and memory DB ([4f435e1](https://github.com/Dicelette/discord-dicelette/commit/4f435e1bf1baa5c9c27c289477821b354fba5904))
* **edit:** bulk edit memory when editing template ([cb15d29](https://github.com/Dicelette/discord-dicelette/commit/cb15d297dfecf203b36e1bbe51fdc423f5bd8a6a))
* improve critical hit handling and modify import paths ([b0b2176](https://github.com/Dicelette/discord-dicelette/commit/b0b21763eec10345c3132321edd5efa3c78c513c))
* **memory-database:** make updateCharactersDb call awaitable in thread message handling ([c2e5707](https://github.com/Dicelette/discord-dicelette/commit/c2e5707ace7a6fd08772dddbbae5eb16e70c2acb))
* **parse-result:** add custom critical value evaluation in the /dbd ([a351c7e](https://github.com/Dicelette/discord-dicelette/commit/a351c7e8d3c00939860b5c4022fd20098b350c9d))
* **parse-result:** handle undefined statistics in convertNameToValue function ([e70edae](https://github.com/Dicelette/discord-dicelette/commit/e70edaeb071fe25d1d166e127d7e674e7fcceaa9))
* **parse-result:** handle when cc used without $ value & allow them ([8fd5b8a](https://github.com/Dicelette/discord-dicelette/commit/8fd5b8a9abcd3742f1fcc3b240395faff57caf5a))
* **skill:** improve dice validation and parsing in bot ([bfc5522](https://github.com/Dicelette/discord-dicelette/commit/bfc5522d1c13dc7833e700159c239330e04aceb0))
* **utils:** add uniformization for record keys and values ([56cf1f7](https://github.com/Dicelette/discord-dicelette/commit/56cf1f71f65d3e44d9d15273245026a77153a2b0))
* **validation:** correct logic for stat value number check ([60d8455](https://github.com/Dicelette/discord-dicelette/commit/60d84557bd5e399fdae5b69e40df9537871830a3))
* wrong data dir in enmap ([6fc00a8](https://github.com/Dicelette/discord-dicelette/commit/6fc00a8a98fcdc1ef60a9b6dae661193d9f11340))

## [1.27.0](https://github.com/Dicelette/discord-dicelette/compare/1.24.0...1.27.0) (2024-12-12)


### Features

* **parse-result:** enhance compareValue to format originalDice output ([238caaa](https://github.com/Dicelette/discord-dicelette/commit/238caaa8ba3a2dd999be0e06d1a052a6660d4544))
* **parse-result:** replace roll function with getRoll in custom critical ([a75e6da](https://github.com/Dicelette/discord-dicelette/commit/a75e6da4db704f142bf89239cfb3df47ea393433))
* **parser:** improve handling of custom critical rolls and comparisons ([89e5f78](https://github.com/Dicelette/discord-dicelette/commit/89e5f782f88776b955d654e830c381709c5e43e0))
* refactor custom critical handling in embeds ([40da490](https://github.com/Dicelette/discord-dicelette/commit/40da49036f83bdb8564fb82f3fe970c075989d36))
* **roll:** enhance dice roll logic with dynamic modificators and comparaison ([fe93226](https://github.com/Dicelette/discord-dicelette/commit/fe93226e276682341680c3160dbf1cbb2dc774db))
* update dotenv configuration for production environment ([d72d6a1](https://github.com/Dicelette/discord-dicelette/commit/d72d6a1dee6074a2f99c66a9da486546feed9509))
* **utils:** add isNumber utility function for value validation ([ad200a2](https://github.com/Dicelette/discord-dicelette/commit/ad200a2d9401113e0bdb15762c713296d8e1e372))


### Bug Fixes

* **commands:** correct client parameter in bulkDeleteCharacters call ([50e86fb](https://github.com/Dicelette/discord-dicelette/commit/50e86fb11e1b04a52e87c5955020c3438258ceba))
* **custom_critical:** correct value assignment in custom critical logic ([ea7827f](https://github.com/Dicelette/discord-dicelette/commit/ea7827feaf80ac9c44e3f69bc9ccf0661390b408))
* **custom-critical:** allow dice also in custom critical compared to a dice to be rolled (prevent also errors :clown:) ([249146c](https://github.com/Dicelette/discord-dicelette/commit/249146c6fecfa2719458d81048858f8afc4471b2))
* **custom-critical:** fix name trimmed in the database and also the affect skill and onNatural dice that have no effect ([5e9c1f2](https://github.com/Dicelette/discord-dicelette/commit/5e9c1f20f6cec7f70824fd6deb0a3f780e262188))
* **delete:** delete message and memory DB ([4f435e1](https://github.com/Dicelette/discord-dicelette/commit/4f435e1bf1baa5c9c27c289477821b354fba5904))
* **edit:** bulk edit memory when editing template ([cb15d29](https://github.com/Dicelette/discord-dicelette/commit/cb15d297dfecf203b36e1bbe51fdc423f5bd8a6a))
* improve critical hit handling and modify import paths ([b0b2176](https://github.com/Dicelette/discord-dicelette/commit/b0b21763eec10345c3132321edd5efa3c78c513c))
* **memory-database:** make updateCharactersDb call awaitable in thread message handling ([c2e5707](https://github.com/Dicelette/discord-dicelette/commit/c2e5707ace7a6fd08772dddbbae5eb16e70c2acb))
* **parse-result:** add custom critical value evaluation in the /dbd ([a351c7e](https://github.com/Dicelette/discord-dicelette/commit/a351c7e8d3c00939860b5c4022fd20098b350c9d))
* **parse-result:** handle undefined statistics in convertNameToValue function ([e70edae](https://github.com/Dicelette/discord-dicelette/commit/e70edaeb071fe25d1d166e127d7e674e7fcceaa9))
* **parse-result:** handle when cc used without $ value & allow them ([8fd5b8a](https://github.com/Dicelette/discord-dicelette/commit/8fd5b8a9abcd3742f1fcc3b240395faff57caf5a))
* **skill:** improve dice validation and parsing in bot ([bfc5522](https://github.com/Dicelette/discord-dicelette/commit/bfc5522d1c13dc7833e700159c239330e04aceb0))
* wrong data dir in enmap ([6fc00a8](https://github.com/Dicelette/discord-dicelette/commit/6fc00a8a98fcdc1ef60a9b6dae661193d9f11340))

## [1.26.0](https://github.com/Dicelette/discord-dicelette/compare/1.24.0...1.26.0) (2024-12-12)


### Features

* **parse-result:** enhance compareValue to format originalDice output ([238caaa](https://github.com/Dicelette/discord-dicelette/commit/238caaa8ba3a2dd999be0e06d1a052a6660d4544))
* **parse-result:** replace roll function with getRoll in custom critical ([a75e6da](https://github.com/Dicelette/discord-dicelette/commit/a75e6da4db704f142bf89239cfb3df47ea393433))
* **parser:** improve handling of custom critical rolls and comparisons ([89e5f78](https://github.com/Dicelette/discord-dicelette/commit/89e5f782f88776b955d654e830c381709c5e43e0))
* refactor custom critical handling in embeds ([40da490](https://github.com/Dicelette/discord-dicelette/commit/40da49036f83bdb8564fb82f3fe970c075989d36))
* **roll:** enhance dice roll logic with dynamic modificators and comparaison ([fe93226](https://github.com/Dicelette/discord-dicelette/commit/fe93226e276682341680c3160dbf1cbb2dc774db))
* update dotenv configuration for production environment ([d72d6a1](https://github.com/Dicelette/discord-dicelette/commit/d72d6a1dee6074a2f99c66a9da486546feed9509))
* **utils:** add isNumber utility function for value validation ([ad200a2](https://github.com/Dicelette/discord-dicelette/commit/ad200a2d9401113e0bdb15762c713296d8e1e372))


### Bug Fixes

* **commands:** correct client parameter in bulkDeleteCharacters call ([50e86fb](https://github.com/Dicelette/discord-dicelette/commit/50e86fb11e1b04a52e87c5955020c3438258ceba))
* **custom_critical:** correct value assignment in custom critical logic ([ea7827f](https://github.com/Dicelette/discord-dicelette/commit/ea7827feaf80ac9c44e3f69bc9ccf0661390b408))
* **custom-critical:** allow dice also in custom critical compared to a dice to be rolled (prevent also errors :clown:) ([249146c](https://github.com/Dicelette/discord-dicelette/commit/249146c6fecfa2719458d81048858f8afc4471b2))
* **custom-critical:** fix name trimmed in the database and also the affect skill and onNatural dice that have no effect ([5e9c1f2](https://github.com/Dicelette/discord-dicelette/commit/5e9c1f20f6cec7f70824fd6deb0a3f780e262188))
* **delete:** delete message and memory DB ([4f435e1](https://github.com/Dicelette/discord-dicelette/commit/4f435e1bf1baa5c9c27c289477821b354fba5904))
* **edit:** bulk edit memory when editing template ([cb15d29](https://github.com/Dicelette/discord-dicelette/commit/cb15d297dfecf203b36e1bbe51fdc423f5bd8a6a))
* improve critical hit handling and modify import paths ([b0b2176](https://github.com/Dicelette/discord-dicelette/commit/b0b21763eec10345c3132321edd5efa3c78c513c))
* **memory-database:** make updateCharactersDb call awaitable in thread message handling ([c2e5707](https://github.com/Dicelette/discord-dicelette/commit/c2e5707ace7a6fd08772dddbbae5eb16e70c2acb))
* **parse-result:** add custom critical value evaluation in the /dbd ([a351c7e](https://github.com/Dicelette/discord-dicelette/commit/a351c7e8d3c00939860b5c4022fd20098b350c9d))
* **parse-result:** handle undefined statistics in convertNameToValue function ([e70edae](https://github.com/Dicelette/discord-dicelette/commit/e70edaeb071fe25d1d166e127d7e674e7fcceaa9))
* **skill:** improve dice validation and parsing in bot ([bfc5522](https://github.com/Dicelette/discord-dicelette/commit/bfc5522d1c13dc7833e700159c239330e04aceb0))
* wrong data dir in enmap ([6fc00a8](https://github.com/Dicelette/discord-dicelette/commit/6fc00a8a98fcdc1ef60a9b6dae661193d9f11340))

## [1.25.0](https://github.com/Dicelette/discord-dicelette/compare/1.24.0...1.25.0) (2024-12-09)


### Features

* update dotenv configuration for production environment ([d72d6a1](https://github.com/Dicelette/discord-dicelette/commit/d72d6a1dee6074a2f99c66a9da486546feed9509))


### Bug Fixes

* **skill:** improve dice validation and parsing in bot ([bfc5522](https://github.com/Dicelette/discord-dicelette/commit/bfc5522d1c13dc7833e700159c239330e04aceb0))

## [1.24.0](https://github.com/Dicelette/discord-dicelette/compare/1.23.0...1.24.0) (2024-12-09)


### Features

* **build:** automate version synchronization with postrelease script ([ecdb694](https://github.com/Dicelette/discord-dicelette/commit/ecdb694e22630e960ecc12c1e62ba3fda7a334e9))
* **logger:** enhance logging configuration and add pretty log styles ([a03f23b](https://github.com/Dicelette/discord-dicelette/commit/a03f23bb218049ccef6d1e9eb2cc901323fee225))
* **logging:** replace console.error and console.warn with logger ([468dfda](https://github.com/Dicelette/discord-dicelette/commit/468dfda77a41b7c3fe5753931484747f7d88a59d))
* **tests:** add test for result within a simple roll ([1c2cc33](https://github.com/Dicelette/discord-dicelette/commit/1c2cc330b932838024275c12dabcc2113a9563a1))


### Bug Fixes

* change console.log to console.info for version update message ([f093704](https://github.com/Dicelette/discord-dicelette/commit/f0937043a2ead3e965a069bc89bc5ed82d953a53))
* **memory-database:** prevent fatal error when no message are found for cache completion ([54674f9](https://github.com/Dicelette/discord-dicelette/commit/54674f91f07c793d7709f771aa8f192e034cc155))

## [1.23.0](https://github.com/Dicelette/discord-dicelette/compare/1.22.0...1.23.0) (2024-12-08)


### Features

* **memory-database:** use a enmap "memory" database to store all user-characters, speed up a lot the bot in the roll process. ([befd6ee](https://github.com/Dicelette/discord-dicelette/commit/befd6ee7f9bcdfd48980765b2042e84bafd9ed8f))
