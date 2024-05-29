import Workspace from "../schemas/workspaceSchema.ts"
import type { IProfile } from '../models/profile.ts';
import { WSPermission } from '../models/profile.ts';
import { Permission } from '../models/profilePerms.ts';
import mongoose from 'mongoose';

export async function getWSPermission(userId: any, workspaceId: any): Promise<WSPermission>{
    try {
        const result = await Workspace.aggregate([
            { $match: { _id: mongoose.Types.ObjectId.createFromHexString(workspaceId) } }, 
            { $unwind: '$profiles' },
            { $match: { 'profiles.users': userId } },
            { $addFields: { 'profiles.wsPermLevel': { $function: {
                body: function(profile : IProfile) {
                    enum WSPermission {
                        Read = 'Read',
                        Write = 'Write',
                        Admin = 'Admin',
                        Owner = 'Owner',
                    }                    
                    const permissionHierarchy: { [key in WSPermission]: number } = {[WSPermission.Read]: 1,[WSPermission.Write]: 2,[WSPermission.Admin]: 3,[WSPermission.Owner]: 4};
                    return profile.wsPerm ? permissionHierarchy[profile.    wsPerm] : 0;
                },args: ['$profiles'], lang: 'js' 
            } } } }, // Add numeric level of wsPerm
            { $sort: { 'profiles.wsPermLevel': -1 } }, 
            { $limit: 1 },
            { $project: { _id: 0, wsPerm: '$profiles.wsPerm' } }
        ]).exec();
        return result[0]?.wsPerm;
    } catch (err) {
        console.error('Error finding profiles with user:', err);
        throw err;
    }
}

export async function getItemPermission(userId: any, workspaceId: any, itemId: any): Promise<Permission>{
    try {
        const result = await Workspace.aggregate([
            { $match: { _id:  mongoose.Types.ObjectId.createFromHexString(workspaceId) } }, 
            { $unwind: '$items' }, 
            { $match: { 'items._id':  mongoose.Types.ObjectId.createFromHexString(itemId) } }, 
            { $unwind: '$profilePerms' },
            { $lookup: { // Lookup para unir la colección de perfiles
                from: 'profiles', // Nombre de la colección de perfiles
                localField: 'profilePerms.profile', // Campo local para unir (referencia al perfil)
                foreignField: '_id', // Campo externo para unir (identificador del perfil)
                as: 'profile' // Alias para el resultado del lookup
            } },
            { $unwind: '$profile' }, 
            { $match: { 'profile.users': userId } }, 
            { $addFields: { 'itemPerm': { $function: {
                body: function(itemPerm : Permission) {
                    enum Permission {
                        Read = "Read",
                        Write = "Write",
                        Owner = "Owner",
                    }
                    const permissionHierarchy: { [key in Permission]: number } = {[Permission.Read]: 1,[Permission.Write]: 2,[Permission.Owner]: 3};
                    return permissionHierarchy[itemPerm];
                },args: ['$profilePerms.itemPerm'], lang: 'js' 
            } } } }, // Add numeric level of itemPerm
            { $sort: { 'itemPerm': -1 } }, 
            { $limit: 1 },
            { $project: { _id: 0, itemPerm: 1 } } 
        ]).exec();

        return result[0]?.itemPerm;
    } catch (err) {
        console.error('Error finding items with user:', err);
        throw err;
    }
}

export async function getUserPermission(userId: any, workspace: any, item?: any): Promise<Permission> {
    const profile = await getWSPermission(userId, workspace);
    if (profile === WSPermission.Owner) {
        return Permission.Owner;
    }else if (profile === WSPermission.Admin) {
        return Permission.Owner;
    }else if (profile === WSPermission.Write) {
        if(item) return await getItemPermission(userId, workspace, item);
        else return Permission.Write;
    }else if (profile === WSPermission.Read) {
    return Permission.Read;
    }
    return profile;
}