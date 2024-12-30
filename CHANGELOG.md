# Changelog

All notable changes to this project will be documented in this file. See [commit-and-tag-version](https://github.com/absolute-version/commit-and-tag-version) for commit guidelines.

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
