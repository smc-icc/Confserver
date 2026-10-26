let LoginDao = require('../../dao/LoginDao');
let TokenDao = require('../../dao/TokenDao');
let cache = require('memory-cache');
let uuidV1 = require('uuid/v1');
let sha1 = require('sha1');
const SystemSuperuser = require('../../../app/service/integration/SystemSuperuser');
const LdapService = require('../../../ldap/LdapService');
const SetService = require('../set/SetService');

const exprireTime = 7 * 24 * 60 * 60 * 1000;

const LoginServer = {};

//登录操作
LoginServer.login = async (uid, password, options = {}) => {
    // Email is a login alias only. Tickets always retain the canonical SSO UID.
    uid = typeof uid === 'string' ? uid.trim() : '';
    if (typeof process !== 'undefined' && process.env.CONF_TENANCY_ENABLED === '1' && (/^1[3-9]\d{9}$/.test(uid) || /^\+[1-9]\d{6,14}$/.test(uid))) {
        const auth = require('../../../app/service/integration/VdnPortalAuth').getAuth();
        if (auth.findLoginPhoneOwners) {
            const phone = uid.startsWith('+') ? uid : '+86' + uid;
            const owners = await auth.findLoginPhoneOwners(phone);
            if (owners.length > 1) return { errMsg: '#login.userNoExist#' };
            if (owners.length === 1) uid = owners[0].uid;
        }
    }
    const emailLogin = uid.includes('@');
    const managed = typeof process !== 'undefined' && process.env.CONF_TENANCY_ENABLED === '1';
    let emailUser;
    if (emailLogin) {
        if (uid.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(uid)) {
            return { errMsg: '#login.userNoExist#' };
        }
        const matches = managed
            ? await require('../../../app/service/integration/VdnPortalAuth').getAuth().findLoginEmailOwners(uid.toLowerCase())
            : await LoginDao.getUsersByEmail(uid.toLowerCase());
        if (matches.length !== 1) return { errMsg: '#login.userNoExist#' };
        emailUser = matches[0];
        uid = emailUser.uid;
    }

    // Managed applicants need an active local principal independently of grants.
    // Unmanaged LDAP username login retains its existing directory-only protocol.
    let principal = emailUser;
    if (managed) {
        principal = principal || await LoginDao.getUserInfoByUid(uid);
        if (!principal || !principal.password) return { errMsg: '#login.userNoExist#' };
        if (uid !== 'admin') {
            const profile = await require('../../../app/service/integration/VdnAccessService').getService().findProfile(uid);
            if ((profile && Number(profile.enabled) !== 1) || (!profile && uid.startsWith('conf-account:'))) {
                return { errMsg: '#login.userNoExist#' };
            }
        }
    }

    let ldapConf = await SetService.ldapConf();
    // With LDAP enabled the client sends email logins as plaintext. The local
    // administrator still uses the existing double-SHA1 password protocol.
    if (ldapConf.enableLDAP && uid === 'admin' && (emailLogin || options.purpose === 'portal')) password = sha1(password);

    if (uid.startsWith('conf-account:')) {
        const accessAuth = require('../../../app/service/integration/VdnPortalAuth');
        const proof = ldapConf.enableLDAP ? accessAuth.digest(password) : password;
        if (!await accessAuth.getAuth().authenticate(uid, proof)) return { errMsg: '#login.passwordNoCorrect#' };
    } else if (uid.startsWith('conf-vdn:')) {
        const identity = require('../../../app/service/integration/OnboardIdentity');
        if (!await identity.authenticateManaged(uid, password, !!ldapConf.enableLDAP)) {
            return { errMsg: '#login.passwordNoCorrect#' };
        }
    } else if (ldapConf.enableLDAP && uid !== 'admin') {
        const LdapRet = await LdapService.authenticateLogin(uid, password);
        if (LdapRet.iRet !== 0) {
            if (LdapRet.iRet === LdapService.RETURN_MSG.SERVER_ERROR.iRet) {
                return {
                    errMsg: '#login.loginFailed#'
                };
            } else if (LdapRet.iRet === LdapService.RETURN_MSG.PASSWORD_ERROR.iRet) {
                return {
                    errMsg: '#login.passwordNoCorrect#'
                };
            } else if (LdapRet.iRet === LdapService.RETURN_MSG.USER_ERROR.iRet) {
                return {
                    errMsg: '#login.userNoExist#'
                };
            }
        }
    } else {
        let userInfo = principal || await LoginDao.getUserInfoByUid(uid);
        if (userInfo) {
            if (userInfo.password !== sha1(password)) {
                return {
                    errMsg: '#login.passwordNoCorrect#'
                };
            }
        } else {
            return {
                errMsg: '#login.userNoExist#'
            };
        }
    }
    let managementAllowed = uid === 'admin';
    if (typeof process !== 'undefined' && process.env.CONF_TENANCY_ENABLED === '1') {
        try {
            const access = require('../../../app/service/integration/VdnAccessService').getService();
            const manager = access.findManagerAccount ? await access.findManagerAccount(uid) : null;
            if (manager?.status === 'disabled') return { errMsg: '账号已停用，请联系管理员', login_status: 'account_disabled' };
            managementAllowed = Boolean((await access.authorizeManagement(uid)).allowed);
            if (options.purpose !== 'portal' && !managementAllowed) {
                if (manager?.status === 'pending') return { errMsg: '管理员正在审核您的注册申请，请耐心等待', login_status: 'pending_review' };
                if (manager?.status === 'rejected') return { errMsg: '您的注册申请未通过，请联系管理员', login_status: 'application_rejected' };
                // Credentials have already passed. Never expose application state
                // to an unauthenticated caller or issue a management ticket here.
                const mine = await access.listMine(uid);
                if (mine.items.some(item => item.status === 'pending')) return { errMsg: '管理员正在审核', login_status: 'pending_review' };
                if (mine.items.some(item => ['rejected', 'approved'].includes(item.status))) return { errMsg: '当前账号没有管理权限，请联系管理员', login_status: 'not_authorized' };
                return { errMsg: '尚未开通管理权限，请先提交申请', login_status: 'application_required' };
            }
        } catch { return { errMsg: '未知错误，请联系管理员', login_status: 'unknown_error' }; }
    }
    let ticket = uuidV1();
    //记录本地缓存，并入库
    let expireTime = new Date(new Date().getTime() + parseInt(exprireTime));
    let tgtMap = cache.get('tgtMap');
    tgtMap && (tgtMap[ticket] = {
        uid: uid,
        expireTime: expireTime
    });

    // console.log("ticket:", ticket);

    await LoginDao.insertTgt({
        ticket: ticket,
        uid: uid,
        expire_time: expireTime
    });
    return {
        ticket: ticket,
        management_allowed: managementAllowed
    };
};

