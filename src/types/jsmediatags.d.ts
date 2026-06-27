declare module 'jsmediatags' {
  class Reader {
    constructor(file: File | string);
    read(callbacks: { onSuccess: (tag: any) => void; onError: (error: any) => void }): void;
  }
  const jsmediatags: {
    Reader: typeof Reader;
    read: (file: File | string, callbacks: { onSuccess: (tag: any) => void; onError: (error: any) => void }) => void;
  };
  export default jsmediatags;
}
