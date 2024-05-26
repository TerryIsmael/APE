import express from 'express';
import type { Express } from 'express';
import session from 'express-session';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import history from 'connect-history-api-fallback';
import router from './src/router.js';
import passport from './src/config/passport.js';
import cors from './src/config/cors.js';

dotenv.config();  
const app: Express = express();

app.set('serverPort', process.env.SERVER_PORT);

app.use(cors);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(path.dirname(fileURLToPath(import.meta.url)), 'public')));
app.use(session({
  secret: process.env.SESSION_SECRET || '',
  resave: false,
  saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

app.use(router);
app.use(history());

app.use(passport.session());

app.use(router);
app.use(history());

const serverPort: number = app.get('serverPort');

app.listen(serverPort, () => {
  console.log(`Servidor iniciado en el puerto ${serverPort}`);
}); 