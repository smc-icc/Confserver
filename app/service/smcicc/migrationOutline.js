/**
 * 与 smciccconfig（Java + webapp JS）对照的迁移说明，供 /api/smcicc/registry 与前端展示。
 */
module.exports = {
    sourceProject: 'smciccconfig/trunk/Source/ICCConfiguration',
    stack: {
        server: 'Java Struts2 2.3 + Spring，JSON 结果插件',
        webUi: 'webapp 下 jQuery + LigerUI，业务脚本在 vdnadmin/*/js、systemadmin/*/js',
        configGeneration: 'com.smcloud.smcicccfg.xml.creator 包内 *Creator.java 生成各子系统 XML',
    },
    strutsNamespaces: [
        { namespace: '/vdnadmin', xml: 'struts-vdnadmin.xml', desc: 'VDN 管理：分机、技能队列、服务路由、用户权限等' },
        { namespace: '/systemadmin', xml: 'struts-systemadmin.xml', desc: '系统管理：接入码、ACD、HMP、TAS、VDN 等' },
        { namespace: '/authentication', xml: 'struts-authentication.xml', desc: '登录、验证码、用户信息' },
    ],
    javaEntryPoints: [
        { dir: 'vdnadmin/action', countHint: '17 个 *Action.java', mapsTo: 'ConfServer/app/controller/smcicc/（按模块逐步实现）' },
        { dir: 'vdnadmin/service', mapsTo: 'ConfServer/app/service/smcicc/' },
        { dir: 'systemadmin', mapsTo: '同上，按 systemadmin 子包拆分' },
    ],
    legacyWebRelativePaths: [
        'src/main/webapp/vdnadmin/',
        'src/main/webapp/systemadmin/',
        'src/main/webapp/lib/',
    ],
    nodeTargetLayout: {
        api: 'ConfServer/app/controller/smcicc、/api/smcicc/proxy/*（过渡期代理）',
        services: 'ConfServer/app/service/smcicc',
        vue: 'ConfServer/client/src/pages/smcicc',
    },
    /** vdnadmin 已在 Node 实现的域（迭代补充） */
    vdnadminNativeDomains: [
        '分机/静态登录/技能队列/服务路由/外呼路由/基础信息',
        '部门（DepartmentManager）',
        '角色与角色权限（RoleAndPowerManager：initRoleData、getPower、增删改角色、用户-角色、addPowerForRole 等）',
    ],
    migrationPhases: [
        '1. 用 ICC_LEGACY_BASE_URL 代理旧接口，Vue 新页逐步把 url 从 vdnadmin/xxx 改为 /api/smcicc/proxy/vdnadmin/xxx',
        '2. 按域选模块（如 Extension）：读 Java Service/DAO 与表结构，在 Node 用 Sequelize 实现并切换路由',
        '3. 将 LigerUI 页面迁为 Vue 组件，对齐原 JSON 字段',
        '4. XML 下发逻辑从 *Creator.java 迁为 Node 模板或独立微服务',
    ],
    actionInventory: {
        script: 'node tools/smcicc-inventory.js',
        outputs: ['tools/smcicc-action-inventory.md', 'tools/smcicc-action-inventory.json'],
        note: 'vdnadmin：nativeHandlers 已实现 vs 仍走代理的 action 差集；systemadmin：smciccApiConf 与 SystemadminCompatController 键对齐检查',
    },
    confServerIntegration: {
        nodeApiPrefix: '/pages/server/api/smcicc/*',
        mysql:
            'ICC Dao 使用 Db.db_smcicc.sequelize（默认 PostgreSQL，DB_ICC_DIALECT=postgres；回滚 mysql 时设 DB_ICC_DIALECT=mysql）。库名见 webConf.dbSMCIccSchema / DB_ICC_SCHEMA。连接见 dbIccConf 与 DB_ICC_HOST 等。Tars 控制台仍用 db_tars / db_tars_web（MySQL）。',
        legacyTomcat:
            'ICC_LEGACY_BASE_URL=旧 WAR 根地址（含 context）。未设置时未实现的 vdnadmin action 返回 503；生产在完成回归后应默认留空，仅应急再打开。',
        xmlStrategy:
            '已选策略 B（Sidecar/统一出口）：各 deploy*XML 通过 configureWriteHttp.postConfigureWrite 向板卡 POST /ConfigureWrite/write。环境变量：ICC_XML_WRITE_PORT（默认 8080）、ICC_XML_WRITE_PATH（默认 /ConfigureWrite/write）、ICC_XML_WRITE_RELAY_URL（可选，设置后忽略板卡 IP 端口，请求发往 ${RELAY}${PATH}，便于同 Pod Sidecar）。长期在 Node 复刻 xml.creator 可逐步替代。',
        configureWriter:
            '与 Java 一致：表单字段 filename、content。Acd deploy 已接入 configureWriteHttp；其余 *Service deploy* 可同样替换硬编码 URL。',
        systemShell:
            'Vue 路由 /smcicc/system 对应 webapp/systemadmin/sysMain.html：左侧菜单 + 各模块 Hub 页 POST 调用已实现之 systemadmin action，并可用 legacyUiBase 嵌入原 HTML/JSP。',
        legacyUi:
            'registry 返回 legacyUiBase（ICC_LEGACY_UI_URL 或 ICC_LEGACY_BASE_URL）：iframe 拼接 ${legacyUiBase}/welcome.html 与 ${legacyUiBase}/systemadmin/…',
        retireLegacyChecklist: [
            '运行 npm run smcicc:inventory，确认需代理的 vdnadmin action 已降至可接受范围',
            '全量 UAT 后取消 ICC_LEGACY_BASE_URL，并验证 ICC_CONFIGURE_WRITER / 板卡写出仍可用',
            '更新 tools/smcicc-action-inventory.md 随迭代提交',
        ],
        sourceTree:
            '旧：smciccconfig/trunk/Source/ICCConfiguration；新：ConfServer。',
    },
};
