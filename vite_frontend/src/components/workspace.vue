<script>
import { ref, onMounted, onUnmounted, nextTick, onBeforeMount, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';

export default {
  setup() {
    
    const currentUser = ref(null);
    const router = useRouter();
    const route = useRoute();
    const path = ref("");
    const workspace = ref({});
    const currentPath = ref('');
    const items = ref([]); 
    const folders = ref([]);
    const notices = ref([]);
    const selectedItem = ref(null);
    const selectedItemPerms = ref(null);
    const selectedFolder = ref('');
    const existFolder = ref(false); 
          
    const showSidebar = ref(false);
    const showMainSidebar = ref(false);
    const showSharedPopup = ref(false);
    const formattedDate = ref(null);
    const isModalOpened = ref(false);
    const shareWith = ref(null);
    const sharePerm = ref(null);
    const errorMessage = ref([]);

    const isNewItemModalOpened = ref(false);
    const newItem = ref({});
    const fileInput = ref(null); 
     
    const hours = ref(0);
    const minutes = ref(0);
    const seconds = ref(0);

    const fetchUser = async () => {
      if (localStorage.getItem('user') !== null) {
        currentUser.value = JSON.parse(localStorage.getItem('user'));
        return;
      }
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
          currentUser.value = data;
          localStorage.setItem('user', JSON.stringify(data));
        } else if (response.status === 401) {
          router.push({ name: 'login' });
        }
      } catch (error) {
        console.log(error);
      }
    }
    
    const fetchWorkspace = async () => {
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
          await arrangeItems();
          getCurrentPath();

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

        } else if (response.status === 401) {
          router.push({ name: 'login' });
        }
      } catch (error) {
        console.log(error);
      }
    }

    const arrangeItems = async () => {

      const wsItems = workspace.value.items;
      const wsFolders = await wsItems.filter(item => item.itemType === 'Folder');
      const currentFolders = await wsItems.filter(item => item.itemType === 'Folder' && item.path === path.value);
      const otherItems = await wsItems.filter(item => item.itemType !== 'Folder' && item.itemType !== 'Notice' && item.itemType !== 'Calendar' && item.path === path.value);
      const wsNotices = await wsItems.filter(item => item.itemType === 'Notice' && item.path === path.value);

      wsFolders.sort((a, b) => new Date(b.modifiedDate).getTime() - new Date(a.modifiedDate).getTime());
      otherItems.sort((a, b) => new Date(b.modifiedDate).getTime() - new Date(a.modifiedDate).getTime());
      wsNotices.sort((a, b) => new Date(b.modifiedDate).getTime() - new Date(a.modifiedDate).getTime());

      items.value = [];
      items.value.push(...currentFolders);
      items.value.push(...otherItems);

      folders.value = wsFolders;
      notices.value = wsNotices;
    }

    const getCurrentPath = () => {

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

    const navigateToPreviousFolder = () => {
      const pathArray = path.value.split('/');

      if (pathArray.length > 1) {
        path.value = pathArray.slice(0, -1).join('/');
        router.push('/workspace/' + path.value);
      } else {
        path.value = '';
        router.push('/workspace/');
      }
    }
      
    const openModal = () => {
      isModalOpened.value = true;
      sharePerm.value = 'view';
    };

    const closeModal = () => {
      isModalOpened.value = false;
      errorMessage.value = [];
      clearModalFields();
    };

    const clearModalFields = () => {
      shareWith.value = '';
      sharePerm.value = 'view';
    };

    const toggleSharedPopup = () => {
      showSharedPopup.value = !showSharedPopup.value
    }

    const toggleSidebar = () => {
      showSidebar.value = !showSidebar.value;
    }

    const selectItem = async (item, direct) => {
      if ((item == 'wsDetails' || item == 'notices' || item == 'favourites')) {
        selectedFolder.value = item;
        router.push('/workspace/' + item);
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
        selectedItemPerms.value = await verifyPerms(item, currentUser.value);
        showSidebar.value = true; // TODO: Gestionar mostrar detalles de una carpeta
        return;
      }
    }

    const closeSidebar = (event) => {
      const sidebar = document.querySelector('.sidebar');
      const modal = document.querySelector('.modal');
      const fileContainers = Array.from(document.querySelectorAll('.file-container'));
      const selectedItem = fileContainers.some(fileContainer => fileContainer.contains(event.target));
      if (sidebar && !sidebar.contains(event.target) && !modal && !selectedItem ) {
        showSidebar.value = false;
      }
    };

    const formatDate = (date) => {
      const options = { year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: 'numeric' };
      return new Date(date).toLocaleDateString('es-ES', options);
    }

    const deleteFile = async (file) => {
      try {
        const confirmDelete = confirm("¿Estás seguro de que deseas eliminar este archivo?");
        if (!confirmDelete) return;
        const response = await fetch(import.meta.env.VITE_BACKEND_URL + '/file', {
          body: JSON.stringify({ id: file._id }),
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: "include",
        });

        if (response.ok) {
          selectedItem.value = null;
          toggleSidebar();
          await fetchWorkspace();
        } else if (response.status === 401) {
          router.push({ name: 'login' });
        }
      } catch (error) {
        console.log(error);
      }
    }

    const toggleLike = async (file) => {
      try {
        const response = await fetch(import.meta.env.VITE_BACKEND_URL + '/file/like', {
          body: JSON.stringify({ fileId: file._id }),
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: "include",
        });
        if (response.ok) {
          await fetchWorkspace();
        } else if (response.status === 401) {
          router.push({ name: 'login' });
        }
      } catch (error) {
        console.log(error);
      }
    }

    const verifyPerms = async (item, user) => {
      const permLevel = { 'Owner': 4, 'Admin': 3, 'Write': 2, 'Read': 1};
      const wpPerm = workspace.value.profiles.filter(profile => profile.users.includes(user._id)).map(x=>[x.permission,permlevel[x.permission]]).sort((a, b) => b[1] - a[1])[0];
      if (wpPerm[1] === 2){
        const filePermLevel = { 'Owner': 3, 'Write': 2, 'Read': 1 }
        return item.profilePerms.map(x=>{
          return {
            "profile":workspace.profiles.find(y=>y._id==x.profile),
            "permission": x.permission
          }
        }).filter(x => x.profile.users.includes(user)).map(y => x=>[x.permission,filePermLevels[x.permission]]).sort((a, b) => b[1] - a[1])[0][0];
      } else {
        return wpPerm[0];
      }
    }

    const changePerms = async (perm, username) => {
      try { 
        const response = await fetch(import.meta.env.VITE_BACKEND_URL + '/file', {
          body: JSON.stringify({ username: username, fileId: selectedItem.value._id, perm: perm }),
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: "include",
        });

        if (response.ok) {
          await fetchWorkspace();
          selectedItem.value = workspace.value.items.find(file => file._id === selectedItem.value._id);
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
          throw new Error("Error al cambiar permisos");
          })
        }

      } catch (error) {
        console.log(error);
      }
    }

    const logout = async () => {
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
    }

    const translatePerm = (perm) => {
      switch (perm) {
        case 'owner':
          return 'Propietario';
        case 'write':
          return 'Escritura';
        case 'read':
          return 'Lectura';
        case 'view':
          return 'Vista';
        default:
          return 'Ninguno';
      }
    }

    const downloadFile = async () => {
      try {
        const response = await fetch(import.meta.env.VITE_BACKEND_URL + '/file/download', {
          body: JSON.stringify({ id: selectedItem.value._id }),
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
          a.download = selectedItem.value.filename;
          a.click();
          window.URL.revokeObjectURL(url);
        } else if (response.status === 401) {
          router.push({ name: 'login' });
        }
      } catch (error) {
        console.log(error);
      }
    }

    const selectUploadFile = () => {
      fileInput.value.click();
    };

    const uploadFile = async (event) => {
      const file = event.target.files[0];
      try {
        const formData = new FormData();
        formData.append('workspace', workspace.value._id);
        formData.append('file', file);
        const response = await fetch(import.meta.env.VITE_BACKEND_URL + '/file', {
          method: 'POST',
          body: formData,
          credentials: "include",
        });
        if (response.ok) {
          await fetchWorkspace();
          console.log('Archivo subido correctamente');
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

    const openNewItemModal = (itemType) => {
      isNewItemModalOpened.value = true;
      newItem.value.name = '';
      newItem.value.itemType = itemType;
      if (itemType == 'Timer') {
        hours.value = 0;
        minutes.value = 0;
        seconds.value = 0;
      } else if (itemType == 'Note' || itemType == 'Notice') {
        newItem.value.text = '';
      }
    };

    const closeNewItemModal = () => {
      isNewItemModalOpened.value = false;
      newItem.value = {};
      errorMessage.value = [];
      hours.value = 0;
      minutes.value = 0;
      seconds.value = 0;
    };

    const handleNewItemForm = async () => {
      try { 
        const itemType = newItem.value.itemType;

        if (itemType == 'Timer') {
          newItem.value.duration = ((hours.value * 3600000) + (minutes.value * 60000) + (seconds.value * 1000));
        } else if (itemType == 'Note' || itemType == 'Notice') {
          newItem.value.text = newItem.value.text;
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
          closeNewItemModal();
          await fetchWorkspace();
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

    const selectImage = (item) => {
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
    }

    onBeforeMount(async () => {
      path.value = route.params.path?JSON.stringify(route.params.path).replace("[", '').replace("]", '').replace(/"/g, '').split(',').join('/'): '';
      fetchWorkspace();
      fetchUser();
    });
    
    onMounted(() => {
      selectedFolder.value = path.value;
      document.addEventListener('click', closeSidebar);
    });

    onUnmounted(() => {
      document.removeEventListener('click', closeSidebar);
    });
    
    watch(
      () => route.params.path,
      () => {
        path.value = route.params.path?JSON.stringify(route.params.path).replace("[", '').replace("]", '').replace(/"/g, '').split(',').join('/'): '';
        selectedFolder.value = path.value;
        fetchWorkspace();
      }
    );

    return {
      workspace,
      folders,
      notices,
      items,
      selectedFolder,
      showSidebar,
      showMainSidebar,
      showSharedPopup,
      selectedItem,
      selectedItemPerms,
      formattedDate,
      currentUser,
      isModalOpened,
      shareWith,
      sharePerm,
      errorMessage,
      fileInput,
      isNewItemModalOpened,
      newItem,
      hours,
      minutes,
      seconds,
      currentPath,
      path,
      existFolder,
      openModal,
      closeModal,
      clearModalFields,
      changePerms,
      selectItem,
      toggleSidebar,
      toggleSharedPopup,
      toggleLike,
      formatDate,
      deleteFile,
      verifyPerms,
      logout,
      downloadFile,
      selectUploadFile,
      uploadFile,
      translatePerm,
      openNewItemModal,
      closeNewItemModal,
      handleNewItemForm,
      selectImage,
      getCurrentPath,
      navigateToPreviousFolder,
    }
  }
}   
</script>
 
<template>

  <div class="main-sidebar-overlay" v-if="showMainSidebar"></div>
    <div class="main-sidebar" :class="{'show' : showMainSidebar}">

      <div :class="{'main-sidebar-toggle':true, 'main-sidebar-toggle-opened':showMainSidebar}">
        <span v-if="!showMainSidebar" @click="showMainSidebar = true" class="material-symbols-outlined" style="z-index: 1002">chevron_right</span>
        <span v-else @click="showMainSidebar = false" class="material-symbols-outlined" style="z-index: 1002">chevron_left</span>
      </div>

      <ul style="height: 85%; min-height: 85%;">
        <div style="display:flex; width: 50px; height: 50px;">
          <div style="margin-left: 35%"><img class="logo-img" src="https://i.pinimg.com/564x/27/bb/89/27bb898786b2fe976f67c318b91a5d2d.jpg"></img></div>
          <div style="margin-left: 65%; display:flex; align-items: center; justify-content: space-between; width: calc(100% - 40px);">
              <div style="text-align: center;">
                  <p style="margin: 0; font-weight: bold;">APE</p>
                  <p style="margin: 0;">{{ currentUser?.username }}</p>
              </div>
          </div>
        </div>

        <li style="font-weight: bolder; text-align: left; margin-left: 5%; margin-right: 5%; margin-bottom: 1%; margin-top: 3%; word-wrap: break-word; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">{{ workspace?.name }}</li>
        <button class="change-workspace-button">Cambiar</button>

        <li class = "main-sidebar-title">Inicio</li>
        <li class="li-clickable">Gestionar perfil</li>
        <li class="li-clickable">Gestionar workspaces</li>

        <li class="main-sidebar-subtitle">Workspace actual <span @click="openNewItemModal('Folder')" style="margin-left: 35%; text-align: right; cursor: pointer; vertical-align: middle" class="material-symbols-outlined">add</span></li>

        <li @click="selectItem('wsDetails', true)" :class="{'li-clickable': true, 'selected_folder':selectedFolder == 'wsDetails'}">Detalles del workspace</li>
        <li @click="selectItem('notices', true)" :class="{'li-clickable': true, 'selected_folder':selectedFolder == 'notices'}">Anuncios</li>
        <li @click="selectItem('favourites', true)" :class="{'li-clickable': true, 'selected_folder':selectedFolder == 'favourites'}">Favoritos</li>
        
        <div class="scrollable" style="max-height: 35%; overflow-y: auto;">
          <div v-for="folder in folders" :key="folder._id" style="word-wrap: break-word;">
            <li @click="selectItem(folder, true)" :class="{'li-clickable': true, 'selected_folder': selectedFolder === folder.name}"> {{ folder.name }}</li>
          </div>
        </div>

      </ul>
      <ul style="height: 5%;">
        <li style="text-align: right;"> <button style="margin-right: 5%;" @click="logout"><span class="material-symbols-outlined">logout</span></button> </li>
      </ul>
  </div>
  
  <div class="main-content" style="display: flex; justify-content: center; align-items: center; word-wrap: break-word;">
      <h1 @click="$router.push('/workspace/')" style="cursor: pointer; display: flex; align-items: center; margin-right: 10px"> 
        <span style="color: #C8B1E4; font-size: 60px;" class="material-symbols-outlined">home</span>
        {{ workspace?.name }} 
      </h1>
  </div>

  <div class="main-content" style="display:flex; flex-direction: column; align-items: center;">

    <div style="display: flex; justify-content: space-around; width: 87%; align-items: center;">
      <div style="flex: 1; display: flex; justify-content: flex-start; align-items: center; width: 85%">
        <button v-if="path !== ''" style=" max-height: 50px;" @click="navigateToPreviousFolder()"><span class="material-symbols-outlined">arrow_back</span></button>
        <h2 style="text-align: left; flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-left: 1%;">Ruta actual: {{ currentPath }}</h2>
      </div>

      <div style="display: flex; justify-content: flex-end; width: 15%;">
        <button style="margin-right: 10px; max-height: 50px;" @click="openNewItemModal('Folder')">
          <span class="material-symbols-outlined">create_new_folder</span>
        </button>
        <div class="dropdown">
          <button style="max-height: 50px;" @click="openDropdown">
            <span class="material-symbols-outlined">add</span>
          </button>
          <div style="z-index: 1002;" class="dropdown-content">
            <div @click="openNewItemModal('Notice')">Anuncio</div>
            <div @click="openNewItemModal('Calendar')">Calendario</div>
            <div @click="openNewItemModal('Note')">Nota</div>
            <div @click="openNewItemModal('Timer')">Temporizador</div>
            <input type="file" ref="fileInput" style="display: none" @change="uploadFile">
            <div @click="selectUploadFile" value="File">Archivo</div>
          </div>
        </div>
      </div>
    </div>

    <div class="main-content container">
      <p v-if="!existFolder" style="font-size: xx-large; font-weight: bolder;">No existe este directorio</p>
      <div v-if="existFolder && items.length === 0">
        <p style="font-size: xx-large; font-weight: bolder;">Aún no hay items...</p>
      </div>
      <div class="files-container" v-else>
        <div class="file-container" v-for="item in items" :key="item.id" @click="selectItem(item, false)">
          <img class="file-img" :src="selectImage(item)" alt="item.name" width="100" height="100">

          <div style="display:flex; align-items: center;">
            <p class="filename">{{ item.name }} </p>
            <span v-if="currentUser?.favorites.includes(item._id)" class="material-symbols-outlined filledHeart">favorite</span>
          </div>
        </div>
    </div>
    
    <div class="sidebar-overlay" v-if="showSidebar && selectedItem.itemType !== 'Folder'" @click="closeSidebar"></div>
      <div class="sidebar" :class="{ 'show': showSidebar }">
        <ul>
          <li>Archivo: {{ selectedItem?.name }}</li>
          <li>Autor: {{ selectedItem?.profilePerms.filter(x => x.permission === 'Owner').map(y => y.username) }}</li>
          <li> {{ selectedItem?.profilePerms.filter(x => x.permission === 'Owner').map(y => `${y.surnames} ${y.firstName}`).join(', ') }}</li>
          <li>Fecha de subida: {{ formatDate(selectedItem?.uploadDate)}}</li>
          <li>Última modificación: {{ formatDate(selectedItem?.modifiedDate)}}</li>

          <li style="display: inline-flex; justify-content: space-around; width: 90%;">
            <button v-if="['Owner'].includes(selectedItemPerms)" @click="openModal"><span class="material-symbols-outlined">groups</span></button>
            <button v-if="['Owner', 'Admin', 'Write','Read'].includes(selectedItemPerms)" @click="downloadFile"><span class="material-symbols-outlined">download</span></button>
            <button @click="toggleLike(selectedItem)">
              <span v-if="!currentUser?.favorites.includes(selectedItem?._id)" class="material-symbols-outlined">favorite</span>
              <span v-else class="material-symbols-outlined filledHeart">favorite</span>
            </button>
            <button v-if="['Owner','Admin'].includes(selectedItemPerms)" @click="deleteFile(selectedItem)"><span class="material-symbols-outlined">delete</span></button>
          </li>
        </ul>
      </div>
    </div>

    <Modal class="modal" :isOpen="isNewItemModalOpened" @modal-close="closeNewItemModal" name="item-modal">
      <template #header><strong>Crear {{ newItem.itemType }}</strong></template>                
      <template #footer>
        <div style="margin-top:20px">

          <div class="error" v-if="errorMessage.length !== 0">
            <p style="margin-top: 5px; margin-bottom: 5px;" v-for="error in errorMessage">{{ error }}</p>
          </div>
            <input type="text" v-model="newItem.name" placeholder="Nombre de item..." style="border-radius: 5px; margin-right:5px;  margin-bottom: 5px; height:30px; width: 200px; background-color: #f2f2f2; color: black;"/>
            <textarea v-if="newItem.itemType == 'Note'" v-model="newItem.text" placeholder="Contenido..." style="border-radius: 5px; height: 100px; width: 300px; background-color: #f2f2f2; color: black; resize: none"></textarea>
            <textarea v-if="newItem.itemType == 'Notice'" v-model="newItem.text" placeholder="Contenido..." maxlength="1000" style="border-radius: 5px; height: 100px; width: 300px; background-color: #f2f2f2; color: black; resize: none"></textarea>

            <div v-if="newItem.itemType == 'Timer'" style="display: inline-flex; vertical-align: middle; align-items: center;">
              <input v-model="hours" type="number" min="0" placeholder="Hor" style="border-top-left-radius: 5px; border-bottom-left-radius: 5px ; margin-top: 5px; margin-right:5px; height:30px; width: 56px; background-color: #f2f2f2; color: black"/>
              :<input v-model="minutes" type="number" min="0" placeholder="Min" style="margin-top:5px; margin-right: 5px; height:30px; width: 56px; background-color: #f2f2f2; color: black"/>
              :<input v-model="seconds" type="number" min="0" placeholder="Seg" style="border-top-right-radius: 5px; border-bottom-right-radius: 5px ; margin-top: 5px; margin-right:5px; height:30px; width: 56px; background-color: #f2f2f2; color: black"/>
            </div>
          </div>
          <button @click="handleNewItemForm()" style="margin-top:15px">Crear</button>
      </template>
    </Modal>

    <Modal class="modal" :isOpen="isModalOpened" @modal-close="closeModal" name="first-modal">
      <template #header><strong>Compartir archivo</strong></template>
      <template #content>
        
        <div v-if="selectedItem?.sharedWith.length === 0">
          <p>Este archivo no se ha compartido</p>
        </div>

        <div v-else>
          <p>Compartido con:</p>
          <table style="border-collapse: collapse; width: 100%; height: 100%;">
            <tbody style="display: table; justify-items: center; width: 100%; height: 100%;">
              <tr v-for="shared in selectedItem?.sharedWith" :key="shared.user._id" style="display: table-row;">
                <td style="padding: 0px; text-align: center;">{{ shared.user.username }}</td>
                <td style="padding: 0px; margin-left: 5px; margin-right: 5px;">-</td>
                <td style="padding: 0px; text-align: center;">{{ translatePerm(shared.perm) }}</td>
                <td style="padding: 0px; color: red; cursor: pointer; padding-top: 6px;" class="material-symbols-outlined" @click="changePerms('none', shared.user.username)">close</td>
              </tr>
            </tbody>
          </table>
        </div>
        
      </template>
      <template #footer>
        <div style="margin-top:20px">

          <div class="error" v-if="errorMessage.length !== 0">
            <p style="margin-top: 5px; margin-bottom: 5px;" v-for="error in errorMessage">{{ error }}</p>
          </div>

          <input type="text" v-model="shareWith" placeholder="Comparta con username" style="margin-right:5px; background-color: #f2f2f2; color: black"/>
          <select v-model="sharePerm" style="background-color: #f2f2f2; color: black;">
            <option value="view">Vista</option>
            <option value="read">Lectura</option>
            <option value="write">Escritura</option>
          </select>
          <button @click="changePerms(sharePerm, shareWith).then(clearModalFields())" style="margin-top:10px">Compartir</button>
        </div>
      </template>
    </Modal>
  </div>
</template>

<style scoped>

.container {
  display: flex;
  align-items: center;
}

.files-container {
  display: flex;
  justify-content: center;
  align-items: center;
  flex-wrap: wrap;
}

.file-container {
  margin: 10px;
  padding: 10px;
  border: 1px solid #C8B1E4;
  border-radius: 10px;
  width: 150px;
  height: 175px;
}

.file-img {
  margin-bottom: 10px;
  justify-self: flex-start;
}

.filename {
  text-align: center;
  font-size: 16px;
  font-weight: bold;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  width: 100%;
  margin: 0;
}

.sidebar {
  width: 300px;
  height: 100vh;
  height: 100%;
  background-color: #2F184B;
  transition: right 0.3s ease;
}

.sidebar-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100vh;
  background-color: rgba(0, 0, 0, 0.5);
  z-index: 999;
  display: none;
}

.sidebar.show + .sidebar-overlay {
  display: block;
}

.sidebar ul {
  list-style-type: none; 
  padding: 0; 
}

.sidebar ul li {
  padding: 10px;
}

.container {
  position: relative;
  overflow-x: hidden;
}

.sidebar {
  position: fixed;
  top: 0;
  right: -300px;
  width: 300px;
  height: 100%;
  background-color: #2F184B;
  transition: right 0.3s ease;
}

.sidebar.show {
  right: 0;
}

.sidebar-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  z-index: 999;
  display: none;
}

.sidebar.show + .sidebar-overlay {
  display: block;
}

.main-sidebar {
  position: fixed;
  top: 0;
  left: -300px;
  width: 300px;
  height: 100%;
  background-color: #2F184B;
  transition: left 0.3s ease;
  z-index: 1001;
}

.main-sidebar.show {
  left: 0;
}

.main-sidebar-overlay {
  position: fixed;
  top: 0;
  right: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  z-index: 1000;
  display: none;
}

.main-sidebar.show + .main-sidebar-overlay {
  display: block;
}

.main-sidebar-toggle {
  position: fixed;
  top: 15px;
  left: 15px;
  height: 50%;
  cursor: pointer;
}
.main-sidebar-toggle-opened {
  top: 15px;
  left: 275px;
  z-index: 1000;
}

.main-sidebar-title {
  text-align: left; 
  margin-left: 5%; 
  margin-top: 3%; 
  font-weight: bolder; 
  word-wrap: break-word;
}

.main-sidebar-subtitle {
  text-align: left;
  margin-left: 5%;
  margin-top: 3%;
  font-weight: bolder;
}

.li-clickable {
  text-align: left; 
  margin-left: 10%; 
  cursor: pointer;
  word-wrap: break-word; 
  display: -webkit-box; 
  -webkit-line-clamp: 1; 
  -webkit-box-orient: vertical; 
  overflow: hidden;
}

.main-sidebar ul {
  list-style-type: none; 
  padding: 0; 
}

.main-sidebar ul li {
  padding: 5px;
}

.material-symbols-outlined {
  font-variation-settings:
  'FILL' 0,
  'wght' 400,
  'GRAD' 0,
  'opsz' 24
}

.filledHeart {
  font-variation-settings:
  'FILL' 1
}

.error {
  grid-column: 1 / -1;
  text-align: center;
  justify-content: center;
  width: 90%;
  height: auto;
  background-color: rgb(151, 47, 47);
  border-radius: 10px;
  padding: 1px 10px;
  margin-bottom: 10px;
  margin-left: auto;
  margin-right: auto;
  overflow-wrap: break-word;
}

.main-content {
  z-index: 1;
}

.selected_folder {
  margin-left: 10%; 
  border-radius: 8px;
  width: 80%;
  padding: 0.6em 1.2em;
  font-size: 1em;
  font-weight: 500;
  font-family: inherit;
  background-color: #C8B1E4;
  color:black;
  text-align: left;
  cursor: pointer;
  word-wrap: break-word; 
  display: -webkit-box; 
  -webkit-line-clamp: 1; 
  -webkit-box-orient: vertical; 
  overflow: hidden;
}

.logo-img{
  width: 50px;
  height: 50px;
  
}
.change-workspace-button {
  height: auto;
  border-radius: 8px;
  margin-top: 1%;
  padding: 0.4em 0.7em;
  font-size: 1em;
  font-weight: 500;
  font-family: inherit;
  background-color: #C8B1E4;
  color:black;
  cursor: pointer;
}

.dropdown {
  position: relative;
  display: inline-block;
  color: black;
}

.dropdown-content {
  display: none;
  position: absolute;
  background-color: #f9f9f9;
  min-width: 160px;
  box-shadow: 0px 8px 16px 0px rgba(0,0,0,0.2);
  padding: 12px 16px;
  z-index: 1;
}

.dropdown-content div {
  display: block;
  padding: 5px;
  cursor: pointer;
}

.dropdown:hover .dropdown-content {
  display: block;
}

.scrollable {
  scrollbar-color: #C8B1E4 transparent;
  scroll-behavior: smooth;
}
</style>