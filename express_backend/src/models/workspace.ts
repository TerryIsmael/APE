import mongoose from '../config/mongoose.ts';
import type { IItem } from './item.ts';
import type { IProfile } from './profile.ts';

export interface IWorkspace extends mongoose.Document {
    _id: mongoose.Types.ObjectId;
    name: string;
    creationDate: Date;
    items: Array<mongoose.PopulatedDoc<IItem>> | Array<mongoose.Types.ObjectId>;
    profiles: Array<mongoose.PopulatedDoc<IProfile>> | Array<mongoose.Types.ObjectId>;
    default: boolean;
}