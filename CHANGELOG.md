### Changelog

All notable changes to this project will be documented in this file. Dates are displayed in UTC.

#### [0.3.0](https://github.com/karmaniverous/aws-api-gateway-tools/compare/0.2.0...0.3.0)

- feat(pull-keys): --vars VAR=keyName pairs, parsed like root --vars [`#13`](https://github.com/karmaniverous/aws-api-gateway-tools/pull/13)
- feat(pull-keys): --if-exists skips missing keys; exact-name match only [`#12`](https://github.com/karmaniverous/aws-api-gateway-tools/pull/12)
- updated dependencies [`3da3710`](https://github.com/karmaniverous/aws-api-gateway-tools/commit/3da371034b6d5e8f187189b163eaf25a90b69903)

#### [0.2.0](https://github.com/karmaniverous/aws-api-gateway-tools/compare/0.1.3...0.2.0)

> 17 November 2026

- feat: adopt get-dotenv 8 package contract [`#11`](https://github.com/karmaniverous/aws-api-gateway-tools/pull/11)
- [GH-8] feat: adopt get-dotenv 8 package contract [`45e1ea9`](https://github.com/karmaniverous/aws-api-gateway-tools/commit/45e1ea916bee9281a55bf47a2c196c1b0724af65)
- [GH-8] chore: eliminate npm install warnings [`040d2c0`](https://github.com/karmaniverous/aws-api-gateway-tools/commit/040d2c06ad1311c9de0bd19407bc9073822a52ce)
- [GH-8] refactor: remove stale smoke helpers [`927851c`](https://github.com/karmaniverous/aws-api-gateway-tools/commit/927851c91c1e649db969bb11afdbb1fe07787954)
- [GH-8] chore(deps): require released get-dotenv ^8.0.0 [`4938b83`](https://github.com/karmaniverous/aws-api-gateway-tools/commit/4938b837e2bacca68d5f32e834e560a21969e118)
- npm audit fix [`d783160`](https://github.com/karmaniverous/aws-api-gateway-tools/commit/d783160cddc90bfe78047f7e4fbd5151c2818950)
- chore: release v0.2.0 [`dcf3655`](https://github.com/karmaniverous/aws-api-gateway-tools/commit/dcf3655b89f455bbe67337b4aa4e64d06de13b3d)

#### [0.1.3](https://github.com/karmaniverous/aws-api-gateway-tools/compare/0.1.2...0.1.3)

> 15 July 2026

- chore: update dependencies [`#9`](https://github.com/karmaniverous/aws-api-gateway-tools/pull/9)
- cleanup [`3a2491f`](https://github.com/karmaniverous/aws-api-gateway-tools/commit/3a2491f39fe07e9b5e4c2e14edaaf0945635b73a)
- chore: add copilot review instructions [`ac96569`](https://github.com/karmaniverous/aws-api-gateway-tools/commit/ac965699c7f0a74bea76d6c72c99a8e6ba814da2)
- chore: release v0.1.3 [`b983a5d`](https://github.com/karmaniverous/aws-api-gateway-tools/commit/b983a5d6b34f1cf602edb998f504d7a386b2a812)

#### [0.1.2](https://github.com/karmaniverous/aws-api-gateway-tools/compare/0.1.1...0.1.2)

> 21 May 2026

- chore: release v0.1.2 [`25c32b3`](https://github.com/karmaniverous/aws-api-gateway-tools/commit/25c32b3f2eb29ae9bc9e9a0a279beab4101376a5)
- updated getdotenv [`3c6e6ca`](https://github.com/karmaniverous/aws-api-gateway-tools/commit/3c6e6cacd60c0ee18a14eba062b943ac140f20b8)

#### [0.1.1](https://github.com/karmaniverous/aws-api-gateway-tools/compare/0.1.0...0.1.1)

> 21 May 2026

- chore: move docs generation to GHA workflow [`#7`](https://github.com/karmaniverous/aws-api-gateway-tools/pull/7)
- fix: remove obsolete defaultEnv cascade from pull-keys [`#6`](https://github.com/karmaniverous/aws-api-gateway-tools/pull/6)
- fix: remove obsolete bag.env ?? bag.defaultEnv cascade [`#5`](https://github.com/karmaniverous/aws-api-gateway-tools/issues/5)
- updated docs [`8e649f4`](https://github.com/karmaniverous/aws-api-gateway-tools/commit/8e649f46d343ababc3406a7fbf57881015db10e6)
- chore: release v0.1.1 [`b993c04`](https://github.com/karmaniverous/aws-api-gateway-tools/commit/b993c04b22a34b49d85ecc0eb1d727125d9acc65)
- updated getdotenv [`b622e9a`](https://github.com/karmaniverous/aws-api-gateway-tools/commit/b622e9a7f3be1991524bbf564c549aa64000dfe5)

#### 0.1.0

> 20 May 2026

- chore: move changelog generation to after:bump hook [`#3`](https://github.com/karmaniverous/aws-api-gateway-tools/pull/3)
- chore: add npm-pack-check CI workflow [`#2`](https://github.com/karmaniverous/aws-api-gateway-tools/pull/2)
- initial commit [`252b339`](https://github.com/karmaniverous/aws-api-gateway-tools/commit/252b339c6a9cdd980af414604ad42a4f62698aad)
- created docs [`219da31`](https://github.com/karmaniverous/aws-api-gateway-tools/commit/219da3123ab951bd28b4685bb745b89eb16a5a43)
- npm audit fix [`06a7368`](https://github.com/karmaniverous/aws-api-gateway-tools/commit/06a736869068ecb06303db8603f5ca2bed10fb55)
- Switch repo to API Gateway tools/plugin [`cf8feb5`](https://github.com/karmaniverous/aws-api-gateway-tools/commit/cf8feb5247615bbfe12cc766c27506fa78b67265)
- Fix api-gateway plugin wiring and smoke [`d9b3e2c`](https://github.com/karmaniverous/aws-api-gateway-tools/commit/d9b3e2cd8a5873910fb3c4ecb4fa82df301a3f7b)
- Clean up lint/docs and smoke exports [`c80887c`](https://github.com/karmaniverous/aws-api-gateway-tools/commit/c80887c763e4d17a31a230537c61618fd8329c7e)
- chore: release v0.1.0 [`f539191`](https://github.com/karmaniverous/aws-api-gateway-tools/commit/f53919152bdd777ba7264b265c8cf886bd9bcfa6)
- Reduce TypeDoc warnings and fix README drift [`f1e31dd`](https://github.com/karmaniverous/aws-api-gateway-tools/commit/f1e31dddc8692bbf5ff90a09217ebdf792d199aa)
- chore: add npm publish safety net (.npmignore + gitignore *.local) [`a0e2142`](https://github.com/karmaniverous/aws-api-gateway-tools/commit/a0e21427886383c351825cbbc6fd3a959f8bc794)
