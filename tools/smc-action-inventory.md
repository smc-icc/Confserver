# ICC Action 迁移清单（自动生成）

生成时间：2026-04-12T11:10:04.218Z（运行 `node tools/smcicc-inventory.js`）

## vdnadmin（/smcicc/vdnadmin/:action）

- Struts 清单总数：**146**
- Node 已实现（nativeHandlers）：**99**
- 仍依赖 ICC_LEGACY_BASE_URL 代理：**47**

### 仍走代理的 action

- `addAgentNoAnswer`
- `addBusinessType`
- `addElement`
- `addExtensionInfo`
- `addGroup`
- `addPowerToUser`
- `addUserInfo`
- `addqueueFailProc`
- `copyAgentNoAnswer`
- `copyBusinessType`
- `copyElement`
- `copyQueueFailProc`
- `deletPowerForUser`
- `deleteAgentNoAnswer`
- `deleteAllPower`
- `deleteBusinessType`
- `deleteElement`
- `deleteGroup`
- `deleteQueueFailProc`
- `editBusinessType`
- `editElement`
- `editExtensionInfo`
- `editGroup`
- `editUserInfo`
- `getGroupAlternativeData`
- `getGroupSelectedData`
- `getTUserGroupById`
- `getUserById`
- `initSeatGroupData`
- `insertToGroup`
- `loadAgentNoAnswerList`
- `loadBusinessTypeList`
- `loadElementList`
- `loadQueueFailProcList`
- `loadUserAllPower`
- `loadUserDepartPower`
- `loadUserInfo`
- `loadUserRolePower`
- `loadUserSignedPower`
- `loadUserUnsignedPower`
- `modifyAgentNoAnswer`
- `modifyQueueFailProc`
- `numIsExist`
- `removeFromGroup`
- `updateActive`
- `updateAutoCheckIn`
- `updateIsOwn`

## systemadmin（/smcicc/systemadmin/:action）

- smciccApiConf 注册数：**216**
- Controller 已绑定函数：**216**
- **缺失处理器（需修复）**：0

- （无）

### struts-systemadmin.xml 中有但未在 smciccApiConf 注册

- （无）

### 已在 smciccApiConf 注册但不在 strutsActions.json 的 struts-systemadmin 列表

- `loadMc100`
- `getUserList`
