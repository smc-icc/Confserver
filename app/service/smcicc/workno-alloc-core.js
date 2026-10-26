const MAX_NO = 99999999;
const MAX_SPAN = 100000;

function fail(message, status = 400) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function parseWorkNo(value) {
  const text = String(value ?? '').trim();
  if (!/^[1-9]\d*$/.test(text)) return null;
  const number = Number(text);
  if (!Number.isSafeInteger(number) || number < 1 || number > MAX_NO) return null;
  return number;
}

function parseRange(start, end) {
  const startNo = parseWorkNo(start);
  const endNo = parseWorkNo(end);
  if (!startNo || !endNo || endNo < startNo) throw fail('号段须为正整数，且结束号不能小于起始号');
  if (endNo - startNo + 1 > MAX_SPAN) throw fail(`单个号段不能超过 ${MAX_SPAN} 个工号`);
  return { startNo, endNo };
}

function overlaps(left, right) {
  return left.startNo <= right.endNo && right.startNo <= left.endNo;
}

function findOverlap(candidate, ranges) {
  return ranges.find(range => overlaps(candidate, range)) || null;
}

function mergeRanges(ranges) {
  const sorted = ranges
    .map(range => ({ startNo: Number(range.startNo), endNo: Number(range.endNo) }))
    .filter(range => range.endNo >= range.startNo && range.endNo >= 1)
    .sort((a, b) => a.startNo - b.startNo || a.endNo - b.endNo);
  const merged = [];
  for (const range of sorted) {
    const last = merged[merged.length - 1];
    if (last && range.startNo <= last.endNo + 1) last.endNo = Math.max(last.endNo, range.endNo);
    else merged.push({ ...range });
  }
  return merged;
}

function nextWorkNo(used, blocked) {
  const taken = new Set();
  for (const value of used || []) {
    const number = parseWorkNo(value);
    if (number) taken.add(number);
  }
  const ranges = mergeRanges(blocked || []);
  let cursor = 1;
  let index = 0;
  while (cursor <= MAX_NO) {
    while (index < ranges.length && ranges[index].endNo < cursor) index += 1;
    const range = ranges[index];
    if (range && cursor >= range.startNo && cursor <= range.endNo) {
      cursor = range.endNo + 1;
      continue;
    }
    if (!taken.has(cursor)) return cursor;
    cursor += 1;
  }
  throw fail('没有可用工号', 409);
}

function ownGrants(ranges, vdnId) {
  return (ranges || []).filter(range => range.kind === 'grant' && range.state === 'active' && Number(range.vdnId) === Number(vdnId));
}

function allocationMode(ranges, vdnId) {
  return ownGrants(ranges, vdnId).length ? 'manual' : 'auto';
}

function blockedForAuto(ranges) {
  return (ranges || []).filter(range => range.state === 'active' && (range.kind === 'shield' || range.kind === 'grant'));
}

function rangeContains(grants, number) {
  return grants.some(range => number >= Number(range.startNo) && number <= Number(range.endNo));
}

module.exports = {
  MAX_NO, MAX_SPAN, fail, parseWorkNo, parseRange, overlaps, findOverlap, mergeRanges,
  nextWorkNo, ownGrants, allocationMode, blockedForAuto, rangeContains,
};
