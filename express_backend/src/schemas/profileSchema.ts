import mongoose from '../config/mongoose.ts';
import type { IProfile } from '../models/profile.ts';
import { ProfileType, WSPermission } from '../models/profile.ts';
import type { IUser } from '../models/user.ts';

const profileSchema = new mongoose.Schema<IProfile>({
    profileType: {
        type: String,
        enum: {
            values: Object.values(ProfileType),
            message: '{VALUE} no es un tipo de perfil válido'
        },
        required: [true, 'El tipo de perfil es obligatorio']
    },
    name: {
        type: String,
        required: [true, 'El nombre identificador es obligatorio'],
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
            validator: async function(this: IUser, value: mongoose.Types.ObjectId[]) {
              
                if (Array.isArray(value)) {
                    for (const v of value) {
                        const existingUser = await mongoose.model<IUser>('User').findById(v);
                        if (!existingUser) return false;
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
            message: '{VALUE} no es un permiso válido'
        },
        default: WSPermission.Read
    }
});

const Profile = mongoose.model('Profile', profileSchema);
export default Profile;
