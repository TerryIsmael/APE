import mongoose from '../config/mongoose.ts';  
import { Permission } from './permission.ts';

export interface IMember {
    userId: mongoose.Types.ObjectId;
    profile: Array<string>;
}