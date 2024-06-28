import express from 'express';
import type { Express } from 'express';
import session from 'express-session';
import path from 'path';
import { fileURLToPath } from 'url';
import history from 'connect-history-api-fallback';
import router from './src/router.ts';
import passport from './src/config/passport.ts';
import cors from './src/config/cors.ts';
  
export const app: Express = express();

app.set('serverPort', process.env.SERVER_PORT);
app.use(cors);
app.use(express.json({ limit: '200mb' }));
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

export default app;