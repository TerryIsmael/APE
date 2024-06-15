import Utils from './UtilsFunctions.js';

class NoticeFunctions {

  static fetchNotices = async (wsId, workspace, router, userWsPerms, currentUser, errorMessage) => {
    try {
      const response = await fetch(import.meta.env.VITE_BACKEND_URL + '/workspace/notices', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: "include",
        body: JSON.stringify({ wsId: wsId.value })
      });

      if (response.ok) {
        const data = await response.json();
        workspace.value = data;
        await this.arrangeNotices(workspace);
        await Utils.verifyWsPerms(workspace, userWsPerms, currentUser);
        wsId.value = workspace.value._id;
      } else if (response.status === 401) {
        router.push({ name: 'login' });
      } else {
        errorMessage.value = [];
        const data = await response.json();
        if (data.error || data.errors) {
          Utils.parseErrorMessage(data, errorMessage);
        } else {
          throw new Error("Error al cargar anuncios");
        }
      }
    } catch (error) {
      console.log(error);
    }
  };

  static arrangeNotices = (workspace) => {
    const noticeItems = workspace.value.notices;
    noticeItems.sort((a, b) => {
      const dateComparison = new Date(b.notice.uploadDate).getTime() - new Date(a.notice.uploadDate).getTime();
      if (dateComparison === 0) {
        return b.notice.important - a.notice.important;
      } else {
        return dateComparison;
      }
    });
    workspace.value.notices = noticeItems;
  };

  static verifyNoticePerms = (item, userWsPerms, workspace, currentUser) => {
    if (userWsPerms.value == 'Write') {
      const filePermLevels = { 'Owner': 3, 'Write': 2, 'Read': 1 }
      const perm = item.profilePerms.map(x => {
        return {
          "profile": workspace.value.profiles.find(y=> y._id==x.profile),
          "permission": x.permission
        }
      }).filter(x => x.profile.users.map(x => x._id).includes(currentUser.value._id)).map(y => x=>[x.permission, filePermLevels[x.permission]]).sort((a, b) => b[1] - a[1])[0];
      return perm ? perm[0] : null;
    } else {
      return userWsPerms.value;
    }
  };

  static deleteItem = async (itemId, workspace, router, wsId, userWsPerms, currentUser, errorMessage) => {
    try {
      const confirmDelete = confirm("¿Estás seguro de que deseas eliminar este anuncio?");
      if (!confirmDelete) return;
      const response = await fetch(import.meta.env.VITE_BACKEND_URL + '/item', {
        body: JSON.stringify({ workspace: workspace.value._id, itemId: itemId }),
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: "include",
      });

      if (response.ok) {
        await this.fetchNotices(wsId, workspace, router, userWsPerms, currentUser, errorMessage);
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

  static selectItem = async (item, router, userWsPerms, workspace, currentUser, selectedItem, selectedItemPerms, userItemPerms) => {
    if ((item == 'wsDetails' || item == 'notices' || item == 'favorites' || item == 'userDetails'|| item == 'chats')) {
      router.push('/' + item);
      return;
    }
    if (item.itemType === 'Folder') {
      router.push('/workspace' + (item.path ? '/' + item.path : '') + '/' + item.name);
      return;
    }
    selectedItem.value = item;
    selectedItemPerms.value = this.verifyNoticePerms(item, userWsPerms, workspace, currentUser);
    userItemPerms.value = {};
    selectedItem.value.profilePerms.forEach(profilePerm => {
      userItemPerms.value[profilePerm.profile] = profilePerm.permission;
    });
    return;
  };

  static openNewItemModal = (itemType, isNewItemModalOpened, newItem, errorMessage) => {
    errorMessage.value = [];
    isNewItemModalOpened.value = true;
    newItem.value.name = '';
    newItem.value.itemType = itemType;

    if (itemType === 'Notice') {
      newItem.value.text = '';
      newItem.value.important = false;
    }
  };

  static closeNewItemModal = (isNewItemModalOpened, newItem, errorMessage) => {
    errorMessage.value = [];  
    isNewItemModalOpened.value = false;
    newItem.value = {};
  };

  static handleNewItemForm = async (newItem, workspace, router, wsId, userWsPerms, currentUser, isNewItemModalOpened, errorMessage) => {
    try { 
      const itemType = newItem.value.itemType;

      if (itemType == 'Notice') {
        newItem.value.text = newItem.value.text;
        newItem.value.important = newItem.value.important;
      } 
      
      const response = await fetch(import.meta.env.VITE_BACKEND_URL + '/item', {
        body: JSON.stringify({ workspace: workspace.value._id, path: '/notices', item: newItem.value }),
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: "include",
      });

      if (response.ok) {
        this.closeNewItemModal(isNewItemModalOpened, newItem, errorMessage);
        await this.fetchNotices(wsId, workspace, router, userWsPerms, currentUser, errorMessage);
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

  static changePerms = async (perm, profileId, workspace, selectedItem, wsId, router, userWsPerms, currentUser, errorMessage) => {
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
        await this.fetchNotices(wsId, workspace, router, userWsPerms, currentUser, errorMessage);
        selectedItem.value = workspace.value.notices.find(item => item.notice._id === selectedItem.value._id).notice;
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
}

export default NoticeFunctions;