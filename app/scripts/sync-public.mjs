// 把 MVP 的 public/ 共用檔（課程資料、圖示、manifest）複製到 app/public/，內容只維護一份。
// app/public/ 裡自己的檔案（sw.js、_headers）不會被覆蓋。被複製的檔案已列在 .gitignore。
import fs from 'fs';
const src = new URL('../../public/', import.meta.url), dst = new URL('../public/', import.meta.url);
const FILES = ['data', 'icon.svg', 'icon-192.png', 'icon-512.png', 'manifest.webmanifest'];
for (const f of FILES) fs.cpSync(new URL(f, src), new URL(f, dst), { recursive: true });
console.log('synced', FILES.join(', '));
