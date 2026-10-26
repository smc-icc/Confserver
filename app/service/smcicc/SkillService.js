const Dao = require('../../dao/SkillSMCIccDao');

function toInt(v, d = 0) {
    if (v === null || v === undefined || v === '') return d;
    const n = Number(v);
    return Number.isNaN(n) ? d : n;
}

const Service = {};

Service.initSkill = async (ctx) => {
    const vdnId = toInt(ctx.paramsObj.vdnId || ctx.session.smcicc_vdn_id, -1);
    const keyWord = (ctx.paramsObj.keyWord || '').trim();
    const rows = await Dao.findAll({ vdnId, keyWord });
    return { Rows: rows, Total: rows.length };
};

Service.loadSkillList = async (ctx) => {
    const vdnId = toInt(ctx.paramsObj.vdnId || ctx.session.smcicc_vdn_id, -1);
    const key = (ctx.paramsObj.key || '').trim();
    const rows = await Dao.loadSkillList({ vdnId, key });
    return [{ id: -1, name: '<系统自动分配>' }, ...rows];
};

Service.addSkill = async (ctx) => {
    const vdnId = toInt(ctx.paramsObj.vdnId || ctx.session.smcicc_vdn_id, -1);
    const skillName = (ctx.paramsObj.skillName || '').trim();
    const mediaTypeID = toInt(ctx.paramsObj.mediaTypeID, 0);
    const businessTypeID = toInt(ctx.paramsObj.businessTypeID, 0);
    const skillElementID = toInt(ctx.paramsObj.skillElementID, 0);

    if (await Dao.existsByName({ vdnId, name: skillName })) return 3;
    await Dao.insert({ name: skillName, mediaTypeId: mediaTypeID, businessTypeId: businessTypeID, skillElementId: skillElementID, vdn: vdnId });
    return 1;
};

Service.getTIcipSkillById = async (ctx) => {
    const skillId = toInt(ctx.paramsObj.skillId, 0);
    const row = await Dao.findById(skillId);
    if (!row) return {};
    return {
        id: row.id,
        name: row.name,
        mediatypeid: row.mediaTypeId,
        skillelementid: row.skillElementId,
        businesstypeid: row.businessTypeId,
    };
};

Service.editSkill = async (ctx) => {
    const vdnId = toInt(ctx.paramsObj.vdnId || ctx.session.smcicc_vdn_id, -1);
    const skillId = toInt(ctx.paramsObj.skillId, 0);
    const skillName = (ctx.paramsObj.skillName || '').trim();
    const mediaTypeID = toInt(ctx.paramsObj.mediaTypeID, 0);
    const businessTypeID = toInt(ctx.paramsObj.businessTypeID, 0);
    const skillElementID = toInt(ctx.paramsObj.skillElementID, 0);

    if (await Dao.existsByName({ vdnId, name: skillName, excludeId: skillId })) return 3;
    await Dao.update({ id: skillId, name: skillName, mediaTypeId: mediaTypeID, businessTypeId: businessTypeID, skillElementId: skillElementID });
    return 1;
};

Service.deleteSkill = async (ctx) => {
    const skillId = toInt(ctx.paramsObj.skillId, 0);
    await Dao.deleteSkillToUserBySkillId(skillId);
    const ret = await Dao.deleteSkillById(skillId);
    return Number(ret || 0) > 0;
};

Service.getSkillAlternativeData = async (ctx) => {
    const skillId = toInt(ctx.paramsObj.skillId, 0);
    const keyWord = (ctx.paramsObj.keyWord || '').trim();
    const vdnId = toInt(ctx.paramsObj.vdnId || ctx.session.smcicc_vdn_id, -1);
    const rows = await Dao.listSkillAlternativeUsers({ skillId, keyWord, vdnId });
    return { Rows: rows, Total: rows.length };
};

Service.getSkillSelectedData = async (ctx) => {
    const skillId = toInt(ctx.paramsObj.skillId, 0);
    const keyWord = (ctx.paramsObj.keyWord || '').trim();
    const vdnId = toInt(ctx.paramsObj.vdnId || ctx.session.smcicc_vdn_id, -1);
    const rows = await Dao.listSkillSelectedUsers({ skillId, keyWord, vdnId });
    return { Rows: rows, Total: rows.length };
};

Service.insertToSkill = async (ctx) => {
    const skillId = toInt(ctx.paramsObj.skillId, 0);
    const ids = String(ctx.paramsObj.selIdStr || '').split(',').map((x) => x.trim()).filter(Boolean);
    if (!ids.length) return false;
    let ok = false;
    for (const userId of ids) {
        const ret = await Dao.insertUserToSkill({ userId, skillId });
        if (Number(ret || 0) > 0) ok = true;
    }
    return ok;
};

Service.removeFromSkill = async (ctx) => {
    const skillId = toInt(ctx.paramsObj.skillId, 0);
    const ids = String(ctx.paramsObj.selIdStr || '').split(',').map((x) => x.trim()).filter(Boolean);
    if (!ids.length) return false;
    let ok = false;
    for (const userId of ids) {
        const ret = await Dao.removeUserFromSkill({ userId, skillId });
        if (Number(ret || 0) > 0) ok = true;
    }
    return ok;
};

Service.loadMediaTypeList = async () => Dao.loadMediaTypeList();

Service.loadSkillBusinessTypeList = async (ctx) => {
    const vdnId = toInt(ctx.paramsObj.vdnId || ctx.session.smcicc_vdn_id, -1);
    return Dao.loadSkillBusinessTypeList(vdnId);
};

Service.loadSkillElementList = async (ctx) => {
    const vdnId = toInt(ctx.paramsObj.vdnId || ctx.session.smcicc_vdn_id, -1);
    return Dao.loadSkillElementList(vdnId);
};

Service.updateSkillAutoCheckIn = async (ctx) => {
    const agentId = String(ctx.paramsObj.agentId || '');
    const skillId = toInt(ctx.paramsObj.skillId, 0);
    const autoCheckInFlag = toInt(ctx.paramsObj.autoCheckInFlag, 0);
    if (!agentId || !skillId) return false;
    const count = await Dao.countSkillUser({ agentId, skillId });
    let ret = 0;
    if (count > 0) {
        ret = await Dao.updateSkillUserAutoCheckIn({ agentId, skillId, autoCheckInFlag });
    } else {
        ret = await Dao.insertSkillUserAutoCheckIn({ agentId, skillId, autoCheckInFlag });
    }
    return Number(ret || 0) > 0;
};

module.exports = Service;
