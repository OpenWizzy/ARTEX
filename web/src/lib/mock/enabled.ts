// Mock 开关：用 `npm run dev:mock` 启动（Vite 的 mock 模式）时整站走模拟数据，
// 不需要后端，用来在没有后端时预览界面。
export const MOCK = import.meta.env.MODE === "mock";
