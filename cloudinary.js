// cloudinary.js (server-side usage only)
// Do NOT bundle this into client-side code. Use it from a server (e.g., Netlify Functions).

import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: 'dcinv5xbc',
  api_key: '499858486962762',
  api_secret: 'HxHE7sdShQOqb1u00vBRGP6qXmI',
});

export default cloudinary;
