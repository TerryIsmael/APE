import Workspace from '../schemas/workspaceSchema.ts';
import type { IProfile } from '../models/profile.ts';
import { ProfileType, WSPermission } from '../models/profile.ts';
import { parseValidationError } from '../utils/errorParser.ts';

export const getWorkspace = async (req: any, res: any) => {
  try {
    const wsId = req.query.wsId;
    if (!wsId) {
        const workspace = await Workspace.findOne({ default: true, profiles: {
            $elemMatch: {
                name: req.user._id.toString(),
                wsPerm: WSPermission.Owner
            }
        } });
        res.status(200).json(workspace);
        return;
    }else{
        const workspace = await Workspace.findOne({ _id: wsId });
        if (workspace) {
            if (workspace.profiles.find((profile: IProfile) => profile.name == req.user._id.toString())) {
                res.status(200).json(workspace);
            } else {
                res.status(401).json({ message: 'No estás autorizado para ver ese workspace' });
            }
        } else {
            res.status(404).json({ message: 'No se ha encontrado el workspace' });
        }
    }
  } catch (error: any) {
    res.status(404).json({ message: error.message });
  }
};

export const createWorkspace = async (req: any, res: any) => {
  const wsName = req.body.wsName;  
  const user = req.user;
  try {       
    const profile = { name: user._id, profileType: ProfileType.individual, wsPerm: WSPermission.Owner, users: [user] };
    const workspace = new Workspace({ name: wsName, items:[], profiles: [profile] });  
    try {
        workspace.validateSync();
    } catch(error) {
        res.status(400).json({ message: parseValidationError(error) });
    }
    await workspace.save();
    res.status(201).json(workspace);
  } catch (error: any) {
    res.status(409).json({ message: error.message });
  }
};