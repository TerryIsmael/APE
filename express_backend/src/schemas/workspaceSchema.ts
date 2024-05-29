import mongoose from '../config/mongoose.ts';
import type { IProfile } from '../models/profile.ts';
import { ProfileType, WSPermission } from '../models/profile.ts';
import type { IUser } from '../models/user.ts';
import type { IWorkspace } from '../models/workspace';
import { itemSchema } from './itemSchema.ts';

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
            validator: async function(this: IUser, value: Array<IUser>) {
              
                if (Array.isArray(value)) {
                    for (const user of value) {
                        const existingUser = await mongoose.model<IUser>('User').findById(user._id);
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

const workspaceSchema = new mongoose.Schema<IWorkspace>({
    name: {
        type: String,
        required: [true, "El nombre del espacio de trabajo es obligatorio"],
        validate: {
                validator: (value: string) => { return value.trim().length > 0 && value.trim().length <= 55;},
        message: "El nombre del workspace debe tener entre 1 y 55 caracteres"
        },
    },
    creationDate: {
        type: Date,
        default: Date.now,
        required: [true, "La fecha de creación del espacio de trabajo es obligatoria"],
    },
    default:
    {
        type: Boolean,
        default: false,
    },
    profiles: [profileSchema],
    items: [itemSchema],
});

const Workspace = mongoose.model('Workspace', workspaceSchema);

export default Workspace;