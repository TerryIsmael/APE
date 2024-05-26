import File from '../schemas/fileSchema.js';
import User from '../schemas/userSchema.js';
import type { IUser } from '../models/user.js';
import mongoose from '../config/mongoose.js';

const { ObjectId } = mongoose.Types;

export async function getMyFiles(user: IUser) {
    try {
        const files = await File.find({ $or: [{ owner: user._id }, { 'sharedWith.user': user._id }] })
            .populate('owner')
            .populate('sharedWith.user');
        return files;
    } catch (error : any) {
        throw new Error(`Error retrieving files: ${error.message}`);
    }
}

// export function uploadFile(archivo, user) {
//     return new Promise((resolve, reject) => {
//         const bucket = new GridFSBucket(db);
//         const stream = bucket.openUploadStream(archivo.originalname);
//         stream.on('error', reject);
//         stream.on('finish', async () => {
//             try {
//                 let file = undefined;
                
//                 if (mongooseMode) {
//                     file = await File.findOne({ _id: stream.id });
//                     file.contentType = file.filename.split('.').pop();
//                     file.owner = user;
//                     file.sharedWith = [];
//                     try {
//                         await file.validate();
//                     } catch (errors) {
//                         const errorsMessages = [];
//                         for (let fieldErrors in errors.errors) {
//                             errorsMessages.push(errors.errors[fieldErrors].message);
//                         }
//                         reject(errorsMessages);
//                     }
//                     await file.save();
//                 } else {
//                     file = await db.collection("fs.files").findOne({ _id: stream.id });
//                     file.contentType = file.filename.split('.').pop();
//                     file.owner = user._id;
//                     file.sharedWith = [];
//                     await db.collection("fs.files").updateOne({ _id: stream.id }, { $set: file });
//                 }
                
//                 if (!file) {
//                     reject(new Error('No se encontró el archivo guardado en MongoDB'));
//                     return;
//                 }
//                 resolve(file._id);
//             } catch (error) {
//                 reject(error);
//             }
//         });
//         stream.end(archivo.buffer);
//     });
// }

export function deleteFile(fileId: String, user: IUser) {
    return new Promise<void>(async (resolve, reject) => {
        try {
            let file = undefined;
            file = await File.findOne({ _id: fileId });
            if (!file) {
                reject(new Error('No se encontró el archivo guardado en MongoDB'));
                return;
            }
            const perm = file.sharedWith.some(x =>x.user == user._id && x.perm=='write');
            if (perm || file.owner.equals(user._id)) {
                await File.deleteOne({ _id: file._id });
            } else {
                reject(new Error('No tiene permisos para eliminar el archivo')); 
            }
            
            resolve();
        } catch (error) {
            reject(error);
        }
    });
}

export function changePerms(fileId: String, username: String, perm: string, user: IUser) {
    return new Promise<void>(async (resolve, reject) => {
        try {
            let file = undefined;

            file = await File.findOne({ _id: fileId });
            if (!file) {
                reject(new Error('No se encontró el archivo guardado en MongoDB'));
                return;
            }
            if (file.owner.equals(user._id)) {
                const userId = await User.findOne({ username: username }).then((x: IUser | null) => x ? x._id : null);
                if (!userId) {
                    reject(new Error('El usuario con el que se quiere compartir el archivo no existe'));
                    return;
                }
                if (!perm) {
                    reject(new Error('El usuario con el que se quiere compartir el archivo no existe'));
                    return;
                }
                for (let i = file.sharedWith.length - 1; i >= 0; i--) {
                    if (file.sharedWith[i].user?.equals(userId)) {
                        file.sharedWith.splice(i, 1);
                    }
                }

                if (perm != 'none'){
                    file.sharedWith.push({user: userId, perm: perm });
                }
                await file.save();
            } else {
                reject(new Error('No tiene permisos para cambiar los permisos del archivo')); 
            }
        
            resolve();
        } catch (error) {
            reject(error);
        }
    });
}

// export function downloadFile(fileId: String, user: typeof User) {
//     return new Promise(async (resolve, reject) => {
//         try {
//             let file = await File.findOne({ _id: fileId });
            
//             if (!file) {
//                 reject(new Error('No se encontró el archivo guardado en MongoDB'));
//                 return;
//             }
//             const perm = file.sharedWith.some(x => x.user.equals(user._id) && (x.perm=='write' || x.perm=='read'));
//             if (user && user._id && (file.owner.equals(user._id) || perm)) {
//                 const bucket = new GridFSBucket(db);
//                 const downloadStream = bucket.openDownloadStream(ObjectId.createFromHexString(fileId));
//                 resolve(downloadStream);
//             } else {
//                 reject(new Error('No tiene permisos para descargar el archivo'));
//             }
//         } catch (error) {
//             reject(error);
//         }
//     });
// }

export async function toggleFavorite(fileId: string, user: IUser) {
    try {
        const objectId = new ObjectId(fileId);
        const file = await File.findOne({ _id: objectId });
        const dbUser = await User.findOne({ _id: user._id });

        if (!file) {
            throw new Error('No se encontró el archivo guardado en MongoDB');
        }

        if (!dbUser) {
            throw new Error('No se encontró el usuario guardado en MongoDB');
        }

        const liked = dbUser.favorites.includes(objectId);
        if (liked) {
            dbUser.favorites = dbUser.favorites.filter(x => !x.equals(objectId));
        } else {
            dbUser.favorites.push(objectId);
        }

        await dbUser.save();
        return !liked;
    } catch (error: any) {
        throw new Error(`Error toggling favorite: ${error.message}`);
    }
}