//注册操作
LoginServer.register = async (uid, password) => {
    if (typeof process !== 'undefined' && process.env.CONF_TENANCY_ENABLED === '1') return { errMsg: '请使用 VDN 管理权限申请中心注册' };
    SystemSuperuser.assertBusinessUser(uid);
    let userInfo = await LoginDao.getUserInfoByUid(uid);
    if (userInfo) {
        return {
            errMsg: '#login.hasExist#'
        };
    } else {
        await LoginDao.insertUserInfo(uid, sha1(password));
        return {};
    }
};

//重启服务的时候，从数据库清理掉已经过期的数据
LoginServer.removeExpiresTgt = async () => {
    return await LoginDao.deleteTgtByExpireTime(new Date());
};

//从数据库获取缓存TGT数据
LoginServer.initLoginTgtCache = async () => {
    let tgtMap = {};
    let tgts = await LoginDao.getAllTgt();
    tgts.forEach((tgt) => {
        tgt = tgt.dataValues;
        tgtMap[tgt.ticket] = {
            uid: tgt.uid,
            expireTime: tgt.expire_time
        };
    });

    tgts = await TokenDao.getAllToken();
    tgts.forEach((tgt) => {
        tgt = tgt.dataValues;
        tgtMap[tgt.ticket] = {
            uid: tgt.uid,
            expireTime: tgt.expire_time
        };
    });
    cache.del('tgtMap');
    cache.put('tgtMap', tgtMap, 1 * 60 * 1000, () => {
        LoginServer.removeExpiresTgt();
        LoginServer.initLoginTgtCache();
    });
};

LoginServer.getUidByTicket = async (ticket) => {

    let tgtMap = cache.get('tgtMap') || {};
    let tgt = tgtMap[ticket];

    if (!tgt) {
        let tgtInDb = await LoginDao.getTgtByTicket(ticket);

        // console.log(tgtInDb);

        if (tgtInDb) {
            tgtInDb = tgtInDb.dataValues;
            tgt = tgtMap[ticket] = {
                uid: tgtInDb.uid,
                expireTime: tgtInDb.expire_time
            };
        } else {
            let token = await TokenDao.getToken(ticket);

            if (token) {
                tgt = tgtMap[ticket] = {
                    uid: token.uid,
                    expireTime: token.expire_time
                };
            }
        }
    }
    if (tgt) {
        if (new Date().getTime() - new Date(tgt.expire_time).getTime() > 0) {
            delete tgtMap[ticket];
            LoginDao.deleteTgt(ticket);
            return null
        } else {
            return tgt.uid;
        }
    } else {
        return null;
    }
};


LoginServer.validate = async (pUid, pTicket) => {
    let uid = await LoginServer.getUidByTicket(pTicket);
    if (uid && uid === pUid) {
        return true;
    } else {
        return false;
    }
};

LoginServer.removeExpiresTgt();
LoginServer.initLoginTgtCache();


module.exports = LoginServer;