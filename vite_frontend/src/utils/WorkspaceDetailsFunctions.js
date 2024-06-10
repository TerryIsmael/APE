import WorkspaceUtils from "./WorkspaceFunctions.js";
import Utils from "./UtilsFunctions.js";

class WorkspaceDetails {

    static isUserInModalProfile = (user, modalProfile) => {
        if (modalProfile.value.users) {
            return modalProfile.value.users.find(u => u._id === user._id);
        } else {
            return false;
        }
    }; 

    static openModal = (selectedProfile, modalProfile, isModalOpened) => {
        if (selectedProfile.value) {
          modalProfile.value = selectedProfile.value;
        } else {
          modalProfile.value = {};
          modalProfile.value.users = [];
          modalProfile.value.wsPerm = 'Read';
          modalProfile.value.profileType = 'Group';
        }
        isModalOpened.value = true;
    };

    static closeModal = (selectedProfile, modalProfile, isModalOpened) => {
        selectedProfile.value = null;
        isModalOpened.value = false;
        modalProfile.value = {};
    };

    static setModalProfileUsers = (newUser, modalProfile) => {
        if (!this.isUserInModalProfile(newUser, modalProfile)) {
            modalProfile.value.users.push(newUser);
        } else {
            modalProfile.value.users = modalProfile.value.users.filter(user => user._id.toString() !== newUser._id.toString());
        }
    };

    static toggleEdit = (editing, newWorkspace, workspace) => {
        editing.value = !editing.value;
        newWorkspace.value = workspace.value;
    };

    static populateVariables = (workspace, author, profileWsPerms) => {
        author.value = workspace.value.profiles.find(profile => profile.wsPerm === 'Owner').users[0];

        profileWsPerms.value = {};
        workspace.value.profiles.forEach(profile => {
          profileWsPerms.value[profile._id] = profile.wsPerm;
        });
    };

    static changeWsPerms = async (perm, profileId, workspace, path, currentPath, currentUser, items, folders, selectedFolder, existFolder, userWsPerms, router, errorMessage) => {
        try { 
            const response = await fetch(import.meta.env.VITE_BACKEND_URL + '/perms', {
                body: JSON.stringify({ profileId: profileId, perm: perm, wsId: workspace.value._id }),
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: "include",
            });

            if (response.ok) {
                await WorkspaceUtils.fetchWorkspace(workspace, path, currentPath, currentUser, items, folders, selectedFolder, existFolder, userWsPerms, router, errorMessage);
                errorMessage.value = [];
            } else if (response.status === 401) {
                router.push({ name: 'login' });
            } else if (response.status === 400 || response.status === 404) {
                errorMessage.value = [];
                response.json().then((data) => {
                    if (data.error || data.errors) {
                        Utils.parseErrorMessage(data, errorMessage);
                    } else {
                        throw new Error("Error al cambiar permisos");
                    }
                })
            }
        } catch (error) {
            console.log(error);
        }
    };

    static saveProfile = async (profile, workspace, path, currentPath, currentUser, items, folders, selectedFolder, existFolder, userWsPerms, router, errorMessage) => {
        try { 
            profile.value.users = profile.value.users.map(user => user._id);
            const response = await fetch(import.meta.env.VITE_BACKEND_URL + '/profile', {
                body: JSON.stringify({ profile: profile.value, wsId: workspace.value._id }),
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: "include",
            });

            if (response.ok) {
                await WorkspaceUtils.fetchWorkspace(workspace, path, currentPath, currentUser, items, folders, selectedFolder, existFolder, userWsPerms, router, errorMessage);
                errorMessage.value = [];
            } else if (response.status === 401) {
                router.push({ name: 'login' });
            } else if (response.status === 400 || response.status === 404) {
                errorMessage.value = [];
                response.json().then((data) => {
                    if (data.error || data.errors) {
                        Utils.parseErrorMessage(data, errorMessage);
                    } else {
                        throw new Error("Error al cambiar permisos");
                    }
                })
            }
        } catch (error) {
            console.log(error);
        }
    };
}

export default WorkspaceDetails;