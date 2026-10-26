let AuthDao = require('../../dao/AuthDao');
let UserDao = require('../../dao/UserDao');
let SetService = require('../set/SetService');
let logger = require('../../../logger');

const AuthService = {}

AuthService.isAdmin = async(uid) => uid === 'admin';

//是否已经激活(只有一个用户, 且admin密码为空)
AuthService.isActivated = async() => {
    const users = await UserDao.getUserIdList();
    const admin = users.find(user => user.uid === 'admin');
    return !!(admin && admin.password);
};

AuthService.addAuth = async(authList) => {

    let newAuthList = [];
    authList.forEach((auth)=> {
        if (auth.role === 'admin' && auth.uid !== 'admin') throw new Error('系统超级用户仅限初始化 admin');
        newAuthList.push({
            flag: auth.flag,
            role: auth.role,
            uid: auth.uid
        });
    });
    return AuthDao.insertAuth(newAuthList);
};

AuthService.deleteAuth = async(flag, role) => {
    if(role){
        await AuthDao.deleteAuth({
            flag,
            role
        });
    }else{
        await AuthDao.deleteAuth({
            flag
        });
    }
};

AuthService.updateAuth = async(flag, role, uids) => {
    let newAuthList = [];
    uids.forEach((uid)=> {
        if (role === 'admin' && uid !== 'admin') throw new Error('系统超级用户仅限初始化 admin');
        newAuthList.push({flag: flag, role: role, uid: uid});
    });
    await AuthDao.deleteAuth({flag, role});
    return await AuthDao.insertAuth(newAuthList);
};

AuthService.getAuth = async(flag, roles, uid) => {
    const allowedRoles = uid === 'admin' ? roles : (Array.isArray(roles) ? roles : [roles]).filter(role => role !== 'admin');
    if (!allowedRoles.length) return null;
    return await AuthDao.getAuth(flag, allowedRoles, uid);
};

AuthService.getAuthListByUid = async(uid) => {
    return await AuthDao.getAuthList({uid: uid});
};

AuthService.getAuthListByFlag = async(flag) => {
    return await AuthDao.getAuthList({flag: flag});
};

AuthService.getAuthList = async(flag, role, uid) =>{
    let params = {};
    if (flag !== undefined && flag !== null) {
        params.flag = flag;
    }
    if (role !== undefined && role !== null) {
        params.role = role;
    }
    if (uid !== undefined && uid !== null) {
        params.uid = uid;
    }
    return await AuthDao.getAuthList(params, 'DESC');
};

AuthService.getUserIdList = async() => {
    return await UserDao.getUserIdList();
}; 

AuthService.pageDeleteAuth = async(flag, role, uid) => {
    return await AuthDao.deleteAuthById(flag, role, uid);
}

module.exports = AuthService;
