import { Staark } from '@staark-inc/node';

const api = new Staark({ apiKey: process.env.STAARK_API_KEY });

export default api;
