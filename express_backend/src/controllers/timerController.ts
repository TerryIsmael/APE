import type mongoose from "mongoose";
import { sendMessageToWorkspace } from "../config/websocket";
import { Permission } from "../models/profilePerms";
import type { ITimer } from "../models/typeItem";
import { TimerItem } from "../schemas/itemSchema";
import Workspace from "../schemas/workspaceSchema";
import { getUserPermission } from "../utils/permsFunctions";

const timerIntervals: { [key: string]: NodeJS.Timeout } = {};

export const modifyTimer = async (req: any, res: any) => {
    const timerId = req.body.timerId;
    const wsId = req.body.workspace;
    const action = req.body.action;

    if (!wsId || !timerId || !action) {
        const missingFields = [!wsId?"workspace":null, !timerId?"timerId":null, !action?"action":null].filter((field) => field !== null).join(', ');
        return res.status(400).json({ error: 'No se han especificado el/los campo(s) '+ missingFields });
    }

    const timer =  await TimerItem.findById(timerId);
    if (await Workspace.findById(wsId) === null) {
        return res.status(404).json({ success: false, error: 'Workspace no encontrado' });
    } 
    const perm = await getUserPermission(req.user._id, req.body.workspace, timerId);
    if (!perm || ![Permission.Owner, Permission.Write].includes(perm)) {
        return res.status(403).json({ success: false, error: 'No tienes permisos para modificar el temporizador' });
    }
    if (!timer) {
        return res.status(404).json({ success: false, error: 'Temporizador no encontrado' });
    }
    let result;
    switch (action) {
        case 'init':
            result = await initTimer(timer, wsId);
            break;
        case 'stop':
            result = await stopTimer(timer);
            break;
        case 'reset':
            result = await resetTimer(timer);
            break;
        case 'edit':
            if (!req.body.duration) {
                return res.status(400).json({ success: false, error: 'Duración no especificada' });
            }
            result = await editTimerTime(timer, req.body.duration);
            break;
        default:
            return res.status(400).json({ success: false, error: 'Acción no válida' });
    }
    if (result?.success === true){
        const modifiedTimer = await TimerItem.findById(timerId);
        sendMessageToWorkspace(wsId, { type: 'timer', action, timer:modifiedTimer });
        res.status(result?.status).json({ success: true, message: result.message });
    }else{
        res.status(result?.status).json({ success: false, error: result?.error });
    }
    
}

async function initTimer (timer:mongoose.Document<unknown, {}, ITimer> & ITimer, wsId: string) {
    const timerId = timer._id.toString();
    
    if (timerIntervals[timerId]) {
        timer.active = true;
        timer.save();
        return ({status:400, success: false, error: 'El temporizador ya está iniciado', timer: timer})
    }

    try {
        timer.active = true;
        timer.initialDate = new Date();
        await timer.save();
        timerIntervals[timerId] = setInterval(async () => {
            timer.remainingTime--;
            if (timer.remainingTime <= 0) {
                clearInterval(timerIntervals[timerId]);
                delete timerIntervals[timerId];
                timer.active = false;
                timer.remainingTime = 0;
            } 
            sendMessageToWorkspace(wsId, { type: 'timer', action: "sync", timer });
            await timer.save();
        }, 1000) as NodeJS.Timeout;
        return ({status:200, success: true, message: 'Temporizador iniciado' });
    } catch (error) {
        return ({status:500, success: false, error: 'Error al iniciar el temporizador. ' + error });
    }
};

async function stopTimer (timer: mongoose.Document<unknown, {}, ITimer> & ITimer ) {
    const timerId = timer._id.toString();
    if (!timerIntervals[timerId]){
        timer.active = false;
        await timer.save();
        return ({status:400, success: false, error: 'El temporizador no está iniciado', timer: timer});
    }

    clearInterval(timerIntervals[timerId]);
    delete timerIntervals[timerId];

    try {
        timer.active = false;
        await timer.save();
        return ({status:200, success: true, message: 'Temporizador detenido' });
    }catch (error) {
        return ({status:500, success: false, error: 'Error al detener el temporizador. ' + error });
    }
}

async function resetTimer(timer: mongoose.Document<unknown, {}, ITimer> & ITimer) {
    const timerId = timer._id.toString();
    try{
        clearInterval(timerIntervals[timerId]);
        delete timerIntervals[timerId];

        timer.active = false;
        timer.remainingTime = timer.duration;
        timer.initialDate = new Date();
        await timer.save();
        return ({status:200, success: true, message: 'Temporizador reiniciado' });
    }catch (error) {
        return ({status:500, success: false, error: 'Error al reiniciar el temporizador. ' + error });
    }
}

async function editTimerTime(timer: mongoose.Document<unknown, {}, ITimer> & ITimer, duration: number){
    const timerId = timer._id.toString();
    try{
        clearInterval(timerIntervals[timerId]);
        delete timerIntervals[timerId];

        timer.active = false;
        timer.duration = duration;
        timer.remainingTime = timer.duration;
        timer.initialDate = new Date();
        await timer.save();
        return ({status:200, success: true, message: 'Temporizador modificado' });
    }catch (error) {
        return ({status:500, success: false, error: 'Error al modificar el temporizador. ' + error });
    }

}
 