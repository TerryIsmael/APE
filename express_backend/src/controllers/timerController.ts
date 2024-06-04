import { sendMessageToWorkspace } from "../config/websocket";
import { Permission } from "../models/profilePerms";
import { TimerItem } from "../schemas/itemSchema";
import Workspace from "../schemas/workspaceSchema";
import { getUserPermission } from "../utils/permsFunctions";

const timerIntervals: { [key: string]: NodeJS.Timeout } = {};

export const modifyTimer = async (req: any, res: any) => {
    const timerId = req.body.timerId;
    const wsId = req.body.workspace;
    const action = req.body.action;
    if (Workspace.findById(wsId) === null) {
        return res.status(404).json({ success: false, error: 'Workspace no encontrado' });
    }
    if ([Permission.Owner, Permission.Write].includes(await getUserPermission(req.user._id, req.body.workspace, timerId))) {
        return res.status(403).json({ success: false, error: 'No tienes permisos para iniciar el timer' });
    }
    const timer = await TimerItem.findById(req.body.timerId).exec();
    if (!timer) {
        return res.status(404).json({ success: false, error: 'Timer no encontrado' });
    }
    let result;
    switch (action) {
        case 'init':
            result = await initTimer(timerId);
            break;
        case 'stop':
            result = await stopTimer(timerId);
            break;
        case 'reset':
            result = await resetTimer(timerId);
            break;
        default:
            return res.status(400).json({ success: false, error: 'Acción no válida' });
    }
    if (result?.success === true){
        sendMessageToWorkspace(wsId, { type: 'timerStopped', timer });
        res.status(result?.status).json({ success: true, message: result.message });
    }else{
        res.status(result?.status).json({ success: false, error: result?.error });
    }
    
}

async function initTimer (timerId: string) {

    if (timerIntervals[timerId]) {
        return ({status:400, success: false, error: 'El timer ya está iniciado' })
    }

    try {
        const timer = await TimerItem.findById(timerId).exec();
        if (!timer) {
            return ({status:404, success: false, error: 'Timer no encontrado' });
        }

        timer.active = true;
        timer.initialDate = new Date();
        await timer.save();

        timerIntervals[timerId] = setInterval(async () => {
            const elapsed = ( new Date().getTime() - timer.initialDate!.getTime()) / 1000;
            timer.remainingTime = timer.duration - elapsed;

            if (timer.remainingTime <= 0) {
                clearInterval(timerIntervals[timerId]);
                delete timerIntervals[timerId];
                timer.active = false;
                timer.remainingTime = 0;  
            } 
            await timer.save();
        }, 1000) as NodeJS.Timeout;
        return ({status:200, success: true, message: 'Timer iniciado' });
    } catch (error) {
        return ({status:500, success: false, error: 'Error al iniciar el timer. ' + error });
    }
};

async function stopTimer (timerId: string) {

    if (!timerIntervals[timerId]){
        const timer = await TimerItem.findById(timerId).exec();
        if (!timer) {
            return ({status:404, success: false, error: 'Timer no encontrado' });
        }
        timer.active = false;
        timer.initialDate = new Date();
        await timer.save();
        return ({status:400, success: false, error: 'El timer no está iniciado' });
    }


    clearInterval(timerIntervals[timerId]);
    delete timerIntervals[timerId];

    try {
        const timer = await TimerItem.findById(timerId).exec();
        if (!timer) {
            return ({status:404, success: false, error: 'Timer no encontrado' });
        }

        timer.active = true;
        timer.initialDate = new Date();
        await timer.save();
        return ({status:200, success: true, message: 'Timer detenido' });
    }catch (error) {
        return ({status:500, success: false, error: 'Error al detener el timer. ' + error });
    }
}

async function resetTimer(timerId: string) {
    try{
        clearInterval(timerIntervals[timerId]);
        delete timerIntervals[timerId];
        
        let timer = await TimerItem.findById(timerId);
        if (!timer) return;
    
        timer.active = false;
        timer.duration = 0;
        timer.remainingTime = 0;
        timer.initialDate = new Date();
        await timer.save();
        return ({status:200, success: true, message: 'Timer reiniciado' });
    }catch (error) {
        return ({status:500, success: false, error: 'Error al reiniciar el timer. ' + error });
    }
}
