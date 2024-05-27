import mongoose from '../config/mongoose.ts';

export interface IUser extends mongoose.Document {
  _id: mongoose.Types.ObjectId;
  username: string;
  firstName: string;
  surnames: string;
  password: string;
  email: string;
  favorites: mongoose.Types.ObjectId[];
}