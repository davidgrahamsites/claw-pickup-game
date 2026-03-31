import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('clawDesktop', {
  loadMachineFile: () => ipcRenderer.invoke('claw:load-file'),
  saveMachineFile: (defaultName: string, data: string) =>
    ipcRenderer.invoke('claw:save-file', defaultName, data),
})
