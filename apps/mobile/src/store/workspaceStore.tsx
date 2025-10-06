// apps/mobile/src/store/workspaceStore.ts
import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface WorkspaceState {
  selectedWorkspaceId: string | null;
  selectedWorkspaceName: string | null;
  setSelectedWorkspace: (id: string, name: string) => void;
  clearSelectedWorkspace: () => void;
  loadSavedWorkspace: () => void;
}

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  selectedWorkspaceId: null,
  selectedWorkspaceName: null,
  
  setSelectedWorkspace: async (id, name) => {
    await AsyncStorage.setItem('selectedWorkspaceId', id);
    await AsyncStorage.setItem('selectedWorkspaceName', name);
    set({ selectedWorkspaceId: id, selectedWorkspaceName: name });
  },
  
  clearSelectedWorkspace: async () => {
    await AsyncStorage.multiRemove(['selectedWorkspaceId', 'selectedWorkspaceName']);
    set({ selectedWorkspaceId: null, selectedWorkspaceName: null });
  },
  
  loadSavedWorkspace: async () => {
    try {
      const [id, name] = await AsyncStorage.multiGet(['selectedWorkspaceId', 'selectedWorkspaceName']);
      if (id[1] && name[1]) {
        set({ selectedWorkspaceId: id[1], selectedWorkspaceName: name[1] });
      }
    } catch (error) {
      console.error('Error loading saved workspace:', error);
    }
  },
}));