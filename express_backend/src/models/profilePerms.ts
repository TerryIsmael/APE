import type { IProfile } from "./profile.ts";

export enum Permission {
    Read = "Read",
    Write = "Write",
    Owner = "Owner",
}

export interface IProfilePerms {
    profile: IProfile;
    permission: Permission;
}