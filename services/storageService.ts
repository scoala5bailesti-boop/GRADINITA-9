
export const storage = {
  get: <T,>(key: string, defaultValue: T): T => {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : defaultValue;
  },
  set: (key: string, value: any) => {
    localStorage.setItem(key, JSON.stringify(value));
  }
};
