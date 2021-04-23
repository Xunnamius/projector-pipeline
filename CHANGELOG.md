# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Conventional Commits][1], and this project adheres to
[Semantic Versioning][2].

# 0.0.0-development (2021-04-23)

### Bug Fixes

- **action.yml:** add commit-sha ([a93ba7c][3])
- **action.yml:** add options input, update descriptions ([55ec7c7][4])
- **action.yml:** use proper action names in description ([2a36c8d][5])
- **babel.config.js:** address @actions/github misclassification ([75ecda4][6])
- **global.ts:** update types ([2a84663][7])
- **package.json:** fix semantic-release and spj ([5fbccdc][8])
- **package.json:** include projector lens metadata ([4b95da4][9])
- **types:** better TypeScript support ([3ccaff9][10])
- Make pipeline.config.js properties consistent ([b0448b9][11])

### Build System

- All metadata-collect component-action tests passing ([34c6086][12])
- All metadata-related tests passing ([047a2be][13])
- **package.json:** update dependencies ([814577f][14])
- \[WIP] most metadata-collect tests passing ([3d05f0b][15])
- \[WIP] new pipeline structure ([608a6da][16])
- Refactor metadata usage, update pipeline config, update setup, more tests
  ([639603e][17])
- Source-wide reorganization ([e4460ce][18])
- Update jest config ([5044af2][19])
- **.changelogrc.js:** remove useless dep ([0a3b8d6][20])
- **package.json:** update dependencies ([2d7a0de][21])
- All src and src/utils tests passing ([5a3a15a][22])
- Stub out functionality, all tests passing (WIP) ([6de52d2][23])
- **.github:** backport .github from projector-lens ([c065393][24])
- **action.yml:** update inputs and outputs ([1bd0e62][25])
- **package-lock.json:** update dependencies ([f121dc9][26])
- **package.json:** update dependencies ([122131c][27])
- **package.json:** update dependencies, add
  babel-plugin-explicit-exports-references ([a2e2103][28])
- **package.json:** update description, backport script updates ([2b1abc3][29])
- **package.json:** update semantic-release and spj with explicit ref
  ([e77c567][30])
- **tsconfig.json:** ensure regular JS files are left alone by TS linting tools
  ([c13b7fe][31])
- **types:** improve DX ([328177a][32])
- All tests in a (pseudo-)passing state ([3cf43dc][33])
- Break config out of package.json ([a353666][34])
- Flesh out component-actions unit tests ([2a4ef59][35])
- Update dependencies ([af8b2c5][36])

### Features

- Initial index and tests ([eeb0b80][37])
- **error.ts:** spin off errors into own file ([13c453b][38])
- Add action source and tests ([184415d][39])
- Create dummy dist ([e86d674][40])
- Import cjs lens ([a30ca29][41])
- **action.yml:** add action ([f904bed][42])
- **action.yml:** add action manifest ([87e5c81][43])
- **package-privileged.json:** add privileged defaults ([d82cfca][44])

[1]: https://conventionalcommits.org
[2]: https://semver.org
[3]:
  https://github.com/Xunnamius/projector-pipeline/commit/a93ba7c9baac3834c76f8a9f12d6eadb34a20505
[4]:
  https://github.com/Xunnamius/projector-pipeline/commit/55ec7c75593e36ec00962519eab29145399eb780
[5]:
  https://github.com/Xunnamius/projector-pipeline/commit/2a36c8d332b0d0805e1104fb2ca09558fd459460
[6]:
  https://github.com/Xunnamius/projector-pipeline/commit/75ecda429a013e67341be073284cf090065a8f2d
[7]:
  https://github.com/Xunnamius/projector-pipeline/commit/2a846632decc97163f276f57a6e94d024352c1a5
[8]:
  https://github.com/Xunnamius/projector-pipeline/commit/5fbccdcb388a1a5115f01d0c2d612f2c932e5724
[9]:
  https://github.com/Xunnamius/projector-pipeline/commit/4b95da4bf606d4a38d9300ce0a71c77e73b7c938
[10]:
  https://github.com/Xunnamius/projector-pipeline/commit/3ccaff9622ec7bd80ae8e86d7a0e85a034dc095b
[11]:
  https://github.com/Xunnamius/projector-pipeline/commit/b0448b9cabb42dddc8921c659ee9c3d4d4bd710c
[12]:
  https://github.com/Xunnamius/projector-pipeline/commit/34c6086f186c8876fbe409a2f78955bd10dc1a71
[13]:
  https://github.com/Xunnamius/projector-pipeline/commit/047a2bebf27f89f2160e5b529b408b699d6632ef
