import { TimerItem } from "../schemas/itemSchema";

const timerIntervals: { [key: string]: NodeJS.Timeout } = {};

export const initTimer = async (req: any, res: any) => {
    const { timerId } = req.body;

    if (timerIntervals[timerId]) {
        return res.status(400).json({ success: false, error: 'El timer ya está iniciado' });
    }

    try {
        const timer = await TimerItem.findById(timerId).exec();
        if (!timer) {
            return res.status(404).json({ success: false, error: 'Timer no encontrado' });
        }

        timer.active = true;
        timer.initialDate = new Date();
        await timer.save();

        timerIntervals[timerId] = setInterval(async () => {
            const currentTime = new Date();
            const elapsed = Math.floor((currentTime.getTime() - timer.initialDate!.getTime()) / 1000);
            timer.remainingTime = timer.duration - elapsed;

            if (timer.remainingTime <= 0) {
                clearInterval(timerIntervals[timerId]);
                delete timerIntervals[timerId];
                timer.active = false;
                timer.remainingTime = 0;
                await timer.save();
            } else {
                await timer.save();
            }
        }, 1000) as NodeJS.Timeout;

        res.json({ success: true, message: 'Timer iniciado' });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Error al iniciar el timer. ' + error });
    }
};

export const stopTimer = async(req: any, res: any) =>{
    const { timerId } = req.body;

    if (!timerIntervals[timerId]){
        return res.status(400).json({ success: false, error: 'El timer no está iniciado' });
    }


    clearInterval(timerIntervals[timerId]);
    delete timerIntervals[timerId];

    try {
        const timer = await TimerItem.findById(timerId).exec();
        if (!timer) {
            return res.status(404).json({ success: false, error: 'Timer no encontrado' });
        }

        timer.active = true;
        timer.initialDate = new Date();
        await timer.save();
        res.json({ success: true, message: 'Timer detenido' });
    }catch (error) {
        res.status(500).json({ success: false, error: 'Error al detener el timer. ' + error });
    }
}

export async function resetTimer(timerId: string) {
    clearInterval(timerIntervals[timerId]);
    delete timerIntervals[timerId];
  
    let timer = await TimerItem.findById(timerId);
    if (!timer) return;
  
    timer.active = false;
    timer.duration = 0;
    timer.remainingTime = 0;
    //TODO: undefined
    timer.initialDate = new Date();
    await timer.save();
  }
