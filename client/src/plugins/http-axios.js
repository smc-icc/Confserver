import Vue from 'vue';
import Axios from 'axios';

const axios = Axios.create({
  baseURL: '/',
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

axios.interceptors.response.use(
  (response) => {
    const body = response.data;
    if (body && typeof body === 'object' && body.code !== undefined && body.code !== 0) {
      const err = new Error(body.message || '请求失败');
      err.response = { data: body };
      return Promise.reject(err);
    }
    return response;
  },
  (error) => Promise.reject(error),
);

Object.defineProperty(Vue.prototype, '$axios', {
  get() {
    return axios;
  },
});

export default axios;
