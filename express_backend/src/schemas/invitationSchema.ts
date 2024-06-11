import mongoose from '../config/mongoose.ts';
import { ItemType } from '../models/item.ts';
import type { IProfile } from '../models/profile.ts';
import type { IProfilePerms } from '../models/profilePerms.ts';
import { Permission } from '../models/profilePerms.ts';
import type { INote, INotice, ITimer, IFolder, ICalendar, IEvent, IFile, IStudySession } from '../models/typeItem.ts';
import { noteSchema, noticeSchema, timerSchema, folderSchema, calendarSchema, eventSchema, fileSchema, studySessionSchema } from './typeItemSchema.ts';

// code: string;
// workspace: mongoose.Types.ObjectId;
// profile: string;
// expirationDate: Date;
// active: boolean;

const invitationSchema = new mongoose.Schema<IProfilePerms>({
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
                const existingWorkspace = await mongoose.model<IProfile>('Workspace').findById(value);
                return existingWorkspace;
            },
            message: "Este workspace no existe"
        }
    },
    profile: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Profile',
        validate: {
            validator: async function(value: mongoose.Types.ObjectId) {
                const existingProfile = await mongoose.model<IProfile>('Profile').findById(value);
                return existingProfile;
            },
            message: "Este perfil no existe"
        }
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