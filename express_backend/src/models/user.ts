import mongoose from '../config/mongoose.js';

export interface IUser extends mongoose.Document {
  _id: mongoose.Types.ObjectId;
  username: string;
  password: string;
  email: string;
  favorites: mongoose.Types.ObjectId[];
}