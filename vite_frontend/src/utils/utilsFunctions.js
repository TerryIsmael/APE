import WorkspaceUtils from "./WorkspaceFunctions";

class UtilsFunctions {

  static async fetchUser(currentUser, router) {
    try {
      const response = await fetch(import.meta.env.VITE_BACKEND_URL + '/user', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
        currentUser.value = data.user;
      } else if (response.status === 401) {
        router.push({ name: 'login' });
      }
    } catch (error) {
      console.log(error);
    }
  };

  static async logout (router) {
    try {
      const response = await fetch(import.meta.env.VITE_BACKEND_URL + '/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: "include",
      });
      if (response.ok) {
        router.push({ name: 'login' });
      } else if (response.status === 401){
        router.push({ name: 'login' });
      }
    } catch (error) {
      console.log(error);
    }
  };

  static async verifyWsPerms(workspace, userWsPerms, currentUser) {
    const permLevel = { 'Owner': 4, 'Admin': 3, 'Write': 2, 'Read': 1};
    const wsPerm = workspace.value.profiles.filter(profile => profile.users?.map(x=>x._id).includes(currentUser.value._id)).map(x=>[x.wsPerm, permLevel[x.wsPerm]]).sort((a, b) => b[1] - a[1])[0];
    userWsPerms.value = wsPerm[0];
  };

  static formatDate(date) {
    const options = { year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric'};
    return new Date(date).toLocaleDateString('es-ES', options);
  };

  static translateItemType(item) {
    switch (item) {
      case 'Notice':
        return 'anuncio';
      case 'Calendar':
        return 'calendario';
      case 'Note':
        return 'nota';
      case 'Timer':
        return 'temporizador';
      case 'File':
        return 'archivo';
      case 'Folder':
        return 'carpeta';
      default:
        return 'ninguno';
    }
  };

  static translatePerm(perm) {
    switch (perm) {
      case 'Owner':
        return 'Propietario';
      case 'Write':
        return 'Escritura';
      case 'Read':
        return 'Lectura';
      case 'Admin':
        return 'Admin';
      default:
        return 'Ninguno';
    }
  };

  static selectImage(item) {
    if (item.itemType !== 'File') {
      if (item.itemType === 'Note') {
        return `/files/default.png`;
      } else {
        return `/files/${item.itemType.toLowerCase()}.png`;
      }
    } else {
      switch (item.name.split('.').pop().toLowerCase()) {
        case 'pdf':
          return '/files/pdf.png';
        case 'docx':
          return '/files/docx.png';
        case 'xlsx':
          return '/files/xlsx.png';
        case 'pptx':
          return '/files/pptx.png';
        default:
          return '/files/default.png';
      }
    } 
  };

  static openModal = (isModalOpened, errorMessage) => {
    isModalOpened.value = true;
    errorMessage.value = [];
  };

  static closeModal = (isModalOpened, errorMessage) => {
    isModalOpened.value = false;
    errorMessage.value = [];
  };

  static parseErrorMessage = (data, errorMessage) => {
    if (data.error) {
      errorMessage.value.push(data.error);
    } else if (data.errors) {
      data.errors.forEach((error) => {
        errorMessage.value.push(error);
      });
    }
  };

  static clearErrorMessage = (errorMessage) => {
    errorMessage.value = [];
  };

  static fetchUserWorkspaces = async (workspaces, router, errorMessage) => {
    try { 
      const response = await fetch(import.meta.env.VITE_BACKEND_URL + '/workspaces/', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
        workspaces.value = data.formattedWorkspaces;
        errorMessage.value = [];
      } else if (response.status === 401) {
        router.push({ name: 'login' });
      } else if (response.status === 400 || response.status === 404) {
        errorMessage.value = [];
        response.json().then((data) => {
          if (data.error || data.errors) {
            this.parseErrorMessage(data, errorMessage);
          } else {
            throw new Error("Error al obtener workspaces del usuario");
          }
        })
      }
    } catch (error) {
      console.log(error);
    }
  };

  static leaveWorkspace = async (workspaceId, router, errorMessage, isWsModalOpened) => {
    try { 
        const confirmDelete = confirm("¿Estás seguro de que deseas abandonar este workspace?");
        if (!confirmDelete) return;
        const response = await fetch(import.meta.env.VITE_BACKEND_URL + '/leave', {
            body: JSON.stringify({ wsId: workspaceId }),
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json',
            },
            credentials: "include",
        });

        if (response.ok) {
            errorMessage.value = [];
            const currentWorkspace = localStorage.getItem('workspace');
            if (currentWorkspace == workspaceId) {
              localStorage.removeItem('workspace');
              this.closeWsModal(isWsModalOpened);
              router.push('/workspace');
            }
 
        } else if (response.status === 401) {
            router.push({ name: 'login' });
        } else if (response.status === 400 || response.status === 404) {
            errorMessage.value = [];
            response.json().then((data) => {
                if (data.error || data.errors) {
                    this.parseErrorMessage(data, errorMessage);
                } else {
                    throw new Error("Error al abandonar el workspace");
                }
            })
        }
    } catch (error) {
        console.log(error);
    }
  };

  static openWsModal = async (isWsModalOpened, workspaces, router, errorMessage) => {
    await this.fetchUserWorkspaces(workspaces, router, errorMessage);
    isWsModalOpened.value = true;
  }
  
  static closeWsModal = (isWsModalOpened) => {
    isWsModalOpened.value = false;
  }
}

export default UtilsFunctions;