const SMCIccProxyController = require('./SMCIccProxyController');
const ExtensionController = require('./ExtensionController');
const StaticLoginController = require('./StaticLoginController');
const ServiceRouteController = require('./ServiceRouteController');
const SkillQueueController = require('./SkillQueueController');
const SkillController = require('./SkillController');
const CallOutRouterController = require('./CallOutRouterController');
const TasChildController = require('./TasChildController');
const BasicInfoController = require('./BasicInfoController');
const DepartmentManagerController = require('./DepartmentManagerController');
const RoleAndPowerManagerController = require('./RoleAndPowerManagerController');
const AgentUserController = require('./AgentUserController');
const strutsActionsJson = require('../../service/smcicc/strutsActions.json');

function makeProxyAction(action) {
    return async (ctx) => {
        ctx.params = ctx.params || {};
        ctx.params.action = action;
        await SMCIccProxyController.proxyVdnadmin(ctx);
    };
}

/** 已在 Node 实现的 Struts vdnadmin action；其余名称由下方合并为代理到旧应用 */
const nativeHandlers = {
    loadServiceRouteList: ServiceRouteController.loadServiceRouteList,
    addServiceRoute: ServiceRouteController.addServiceRoute,
    deleteServiceRoutes: ServiceRouteController.deleteServiceRoutes,
    modifyServiceRoute: ServiceRouteController.modifyServiceRoute,
    setServiceRouteValid: ServiceRouteController.setServiceRouteValid,
    copyServiceRoute: ServiceRouteController.copyServiceRoute,
    loadSkillList: SkillController.loadSkillList,
    loadUserList: ServiceRouteController.loadUserList,
    loadAgentGroupList: ServiceRouteController.loadAgentGroupList,
    loadAccessCodeListByVdnSelf: ServiceRouteController.loadAccessCodeListByVdnSelf,
    loadTrunkGroupList: ServiceRouteController.loadTrunkGroupList,
    loadIvrFlowList: ServiceRouteController.loadIvrFlowList,

    loadCallOutRouterList: CallOutRouterController.loadCallOutRouterList,
    addCallOutRouter: CallOutRouterController.addCallOutRouter,
    editCallOutRouter: CallOutRouterController.editCallOutRouter,
    deleteCallOutRouter: CallOutRouterController.deleteCallOutRouter,
    /** 与 CallOutRouterAction.getchGroup：同 extension 侧按 VDN 的通道组列表 */
    getchGroup: ExtensionController.getchGroupList,
    /** 与 vdnadmin 中引用：TAS 系统音（CfgTASPID 来自表单） */
    loadTas4SysVoiceList: TasChildController.loadTas4SysVoiceList,

    loadBasicInfo: BasicInfoController.loadBasicInfo,
    modifyBasicInfo: BasicInfoController.modifyBasicInfo,
    checkVdnNameExist: BasicInfoController.checkVdnNameExist,

    loadUserInfo: AgentUserController.loadUserInfo,
    addUserInfo: AgentUserController.addUserInfo,
    editUserInfo: AgentUserController.editUserInfo,
    setAgentValid: AgentUserController.setAgentValid,
    deleteUserInfo: AgentUserController.deleteUserInfo,

    getDepartTree: DepartmentManagerController.getDepartTree,
    getDepartPower: DepartmentManagerController.getDepartPower,
    addPowerForDepart: DepartmentManagerController.addPowerForDepart,
    deletePowerForDepart: DepartmentManagerController.deletePowerForDepart,
    getNotRelateUsersByDepart: DepartmentManagerController.getNotRelateUsersByDepart,
    getRelateUsersByDepart: DepartmentManagerController.getRelateUsersByDepart,
    toDepart: DepartmentManagerController.toDepart,
    removeUserFromDepart: DepartmentManagerController.removeUserFromDepart,
    getDepartById: DepartmentManagerController.getDepartById,
    addDepart: DepartmentManagerController.addDepart,
    editDepart: DepartmentManagerController.editDepart,
    deleteDepart: DepartmentManagerController.deleteDepart,

    initRoleData: RoleAndPowerManagerController.initRoleData,
    getNotRelateUsersByRole: RoleAndPowerManagerController.getNotRelateUsersByRole,
    getRelateUsersByRole: RoleAndPowerManagerController.getRelateUsersByRole,
    getPower: RoleAndPowerManagerController.getPower,
    toRole: RoleAndPowerManagerController.toRole,
    removeFromRole: RoleAndPowerManagerController.removeFromRole,
    addPowerForRole: RoleAndPowerManagerController.addPowerForRole,
    deletePowerForRole: RoleAndPowerManagerController.deletePowerForRole,
    getRoleById: RoleAndPowerManagerController.getRoleById,
    addRole: RoleAndPowerManagerController.addRole,
    editRole: RoleAndPowerManagerController.editRole,
    deleteRole: RoleAndPowerManagerController.deleteRole,

    loadExtensionList: ExtensionController.loadExtensionList,
    loadExtensionListEx: ExtensionController.loadExtensionList,
    addExtension: ExtensionController.addExtension,
    editExtension: ExtensionController.editExtension,
    setExtensionValid: ExtensionController.setExtensionValid,
    deleteExtension: ExtensionController.deleteExtension,
    copyExtension: ExtensionController.copyExtension,
    batchExtension: ExtensionController.batchExtension,
    acquireExtension: ExtensionController.acquireExtension,
    releaseExtension: ExtensionController.releaseExtension,
    checkExtensionNumber: ExtensionController.checkExtensionNumber,
    getchGroupList: ExtensionController.getchGroupList,
    loadChGroupList: ExtensionController.getchGroupList,

    loadstaticLoginList: StaticLoginController.loadstaticLoginList,
    getUserList: StaticLoginController.getUserList,
    getNumList: ExtensionController.getNumList,
    addStaticLogin: StaticLoginController.addStaticLogin,
    editStaticLogin: StaticLoginController.editStaticLogin,
    deleteStaticLogin: StaticLoginController.deleteStaticLogin,
    copyStaticLogin: StaticLoginController.copyStaticLogin,
    getUserByWorkNo: StaticLoginController.getUserByWorkNo,

    loadSkillQueueList: SkillQueueController.loadSkillQueueList,
    loadQueueGroupList: SkillQueueController.loadQueueGroupList,
    loadQueueSkillList: SkillQueueController.loadQueueSkillList,
    loadBrimGroupList: SkillQueueController.loadBrimGroupList,
    loadBrimSkillList: SkillQueueController.loadBrimSkillList,
    loadMatchGroupEle: SkillQueueController.loadMatchGroupEle,
    loadPolicyGroup: SkillQueueController.loadPolicyGroup,
    loadAppTypeList: SkillQueueController.loadAppTypeList,
    loadQueueOverBrim: SkillQueueController.loadQueueOverBrim,
    loadQueueOverTime: SkillQueueController.loadQueueOverTime,
    loadQueueList: SkillQueueController.loadQueueList,
    loadQueueOTList: SkillQueueController.loadQueueOTList,
    loadQueueOverBrimList: SkillQueueController.loadQueueOverBrimList,
    loadQueueOverTimeList: SkillQueueController.loadQueueOverTimeList,
    addQueueOverBrim: SkillQueueController.addQueueOverBrim,
    editQueueOverBrim: SkillQueueController.editQueueOverBrim,
    copyQueueOverBrim: SkillQueueController.copyQueueOverBrim,
    deleteQueueOverBrim: SkillQueueController.deleteQueueOverBrim,
    addQueueOverTime: SkillQueueController.addQueueOverTime,
    editQueueOverTime: SkillQueueController.editQueueOverTime,
    copyQueueOverTime: SkillQueueController.copyQueueOverTime,
    deleteQueueOverTime: SkillQueueController.deleteQueueOverTime,
    addSkillQueue: SkillQueueController.addSkillQueue,
    copySkillQueue: SkillQueueController.copySkillQueue,
    deleteSkillQueue: SkillQueueController.deleteSkillQueue,
    editSkillQueue: SkillQueueController.editSkillQueue,

    initSkill: SkillController.initSkill,
    addSkill: SkillController.addSkill,
    getTIcipSkillById: SkillController.getTIcipSkillById,
    editSkill: SkillController.editSkill,
    deleteSkill: SkillController.deleteSkill,
    getSkillAlternativeData: SkillController.getSkillAlternativeData,
    getSkillSelectedData: SkillController.getSkillSelectedData,
    insertToSkill: SkillController.insertToSkill,
    removeFromSkill: SkillController.removeFromSkill,
    loadMediaTypeList: SkillController.loadMediaTypeList,
    loadSkillBusinessTypeList: SkillController.loadSkillBusinessTypeList,
    loadSkillElementList: SkillController.loadSkillElementList,
    updateSkillAutoCheckIn: SkillController.updateSkillAutoCheckIn,
};

const vdnList = strutsActionsJson['struts-vdnadmin'] || [];
const merged = { ...nativeHandlers };
for (const action of vdnList) {
    if (merged[action] === undefined) {
        merged[action] = makeProxyAction(action);
    }
}
module.exports = merged;
