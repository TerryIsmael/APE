import cors from 'cors';
import type  { CorsOptions } from 'cors';
const allowedOrigins = [
  'http://localhost:5173',
  'chrome-extension://eipdnjedkpcnlmmdfdkgfpljanehloah',
  'https://vrk28fp0-5173.uks1.devtunnels.ms',
];

const corsOptions: CorsOptions = {
  origin: (origin, callback) => {
    if ( !origin || !allowedOrigins.includes(origin)) {
      callback(new Error('Not allowed by CORS'));
    } else {
      callback(null, true);
    }
  },
  credentials: true,
  exposedHeaders: ['Access-Control-Allow-Origin']
};

export default cors(corsOptions);