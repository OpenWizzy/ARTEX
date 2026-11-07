import { tanstackStart } from "@tanstack/react-start/plugin/vite";

import babel from "@rolldown/plugin-babel";
import tailwindcss from "@tailwindcss/vite";
import viteReact, { reactCompilerPreset } from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// 开发：把 /api/* 反代到 Go 后端（默认 :8787，可用 AUTOPENTEST_API 覆盖）。
const backend = process.env.AUTOPENTEST_API ?? "http://localhost:8787";

export default defineConfig({
  // Vite 8 resolves the tsconfig.json path aliases (`@/*`) itself.
  resolve: { tsconfigPaths: true },
  server: {
    // 监听所有网卡，局域网 IP 也能打开 dev 页面（含 HMR）。
    host: true,
    proxy: { "/api": { target: backend, changeOrigin: true } },
  },
  environments: {
    client: {
      build: {
        // 静态站点输出到 web/out：VPS 部署由 Caddy 直接提供；
        // build.sh / release.yml 也可将其内嵌进 Go 二进制。
        // （dist/server 是预渲染外壳页用的服务端包，不发布。）
        outDir: "out",
        // 生产包去掉 console.*（原 next.config 的 compiler.removeConsole）。
        rolldownOptions: { output: { minify: { compress: { dropConsole: true }, mangle: true } } },
      },
    },
  },
  plugins: [
    tailwindcss(),
    tanstackStart({
      // 前端生成纯静态文件，由 Caddy 提供或内嵌进 Go 二进制，没有 Node 运行时。
      // SPA 模式只在构建期预渲染外壳页并写成 dist/client/index.html；页面一律在
      // 浏览器里渲染，静态服务器对未知路径回落到 index.html，交给客户端路由。
      spa: { enabled: true, prerender: { outputPath: "/index" } },
    }),
    viteReact(),
    // @vitejs/plugin-react 6 no longer runs Babel, so the two Babel
    // transforms run here. Babel applies a config's plugins before its
    // presets: Lingui's macros are expanded first, then React Compiler sees
    // the finished code.
    babel({
      plugins: ["@lingui/babel-plugin-lingui-macro"],
      presets: [reactCompilerPreset()],
    }),
  ],
});
