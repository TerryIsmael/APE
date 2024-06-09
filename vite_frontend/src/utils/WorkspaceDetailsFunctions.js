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
        if (this.isUserInModalProfile(newUser, modalProfile)) {
            modalProfile.value.users.push(newUser);
        } else {
            modalProfile.value.users = modalProfile.value.users.filter(user => user._id !== newUser._id);
        }
    };

    static toggleEdit = (editing, newWorkspace, workspace) => {
        editing.value = !editing.value;
        newWorkspace.value = workspace.value;
    };
}

export default WorkspaceDetails;