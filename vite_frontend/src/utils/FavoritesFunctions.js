import WorkspaceUtils from "./WorkspaceFunctions.js";
import Utils from "./UtilsFunctions.js";

class FavoriteUtils {

  static fetchFavs = async (workspace, currentUser, items, folders, userWsPerms, router, errorMessage) => {
    try {
      const wsId = localStorage.getItem('workspace');
      const response = await fetch(import.meta.env.VITE_BACKEND_URL + '/workspace/favorites', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: "include",
        body: JSON.stringify({ wsId: wsId }),
      });

      if (response.ok) {
        const data = await response.json();      
        workspace.value = data.workspace;
        folders.value = data.folders;
        await this.arrangeFavs(workspace, currentUser, items);    
        await Utils.verifyWsPerms(workspace, userWsPerms, currentUser);
      } else if (response.status === 401) {
        router.push({ name: 'login' });
      } else {
        if (wsId) {
          localStorage.removeItem('workspace');
          await this.fetchFavs(workspace, currentUser, items, folders, userWsPerms, router, errorMessage);
          return;
        }
        errorMessage.value = [];
        const data = await response.json();
        if (data.error || data.errors) {
          Utils.parseErrorMessage(data, errorMessage);
        } else {
          throw new Error("Error al cargar favoritos");
        }
      }
    } catch (error) {
      console.log(error);
    }
  };

  static arrangeFavs = async (workspace, currentUser, items) => {
    const wsItems = workspace.value.items;
    const favFolders = await wsItems.filter(item => item.itemType === 'Folder' && currentUser.value.favorites.includes(item._id));
    const favOtherItems = await wsItems.filter(item => item.itemType !== 'Folder' && item.itemType !== 'Notice' && item.itemType !== 'Calendar' && currentUser.value.favorites.includes(item._id));
    const comparator = (a, b) => {
      return new Date(b.modifiedDate).getTime() - new Date(a.modifiedDate).getTime();
    }

    favFolders.sort(comparator);
    favOtherItems.sort(comparator);
    items.value = [];
    items.value.push(...favFolders);
    items.value.push(...favOtherItems);
  };

  static deleteItem = async (item, selectedItem, author, workspace, currentUser, items, folders, userWsPerms, router, showSidebar, errorMessage) => {
    try {
      const confirmDelete = confirm("¿Estás seguro de que deseas eliminar este item?");
      if (!confirmDelete) return;
      const response = await fetch(import.meta.env.VITE_BACKEND_URL + '/item', {
        body: JSON.stringify({ workspace: workspace.value._id, itemId: item._id }),
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: "include",
      });

      if (response.ok) {
        WorkspaceUtils.toggleSidebar(showSidebar);
        selectedItem.value = null;
        author.value = null;
        await this.fetchFavs(workspace, currentUser, items, folders, userWsPerms, router, errorMessage);
      } else if (response.status === 401) {
        router.push({ name: 'login' });
      } else {
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

  static handleNewItemForm = async (newItem, workspace, errorMessage, currentUser, items, folders, userWsPerms, isNewItemModalOpened, router, hours, minutes, seconds) => {
    try { 
      const response = await fetch(import.meta.env.VITE_BACKEND_URL + '/item', {
        body: JSON.stringify({ workspace: workspace.value._id, path: '', item: newItem.value }),
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: "include",
      });

      if (response.ok) {
        WorkspaceUtils.closeNewItemModal(isNewItemModalOpened, newItem, errorMessage, hours, minutes, seconds);
        await this.fetchFavs(workspace, currentUser, items, folders, userWsPerms, router, errorMessage);
        errorMessage.value = [];
      } else if (response.status === 401) {
        router.push({ name: 'login' });
      } else {
        errorMessage.value = [];
        const data = await response.json();
        if (data.error || data.errors) {
          Utils.parseErrorMessage(data, errorMessage);
        } else {
          throw new Error("Error al crear item");
        }
      }
    } catch (error) {
      console.log(error);
    }
  };

  static changePerms = async (perm, profileId, selectedItem, workspace, currentUser, items, folders, userWsPerms, router, errorMessage) => {
    try { 
      const response = await fetch(import.meta.env.VITE_BACKEND_URL + '/item/perms', {
        body: JSON.stringify({ profileId: profileId, itemId: selectedItem.value._id, perm: perm, workspace: workspace.value._id }),
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: "include",
      });

      if (response.ok) {
        await this.fetchFavs(workspace, currentUser, items, folders, userWsPerms, router, errorMessage);
        selectedItem.value = workspace.value.items.find(item => item._id === selectedItem.value._id);
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

  static toggleLike = async (item, workspace, router, currentUser, items, folders, userWsPerms, errorMessage) => {
    try {
      const response = await fetch(import.meta.env.VITE_BACKEND_URL + '/item/like', {
        body: JSON.stringify({ itemId: item._id, workspace: workspace.value._id }),
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: "include",
      });
      if (response.ok) {
        await Utils.fetchUser(currentUser);
        await this.fetchFavs(workspace, currentUser, items, folders, userWsPerms, router, errorMessage);
      } else if (response.status === 401) {
        router.push({ name: 'login' });
      } else {
        errorMessage.value = [];
        const data = await response.json();
        if (data.error || data.errors) {
          Utils.parseErrorMessage(data, errorMessage);
        } else {
          throw new Error("Error al cambiar favorito");
        }
      }
    } catch (error) {
      console.log(error);
    }
  };

  static modifyItem = async (item, selectedItem, workspace, currentUser, items, folders, userWsPerms, router, errorMessage) => {
    try {
      if (item && item.itemType == 'File') {
        const extension = selectedItem.value?.name.split('.').pop(); 
        if (item.name.trim().length !== 0) {
          item.name = item.name + '.' + extension;
          if (item.name.length > 330) {
            errorMessage.value = ['El nombre del item no puede superar los 330 caracteres'];
            return;
          }
        }
      }
      const response = await fetch(import.meta.env.VITE_BACKEND_URL + '/item', {
        body: JSON.stringify({ workspace: workspace.value._id, item: item }),
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: "include",
      });

      if (response.ok) {
        await this.fetchFavs(workspace, currentUser, items, folders, userWsPerms, router, errorMessage);
        errorMessage.value = [];
      } else if (response.status === 401) {
        router.push({ name: 'login' });
      } else {
        errorMessage.value = [];
        const data = await response.json();
        if (data.error || data.errors) {
          Utils.parseErrorMessage(data, errorMessage);
        } else {
          throw new Error("Error al modificar item");
        }
      }
    } catch (error) {
      console.log(error);
    }
  };
}

export default FavoriteUtils;