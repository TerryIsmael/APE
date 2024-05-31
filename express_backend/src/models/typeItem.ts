import type { IItem } from './item.ts';

export interface INote extends IItem {
    text: string;
}

export interface INotice extends IItem {
    text: string;
    important: boolean;
}

export interface ITimer extends IItem {
    duration: number;
    remainingTime: number;
    initialDate: Date;
    active: boolean;
}

export interface IFile extends IItem {
    length: number;
}

export interface IFolder extends IItem {
}

export interface IEvent extends IItem {
    initDate: Date;
    finalDate: Date;
}

export interface ICalendar extends IItem {
    events: Array<IEvent>;
}

export interface IStudySession extends IItem {
    //TODO: Define study session properties
}


