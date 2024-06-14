import Utils from './UtilsFunctions.js';

class UserDetails {

    static fetchFolders =  async (workspace, errorMessage, router) => {
        try {
            const wsId = localStorage.getItem('workspace');
            const response = await fetch(import.meta.env.VITE_BACKEND_URL + '/workspace/folders', {
              body: JSON.stringify({ wsId: wsId }),
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              credentials: "include",
            });
      
            if (response.ok) {
                const data = await response.json();
                workspace.value = data;
                errorMessage.value = [];
            } else if (response.status === 401) {
                router.push({ name: 'login' });
            } else {
                if (wsId) {
                    localStorage.removeItem('workspace');
                    await this.fetchFolders(workspace, errorMessage, router);
                    return;
                }
                errorMessage.value = [];
                const data = await response.json();
                if (data.error || data.errors) {
                    Utils.parseErrorMessage(data, errorMessage);
                } else {
                    throw new Error("Error al eliminar item");
                }
            }
        } catch (error) {
            console.log(error);
        }
    };

    static toggleEdit = (editing, newUser, currentUser, passwordMatch, errorMessage) => {
        editing.value = !editing.value;
        newUser.value = {...currentUser.value};
        newUser.value.password = '';
        passwordMatch.value = '';
        errorMessage.value = [];
    };

    static editUser = async (currentUser, newUser, errorMessage, editing, router) => {
        if (errorMessage.value.includes("Las contraseñas no coinciden")) {
            return;
        }
        try {
            const response = await fetch(import.meta.env.VITE_BACKEND_URL + '/user/edit', {
                body: JSON.stringify({ 'user': newUser.value }),
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: "include",
            });

            if (response.ok) {
                const data = await response.json();
                currentUser.value = data;
                errorMessage.value = [];
            } else if (response.status === 401) {
                router.push({ name: 'login' });
            } else {
                errorMessage.value = [];
                const data = await response.json();
                if (data.error || data.errors) {
                    Utils.parseErrorMessage(data, errorMessage);
                } else {
                    throw new Error("Error al editar usuario");
                }
            }
        } catch (error) {
            console.log(error);
        }
    };

    static deleteUser = async (errorMessage, router) => {
        const confirmDelete = confirm("¿Estás seguro de que deseas eliminar tu cuenta?");
        if (!confirmDelete) return;
        try {
            const response = await fetch(import.meta.env.VITE_BACKEND_URL + '/user', {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: "include",
            });

            if (response.ok) {
                Utils.logout(router);
            } else if (response.status === 401) {
                router.push({ name: 'login' });
            } else {
                errorMessage.value = [];
                const data = await response.json();
                if (data.error || data.errors) {
                    Utils.parseErrorMessage(data, errorMessage);
                } else {
                    throw new Error("Error al eliminar usuario");
                }
            }
        } catch (error) {
            console.log(error);
        }
    };

}

export default UserDetails;