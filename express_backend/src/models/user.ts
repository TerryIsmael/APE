import mongoose from '../config/mongoose.ts';
import type { IItem } from './item.ts';

export interface IUser extends mongoose.Document {
  _id: mongoose.Types.ObjectId;
  username: string;
  firstName: string;
  surnames: string;
  password: string;
  email: string;
  favorites: Array<mongoose.Types.ObjectId> | Array<mongoose.PopulatedDoc<IItem>>;
}