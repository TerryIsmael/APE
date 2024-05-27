import bcrypt from 'bcrypt';
import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import User from '../schemas/userSchema.ts';
import type { IUser } from '../models/user.ts';

passport.use(new LocalStrategy(
  async (username: string, password: string, done: Function) => {

    let user : IUser | null; 
    user = await User.findOne({ username: username });
    
    if (!user) {
      return done(null, false, { message: 'No existe ninguna cuenta con este nombre de usuario' });
    }
    if (!await bcrypt.compare(password, user.password)) {
      return done(null, false, { message: 'Contraseña incorrecta' });
    }
    return done(null, user);
  }
));

passport.serializeUser(function(user: any, done: Function) {
  done(null, user._id.toString());
});
  
passport.deserializeUser(async function (id, done) {
  let user;
  user = await User.findById(id);
  done(null, user);
});
  
export default passport;