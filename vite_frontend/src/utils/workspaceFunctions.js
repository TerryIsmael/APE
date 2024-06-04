import Utils from './utilsFunctions.js';

class WorkspaceUtils {

    static fetchUserData = async (author, userId) => {
        try {
          const response = await fetch(import.meta.env.VITE_BACKEND_URL + '/user/data', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            credentials: "include",
            body: JSON.stringify({ userId: userId }),
          });
  
          if (response.ok) {
            const data = await response.json();
            author.value = data;
          } else if (response.status === 401) {
            router.push({ name: 'login' });
          }
        } catch (error) {
          console.log(error);
        }
      }
    
    static fetchWorkspace = async (workspace, path, currentPath, currentUser, items, folders, selectedFolder, existFolder, userWsPerms, router) => {
        try {
          const wsId = localStorage.getItem('workspace');
          const response = await fetch(import.meta.env.VITE_BACKEND_URL + '/workspace'+ (wsId?`/${wsId}`:''), {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
            credentials: "include",
          });
  
          if (response.ok) {
            const data = await response.json();
            workspace.value = data;
            localStorage.setItem('workspace', data._id);
            await this.arrangeItems(workspace, path, currentUser, items, folders);
            this.getCurrentPath(path, currentPath);
  
            const pathArray = path.value.split('/');
            const folder = pathArray.pop();
            selectedFolder.value= '';
            folders.value.forEach(item => {
              if (item.name === folder && item.path === pathArray.join('/')) {
                selectedFolder.value = item.name;
              }
            });
            if (selectedFolder.value === '' && path.value !== '') {
              existFolder.value = false;
            } else {
              existFolder.value = true;
            }
  
            await Utils.verifyWsPerms(workspace, userWsPerms, currentUser);
  
          } else if (response.status === 401) {
            router.push({ name: 'login' });
          }
        } catch (error) {
          console.log(error);
        }
      }

    static arrangeItems = async (workspace, path, currentUser, items, folders) => {
        const wsItems = workspace.value.items;
        const wsFolders = await wsItems.filter(item => item.itemType === 'Folder');
        const currentFolders = await wsItems.filter(item => item.itemType === 'Folder' && item.path === path.value);
        const otherItems = await wsItems.filter(item => item.itemType !== 'Folder' && item.itemType !== 'Notice' && item.itemType !== 'Calendar' && item.path === path.value);
  
        const comparator = (a, b) => {
          if (currentUser.value.favorites.includes(a._id) && !currentUser.value.favorites.includes(b._id)) {
            return -1;
          } else if (!currentUser.value.favorites.includes(a._id) && currentUser.value.favorites.includes(b._id)) {
            return 1;
          } else {
            return new Date(b.modifiedDate).getTime() - new Date(a.modifiedDate).getTime();
          }
        }
  
        wsFolders.sort(comparator);
        otherItems.sort(comparator);
  
        items.value = [];
        items.value.push(...currentFolders);
        items.value.push(...otherItems);
        folders.value = wsFolders;
    }

    static getCurrentPath = (path, currentPath) => {
        const pathArray = path.value.split('/');
        if (pathArray.length === 0) {
            currentPath.value = '/';
        } else if (pathArray.length <= 1) {
            currentPath.value =  '/' + pathArray[0];
        } else {
            const lastTwoSegments = pathArray.slice(-2);
            if (lastTwoSegments[0].length > 25) {
            lastTwoSegments[0] = lastTwoSegments[0].substring(0, 25) + '...';
            }
            const path = (pathArray.length === 2 ? '/' : '.../') + lastTwoSegments.join('/');
            currentPath.value = path;
        }
    }

    static selectItem = async (item, direct, selectedFolder, router, selectedItem, showSidebar, selectedItemPerms, workspace, currentUser, author) => {
        if ((item == 'wsDetails' || item == 'notices' || item == 'favorites')) {
          selectedFolder.value = item;
          router.push({ name: item });
          return;
        }
  
        if (item.itemType === 'Folder') {
          if (selectedItem.value?._id === item._id || direct) {
            router.push('/workspace' + (item.path? '/' + item.path : '') + '/' +  item.name);
            return;
          } else {
            selectedItem.value = item;
            return;
          }
        } else {
          selectedItem.value = item;
          selectedItemPerms.value = await this.verifyPerms(item, workspace, currentUser);
          showSidebar.value = true; // TODO: Gestionar mostrar detalles de una carpeta
          await this.findAuthor(selectedItem, workspace, author);
          return;
        }
    }

    static verifyPerms = async (item, workspace, currentUser) => {
        const permLevel = { 'Owner': 4, 'Admin': 3, 'Write': 2, 'Read': 1};
        const wsPerm = workspace.value.profiles.filter(profile => profile.users?.includes(currentUser.value._id)).map(x=>[x.wsPerm,permLevel[x.wsPerm]]).sort((a, b) => b[1] - a[1])[0];
        if (wsPerm[1] === 2) {
          const filePermLevels = { 'Owner': 3, 'Write': 2, 'Read': 1 }
          const perm = item.profilePerms.map(x=>{
            return {
              "profile": workspace.profiles.find(y=>y._id==x.profile),
              "permission": x.permission
            }
          }).filter(x => x.profile.users.includes(currentUser.value._id)).map(y => x=>[x.permission, filePermLevels[x.permission]]).sort((a, b) => b[1] - a[1])[0][0];
          return perm;
        } else {
          return wsPerm[0];
        }
    }

    static findAuthor = async (selectedItem, workspace, author) => {
      const profile = selectedItem.value.profilePerms.find(y => y.permission == 'Owner').profile;
      const userId = workspace.value.profiles.find(x => x.name == profile)?.users[0];
      await this.fetchUserData(author, userId);
    }

    static toggleLike = async (item, workspace, router, currentUser, path, items, folders) => {
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
            await this.arrangeItems(workspace, path, currentUser, items, folders);
        } else if (response.status === 401) {
          router.push({ name: 'login' });
        } else{
          response.json().then((data) => { 
            console.log(data.error);
          })
        }
      } catch (error) {
        console.log(error);
      }
    }

    static deleteItem = async (item, selectedItem, author, workspace, path, currentPath, currentUser, items, folders, selectedFolder, existFolder, userWsPerms, router, showSidebar) => {
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
          this.toggleSidebar(showSidebar);
          selectedItem.value = null;
          author.value = null;
          await this.fetchWorkspace(workspace, path, currentPath, currentUser, items, folders, selectedFolder, existFolder, userWsPerms, router);
        } else if (response.status === 401) {
          router.push({ name: 'login' });
        }
      } catch (error) {
        console.log(error);
      }
  }

  static toggleSidebar = (showSidebar) => {
    showSidebar.value = !showSidebar.value;
  }

  static handleNewItemForm = async (newItem, hours, minutes, seconds, path, workspace, errorMessage, currentPath, currentUser, items, folders, selectedFolder, existFolder, userWsPerms, isNewItemModalOpened, router) => {
    try { 
      const itemType = newItem.value.itemType;

      if (itemType == 'Timer') {
        newItem.value.duration = ((hours.value * 3600000) + (minutes.value * 60000) + (seconds.value * 1000));
      } else if (itemType == 'Note') {
        newItem.value.text = newItem.value.text;
      } else if (itemType == 'Notice') {
        newItem.value.text = newItem.value.text;
        newItem.value.important = newItem.value.important;
      } 

      const response = await fetch(import.meta.env.VITE_BACKEND_URL + '/item', {
        body: JSON.stringify({ workspace: workspace.value._id, path: path.value, item: newItem.value }),
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: "include",
      });

      if (response.ok) {
        this.closeNewItemModal(isNewItemModalOpened, newItem, errorMessage, hours, minutes, seconds);
        await this.fetchWorkspace(workspace, path, currentPath, currentUser, items, folders, selectedFolder, existFolder, userWsPerms, router);
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
  }

  static openNewItemModal = (itemType, isNewItemModalOpened, newItem, hours, minutes, seconds) => {
    isNewItemModalOpened.value = true;
    newItem.value.name = '';
    newItem.value.itemType = itemType;
    if (itemType == 'Timer') {
      hours.value = 0;
      minutes.value = 0;
      seconds.value = 0;
    } else if (itemType == 'Note') {
      newItem.value.text = '';
    } else if (itemType == 'Notice') {
      newItem.value.text = '';
      newItem.value.important = false;
    }
  }

  static closeNewItemModal = (isNewItemModalOpened, newItem, errorMessage, hours, minutes, seconds) => {
    isNewItemModalOpened.value = false;
    newItem.value = {};
    errorMessage.value = [];
    hours.value = 0;
    minutes.value = 0;
    seconds.value = 0;
  }

  static navigateToPreviousFolder = (path, router) => {
    const pathArray = path.value.split('/');
    if (pathArray.length > 1) {
      path.value = pathArray.slice(0, -1).join('/');
      router.push('/workspace/' + path.value);
    } else {
      path.value = '';
      router.push('/workspace/');
    }
  }

  static closeSidebar = (event, showSidebar, author) => {
    const sidebar = document.querySelector('.sidebar');
    const modal = document.querySelector('.modal');
    const fileContainers = Array.from(document.querySelectorAll('.item-container'));
    const downloadButton = document.querySelector('.downloadButton');
    const selectedItem = fileContainers.some(fileContainer => fileContainer.contains(event.target));
    if (sidebar && !sidebar.contains(event.target) && !modal && !selectedItem && (downloadButton ? !downloadButton.contains(event.target) : true) ) {
      showSidebar.value = false;
      author.value = null;
    }
  }

  static downloadFile = async (workspace, selectedItem) => {
    try {
      const response = await fetch(import.meta.env.VITE_BACKEND_URL + '/file/download', {
        body: JSON.stringify({ workspace: workspace.value._id, fileId: selectedItem.value._id }),
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: "include",
      });
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = selectedItem.value.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      } else if (response.status === 401) {
        router.push({ name: 'login' });
      } else {
        response.json().then((data) => { 
          console.log(data.error);
        })
      }
    } catch (error) {
      console.log(error);
    }
  }

  static uploadFile = async (event, workspace, path, currentPath, currentUser, items, folders, selectedFolder, existFolder, userWsPerms, router) => {
    const file = event.target.files[0];
    try {
      const formData = new FormData();
      formData.append('workspace', workspace.value._id);
      formData.append('path', path.value);
      formData.append('file', file);
      const response = await fetch(import.meta.env.VITE_BACKEND_URL + '/file', {
        method: 'POST',
        body: formData,
        credentials: "include",
      });
      if (response.ok) {
        await this.fetchWorkspace(workspace, path, currentPath, currentUser, items, folders, selectedFolder, existFolder, userWsPerms, router);
      } else if (response.status === 401) {
        router.push({ name: 'login' });
      } else{
        response.json().then((data) => { 
          console.log(data);
        })
      }
    } catch (error) {
      console.log(error);
    }
  }
}

export default WorkspaceUtils;