import Vue from 'vue';
import Ajax from '@/plugins/ajax';
export const productModules = Vue.observable({
  loaded: false,
  modules: {},
  edition: 'community',
  limits: {},
  license: null,
  revision: 0,
  canManage: false,
  canDesign: false,
});
export function moduleAvailable(id) {
  return (
    id === 'omni' ||
    Boolean(
      productModules.loaded &&
        productModules.modules[id] &&
        productModules.modules[id].available,
    )
  );
}
export async function refreshModules() {
  try {
    const data = await Ajax.getJSON(
      '/server/api/smcicc/community/capabilities',
    );
    productModules.modules = data.modules || {};
    productModules.edition = data.edition;
    productModules.limits = data.limits || {};
    productModules.license = data.license || null;
    productModules.revision = data.revision;
    productModules.canManage = data.canManage === true;
    productModules.canDesign = data.canDesign === true;
    productModules.loaded = true;
    return data;
  } catch (e) {
    productModules.loaded = false;
    productModules.modules = {};
    productModules.canManage = false;
    productModules.canDesign = false;
    throw e;
  }
}
