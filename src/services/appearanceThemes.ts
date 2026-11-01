export type AppearanceTheme = {
  id: string;
  name: string;
  theme: "forest" | "ocean" | "berry" | "amber";
  wallpaper: string;
  bannerColor: string;
  tint: string;
  overlay: number;
};

async function themeStore<T>(mode: IDBTransactionMode, operation: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open("studyday.appearance", 1);
    request.onupgradeneeded = () => request.result.createObjectStore("themes", { keyPath: "id" });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  return new Promise((resolve, reject) => {
    const transaction = db.transaction("themes", mode);
    const request = operation(transaction.objectStore("themes"));
    transaction.oncomplete = () => { db.close(); resolve(request.result); };
    transaction.onabort = transaction.onerror = () => { db.close(); reject(transaction.error || new Error("Could not save appearance themes.")); };
  });
}

export const listAppearanceThemes = () => themeStore("readonly", (store) => store.getAll()) as Promise<AppearanceTheme[]>;
export const saveAppearanceTheme = (theme: AppearanceTheme) => themeStore("readwrite", (store) => store.put(theme));
export const deleteAppearanceTheme = (id: string) => themeStore("readwrite", (store) => store.delete(id));
