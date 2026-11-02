// Mock 开关。构建期注入的公开变量（VITE_ 前缀才在浏览器可读）。
// 构建时设 VITE_MOCK=1 即整站走 mock、无需后端（演示站用）。
// NEXT_PUBLIC_MOCK is the pre-Vite name, still honored for existing deployments.
export const MOCK = (import.meta.env.VITE_MOCK ?? import.meta.env.NEXT_PUBLIC_MOCK) === "1";
