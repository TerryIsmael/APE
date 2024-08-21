import cors from 'cors';
import type { CorsOptions } from 'cors';

const TEST_MODE = process.env.TEST_MODE === 'false'; 
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [];
const allowedIPOrigins = process.env.ALLOWED_IP_ORIGINS?.split(',') || [];

const corsOptions: CorsOptions = {
  origin: (origin, callback) => {
    const originIP = origin?.split(':').slice(0, -1).join(':');
    if (!TEST_MODE && (!origin || (!allowedIPOrigins.includes(originIP?originIP:"") && !allowedOrigins.includes(origin)))) {
      callback(new Error('Not allowed by CORS'));
    } else {
      callback(null, true);
    }
  },
  credentials: true,
  exposedHeaders: ['Access-Control-Allow-Origin']
};

export default cors(corsOptions);