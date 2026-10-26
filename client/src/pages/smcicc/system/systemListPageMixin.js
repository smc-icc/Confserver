const DEFAULT_LIST_LIMIT = 10000;

function collectSearchValues(value, output, seen) {
  if (value == null) return;
  if (typeof value !== 'object') {
    output.push(String(value));
    return;
  }
  if (seen.has(value)) return;
  seen.add(value);
  Object.keys(value).forEach((key) => collectSearchValues(value[key], output, seen));
}

function flattenRow(value, prefix, output) {
  if (value == null || typeof value !== 'object') {
    if (prefix) output[prefix] = value == null ? '' : value;
    return;
  }
  Object.keys(value).forEach((key) => {
    const path = prefix ? `${prefix}.${key}` : key;
    flattenRow(value[key], path, output);
  });
}

function csvCell(value) {
  return `"${String(value == null ? '' : value).replace(/"/g, '""')}"`;
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;
  const source = String(text || '').replace(/^\uFEFF/, '');
  for (let i = 0; i < source.length; i += 1) {
    const char = source[i];
    if (char === '"') {
      if (quoted && source[i + 1] === '"') {
        cell += '"';
        i += 1;
      } else {
        quoted = !quoted;
      }
    } else if (char === ',' && !quoted) {
      row.push(cell.trim());
      cell = '';
    } else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && source[i + 1] === '\n') i += 1;
      row.push(cell.trim());
      if (row.some((item) => item !== '')) rows.push(row);
      row = [];
      cell = '';
    } else {
      cell += char;
    }
  }
  row.push(cell.trim());
  if (row.some((item) => item !== '')) rows.push(row);
  return rows;
}

export { DEFAULT_LIST_LIMIT };

export default {
  data() {
    return {
      filterKeyword: '',
      importing: false,
    };
  },
  computed: {
    listFilteredRows() {
      const source = this.listSourceRows();
      const keyword = String(this.filterKeyword || '').trim().toLowerCase();
      if (!keyword) return source;
      return source.filter((row) => {
        const values = [];
        collectSearchValues(row, values, new Set());
        return values.some((value) => value.toLowerCase().includes(keyword));
      });
    },
    listVisibleRows() {
      const page = Math.max(1, Number(this.listCurrentPage()) || 1);
      const size = Math.max(1, Number(this.listCurrentPageSize()) || 10);
      return this.listFilteredRows.slice((page - 1) * size, page * size);
    },
    listFilteredTotal() {
      return this.listFilteredRows.length;
    },
  },
  methods: {
    listSourceRows() {
      return Array.isArray(this.rows) ? this.rows : [];
    },
    listCurrentPage() {
      return this.page;
    },
    listCurrentPageSize() {
      return this.pageSize;
    },
    setListPage(page) {
      this.page = page;
    },
    setListPageSize(size) {
      this.pageSize = size;
      this.setListPage(1);
    },
    handleListSearch() {
      this.filterKeyword = String(this.filterKeyword || '').trim();
      this.setListPage(1);
    },
    clearListSearch() {
      this.filterKeyword = '';
      this.setListPage(1);
    },
    listReload() {
      return this.load();
    },
    listExportFileName() {
      return 'icc-config';
    },
    exportList() {
      const flatRows = this.listFilteredRows.map((row) => {
        const flat = {};
        flattenRow(row, '', flat);
        return flat;
      });
      if (!flatRows.length) return;
      const headers = Array.from(new Set(flatRows.flatMap((row) => Object.keys(row))));
      const lines = flatRows.map((row) => headers.map((header) => csvCell(row[header])).join(','));
      const blob = new Blob([`\uFEFF${headers.map(csvCell).join(',')}\r\n${lines.join('\r\n')}`], {
        type: 'text/csv;charset=utf-8',
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${this.listExportFileName()}-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    },
    async importList(file) {
      if (typeof this.importListRecord !== 'function') return;
      this.importing = true;
      let success = 0;
      let failed = 0;
      try {
        const text = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsText(file, 'UTF-8');
        });
        const csvRows = parseCsv(text);
        const headers = (csvRows.shift() || []).map((header) => header.trim());
        if (!headers.length || !csvRows.length) {
          this.$message.warning(this.$t('smcicc.system.listToolbar.importInvalid'));
          return;
        }
        for (const values of csvRows) {
          const record = {};
          headers.forEach((header, index) => {
            if (header) record[header] = values[index] == null ? '' : values[index];
          });
          try {
            const ok = await this.importListRecord(record);
            if (ok) success += 1;
            else failed += 1;
          } catch (e) {
            failed += 1;
          }
        }
        this.$message.success(this.$t('smcicc.system.listToolbar.importResult', { success, failed }));
        await this.listReload();
      } catch (e) {
        this.$message.error(this.$t('smcicc.system.listToolbar.importFailed'));
      } finally {
        this.importing = false;
      }
    },
  },
};
