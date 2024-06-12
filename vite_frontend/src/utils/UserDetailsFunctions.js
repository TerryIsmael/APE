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
                errorMessage.value = [];
                response.json().then((data) => {
                if (data.error || data.errors) {
                    Utils.parseErrorMessage(data, errorMessage);
                } else {
                    throw new Error("Error al eliminar item");
                }
              })
            }
        } catch (error) {
        console.log(error);
        }
    };



}

export default UserDetails;