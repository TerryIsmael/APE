import mongoose from '../config/mongoose.ts';
import type { IProfile } from './profile.ts';

export interface IWorkspace extends mongoose.Document {
    _id: mongoose.Types.ObjectId;
    name: string;
    creationDate: Date;
    items: mongoose.Types.ObjectId[];
    profiles: Array<IProfile>;
    default: boolean;
}