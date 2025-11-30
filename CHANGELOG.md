# Changelog

All notable changes to this project will be documented in this file. See [commit-and-tag-version](https://github.com/absolute-version/commit-and-tag-version) for commit guidelines.

## [2.22.2](https://github.com/Dicelette/discord-dicelette/compare/2.22.1...2.22.2) (2025-11-30)


### Bug Fixes

* ensure user ID is valid and not a webhook in saveCount function ([d761a5a](https://github.com/Dicelette/discord-dicelette/commit/d761a5a4d9cb3a62b19ed7335bf3a99f1a559c90))
* id not found in mp ([cd58af5](https://github.com/Dicelette/discord-dicelette/commit/cd58af53ee26a0edfe283e9c3c47126a5bfdd6c6))
* interaction.guild.id doesn't exists in MP ([033c0c2](https://github.com/Dicelette/discord-dicelette/commit/033c0c28468981a07d1cf6b6aa66a9b7641bb4d4))
* total = 0 ([a0d65b1](https://github.com/Dicelette/discord-dicelette/commit/a0d65b15e9a10921688f006c7952dfc783049e89))
* total is undefined ([ecfd6fd](https://github.com/Dicelette/discord-dicelette/commit/ecfd6fd2d8d54a6d97cf4b1dc4c800bff7bb204e))
* undefined success ([0a1d047](https://github.com/Dicelette/discord-dicelette/commit/0a1d04762233a1e290c8121d3d8d0cbe93b11fb8))

## [2.22.1](https://github.com/Dicelette/discord-dicelette/compare/2.22.0...2.22.1) (2025-11-28)


### Bug Fixes

* Centralized command helpers, autocomplete, and interaction context ([0726907](https://github.com/Dicelette/discord-dicelette/commit/072690769300fa70ac202cbb69a2bf9afff9f745))

## [2.22.0](https://github.com/Dicelette/discord-dicelette/compare/2.21.0...2.22.0) (2025-11-28)


### Features

* **snippets:** allow to import snippets from a JSON file ([81043c8](https://github.com/Dicelette/discord-dicelette/commit/81043c8090ef5e1d076ca67456dfb16c1ec35d55))

## [2.21.0](https://github.com/Dicelette/discord-dicelette/compare/2.20.0...2.21.0) (2025-11-25)


### Features

* add `karma reset` if needed ([9774907](https://github.com/Dicelette/discord-dicelette/commit/9774907944737daba6251a467c5b748b4f8a685c))


### Bug Fixes

* cannot read of undefined "statsname" ([4047bd3](https://github.com/Dicelette/discord-dicelette/commit/4047bd39cfd7c8c80841675eb2a1b743e7d7146a))
* message sending logic for chunked replies ([6daff3e](https://github.com/Dicelette/discord-dicelette/commit/6daff3e757f97a28514188f4c9f64887196043e1))
* reply already replied ([231f96a](https://github.com/Dicelette/discord-dicelette/commit/231f96a3bde65200e01e3d58ac2572b056142f74))

## [2.20.0](https://github.com/Dicelette/discord-dicelette/compare/2.19.0...2.20.0) (2025-11-23)


### Features

* use the real name for statistics when found ([be239e1](https://github.com/Dicelette/discord-dicelette/commit/be239e185f7af621d5f87a2a14adcd212ebe1a69))

## [2.19.0](https://github.com/Dicelette/discord-dicelette/compare/2.18.1...2.19.0) (2025-11-22)


### Features

* allow threshold in macro & snippets ([6a060a3](https://github.com/Dicelette/discord-dicelette/commit/6a060a38ea2df2399eb8eb1de1cb5deea21a0d48))


### Bug Fixes

* should support at last expression in shared rolls in snippets ([fd5ca1d](https://github.com/Dicelette/discord-dicelette/commit/fd5ca1de502cd4a10a81b089a8a20a75a94cdd13))

## [2.18.1](https://github.com/Dicelette/discord-dicelette/compare/2.18.0...2.18.1) (2025-11-22)


### Bug Fixes

* **expr:** should not display the `+0` or `-0` ([4887dd2](https://github.com/Dicelette/discord-dicelette/commit/4887dd281e73867ee1c8106ae175ee64433f6da4))

## [2.18.0](https://github.com/Dicelette/discord-dicelette/compare/2.17.2...2.18.0) (2025-11-22)


### Features

* add snippets functionality for creating, deleting, and listing user-defined macros ([b721657](https://github.com/Dicelette/discord-dicelette/commit/b721657eef0a4fa658f57a053411aef115b99e09))
* autodelete usersettings when needed ([29805f1](https://github.com/Dicelette/discord-dicelette/commit/29805f17143c503c339aff0616e31e01a0c55660))


### Bug Fixes

* sanitize string values in context menus ([158d64e](https://github.com/Dicelette/discord-dicelette/commit/158d64e29c11361232ef92127fda79f2d383218b))

## [2.17.2](https://github.com/Dicelette/discord-dicelette/compare/2.17.1...2.17.2) (2025-11-22)


### Bug Fixes

* typo ([12ee6cf](https://github.com/Dicelette/discord-dicelette/commit/12ee6cf0f8f466989db2fae212c5584bab318078))

## [2.17.1](https://github.com/Dicelette/discord-dicelette/compare/2.17.0...2.17.1) (2025-11-22)

## [2.17.0](https://github.com/Dicelette/discord-dicelette/compare/2.16.0...2.17.0) (2025-11-22)


### Features

* allow to set char even if not registered using the `[@tag](https://github.com/tag)` ([9a0a36d](https://github.com/Dicelette/discord-dicelette/commit/9a0a36dfb3ce54581c77c8b61fb14ee1869a52b7))

## [2.16.0](https://github.com/Dicelette/discord-dicelette/compare/2.15.0...2.16.0) (2025-11-21)


### Features

* implement template rendering with improved token replacement and context handling ([7829572](https://github.com/Dicelette/discord-dicelette/commit/7829572c7d8b1207c4902aa5648eef4b2568a791))

## [2.15.0](https://github.com/Dicelette/discord-dicelette/compare/2.14.3...2.15.0) (2025-11-21)


### Features

* enhance template functionality with character and original dice support ([e4fff64](https://github.com/Dicelette/discord-dicelette/commit/e4fff643c79023b2c1adeaf3955ca98481c74026))

## [2.14.3](https://github.com/Dicelette/discord-dicelette/compare/2.14.2...2.14.3) (2025-11-21)

## [2.14.2](https://github.com/Dicelette/discord-dicelette/compare/2.14.1...2.14.2) (2025-11-21)

## [2.14.1](https://github.com/Dicelette/discord-dicelette/compare/2.14.0...2.14.1) (2025-11-21)


### Bug Fixes

* **context-menus:** switch results to dice accordingly ([19e2c83](https://github.com/Dicelette/discord-dicelette/commit/19e2c837bb5d22f422384cdcd1af22bf161a84d6))

## [2.14.0](https://github.com/Dicelette/discord-dicelette/compare/2.13.3...2.14.0) (2025-11-21)


### Features

* add user settings command for creating and displaying the link created by the context menu ([5eb6ccb](https://github.com/Dicelette/discord-dicelette/commit/5eb6ccb92efc052a1fd58cc3cba65d74123bc66c))

## [2.13.3](https://github.com/Dicelette/discord-dicelette/compare/2.13.2...2.13.3) (2025-11-18)


### Bug Fixes

* typo in setDescriptions method ([9d50e91](https://github.com/Dicelette/discord-dicelette/commit/9d50e91621a974bf4cf0250ebd11e53cb2dabeeb))

## [2.13.2](https://github.com/Dicelette/discord-dicelette/compare/2.13.1...2.13.2) (2025-11-18)


### Bug Fixes

* typo in choose description ([8799e95](https://github.com/Dicelette/discord-dicelette/commit/8799e951c0cf2e35b44051b6433c36f6df902868))

## [2.13.1](https://github.com/Dicelette/discord-dicelette/compare/2.13.0...2.13.1) (2025-11-18)

## [2.13.0](https://github.com/Dicelette/discord-dicelette/compare/2.12.0...2.13.0) (2025-11-18)


### Features

* add a select/choose in a list commands ([6b2a84f](https://github.com/Dicelette/discord-dicelette/commit/6b2a84f68bec52933088e97435717d257654d81c))
* update to node crypto engine for better number generation ([5e6a543](https://github.com/Dicelette/discord-dicelette/commit/5e6a543da86f29ae648ab119a1cb45c840ed73d3))

## [2.12.0](https://github.com/Dicelette/discord-dicelette/compare/2.11.3...2.12.0) (2025-11-03)


### Features

* remove followup with the commands, as you can copy codeblock in mobile ([1c60fed](https://github.com/Dicelette/discord-dicelette/commit/1c60fedda03de2e95f37cf80d16f0c5217d2217f))

## [2.11.3](https://github.com/Dicelette/discord-dicelette/compare/2.11.2...2.11.3) (2025-11-02)


### Bug Fixes

* correct page number in modal title ([52312c5](https://github.com/Dicelette/discord-dicelette/commit/52312c54ce42409901a7685ef0af29cbc49492a8))

## [2.11.2](https://github.com/Dicelette/discord-dicelette/compare/2.11.1...2.11.2) (2025-11-01)


### Bug Fixes

* crash when config is not found ([33d9d48](https://github.com/Dicelette/discord-dicelette/commit/33d9d480688cf3bc2e6102fe1ead59b50b0c7783))

## [2.11.1](https://github.com/Dicelette/discord-dicelette/compare/2.11.0...2.11.1) (2025-11-01)


### Bug Fixes

* update member access verification and handle private user data in interactions ([d33c55f](https://github.com/Dicelette/discord-dicelette/commit/d33c55ff093a1800e727557d3d2f24d444f60623))
* wrong path for linux ([07fc061](https://github.com/Dicelette/discord-dicelette/commit/07fc0615be98ecaabdfe3e96a19fab17c1d8ff20))

## [2.11.0](https://github.com/Dicelette/discord-dicelette/compare/2.10.8...2.11.0) (2025-10-31)


### Features

* enhance interaction handling and button functionality with new moderation options ([ed444c9](https://github.com/Dicelette/discord-dicelette/commit/ed444c90ebdf2d0a6986bc4d3fa3899374bc5c0d))


### Bug Fixes

* correct import path for localization module in button functionality ([649cda3](https://github.com/Dicelette/discord-dicelette/commit/649cda39e0d044343f131fe9d09b0d06627e345e))
* improve avatar file handling and validation in user interactions ([3e8c184](https://github.com/Dicelette/discord-dicelette/commit/3e8c184053d442c8093ae9e111a169c2a9514ad0))

## [2.10.8](https://github.com/Dicelette/discord-dicelette/compare/2.10.7...2.10.8) (2025-10-31)


### Bug Fixes

* synchronize user template with guild settings and remove unused utility ([d083553](https://github.com/Dicelette/discord-dicelette/commit/d0835535b68c8409f74eec3b46b4f8c6f13af2e1))

## [2.10.7](https://github.com/Dicelette/discord-dicelette/compare/2.10.6...2.10.7) (2025-10-31)

## [2.10.6](https://github.com/Dicelette/discord-dicelette/compare/2.10.5...2.10.6) (2025-10-31)


### Bug Fixes

* wrong error message ([3666b55](https://github.com/Dicelette/discord-dicelette/commit/3666b5597b4563225e7b0965d5528f699518dd06))

## [2.10.5](https://github.com/Dicelette/discord-dicelette/compare/2.10.4...2.10.5) (2025-10-31)

## [2.10.4](https://github.com/Dicelette/discord-dicelette/compare/2.10.3...2.10.4) (2025-10-30)


### Bug Fixes

* update avatar thumbnail handling to clear if links include discord CDN ([5db3917](https://github.com/Dicelette/discord-dicelette/commit/5db391777ebb9d0af070bfd148647c5df292c46d))

## [2.10.3](https://github.com/Dicelette/discord-dicelette/compare/2.10.2...2.10.3) (2025-10-30)


### Bug Fixes

* adjust pagination logic and update footer for last page in modals ([783eb61](https://github.com/Dicelette/discord-dicelette/commit/783eb61e03053760d531f703d9a6abc8b97202fb))

## [2.10.2](https://github.com/Dicelette/discord-dicelette/compare/2.10.1...2.10.2) (2025-10-30)

## [2.10.1](https://github.com/Dicelette/discord-dicelette/compare/2.10.0...2.10.1) (2025-10-30)

## [2.10.0](https://github.com/Dicelette/discord-dicelette/compare/2.9.0...2.10.0) (2025-10-30)


### Features

* enhance avatar handling by allowing attachment uploads and improving error handling ([684baeb](https://github.com/Dicelette/discord-dicelette/commit/684baeb5d6c61938d4f6a393727b9df7c10caf09))


### Bug Fixes

* improve avatar error handling by updating error messages and refining URL validation ([3fbfeac](https://github.com/Dicelette/discord-dicelette/commit/3fbfeac05ca094f3d0d2c48645ffd1e8981b1c61))
* remove redundant cleanUrl option in getUserFromInteraction call ([aa2484f](https://github.com/Dicelette/discord-dicelette/commit/aa2484f00fd73395347a9551a291d4f908e8ab6f))
* update charUserOptions and edit command to improve option descriptions and error handling ([1874ef9](https://github.com/Dicelette/discord-dicelette/commit/1874ef96ba6e41dcd9176a6e9715265de0ecf2fe))
* update reuploadAvatar function to include translation support and enhance error avatar handling ([65a1316](https://github.com/Dicelette/discord-dicelette/commit/65a1316fd28e4d238d3a2a649200626da7190337))

## [2.9.0](https://github.com/Dicelette/discord-dicelette/compare/2.8.1...2.9.0) (2025-10-29)


### Features

* allow to upload avatar instead to use a link outside of discord ([2562a92](https://github.com/Dicelette/discord-dicelette/commit/2562a921c8f8ef258e1c04dc3bcbd39c3fbf7d6f))
* implement avatar reupload functionality and improve avatar handling in display logic ([e001718](https://github.com/Dicelette/discord-dicelette/commit/e001718e3eb7411720508eed3b63c98134e8cd26))

## [2.8.1](https://github.com/Dicelette/discord-dicelette/compare/2.8.0...2.8.1) (2025-10-28)


### Bug Fixes

* enhance moderation cancellation with user notification and utility functions ([f3c0ef8](https://github.com/Dicelette/discord-dicelette/commit/f3c0ef89c75a820233e0fbef2331519632964e6a))

## [2.8.0](https://github.com/Dicelette/discord-dicelette/compare/2.7.0...2.8.0) (2025-10-28)


### Features

* adjust the display of "simple send dice" ([b5ef01a](https://github.com/Dicelette/discord-dicelette/commit/b5ef01a5d93d8691c7ef0064baedb7d9f6146305))
* better processing of custom critical and display value ([0aab83b](https://github.com/Dicelette/discord-dicelette/commit/0aab83b94fdd41ad35661184d9b3a8cdf596418b))
* implement moderation for dice edits and validations ([feb56fb](https://github.com/Dicelette/discord-dicelette/commit/feb56fb885a2cc101277bfd501e0d3ddc33ebefb))


### Bug Fixes

* enhance timer descriptions and error handling in translations ([0b4950d](https://github.com/Dicelette/discord-dicelette/commit/0b4950d788e471a6a3bc6d146347446e6c41d074))
* should not keep the CC that continue to contains `$` ([48fed51](https://github.com/Dicelette/discord-dicelette/commit/48fed51ff7ad379893d73e5e683418c43acf3fae))

## [2.7.0](https://github.com/Dicelette/discord-dicelette/compare/2.6.3...2.7.0) (2025-10-20)


### Features

* add activities commands for admin only (private server) ([5c64805](https://github.com/Dicelette/discord-dicelette/commit/5c64805438dd100bd0d7127d507f2223d04fe3b5))

## [2.6.3](https://github.com/Dicelette/discord-dicelette/compare/2.6.2...2.6.3) (2025-10-18)


### Bug Fixes

* **editMe:** allow reset to default ([84a8fa6](https://github.com/Dicelette/discord-dicelette/commit/84a8fa6e27b6884c6d14ec8eb8b8b6bbb461c114))

## [2.6.2](https://github.com/Dicelette/discord-dicelette/compare/2.6.1...2.6.2) (2025-10-18)

## [2.6.1](https://github.com/Dicelette/discord-dicelette/compare/2.6.0...2.6.1) (2025-10-18)


### Bug Fixes

* update error messages for template not found scenarios ([183e50d](https://github.com/Dicelette/discord-dicelette/commit/183e50d78400a1467cf1c2640d9cae03c679a19d))

## [2.6.0](https://github.com/Dicelette/discord-dicelette/compare/2.5.0...2.6.0) (2025-10-17)


### Features

* add editMe command to update bot profile information ([8d7f68d](https://github.com/Dicelette/discord-dicelette/commit/8d7f68d0fa8e8b6b2fef2fb483183c8bf1ca2692))

## [2.5.0](https://github.com/Dicelette/discord-dicelette/compare/2.4.1...2.5.0) (2025-10-16)


### Features

* add mp_roll command for private channel usage and update roll command contexts ([3f9638f](https://github.com/Dicelette/discord-dicelette/commit/3f9638fa37aed226813aece500fc01d37201d7ee))

## [2.4.1](https://github.com/Dicelette/discord-dicelette/compare/2.4.0...2.4.1) (2025-10-14)


### Bug Fixes

* improve channel validation and response handling in send function ([32e79b8](https://github.com/Dicelette/discord-dicelette/commit/32e79b8a0de5713421750c7dc74ee6426a75dfc9))

## [2.4.0](https://github.com/Dicelette/discord-dicelette/compare/2.3.7...2.4.0) (2025-10-14)


### Features

* allow simple roll in DM ([00451d7](https://github.com/Dicelette/discord-dicelette/commit/00451d7f1acc78942b9dea516fb52775893a4f85))


### Bug Fixes

* enhance variable matching regex and improve formula processing ([cbf2e62](https://github.com/Dicelette/discord-dicelette/commit/cbf2e62f413c5c259f6696920487207ee9a5a72e))
* implement parseComparator function and update interaction handling ([eb9d6a9](https://github.com/Dicelette/discord-dicelette/commit/eb9d6a91dfffd8cd0485f04bd34756815d70bd59))
* remove debug console logs from base_roll and dice_extractor ([424da9a](https://github.com/Dicelette/discord-dicelette/commit/424da9af795129af3b72a1429134919a874d1580))
* remove unnecessary config object from fetch function return ([bb9578a](https://github.com/Dicelette/discord-dicelette/commit/bb9578aba67f0aec4ea1e7776c94a1e9811d7eca))

## [2.3.7](https://github.com/Dicelette/discord-dicelette/compare/2.3.6...2.3.7) (2025-10-11)


### Bug Fixes

* the autocomplete should be based on the client instead of the guild lang ([243b566](https://github.com/Dicelette/discord-dicelette/commit/243b566741570b0ee6adcfe2d4d29109669e5abd))

## [2.3.6](https://github.com/Dicelette/discord-dicelette/compare/2.3.5...2.3.6) (2025-10-11)


### Bug Fixes

* translation for transform ([bdc8bba](https://github.com/Dicelette/discord-dicelette/commit/bdc8bbae19b36d387c0fa1dedcd7609be8e2395c))

## [2.3.5](https://github.com/Dicelette/discord-dicelette/compare/2.3.4...2.3.5) (2025-10-10)


### Bug Fixes

* **modals:** use modals from discord 14.23 ([cc4d71d](https://github.com/Dicelette/discord-dicelette/commit/cc4d71da68a30cff1a7e530d9e192b8a9be0432d))
* **record:** improve avatar fetching logic and channel selection (should be used when the user is a moderator) ([f5b7990](https://github.com/Dicelette/discord-dicelette/commit/f5b7990c4e6945f876c6043f7c2996ed7a3b2f2e))
* **record:** update avatar verification to return null for empty avatar ([a9d6e8f](https://github.com/Dicelette/discord-dicelette/commit/a9d6e8fdbea754ef5c76a51b4ffc97acacb859ba))
* **record:** update user and channel input handling in modals ([f005670](https://github.com/Dicelette/discord-dicelette/commit/f0056707ecbe4e65b5ada79e37adeec6d2c89efe))
* **user:** they are too much condition where we want to get the user if we can ([03affbc](https://github.com/Dicelette/discord-dicelette/commit/03affbce36ecb25aac4b87e6b6485691489b6fa5))

## [2.3.4](https://github.com/Dicelette/discord-dicelette/compare/2.3.3...2.3.4) (2025-10-08)


### Bug Fixes

* **contextMenu:** improve line matching logic and remove duplicate partial ([21b9d19](https://github.com/Dicelette/discord-dicelette/commit/21b9d1962a351e23afae659bad52ab290399f40c))

## [2.3.3](https://github.com/Dicelette/discord-dicelette/compare/2.3.2...2.3.3) (2025-10-08)

## [2.3.2](https://github.com/Dicelette/discord-dicelette/compare/2.3.1...2.3.2) (2025-10-07)


### Bug Fixes

* **roll:** should get the critical roll when available in /roll ([6ff921f](https://github.com/Dicelette/discord-dicelette/commit/6ff921f236fd39cde711aaf23c92e125ac4505f0))

## [2.3.1](https://github.com/Dicelette/discord-dicelette/compare/2.3.0...2.3.1) (2025-09-26)

## [2.3.0](https://github.com/Dicelette/discord-dicelette/compare/2.2.3...2.3.0) (2025-09-24)


### Features

* **luckmeter:** add ephemeral ([c5b4466](https://github.com/Dicelette/discord-dicelette/commit/c5b446640ae2fcf624c1340ffa29196be83b4455))

## [2.2.3](https://github.com/Dicelette/discord-dicelette/compare/2.2.2...2.2.3) (2025-09-20)

## [2.2.2](https://github.com/Dicelette/discord-dicelette/compare/2.2.1...2.2.2) (2025-09-16)


### Bug Fixes

* should send error in DM to not flood the channels when an error appear ([3de2478](https://github.com/Dicelette/discord-dicelette/commit/3de2478dd0321f99e2fea0d768b88fcd538ea12e))

## [2.2.1](https://github.com/Dicelette/discord-dicelette/compare/2.2.0...2.2.1) (2025-09-16)


### Bug Fixes

* add fetchAvatarUrl utility and update avatar handling across modules ([8540560](https://github.com/Dicelette/discord-dicelette/commit/854056019d43b26d7d18ca40af4a447070ad26d0))
* total should not includes critical as they are already counted in they respective things ([431460b](https://github.com/Dicelette/discord-dicelette/commit/431460b39670fd384226084429d8135ffc65a017))
* total should not includes critical as they are already counted in they respective things ([cfb149e](https://github.com/Dicelette/discord-dicelette/commit/cfb149e2d8caf542366845109287f8c2bfcb0578))
* typo that broke translation description in user ([be42cdb](https://github.com/Dicelette/discord-dicelette/commit/be42cdb67b98815b9c6a51f58f65931e15ecac1c))

## [2.2.0](https://github.com/Dicelette/discord-dicelette/compare/2.1.0...2.2.0) (2025-09-12)


### Features

* add "total" rolls to have the number of roll done in the server ([9320860](https://github.com/Dicelette/discord-dicelette/commit/9320860982f8713d9438a1738091f68e913a45bb))
* enhance leaderboard functionality to display all options when none selected ([7535426](https://github.com/Dicelette/discord-dicelette/commit/75354263d6031a44a10a7818d4e8836c969b3d3a))


### Bug Fixes

* add support for displaying custom critical settings in the embed and diceType ([3b4b8cb](https://github.com/Dicelette/discord-dicelette/commit/3b4b8cb692d0676506667538f476ed9e87a98a7c))
* ensure critical count is only deleted if it exists on user quit ([5064633](https://github.com/Dicelette/discord-dicelette/commit/506463353ca7100bc3d8d855d2d35e030c16a3ca))
* export critical count functions and clean up imports ([77e303b](https://github.com/Dicelette/discord-dicelette/commit/77e303bf46f085cf49f0539880851dd34695d18a))
* should not display the server custom critical if they are not the same as the diceType ([9ad333e](https://github.com/Dicelette/discord-dicelette/commit/9ad333ee7191e72c118c0ae695aaef382bef6841))

## [2.1.0](https://github.com/Dicelette/discord-dicelette/compare/2.0.2...2.1.0) (2025-09-08)


### Features

* add tools function: luck_meter ([6bb0b72](https://github.com/Dicelette/discord-dicelette/commit/6bb0b728a00319544e2b894fb071c265df091165))


### Bug Fixes

* clean critical blocks from dice content during processing ([b348dba](https://github.com/Dicelette/discord-dicelette/commit/b348dbae32a672233fe5599ff427bd8d4faddd65))
* ensure proper parsing of custom value in natural dice evaluation ([b6402eb](https://github.com/Dicelette/discord-dicelette/commit/b6402eb82cdc3e4a3b64e929624434725ccefe32))
* **on_message_send:** text cc not recognized ([f31014b](https://github.com/Dicelette/discord-dicelette/commit/f31014bd5daf9d9bf221eefb430066ef53f6ad6a))
* should return early when no result found ([1d38bf1](https://github.com/Dicelette/discord-dicelette/commit/1d38bf105b38afc1d765d3c4cb4ab35b16ed44ac))
* should roll for bulked roll again ([d6c1557](https://github.com/Dicelette/discord-dicelette/commit/d6c1557266c10baaf09344c6026832c12eaf0939))

## [2.0.2](https://github.com/Dicelette/discord-dicelette/compare/2.0.1...2.0.2) (2025-08-17)


### Bug Fixes

* correct templateID check and update documentation formatting ([97e1b52](https://github.com/Dicelette/discord-dicelette/commit/97e1b52dfc449f299de019f7fe694592d0852c84))
* message broken ([c336a47](https://github.com/Dicelette/discord-dicelette/commit/c336a47b84a60ae87a80c36872526ef66c002f56))

## [2.0.1](https://github.com/Dicelette/discord-dicelette/compare/2.0.0...2.0.1) (2025-08-14)

## [2.0.0](https://github.com/Dicelette/discord-dicelette/compare/1.65.0...2.0.0) (2025-08-14)


### ⚠ BREAKING CHANGES

* the dbd command doesn't exists anymore, user need to use /macro instead of.

### Features

* rename DBD to macro ([f02f16e](https://github.com/Dicelette/discord-dicelette/commit/f02f16ece60f3d9453407491cf5cb0c161a7ae6b))

## [1.65.0](https://github.com/Dicelette/discord-dicelette/compare/1.64.5...1.65.0) (2025-08-14)


### Features

* base roll should works the same as parsing message content ([5fb8c78](https://github.com/Dicelette/discord-dicelette/commit/5fb8c7864ebbac9c6287374b415db52040026a6b))

## [1.64.5](https://github.com/Dicelette/discord-dicelette/compare/1.64.4...1.64.5) (2025-08-12)

## [1.64.4](https://github.com/Dicelette/discord-dicelette/compare/1.64.3...1.64.4) (2025-08-12)


### Bug Fixes

* should not be 0 when the number is under 10 ([c0604ab](https://github.com/Dicelette/discord-dicelette/commit/c0604ab968aaff1488ef7170ab2aa23d1aa9fa59))

## [1.64.3](https://github.com/Dicelette/discord-dicelette/compare/1.64.2...1.64.3) (2025-08-12)


### Bug Fixes

* can't display negative result ([553ce9f](https://github.com/Dicelette/discord-dicelette/commit/553ce9fc644c01b41c226c68ffa31d59288fd0d5))
* fetch as text ([71c68c4](https://github.com/Dicelette/discord-dicelette/commit/71c68c4e2e4aaad3f3c0776ff692cc138640b62f))

## [1.64.2](https://github.com/Dicelette/discord-dicelette/compare/1.64.1...1.64.2) (2025-08-03)


### Bug Fixes

* bad env for Math constants ([9a01672](https://github.com/Dicelette/discord-dicelette/commit/9a016725015ea683298b9db39282398459e98a2e))

## [1.64.1](https://github.com/Dicelette/discord-dicelette/compare/1.64.0...1.64.1) (2025-08-01)


### Bug Fixes

* comments not set when using with stats ([3797521](https://github.com/Dicelette/discord-dicelette/commit/37975216dea0c01138c5a978f59b393b7ddebf2a))

## [1.64.0](https://github.com/Dicelette/discord-dicelette/compare/1.63.0...1.64.0) (2025-08-01)


### Features

* add character name support to dice roll processing ([c18e06d](https://github.com/Dicelette/discord-dicelette/commit/c18e06da698931ca3d3814c79f2b83c608a4e1c1))
* add support for info stats comments and refactor comment extraction logic ([efa8a64](https://github.com/Dicelette/discord-dicelette/commit/efa8a64a32f8f9333a197daab962cb3bd6395fb9))
* enhance dice roll processing with infoRoll support and refactor user data handling ([97f8c8d](https://github.com/Dicelette/discord-dicelette/commit/97f8c8d976acf2ff3411e0a7e8dc1f4d0ef9610e))
* enhance user data handling and improve comment formatting ([666505d](https://github.com/Dicelette/discord-dicelette/commit/666505d79cbf851075d936a830730e49afcfd9da))
* integrate user data into dice roll processing and result formatting ([7536b0d](https://github.com/Dicelette/discord-dicelette/commit/7536b0df53b135cc771f36ce458293a03dcb7008))
* remove character name parameter from dice roll functions ([600b934](https://github.com/Dicelette/discord-dicelette/commit/600b934b79ec841f9168f90cfffedb6905df52af))
* update comment processing logic and improve test assertions for dice rolls ([aaff09a](https://github.com/Dicelette/discord-dicelette/commit/aaff09a91c91290e79c3f75008c134b9179815be))


### Bug Fixes

* should not processed dice between code (`1d20`) ([fec2af8](https://github.com/Dicelette/discord-dicelette/commit/fec2af8a05055b7f89e92e1356645dbe75e3bb9a))

## [1.63.0](https://github.com/Dicelette/discord-dicelette/compare/1.62.1...1.63.0) (2025-07-31)


### Features

* add support for custom critical in template ([80dee14](https://github.com/Dicelette/discord-dicelette/commit/80dee1458092e7e9ecfd49eff6f44673e0fa827d))
* add user data integration for dice rolls and character retrieval ([7a284d6](https://github.com/Dicelette/discord-dicelette/commit/7a284d6393f95bb08120baae06bf40fe2b78bb4b))

## [1.62.1](https://github.com/Dicelette/discord-dicelette/compare/1.62.0...1.62.1) (2025-07-30)


### Bug Fixes

* **customCritical:** `Invalid left hand side of assignment operator` when using `=` instead of `==` ([0e7851b](https://github.com/Dicelette/discord-dicelette/commit/0e7851bda8f8bb2c09036abb1682a2346a3d6644))

## [1.62.0](https://github.com/Dicelette/discord-dicelette/compare/1.61.1...1.62.0) (2025-07-29)


### Features

* prevent quickest moderator to validate until the user mark it as "confirmed" ([220abed](https://github.com/Dicelette/discord-dicelette/commit/220abed2fec90dc2e4e1801365a803f4ad4a351d))


### Bug Fixes

* handle JSON parse error when cancellation ([21f085a](https://github.com/Dicelette/discord-dicelette/commit/21f085ae9d6730cd673338359671772b075d970f))

## [1.61.1](https://github.com/Dicelette/discord-dicelette/compare/1.61.0...1.61.1) (2025-07-28)


### Bug Fixes

* should delete input if ([012ba3f](https://github.com/Dicelette/discord-dicelette/commit/012ba3fedd24db7cc903ce11f29d7e1bedddcb55))

## [1.61.0](https://github.com/Dicelette/discord-dicelette/compare/1.60.0...1.61.0) (2025-07-27)


### Features

* **selfRegister:** enhance validation process with modal support and footer data handling ([515868d](https://github.com/Dicelette/discord-dicelette/commit/515868de1049faa1556b8c5f15f5ccbef85893c9))


### Bug Fixes

* crash with private allowed only for moderator ([44b5d63](https://github.com/Dicelette/discord-dicelette/commit/44b5d6337b4b8a37a8f9e6623d0e7ac3035db303))
* displaying of the self registration configuration ([b1ed88b](https://github.com/Dicelette/discord-dicelette/commit/b1ed88b5db32bad5eae2f70f9cd3d349c5262e36))
* only moderator should be allowed to move an user to another ([c0a8151](https://github.com/Dicelette/discord-dicelette/commit/c0a8151daeed8b7bb5d848ef1f24f40cc8b645e8))

## [1.60.0](https://github.com/Dicelette/discord-dicelette/compare/1.59.3...1.60.0) (2025-07-26)


### Features

* add an "update template" commands to quick update without re-registering the channels. ([c808658](https://github.com/Dicelette/discord-dicelette/commit/c8086580f3c3287c43480ee742fe470212d4e45d))

## [1.59.3](https://github.com/Dicelette/discord-dicelette/compare/1.59.2...1.59.3) (2025-07-25)

## [1.59.2](https://github.com/Dicelette/discord-dicelette/compare/1.59.1...1.59.2) (2025-07-25)


### Bug Fixes

* messageId is the first in the list ; not the last. ([b4ae012](https://github.com/Dicelette/discord-dicelette/commit/b4ae0120e932a765ec2fc50494ca00069666668e))

## [1.59.1](https://github.com/Dicelette/discord-dicelette/compare/1.59.0...1.59.1) (2025-07-24)

## [1.59.0](https://github.com/Dicelette/discord-dicelette/compare/1.58.0...1.59.0) (2025-07-21)


### Features

* add `invert` option for some system ([85225c1](https://github.com/Dicelette/discord-dicelette/commit/85225c1506810dbdeae4f6a5f5bc8a5640e15511))

## [1.58.0](https://github.com/Dicelette/discord-dicelette/compare/1.57.0...1.58.0) (2025-07-13)


### Features

* add EMOJI_MATH constant and update return statements to include it ([40441e5](https://github.com/Dicelette/discord-dicelette/commit/40441e5b9aa4dd09eaeb2cb226d9c1f8d61ddf6d))

## [1.57.0](https://github.com/Dicelette/discord-dicelette/compare/1.56.3...1.57.0) (2025-07-11)


### Features

* add onDebug and onWarn event handlers to logger ([770e23c](https://github.com/Dicelette/discord-dicelette/commit/770e23ca8a33597b43f91c889df6ec033e75a590))


### Bug Fixes

* typo during refractor broke cmd ([07108c3](https://github.com/Dicelette/discord-dicelette/commit/07108c375357b5b0ba7c587308da600e207f0ce6))

## [1.56.3](https://github.com/Dicelette/discord-dicelette/compare/1.56.2...1.56.3) (2025-07-04)

## [1.56.2](https://github.com/Dicelette/discord-dicelette/compare/1.56.1...1.56.2) (2025-07-04)


### Bug Fixes

* await in fetchChannel ([9d4a9cf](https://github.com/Dicelette/discord-dicelette/commit/9d4a9cf412e4889a64014200c11edeedbccc1852))
* **cache:** duplicate key translation create a cascading issue in french ([fe3b227](https://github.com/Dicelette/discord-dicelette/commit/fe3b2270f639d7dfbddffb90414194b6d74673ff))
* **dbd:** missing translation ([0d87190](https://github.com/Dicelette/discord-dicelette/commit/0d87190995c33b611e988b6e983778869abfabea))
* **registration:** duplicate found even if the diceEmbed is empty ([f858a2f](https://github.com/Dicelette/discord-dicelette/commit/f858a2f6b5fc1cd6c1ad217855f40e85fe6bf968))

## [1.56.1](https://github.com/Dicelette/discord-dicelette/compare/1.56.0...1.56.1) (2025-07-04)


### Bug Fixes

* **diceNotFound:** I dunno why but in some condition, the template is not fully fetched on user resulting in cache error. ([1dd6be0](https://github.com/Dicelette/discord-dicelette/commit/1dd6be006d56d8f98cfaadea03bbd571dc744388))

## [1.56.0](https://github.com/Dicelette/discord-dicelette/compare/1.55.0...1.56.0) (2025-07-03)


### Features

* add strip_ooc option to remove out-of-characters messages, and other improvements ([1ccbe33](https://github.com/Dicelette/discord-dicelette/commit/1ccbe335374a0ca40ca00bc48600093c6f69c34b))
* **config:** enhance display command with general and template subcommands ([b9cb377](https://github.com/Dicelette/discord-dicelette/commit/b9cb37749e37ebd9a757ed5ad130a462e5968592))
* **stripOOC:** add thread mode option for OOC deletion configuration ([9694448](https://github.com/Dicelette/discord-dicelette/commit/9694448593774ec3fffdcef8f4b49e3714fa4f10))

## [1.55.0](https://github.com/Dicelette/discord-dicelette/compare/1.54.3...1.55.0) (2025-06-27)


### Features

* add aide changelog ([33f9bbd](https://github.com/Dicelette/discord-dicelette/commit/33f9bbd615ca47acbbe85d1561d51f4e16459226))

## [1.54.3](https://github.com/Dicelette/discord-dicelette/compare/1.54.2...1.54.3) (2025-06-26)


### Bug Fixes

* fetch user when not found in cache ([e8d345d](https://github.com/Dicelette/discord-dicelette/commit/e8d345db3a8c78253bc09aafcb1a733c74fa04fb))
* total exceeded should be accurate ([cb6c28d](https://github.com/Dicelette/discord-dicelette/commit/cb6c28d3076aff700ad216e0749a5dd2ca589169))

## [1.54.2](https://github.com/Dicelette/discord-dicelette/compare/1.54.1...1.54.2) (2025-06-22)


### Bug Fixes

* help message doesn't send right as they are pretty long ([76669e2](https://github.com/Dicelette/discord-dicelette/commit/76669e2fd56baa42db63e587515878e92f244268))

## [1.54.1](https://github.com/Dicelette/discord-dicelette/compare/1.54.0...1.54.1) (2025-06-22)


### Bug Fixes

* user shouldn't be allowed to set a private sheet ([80962de](https://github.com/Dicelette/discord-dicelette/commit/80962de9530964efd3387d550540e72389b7b206))

## [1.54.0](https://github.com/Dicelette/discord-dicelette/compare/1.53.1...1.54.0) (2025-06-22)


### Features

* disallow channel with self register ([09f1cc3](https://github.com/Dicelette/discord-dicelette/commit/09f1cc3a99c2eb24b812b4b684c393d6abc53a44))


### Bug Fixes

* private channel should not be allowed if private channel is not set ([be08927](https://github.com/Dicelette/discord-dicelette/commit/be08927f1bbf3d6610545af0ba5499c90aebfc0c))
* remaining value not accurate ([c168085](https://github.com/Dicelette/discord-dicelette/commit/c168085e99b3d1e54eaa03c6a8e593229aab7007))

## [1.53.1](https://github.com/Dicelette/discord-dicelette/compare/1.53.0...1.53.1) (2025-06-22)

## [1.53.0](https://github.com/Dicelette/discord-dicelette/compare/1.52.0...1.53.0) (2025-06-22)


### Features

* opposition roll option in dice ([6a49ec2](https://github.com/Dicelette/discord-dicelette/commit/6a49ec22b3f08970a80bb694a5b86559479af125))

## [1.52.0](https://github.com/Dicelette/discord-dicelette/compare/1.51.1...1.52.0) (2025-06-21)


### Features

* remove restriction on adding a template & add it when template is deleted ([ea61eb2](https://github.com/Dicelette/discord-dicelette/commit/ea61eb2e0568fcb1feeb2970e7685b57d0cb5e0e))


### Bug Fixes

* allow to get cs and cf ([00b547c](https://github.com/Dicelette/discord-dicelette/commit/00b547ce698dc8a02239cfd4eec96786f61211dc))
* use const for restricted command name ([3e959f0](https://github.com/Dicelette/discord-dicelette/commit/3e959f043deb3d639663214943c8fd3da9fbff90))

## [1.51.1](https://github.com/Dicelette/discord-dicelette/compare/1.51.0...1.51.1) (2025-06-19)


### Bug Fixes

* **dbroll:** forgot to remove the detect critical before parsing the comparator ([f824942](https://github.com/Dicelette/discord-dicelette/commit/f824942aef63d1ccc60b5a835cedb11175e7d3d3))

## [1.51.0](https://github.com/Dicelette/discord-dicelette/compare/1.50.1...1.51.0) (2025-06-19)


### Features

* custom critical per dice roll with `{(*)c(sf):(sign)(number)}` syntax. ([ba55c42](https://github.com/Dicelette/discord-dicelette/commit/ba55c4231e727bbcaa1fdf8c9a1031df7a298855))


### Bug Fixes

* **damage:** allow overriding template dice when registering an user (aka fix duplicate) ([9d09c94](https://github.com/Dicelette/discord-dicelette/commit/9d09c94fad95462a946b4abef7094d30597ad6b6))
* **damage:** on duplicate value registered with damage dice, allow to override a existing value ([035a9ef](https://github.com/Dicelette/discord-dicelette/commit/035a9ef6c4c4e85473f0fbe987e65ff765b123f8))
* roll custom critical if they are dice ([702a131](https://github.com/Dicelette/discord-dicelette/commit/702a1312ad1219c54b5ca47123c54c080f353cf0))

## [1.50.1](https://github.com/Dicelette/discord-dicelette/compare/1.50.0...1.50.1) (2025-06-15)

## [1.50.0](https://github.com/Dicelette/discord-dicelette/compare/1.49.0...1.50.0) (2025-06-14)


### Features

* **allowSelf:** add option where moderator needs to validate the sheet ([64fb496](https://github.com/Dicelette/discord-dicelette/commit/64fb496f6fffbe35d6bfbfe54eee6162974b0d56))

## [1.49.0](https://github.com/Dicelette/discord-dicelette/compare/1.48.4...1.49.0) (2025-06-14)


### Features

* allow force distribution of points ([085b11e](https://github.com/Dicelette/discord-dicelette/commit/085b11e07a9680b4d8c36d3bc935c269e135ad04))

## [1.48.4](https://github.com/Dicelette/discord-dicelette/compare/1.48.3...1.48.4) (2025-06-13)

## [1.48.3](https://github.com/Dicelette/discord-dicelette/compare/1.48.2...1.48.3) (2025-06-11)


### Bug Fixes

* **on-message:** regression with "comments" on normal dice (like `1d20 hello` or `1d20 # hello`) ([410f5c0](https://github.com/Dicelette/discord-dicelette/commit/410f5c028ee8055ab18307de82d527e2ef6547d3))

## [1.48.2](https://github.com/Dicelette/discord-dicelette/compare/1.48.1...1.48.2) (2025-06-10)


### Bug Fixes

* **auto-role:** inverted the stats/dice role ([153f4ca](https://github.com/Dicelette/discord-dicelette/commit/153f4ca65509f8ed039486c3b23ea656b0026fe0))

## [1.48.1](https://github.com/Dicelette/discord-dicelette/compare/1.48.0...1.48.1) (2025-06-10)


### Bug Fixes

* **calc:** undefined symbol when calc's result = 0 ([8698ada](https://github.com/Dicelette/discord-dicelette/commit/8698adaf6a3b2df9aca43a73300aff098f52b305))

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
