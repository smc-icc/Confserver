/**
 * MySQL → PostgreSQL SQL 适配（仅 db_smcicc 手写 SQL）。
 * 在 index.js 中对 db_smcicc.sequelize.query 做透明包装。
 */

function adaptIccSql(sql) {
	if (typeof sql !== 'string' || !sql) {
		return sql;
	}

	let out = sql;

	// IFNULL → COALESCE（忽略大小写）
	out = out.replace(/\bIFNULL\s*\(/gi, 'COALESCE(');

	// LIMIT offset, count → LIMIT count OFFSET offset
	out = out.replace(
		/\bLIMIT\s+:offset\s*,\s*:limit\b/gi,
		'LIMIT :limit OFFSET :offset'
	);

	// NOW() 在 PG 中可用，保留

	return out;
}

function wrapSequelizeQuery(sequelize) {
	const origQuery = sequelize.query.bind(sequelize);
	sequelize.query = function patchedQuery(sql, options) {
		if (typeof sql === 'string') {
			sql = adaptIccSql(sql);
		}
		return origQuery(sql, options);
	};
}

module.exports = {
	adaptIccSql,
	wrapSequelizeQuery,
};
