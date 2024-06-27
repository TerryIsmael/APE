import Workspace from "../schemas/workspaceSchema.ts"
import type { IProfile } from '../models/profile.ts';
import { WSPermission } from '../models/profile.ts';
import { Permission } from '../models/profilePerms.ts';
import mongoose from 'mongoose';
import Item from "../schemas/itemSchema.ts";

export async function getWSPermission(userId: any, workspaceId: any): Promise<WSPermission>{
    try {
        const result = await Workspace.aggregate([
            { $match: { _id: mongoose.Types.ObjectId.createFromHexString(workspaceId) } },
            {
                $lookup: {
                    from: 'profiles',
                    localField: 'profiles',
                    foreignField: '_id',
                    as: 'populatedProfiles'
                }
            },
            { $unwind: '$populatedProfiles' },
            { $match: { 'populatedProfiles.users': userId } },
            { $addFields: { 'populatedProfiles.wsPermLevel': { $function: {
                body: function(profile : IProfile) {
                    enum WSPermission {
                        Read = 'Read',
                        Write = 'Write',
                        Admin = 'Admin',
                        Owner = 'Owner',
                    }                    
                    const permissionHierarchy: { [key in WSPermission]: number } = {[WSPermission.Read]: 1,[WSPermission.Write]: 2,[WSPermission.Admin]: 3,[WSPermission.Owner]: 4};
                    return profile.wsPerm ? permissionHierarchy[profile.    wsPerm] : 0;
                },args: ['$populatedProfiles'], lang: 'js' 
            } } } },
            { $sort: { 'populatedProfiles.wsPermLevel': -1 } }, 
            { $limit: 1 },
            { $project: { _id: 0, wsPerm: '$populatedProfiles.wsPerm' } }
        ]).exec();
        return result[0]?.wsPerm;
    } catch (err) {
        console.error('Error finding profiles with user:', err);
        throw err;
    }
}

export async function getItemPermission(userId: mongoose.Types.ObjectId, itemId: String): Promise<Permission | undefined>{
    try {
        const permissionHierarchy: { [key in Permission]: number } = {[Permission.Read]: 1,[Permission.Write]: 2,[Permission.Owner]: 3}
        const item = await Item.findOne({ _id: itemId });
        await item?.populate('profilePerms.profile');
        const profilePerms = item?.profilePerms.filter((profilePerm) => (profilePerm?.profile as IProfile)?.users?.includes(userId));
        if (profilePerms?.length === 0) {
            return undefined;
        }
        return profilePerms?.map((profilePerm) => [profilePerm.permission, permissionHierarchy[profilePerm.permission as Permission]]).sort((a, b) => Number(b[1]) - Number(a[1]))[0][0] as Permission;
    } catch (err) {
        console.error('Error finding item perms by user. Error:', err);
        throw err;
    }
}

export async function getUserPermission(userId: any, workspace: any, item?: any): Promise<Permission | undefined> {
    const profile = await getWSPermission(userId, workspace);
    if (profile === WSPermission.Owner) {
        return Permission.Owner;
    } else if (profile === WSPermission.Admin) {
        return Permission.Owner;
    } else if (profile === WSPermission.Write) {
        if (item) return await getItemPermission(userId, item);
        else return Permission.Write;
    } else if (profile === WSPermission.Read) {
        if (item) return await getItemPermission(userId, item);
        else return Permission.Read;
    }
    return profile;
}