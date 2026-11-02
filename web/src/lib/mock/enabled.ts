// Mock 开关。构建期注入的公开变量（VITE_ 前缀才在浏览器可读）。
// 构建时设 VITE_MOCK=1 即整站走 mock、无需后端（没有后端时预览界面用）。
export const MOCK = import.meta.env.VITE_MOCK === "1";