[14]:
  https://github.com/Xunnamius/projector-pipeline/commit/814577f2f62fe54ef79d2dc14803faa2273f3a63
[15]:
  https://github.com/Xunnamius/projector-pipeline/commit/3d05f0be0de678ca1af34de862c9229d4c34445b
[16]:
  https://github.com/Xunnamius/projector-pipeline/commit/608a6da729f898e7ba7446df10e0dc667ace0cde
[17]:
  https://github.com/Xunnamius/projector-pipeline/commit/639603e265d0d88b4f12b5818dacdc59a958f779
[18]:
  https://github.com/Xunnamius/projector-pipeline/commit/e4460ce1ef22c17fa895d25b55b2375a1ba110da
[19]:
  https://github.com/Xunnamius/projector-pipeline/commit/5044af26a8ff0201b71d5bb3e8acebf4c8b75906
[20]:
  https://github.com/Xunnamius/projector-pipeline/commit/0a3b8d69cc683514cf2f78ce0bc28a814e516ced
[21]:
  https://github.com/Xunnamius/projector-pipeline/commit/2d7a0de83f1b912aa251eb7206560904e2ecdcda
[22]:
  https://github.com/Xunnamius/projector-pipeline/commit/5a3a15afdea82b78f475590116aab8f6b1d4f0d3
[23]:
  https://github.com/Xunnamius/projector-pipeline/commit/6de52d2c82f15d609d0b83c0993462fdc76e75a6
[24]:
  https://github.com/Xunnamius/projector-pipeline/commit/c065393e2d6ff9fadaf24b6c51f639dd37f28324
[25]:
  https://github.com/Xunnamius/projector-pipeline/commit/1bd0e626b76afb6c50227b68a1bfafb05e5fd132
[26]:
  https://github.com/Xunnamius/projector-pipeline/commit/f121dc91ee5e899a084e10ecec4f66c5522d5eea
[27]:
  https://github.com/Xunnamius/projector-pipeline/commit/122131cf24198acd155686da6d892a9622bc8aa4
[28]:
  https://github.com/Xunnamius/projector-pipeline/commit/a2e21037f2b86e649a1ed0f77c82533d58ad08a3
[29]:
  https://github.com/Xunnamius/projector-pipeline/commit/2b1abc3cd3eaba6ddcca0d419742f3c1b6ab9fcf
[30]:
  https://github.com/Xunnamius/projector-pipeline/commit/e77c5672b45310c4ac8cc0d3d25763ee507c05fa
[31]:
  https://github.com/Xunnamius/projector-pipeline/commit/c13b7fe3def19067439a7b607871cfd015b2e85d
[32]:
  https://github.com/Xunnamius/projector-pipeline/commit/328177a781f4a9aa891414ed6d9bd10f860ac6d7
[33]:
  https://github.com/Xunnamius/projector-pipeline/commit/3cf43dca53346f75398f99094863ad93ce557c1a
[34]:
  https://github.com/Xunnamius/projector-pipeline/commit/a3536664145892ab3f9985b04de5e06411b1784e
[35]:
  https://github.com/Xunnamius/projector-pipeline/commit/2a4ef59d40e2a77050514b2de3fb625590e4a06e
[36]:
  https://github.com/Xunnamius/projector-pipeline/commit/af8b2c5c0f9be69a215e42b8a43d787e84651cdb
[37]:
  https://github.com/Xunnamius/projector-pipeline/commit/eeb0b8089af2c6b5bbdd9d924a2e883fa2fe89cf
[38]:
  https://github.com/Xunnamius/projector-pipeline/commit/13c453b8088625d4b83b75ea8d342f43ef1e6c98
[39]:
  https://github.com/Xunnamius/projector-pipeline/commit/184415d1f82c6983dfb41044862a59f357185d62
[40]:
  https://github.com/Xunnamius/projector-pipeline/commit/e86d6740850d1d7771ad35318853a40bc12be55a
[41]:
  https://github.com/Xunnamius/projector-pipeline/commit/a30ca2989665ba4d9f474f27e5ff48fb5dda2cb7
[42]:
  https://github.com/Xunnamius/projector-pipeline/commit/f904bed764705e03325e4cd482c6d849fbbce02f
[43]:
  https://github.com/Xunnamius/projector-pipeline/commit/87e5c81f01d2da2bb0dcc01f2cfce74bdab268d8
[44]:
  https://github.com/Xunnamius/projector-pipeline/commit/d82cfca9965f2059f4e8db13e19bf53209f39f06
