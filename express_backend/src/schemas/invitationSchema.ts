import mongoose from '../config/mongoose.ts';
import type { IInvitation } from '../models/invitation.ts';
import type { IProfile } from '../models/profile.ts';
import type { IWorkspace } from '../models/workspace.ts';

const invitationSchema = new mongoose.Schema<IInvitation>({
    code: {
        type: String,
        required: [true, "El código de la invitación es obligatorio"],
        validate: {
            validator: (value: string) => value.trim().length > 0,
            message: "El código de la invitación no puede estar vacío"
        }
    },
    workspace: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Workspace',
        required: [true, "El workspace es obligatorio"],
        validate: {
            validator: async function(value: mongoose.Types.ObjectId) {
                const existingWorkspace = await mongoose.model<IWorkspace>('Workspace').findById(value);
                return existingWorkspace;
            },
            message: "Este workspace no existe"
        }
    },
    profile: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Profile',
        validate: [
            { 
                async validator(value: mongoose.Types.ObjectId) {
                    const existingProfile = await mongoose.model<IProfile>('Profile').findById(value);
                    return existingProfile;
                },
                message: "Este perfil no existe"
            },
            {
                async validator(this: IInvitation, value: mongoose.Types.ObjectId) {
                    const existsProfileInWs = (await mongoose.model<IWorkspace>('Workspace').findById(this.workspace))?.profiles.some(profile => profile?._id.toString() === value.toString());
                    return existsProfileInWs;
                },
                message: "Este perfil no existe en el workspace seleccionado"
            }
        ]
    },
    expirationDate: {
        type: Date,
        validate: {
            validator: (value: Date) => value.getTime() > Date.now(),
            message: "La fecha de expiración debe ser mayor a la fecha actual"
        }
    },
    active: {
        type: Boolean,
        default: true
    }
});

const Invitation = mongoose.model('Invitation', invitationSchema);

export default Invitation;