import mongoose from '../config/mongoose.ts';
import type { IItem } from './item.ts';
import type { IMember } from './member.ts';
import type { IPermGroup } from './permGroup.ts';

export interface IWorkspace extends mongoose.Document {
    _id: mongoose.Types.ObjectId;
    name: string;
    ownerId: mongoose.Types.ObjectId;
    creationDate: Date;
    items: Array<IItem>;
    members: Array<IMember>;
    permgroups: Array<IPermGroup>;
}