import mongoose from '../config/mongoose.ts';
import type { INote, INotice, ITimer, IFile, IFolder, ICalendar, IEvent, IStudySession } from '../models/typeItem.ts';

export const noteSchema = new mongoose.Schema<INote>({
    text: { 
        type: String, 
        required: [true, "El texto de la nota es obligatorio"],
        validate: {  
            validator: (value: string) => value.trim().length > 0,
            message: `El texto de la nota no puede estar vacío`
        } 
    },
});

export const noticeSchema = new mongoose.Schema<INotice>({
    text: { 
        type: String, 
        required: [true, "El texto de la nota es obligatorio"],
        validate: {  
            validator: (value: string) => value.trim().length > 0 && value.trim().length <= 1000,
            message: `El texto del anuncio no puede estar vacío y no puede superar los 1000 caracteres`
        } 
    },
    important: { 
        type: Boolean, 
        required: true,
        default: false
    }
});

export const timerSchema = new mongoose.Schema<ITimer>({
    duration: { 
        type: Number, 
        required: [true, "La duración del temporizador es obligatoria"],
        min: [0, "La duración del temporizador no puede ser negativa"],
        default: 0
    },
    remainingTime: { 
        type: Number, 
        min: [0, "El tiempo restante del temporizador no puede ser negativo"],
        default: 0
    },
    initialDate: {
        type: Date,
        validate: {
            validator: (value: Date) => value.getTime() > Date.now(),
            message: "La fecha de inicio del temporizador no puede ser anterior a la fecha actual"
        },
        default: Date.now
    },
    active: {
        type: Boolean,
        default: false
    }
});

export const fileSchema = new mongoose.Schema<IFile>({
    length: { 
        type: Number, 
        required: [true, "La longitud del archivo es obligatoria"],
        min: [0, "La longitud del archivo no puede ser negativa"],
        default: 0
    }
});

export const eventSchema = new mongoose.Schema<IEvent>({
    initDate: { 
        type: Date, 
        required: [true, "La fecha de inicio del evento es obligatoria"],
        validate: {
            validator: (value: Date) => value.getTime() > Date.now(),
            message: "La fecha de inicio del evento no puede ser anterior a la fecha actual"
        },
        default: Date.now
    },
    finalDate: { 
        type: Date, 
        required: [true, "La fecha de finalización del evento es obligatoria"],
        validate: [
            {
                validator: (value: Date) => value.getTime() > Date.now(),
                message: "La fecha de finalización del evento no puede ser anterior a la fecha actual"
            },
            {
                validator: function(this: IEvent, value: Date) {
                    return value.getTime() > this.initDate.getTime();
                },                
                message: "La fecha de finalización del evento no puede ser anterior a la fecha de inicio"
            }
        ],
        default: Date.now
    }
});

export const folderSchema = new mongoose.Schema<IFolder>({});

export const calendarSchema = new mongoose.Schema<ICalendar>({
    //TODO: Define properties
});

export const studySessionSchema = new mongoose.Schema<IStudySession>({
    //TODO: Define properties
});


