const mysql = require('mysql2/promise');

let pool = null;

/**
 * Kamailio/OpenSIPS `subscriber` 表连接（与 Java JdbcUtil + PropsUtil 等价：先 connectionDB 再操作）。
 */
async function createPool({ host, port, user, password, database }) {
    if (pool) {
        await pool.end().catch(() => {});
        pool = null;
    }
    pool = mysql.createPool({
        host,
        port: Number(port) || 3306,
        user,
        password,
        database,
        waitForConnections: true,
        connectionLimit: 10,
    });
    return pool;
}

function getPool() {
    return pool;
}

async function testConnection() {
    const p = getPool();
    if (!p) return false;
    const c = await p.getConnection();
    try {
        await c.query('SELECT 1');
        return true;
    } finally {
        c.release();
    }
}

module.exports = {
    createPool,
    getPool,
    testConnection,
};
