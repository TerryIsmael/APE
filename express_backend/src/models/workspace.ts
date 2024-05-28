import mongoose from '../config/mongoose.ts';
import type { IItem } from './item.ts';
import type { IProfile } from './profile.ts';

export interface IWorkspace extends mongoose.Document {
    _id: mongoose.Types.ObjectId;
    name: string;
    creationDate: Date;
    items: Array<IItem>;
    profiles: Array<IProfile>;
}