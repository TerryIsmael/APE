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
    ready: boolean;
}

export interface IFolder extends IItem {
}

export interface IEvent extends IItem {
    title: string;
    start: Date;
    end: Date;
}

export interface ICalendar extends IItem {
    events: Array<IEvent>;
}


