type PickerAcceptMap = Record<string, string[]>;

interface PickerTypeOption {
  description?: string;
  accept: PickerAcceptMap;
}

interface OpenFilePickerOptions {
  multiple?: boolean;
  types?: PickerTypeOption[];
  excludeAcceptAllOption?: boolean;
}

interface SaveFilePickerOptions {
  suggestedName?: string;
  types?: PickerTypeOption[];
  excludeAcceptAllOption?: boolean;
}

interface WritableFileStream {
  write(data: string): Promise<void>;
  close(): Promise<void>;
}

interface FileHandlePermissionDescriptor {
  mode?: 'read' | 'readwrite';
}

interface FileSystemFileHandleLike {
  getFile(): Promise<File>;
  createWritable(): Promise<WritableFileStream>;
  queryPermission?(descriptor?: FileHandlePermissionDescriptor): Promise<PermissionState>;
  requestPermission?(descriptor?: FileHandlePermissionDescriptor): Promise<PermissionState>;
}

interface WindowFilePickerSupport extends Window {
  showOpenFilePicker?: (options?: OpenFilePickerOptions) => Promise<FileSystemFileHandleLike[]>;
  showSaveFilePicker?: (options?: SaveFilePickerOptions) => Promise<FileSystemFileHandleLike>;
}

export interface FilePickerAccept {
  description: string;
  mimeTypes: string[];
  extensions: string[];
}

export class UserCancelledFilePickerError extends Error {
  constructor() {
    super('User cancelled file picker');
    this.name = 'UserCancelledFilePickerError';
  }
}

export function isUserCancelledFilePickerError(error: unknown): boolean {
  if (error instanceof UserCancelledFilePickerError) return true;
  if (error instanceof DOMException && error.name === 'AbortError') return true;
  if (error instanceof Error && error.name === 'AbortError') return true;
  return false;
}

export function supportsFileSystemAccessApi(): boolean {
  const w = window as WindowFilePickerSupport;
  return typeof w.showOpenFilePicker === 'function' && typeof w.showSaveFilePicker === 'function';
}

function toPickerTypes(accept?: FilePickerAccept[]): PickerTypeOption[] | undefined {
  if (!accept || accept.length === 0) return undefined;
  return accept.map(item => ({
    description: item.description,
    accept: item.mimeTypes.reduce<PickerAcceptMap>((acc, mime) => {
      acc[mime] = item.extensions;
      return acc;
    }, {}),
  }));
}

async function requestPermission(
  handle: FileSystemFileHandleLike,
  mode: 'read' | 'readwrite'
): Promise<boolean> {
  if (!handle.queryPermission || !handle.requestPermission) return true;
  const current = await handle.queryPermission({ mode });
  if (current === 'granted') return true;
  const next = await handle.requestPermission({ mode });
  return next === 'granted';
}

function readFromInputElement(accept?: FilePickerAccept[]): Promise<File> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept?.flatMap(item => item.extensions).join(',') || '';
    let handled = false;
    input.onchange = () => {
      handled = true;
      const file = input.files?.[0];
      if (!file) {
        reject(new UserCancelledFilePickerError());
        return;
      }
      resolve(file);
    };
    input.onerror = () => reject(new Error('Failed to open file picker'));
    input.oncancel = () => {
      handled = true;
      reject(new UserCancelledFilePickerError());
    };

    const onFocusBack = () => {
      setTimeout(() => {
        if (!handled) {
          handled = true;
          reject(new UserCancelledFilePickerError());
        }
        window.removeEventListener('focus', onFocusBack, true);
      }, 0);
    };
    window.addEventListener('focus', onFocusBack, true);
    input.click();
  });
}

export async function pickTextFile(options?: {
  accept?: FilePickerAccept[];
}): Promise<{ file: File; text: string; handle?: FileSystemFileHandleLike }> {
  const w = window as WindowFilePickerSupport;
  if (w.showOpenFilePicker) {
    const handles = await w.showOpenFilePicker({
      multiple: false,
      types: toPickerTypes(options?.accept),
      excludeAcceptAllOption: false,
    });
    const handle = handles[0];
    if (!handle) throw new Error('No file selected');
    const granted = await requestPermission(handle, 'read');
    if (!granted) throw new Error('File read permission denied');
    const file = await handle.getFile();
    const text = await file.text();
    return { file, text, handle };
  }

  const file = await readFromInputElement(options?.accept);
  const text = await file.text();
  return { file, text };
}

export async function saveTextFile(
  text: string,
  options?: {
    suggestedName?: string;
    accept?: FilePickerAccept[];
  }
): Promise<void> {
  const w = window as WindowFilePickerSupport;
  if (w.showSaveFilePicker) {
    const handle = await w.showSaveFilePicker({
      suggestedName: options?.suggestedName,
      types: toPickerTypes(options?.accept),
      excludeAcceptAllOption: false,
    });
    const granted = await requestPermission(handle, 'readwrite');
    if (!granted) throw new Error('File write permission denied');
    const writable = await handle.createWritable();
    await writable.write(text);
    await writable.close();
    return;
  }

  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = options?.suggestedName || `diagram-${Date.now()}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
