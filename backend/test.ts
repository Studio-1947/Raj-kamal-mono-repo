import { websiteApiGet } from './src/config/websiteApi.js';
websiteApiGet('/api/v1/admin/carts', new URLSearchParams({ page: '1', pageSize: '1' }))
  .then((d: any) => console.log(JSON.stringify(d.data[0].items[0], null, 2)))
  .catch(console.error);
