import Utils from './UtilsFunctions.js';

class NoticeFunctions {

  static fetchNotices = async (wsId, workspace, router, userWsPerms, currentUser) => {
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
        }).filter(x => x.profile.users.map(x => x._id).includes(currentUser.value._id)).map(y => x=>[x.permission, filePermLevels[x.permission]]).sort((a, b) => b[1] - a[1])[0][0];
        return perm;
      } else {
        return userWsPerms.value;
      }
  };

  static deleteItem = async (itemId, workspace, router, wsId, userWsPerms, currentUser) => {
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
          await this.fetchNotices(wsId, workspace, router, userWsPerms, currentUser);
        } else if (response.status === 401) {
          router.push({ name: 'login' });
        }
      } catch (error) {
        console.log(error);
      }
  };

  static selectItem = async (item, router, userWsPerms, workspace, currentUser, selectedItem, selectedItemPerms) => {
      if ((item == 'wsDetails' || item == 'notices' || item == 'favorites')) {
        router.push('/workspace/' + item);
        return;
      }
      if (item.itemType === 'Folder') {
        router.push('/workspace' + (item.path ? '/' + item.path : '') + '/' + item.name);
        return;
      }
      selectedItem.value = item;
      selectedItemPerms.value = this.verifyNoticePerms(item, userWsPerms, workspace, currentUser);
      return;
  };

  static openNewItemModal = (itemType, isNewItemModalOpened, newItem) => {
      isNewItemModalOpened.value = true;
      newItem.value.name = '';
      newItem.value.itemType = itemType;

      if (itemType === 'Notice') {
        newItem.value.text = '';
        newItem.value.important = false;
      }
  };

  static closeNewItemModal = (isNewItemModalOpened, newItem, errorMessage) => {
      isNewItemModalOpened.value = false;
      newItem.value = {};
      errorMessage.value = [];
  };

  static handleNewItemForm = async (newItem, workspace, router, wsId, userWsPerms, currentUser, isNewItemModalOpened, errorMessage) => {
      try { 
        const itemType = newItem.value.itemType;

        if (itemType == 'Notice') {
          newItem.value.text = newItem.value.text;
          newItem.value.important = newItem.value.important;
        } 
        
        const response = await fetch(import.meta.env.VITE_BACKEND_URL + '/item', {
          body: JSON.stringify({ workspace: workspace.value._id, path: '', item: newItem.value }),
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: "include",
        });

        if (response.ok) {
          this.closeNewItemModal(isNewItemModalOpened, newItem, errorMessage);
          await this.fetchNotices(wsId, workspace, router, userWsPerms, currentUser);
          errorMessage.value = [];
        } else if (response.status === 401) {
          router.push({ name: 'login' });
        } else if (response.status === 400 || response.status === 404) {
          errorMessage.value = [];
          response.json().then((data) => {
            if (data.error) {
              errorMessage.value.push(data.error);
            } else {
              data.errors.forEach((error) => {
                errorMessage.value.push(error.msg);
              });
            }
          throw new Error("Error al crear item");
          })
        }
      } catch (error) {
        console.log(error);
      }
  };

  static changePerms = async (perm, profileName, workspace, selectedItem, wsId, router, userWsPerms, currentUser, errorMessage) => {
      try { 
        const response = await fetch(import.meta.env.VITE_BACKEND_URL + '/item/perms', {
          body: JSON.stringify({ profileName: profileName, itemId: selectedItem.value._id, perm: perm, workspace: workspace.value._id }),
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: "include",
        });

        if (response.ok) {
          await this.fetchNotices(wsId, workspace, router, userWsPerms, currentUser);
          selectedItem.value = workspace.value.notices.find(item => item.notice._id === selectedItem.value._id).notice;
          errorMessage.value = [];
        } else if (response.status === 401) {
          router.push({ name: 'login' });
        } else if (response.status === 400 || response.status === 404) {
          errorMessage.value = [];
          response.json().then((data) => {
            console.log(data);
            if (data.error) {
              errorMessage.value.push(data.error);
            } else {
              data.errors.forEach((error) => {
                errorMessage.value.push(error.msg);
              });
            }
          throw new Error("Error al cambiar permisos");
          })
        }
      } catch (error) {
        console.log(error);
      }
    };  
}

export default NoticeFunctions;