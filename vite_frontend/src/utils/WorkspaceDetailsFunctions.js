import Utils from './UtilsFunctions.js';
import WorkspaceUtils from './WorkspaceFunctions.js';

class WorkspaceDetails {

    static isUserInModalProfile = (user, modalProfile) => {
        if (modalProfile.value.users) {
            return modalProfile.value.users.find(u => u._id === user._id);
        } else {
            return false;
        }
    }; 

    static openModal = (selectedProfile, modalProfile, isModalOpened, errorMessage) => {
        errorMessage.value = [];
        if (selectedProfile.value) {
            modalProfile.value = { ...selectedProfile.value };
        } else {
            modalProfile.value = {};
            modalProfile.value.users = [];
            modalProfile.value.wsPerm = 'Read';
            modalProfile.value.profileType = 'Group';
        }
        isModalOpened.value = true;
    };

    static closeModal = (selectedProfile, modalProfile, isModalOpened, errorMessage) => {
        selectedProfile.value = null;
        isModalOpened.value = false;
        modalProfile.value = {};
        errorMessage.value = [];
    };

    static setModalProfileUsers = (newUser, modalProfile) => {
        if (!this.isUserInModalProfile(newUser, modalProfile)) {
            modalProfile.value.users.push(newUser);
        } else {
            modalProfile.value.users = modalProfile.value.users.filter(user => user._id.toString() !== newUser._id.toString());
        }
    };

    static toggleEdit = (editing, newWorkspace, workspace, errorMessage) => {
        editing.value = !editing.value;
        newWorkspace.value = {...workspace.value}; 
        errorMessage.value = [];
    };

    static populateVariables = (workspace, author, profileWsPerms) => {
        author.value = workspace.value.profiles.find(profile => profile.wsPerm === 'Owner').users[0];

        profileWsPerms.value = {};
        workspace.value.profiles.forEach(profile => {
          profileWsPerms.value[profile._id] = profile.wsPerm;
        });
    };
    
