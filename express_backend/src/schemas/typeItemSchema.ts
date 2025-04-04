import mongoose from '../config/mongoose.ts';
import type { INote, INotice, ITimer, IFile, IFolder, ICalendar, IEvent } from '../models/typeItem.ts';

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
        required: [true, "El texto del anuncio es obligatorio"],
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
        min: [1, "La duración del temporizador no puede ser 0 o inferior"],
    },
    remainingTime: { 
        type: Number, 
        min: [0, "El tiempo restante del temporizador no puede ser negativo"],
        default: 0
    },
    initialDate: {
        type: Date,
    },
    active: {
        type: Boolean,
        default: false
    }
});

export const fileSchema = new mongoose.Schema<IFile>({
    ready: { 
        type: Boolean, 
        default: false
    }
});

export const eventSchema = new mongoose.Schema<IEvent>({
    title: { 
        type: String, 
        required: [true, "El título del evento es obligatorio"],
        validate: {  
            validator: (value: string) => value.trim().length > 0,
            message: `El título del evento no puede estar vacío`
        } 
    },
    start: { 
        type: Date, 
        required: [true, "La fecha de inicio del evento es obligatoria"],
        default: Date.now
    },
    end: { 
        type: Date, 
        validate: [
            {
                validator: function(this: IEvent, value: Date) {
                    return value.getTime() >= this.start.getTime();
                },                
                message: "La fecha de finalización del evento no puede ser anterior a la fecha de inicio"
            }
        ],
        default: Date.now
    }
});

export const folderSchema = new mongoose.Schema<IFolder>({});

export const calendarSchema = new mongoose.Schema<ICalendar>({
    events: { 
        type: [eventSchema], 
        default: []
    }
});



