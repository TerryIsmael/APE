import mongoose from '../config/mongoose.ts';
import type { IProfile } from '../models/profile.ts';
import { ProfileType, WSPermission } from '../models/profile.ts';
import type { IUser } from '../models/user.ts';

const profileSchema = new mongoose.Schema<IProfile>({
    profileType: {
        type: String,
        enum: {
            values: Object.values(ProfileType),
            message: 'El tipo del perfil debe ser Group o Individual'
        },
        required: [true, 'El tipo de perfil es obligatorio']
    },
    name: {
        type: String,
        required: [true, 'El nombre identificador es obligatorio'],
        maxlength: [60, 'El nombre identificador no puede tener más de 60 caracteres'],
        validate: {
            validator: (value: string) => value.trim().length > 0,
            message: 'El nombre identificador no puede estar vacío'
        }
    },
    users: {
        type: [mongoose.Types.ObjectId],
        ref: 'User',
        required: [true, 'El usuario es obligatorio'],
        validate: {
            validator: async function(this: IUser, value: (mongoose.Types.ObjectId | mongoose.PopulatedDoc<IUser>)[]) {
                if (Array.isArray(value)) {
                    for (const v of value) {
                        if (v instanceof mongoose.Types.ObjectId) {
                            const existingUser = await mongoose.model<IUser>('User').findById(v);
                            if (!existingUser) return false;
                        } else {
                            return true;
                        }
                    }
                    return true; 
                } else {
                    return false;
                }
            },
            message: "Los usuarios asignados deben existir en el sistema"
        },
        default: []
    },
    wsPerm: {
        type: String,
        required: [true, 'El permiso del perfil es obligatorio'],
        enum: {
            values: Object.values(WSPermission),
            message: 'El permiso debe ser Read, Write o Admin'
        },
        default: WSPermission.Read
    }
});

const Profile = mongoose.model('Profile', profileSchema);
export default Profile;
