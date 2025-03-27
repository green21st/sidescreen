interface ElectronAPI {
  openDirectory: () => Promise<Electron.OpenDialogReturnValue>;
  readDirectory: (folderPath: string) => Promise<string[]>;
  closeWindow: () => void;
  readTextFile: (filePath: string) => Promise<string>;
  selectFile: () => Promise<Electron.OpenDialogReturnValue>;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
} 