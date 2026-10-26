const fs = require('fs');
const path = require('path');

const base = path.join(__dirname, '../../smciccconfig/trunk/Source/ICCConfiguration/src/main/resources/config/struts2');
const files = ['struts-vdnadmin.xml', 'struts-systemadmin.xml', 'struts-authentication.xml'];

const out = {};
for (const f of files) {
    const x = fs.readFileSync(path.join(base, f), 'utf8');
    const re = /<action name="([^"]+)"/g;
    const set = new Set();
    let m;
    while ((m = re.exec(x)) !== null) set.add(m[1]);
    const key = f.replace('.xml', '');
    out[key] = [...set].sort();
}

const dest = path.join(__dirname, '../app/service/smcicc/strutsActions.json');
fs.mkdirSync(path.dirname(dest), { recursive: true });
fs.writeFileSync(dest, JSON.stringify(out, null, 2), 'utf8');
console.log('Wrote', dest, Object.keys(out).map((k) => `${k}:${out[k].length}`).join(' '));
