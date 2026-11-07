//go:build !embedui

package server

import "net/http"

// webuiHandler is the no-embed stub (default build). The frontend is NOT bundled
// into this binary. In VPS deployments Caddy serves web/out separately; during
// development run `cd web && npm run dev`. Build the bundled single-binary with:
//
//	cd web && npm run build:static     # produces web/out
//	cp -r web/out server/webui/dist    # (or use the build script)
//	go build -tags embedui ./cmd/artex
func (s *Server) webuiHandler() http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		http.Error(w, "此二进制仅提供 API；请通过 Caddy 访问前端，开发时可运行 cd web && npm run dev", http.StatusNotFound)
	})
}
