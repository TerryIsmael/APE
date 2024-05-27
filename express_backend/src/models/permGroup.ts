import mongoose from "../config/mongoose.ts";
import { Permission } from "./permission.ts";

export enum groupType {
    user = "User",
    profile = "Profile",
}

export interface IPermGroup {
    _id: mongoose.Types.ObjectId;
    permGroupType: groupType;
    groupId: mongoose.Types.ObjectId;
    permission: Permission;
}