    static fetchInvitations = async (workspace, invitations, errorMessage, router) => {
        try {
            const response = await fetch(import.meta.env.VITE_BACKEND_URL + '/invitation/'+workspace.value._id, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: "include",
            });

            if (response.ok) {
                const data = await response.json();
                invitations.value = data;
            } else if (response.status === 401) {
                router.push({ name: 'login' });
            } else {
                errorMessage.value = [];
                const data = await response.json();
                if (data.error || data.errors) {
                    Utils.parseErrorMessage(data, errorMessage);
                } else {
                    throw new Error("Error al obtener datos del workspace");
                }
            }
        } catch (error) {
            console.log(error);
        }
    }

    static createInvitationLink = async (workspace, inviteProfile, linkDuration, invitations, errorMessage, router) => {
        const invitation = {
          workspace: workspace.value._id,
          linkDuration: linkDuration.value
        };
        console.log(linkDuration.value)
        if (inviteProfile.value != 'none') {
          invitation.profile = inviteProfile.value._id;
        } 
        try {
            const response = await fetch(import.meta.env.VITE_BACKEND_URL + '/invitation', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: "include",
                body: JSON.stringify(invitation),
            });

            if (response.ok) {
            const data = await response.json();
            await navigator.clipboard.writeText(import.meta.env.VITE_BACKEND_URL + '/invite/' + data.invitation.code);
            await this.fetchInvitations(workspace, invitations, errorMessage);
            } else if (response.status === 401) {
                router.push({ name: 'login' });
            } else {
                errorMessage.value = [];
                const data = await response.json();
                if (data.error || data.errors) {
                    Utils.parseErrorMessage(data, errorMessage);
                } else {
                    throw new Error("Error al obtener datos del workspace");
                }
            }
        } catch (error) {
            console.log(error);
        }
    };

    static toggleActiveInvitation = async (workspace, invitation, invitations, errorMessage, router) => {
        try {
            const response = await fetch(import.meta.env.VITE_BACKEND_URL + '/invitation/', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: "include",
                body: JSON.stringify({ invId: invitation._id }),
            });
            if (response.ok) {
                await this.fetchInvitations(workspace, invitations, errorMessage);
            } else if (response.status === 401) {
                router.push({ name: 'login' });
            } else {
                errorMessage.value = [];
                const data = await response.json();
                if (data.error || data.errors) {
                    Utils.parseErrorMessage(data, errorMessage);
                } else {
                    throw new Error("Error al obtener datos del workspace");
                }
            }
        } catch (error) {
            console.log(error);
        }
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
            } else {
                errorMessage.value = [];
                const data = await response.json();
                if (data.error || data.errors) {
                    Utils.parseErrorMessage(data, errorMessage);
                } else {
                    throw new Error("Error al cambiar permisos");
                }
            }
        } catch (error) {
            console.log(error);
        }
    };

    static deleteInvitation = async (workspace, invitation, invitations, errorMessage, router) => {
        try {
            const response = await fetch(import.meta.env.VITE_BACKEND_URL + '/invitation/', {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: "include",
                body: JSON.stringify({ invId: invitation._id }),
            });
            if (response.ok) {
                await this.fetchInvitations(workspace, invitations, errorMessage);
            } else if (response.status === 401) {
                router.push({ name: 'login' });
            } else {
                errorMessage.value = [];
                const data = await response.json();
                if (data.error || data.errors) {
                    Utils.parseErrorMessage(data, errorMessage);
                } else {
                    throw new Error("Error al obtener datos del workspace");
                }
            }
        } catch (error) {
            console.log(error);
        }
    };

    static inviteUser = async (workspace, userToInvite, permToInvite, path, currentPath, currentUser, items, folders, selectedFolder, existFolder, userWsPerms, errorMessage, router) => {
        try {
            const response = await fetch(import.meta.env.VITE_BACKEND_URL + '/invite', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: "include",
                body: JSON.stringify({ workspace: workspace.value._id, username: userToInvite.value, perm: permToInvite.value}),
            });
            if (response.ok) {
                userToInvite.value = '';
                permToInvite.value = 'Read';
                await WorkspaceUtils.fetchWorkspace(workspace, path, currentPath, currentUser, items, folders, selectedFolder, existFolder, userWsPerms, router, errorMessage);
            } else if (response.status === 401) {
                router.push({ name: 'login' });
            } else {
                errorMessage.value = [];
                const data = await response.json();
                if (data.error || data.errors) {
                    Utils.parseErrorMessage(data, errorMessage);
                } else {
                    throw new Error("Error al obtener datos del workspace");
                }
            }
        } catch (error) {
            console.log(error);
        }
    };

    static saveProfile = async (profile, workspace, path, currentPath, currentUser, items, folders, selectedFolder, existFolder, userWsPerms, router, errorMessage, author, profileWsPerms) => {
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
            } else {
                errorMessage.value = [];
                const data = await response.json();
                if (data.error || data.errors) {
                  Utils.parseErrorMessage(data, errorMessage);
                } else {
                    throw new Error("Error al guardar el perfil");
                }
            }
        } catch (error) {
            console.log(error);
        }
    };

    static deleteProfile = async (profileId, workspace, path, currentPath, currentUser, items, folders, selectedFolder, existFolder, userWsPerms, router, errorMessage) => {
        try { 
            const confirmDelete = confirm("¿Estás seguro de que deseas eliminar este perfil?");
            if (!confirmDelete) return;
            const response = await fetch(import.meta.env.VITE_BACKEND_URL + '/profile', {
                body: JSON.stringify({ profileId: profileId, wsId: workspace.value._id }),
                method: 'DELETE',
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
            } else {
                errorMessage.value = [];
                const data = await response.json();
                if (data.error || data.errors) {
                    Utils.parseErrorMessage(data, errorMessage);
                } else {
                    throw new Error("Error al eliminar perfil");
                }
            }
        } catch (error) {
            console.log(error);
        }
    };

    static editWorkspace = async (newWorkspace, workspace, router, errorMessage, author, profileWsPerms, editing) => {
        try { 
            const response = await fetch(import.meta.env.VITE_BACKEND_URL + '/workspace/edit', {
                body: JSON.stringify({ workspace: newWorkspace.value }),
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: "include",
            });

            if (response.ok) {
                const data = await response.json();
                workspace.value = data;
                editing.value = false;
                this.populateVariables(workspace, author, profileWsPerms);
                errorMessage.value = [];
            } else if (response.status === 401) {
                router.push({ name: 'login' });
            } else {
                errorMessage.value = [];
                const data = await response.json();
                if (data.error || data.errors) {
                    Utils.parseErrorMessage(data, errorMessage);
                } else {
                    throw new Error("Error al editar workspace");
                }
            }
        } catch (error) {
            console.log(error);
        }
    };

    static deleteWorkspace = async (workspace, router, errorMessage) => {
        try { 
            const confirmDelete = confirm("¿Estás seguro de que deseas eliminar este workspace?");
            if (!confirmDelete) return;
            const response = await fetch(import.meta.env.VITE_BACKEND_URL + '/workspace', {
                body: JSON.stringify({ wsId: workspace.value._id }),
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: "include",
            });

            if (response.ok) {
                localStorage.removeItem('workspace');
                router.push('/workspace');
            } else if (response.status === 401) {
                router.push({ name: 'login' });
            } else {
                errorMessage.value = [];
                const data = await response.json();
                if (data.error || data.errors) {
                    Utils.parseErrorMessage(data, errorMessage);
                } else {
                    throw new Error("Error al eliminar el workspace");
                }
            }
        } catch (error) {
            console.log(error);
        }
    };
}

export default WorkspaceDetails;