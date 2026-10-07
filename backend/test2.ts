import { websiteApiGet } from './src/config/websiteApi.js';
websiteApiGet('/api/v1/admin/carts', new URLSearchParams({ search: '8953953339' }))
  .then((d: any) => console.log(JSON.stringify(d.data[0].items, null, 2)))
  .catch(console.error);
