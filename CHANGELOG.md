# Changelog

All notable changes to this project will be documented in this file. See [commit-and-tag-version](https://github.com/absolute-version/commit-and-tag-version) for commit guidelines.

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
