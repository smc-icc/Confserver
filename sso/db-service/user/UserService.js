let UserDao = require('../../dao/UserDao');
const logger = require('../../../logger');
let sha1 = require('sha1');

const SystemSuperuser = require('../../../app/service/integration/SystemSuperuser');

const UserService = {}

// UserService.getUserIdList = async() => {
//     return await UserDao.getUserIdList();
// }; 

    // authorization:
    // [
    //     {
    //         role: (admin ,operator ,developer )
    //         flag: string,
    //         updateTime:
    //     }
    // ]
    // let items = [];
    // data.forEach(item => {

    //     items.push({
    //         uid: item.spec.username,
    //         name: item.spec.username,
    //         update_time: item.metadata.creationTimestamp,
    //         authorization: item.spec.authorization,
    //     });
    // })

UserService.getUserAuthList = async() => {
    let data = await UserDao.getUserAuthList();

    let items = [];

    data.forEach(item => {
        if (items.length == 0 || items[items.length - 1].uid != item.uid) {
            items.push({
                uid: item.uid,
                name: item.uid,
                update_time: item.update_time,
                authorization: []
            });

            if (item.role && item.flag) {
                items[items.length - 1].authorization.push({
                    role: item.role,
                    flag: item.flag,                    
                })
            }    
        } else if (item.role && item.flag){
            items[items.length - 1].authorization.push({
                role: item.role,
                flag: item.flag,                 
            })
        }
    })    

    return items;
}; 

//注册操作
UserService.modifyPass = async(uid, password, options = {}) => {
    if (typeof uid !== 'string' || !uid || uid.trim() !== uid) throw new Error('无效账号');
    if (uid.toLowerCase() === SystemSuperuser.UID && uid !== SystemSuperuser.UID) throw new Error('请使用初始化账号 admin 修改密码');
    if (uid === SystemSuperuser.UID) SystemSuperuser.validatePassword(password, options.plainPassword);
    if (options.initialize && uid !== SystemSuperuser.UID) throw new Error('仅允许初始化 admin');
    let email;
    if (uid === SystemSuperuser.UID) {
        if (options.initialize) email = SystemSuperuser.normalizeEmail(options.email);
        else {
            const users = await UserDao.getUserList({ uid: SystemSuperuser.UID });
            // Old installations without a saved email retain the configured fallback.
            email = users[0] && users[0].email;
            if (email) email = SystemSuperuser.normalizeEmail(email);
        }
    }
    const result = options.initialize
        ? await UserDao.initializeAdminPass(sha1(password), email)
        : await UserDao.modifyPass(uid, sha1(password));
    if (!result || Number(result[0]) !== 1) return { errMsg: '账号不存在或管理员已初始化，请登录后修改密码' };
    return uid === SystemSuperuser.UID ? SystemSuperuser.syncPassword(options.plainPassword, email) : {};
};

UserService.addUser = async(userList) => {
    let newUserList = [];
    userList.forEach((user)=> {
        SystemSuperuser.assertBusinessUser(user.uid);
        newUserList.push({
            uid: user.uid,
            password: sha1(user.password),
            update_time: new Date()
        });
    });
    return UserDao.insertUser(newUserList);
};

UserService.deleteUser = async(uids) => {
    (Array.isArray(uids) ? uids : [uids]).forEach(SystemSuperuser.assertBusinessUser);
    await UserDao.deleteUser({ 
        uid: uids
        });
};

module.exports = UserService;
