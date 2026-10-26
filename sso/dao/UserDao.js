const {
    tUserInfo, tAuth, sequelize
} = require('./db').db_user_system;

const { QueryTypes } = require('sequelize');
const AuthDao = require('./AuthDao');
// const logger = require('../logger');

const UserDao = {}

UserDao.getUserIdList = async() => {
    return await tUserInfo.findAll();
};



UserDao.getUserAuthList = async() => {

    return await sequelize.query('select u.uid as uid, u.update_time as update_time, a.`role`, a.`flag` from  t_user_info as u left join t_auth as a on u.`uid` = a.`uid` order by uid', { type: QueryTypes.SELECT });
};

UserDao.modifyPass = async (uid, password) => {
    return await tUserInfo.update({
        password: password
    }, {
        where: sequelize.where(sequelize.cast(sequelize.col('uid'), 'BINARY'), uid)
    });
};

// Compare-and-set closes the first-admin initialization race without resetting existing credentials.
UserDao.initializeAdminPass = async(password, email) => tUserInfo.update({ password, email }, {
    where: { uid: 'admin', password: '' }
});

UserDao.insertUser = async(userList) => {
    return await tUserInfo.bulkCreate(userList);
};

UserDao.getUserList = async(uid) => {
    return await tUserInfo.findAll({
        where: uid
    })
};

UserDao.deleteUser = async(params) => {

    let users = await UserDao.getUserList(params);
    let uids = [];
    for(let user of users) {
        uids.push(user.uid);
    }
    // console.log('deleteUser', params, users, uids);

    await AuthDao.deleteAuthByUid(uids);

    //删除用户
    return await tUserInfo.destroy({
        where: params
    })


};

module.exports = UserDao;