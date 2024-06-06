import type mongoose from "mongoose";
import type { IProfile } from "./profile";

export enum Permission {
    Read = "Read",
    Write = "Write",
    Owner = "Owner",
}

export interface IProfilePerms {
    profile: mongoose.PopulatedDoc<IProfile> | mongoose.Types.ObjectId;
    permission: Permission;
}