#!/usr/bin/env bash
# 准备 Debian/Ubuntu VPS：依赖、纯 Go 后端、静态前端和 systemd 配置；不启动应用。
set -euo pipefail
cd "$(cd "$(dirname "$0")" && pwd)"

info(){ printf '[*] %s\n' "$*"; }
die(){ printf '错误：%s\n' "$*" >&2; exit 1; }
usage(){
  cat <<'EOF'
用法：sudo ./setup-vps.sh [--domain artex.example.com] [--skip-deps]
默认用 HTTP 80 端口；指定域名后由 Caddy 自动申请 HTTPS 证书。
数据库使用已有 PostgreSQL（包括 Neon）；首次运行交互填写连接串。
--skip-deps 复用已安装的依赖，只重新编译和部署。保留已有数据库配置与数据。
完成后运行 sudo ./start-vps.sh 检查并启动。
EOF
}
site=""
skip_deps=0
while [ "$#" -gt 0 ]; do
  case "$1" in
    --domain) [ "$#" -ge 2 ] || die "--domain 缺少域名"; site="$2"; shift 2 ;;
    --skip-deps) skip_deps=1; shift ;;
    -h|--help) usage; exit 0 ;;
    *) die "未知参数：$1" ;;
  esac
done
[ "$(uname -s)" = Linux ] || die "本脚本用于 Linux VPS"
[ "$(id -u)" -eq 0 ] || die "请使用 sudo 运行"
[ -d /run/systemd/system ] || die "需要使用 systemd 的 VPS"
[ -f /etc/os-release ] || die "无法识别 Linux 发行版"
. /etc/os-release
case "$ID:$VERSION_ID" in
  ubuntu:22.04|ubuntu:24.04|debian:12|debian:13) ;;
  *) die "支持 Ubuntu 22.04/24.04、Debian 12/13" ;;
esac
if [ -z "$site" ] && [ -f /etc/artex/site ]; then site="$(cat /etc/artex/site)"; fi
site="${site:-:80}"
if [ "$site" != :80 ] && ! [[ "$site" =~ ^[A-Za-z0-9]([A-Za-z0-9.-]*[A-Za-z0-9])?$ ]]; then
  die "域名只能包含字母、数字、点和连字符"
fi

work_dir="$(mktemp -d)"
trap 'rm -rf "$work_dir"' EXIT
if [ "$skip_deps" -eq 0 ]; then
  info "安装系统工具和 PostgreSQL 客户端（不安装数据库服务）…"
  export DEBIAN_FRONTEND=noninteractive
  apt-get update
  apt-get install -y --no-install-recommends \
    ca-certificates curl wget git jq unzip rsync build-essential gnupg \
    debian-keyring debian-archive-keyring apt-transport-https \
    python3 python3-pip python3-venv python3-psycopg2 postgresql-client \
    ripgrep vim dnsutils iputils-ping netcat-openbsd inetutils-telnet whois nmap \
    util-linux iproute2

  if ! command -v node >/dev/null || ! node -e 'if (Number(process.versions.node.split(".")[0]) < 24) process.exit(1)'; then
    info "安装 Node.js 24…"
    curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key \
      | gpg --dearmor --yes -o /usr/share/keyrings/artex-nodesource.gpg
    chmod 644 /usr/share/keyrings/artex-nodesource.gpg
    printf 'deb [arch=%s signed-by=/usr/share/keyrings/artex-nodesource.gpg] https://deb.nodesource.com/node_24.x nodistro main\n' \
      "$(dpkg --print-architecture)" > /etc/apt/sources.list.d/artex-nodesource.list
    apt-get update
    apt-get install -y nodejs
  fi

  go_version="$(awk '$1 == "go" {print $2; exit}' go.mod)"
  if ! command -v go >/dev/null || ! dpkg --compare-versions "$(GOTOOLCHAIN=local go version | awk '{sub(/^go/, "", $3); print $3}')" ge "$go_version"; then
    case "$(uname -m)" in
      x86_64) go_arch=amd64 ;;
      aarch64|arm64) go_arch=arm64 ;;
      *) die "Go 自动安装支持 x86_64 和 arm64" ;;
    esac
    info "安装 Go ${go_version}（核对官方 SHA256）…"
    curl -fsSL 'https://go.dev/dl/?mode=json&include=all' -o "$work_dir/go-releases.json"
    go_archive="go$go_version.linux-$go_arch.tar.gz"
    go_checksum="$(python3 - "$work_dir/go-releases.json" "$go_archive" <<'PY'
import json, sys
for release in json.load(open(sys.argv[1])):
    for f in release["files"]:
        if f["filename"] == sys.argv[2]:
            print(f["sha256"])
            sys.exit(0)
sys.exit("官方发布列表中未找到所需 Go 版本")
PY
)"
    curl -fsSL "https://go.dev/dl/$go_archive" -o "$work_dir/$go_archive"
    printf '%s  %s\n' "$go_checksum" "$work_dir/$go_archive" | sha256sum -c -
    toolchain_dir="/opt/artex-toolchains/go$go_version"
    mkdir -p "$toolchain_dir"
    tar -xzf "$work_dir/$go_archive" -C "$toolchain_dir"
    ln -sfn "$toolchain_dir/go/bin/go" /usr/local/bin/go
    ln -sfn "$toolchain_dir/go/bin/gofmt" /usr/local/bin/gofmt
  fi

  if ! command -v caddy >/dev/null; then
    info "安装 Caddy…"
    curl -fsSL https://dl.cloudsmith.io/public/caddy/stable/gpg.key \
      | gpg --dearmor --yes -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
    curl -fsSL https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt \
      -o /etc/apt/sources.list.d/caddy-stable.list
    chmod 644 /usr/share/keyrings/caddy-stable-archive-keyring.gpg /etc/apt/sources.list.d/caddy-stable.list
    apt-get update
    apt-get install -y caddy
    # 包会自动启动默认站点；ARTEX 使用独立的 artex-web 单元。
    systemctl disable --now caddy
  fi
fi

export PATH="/usr/local/bin:/usr/bin:/bin:$PATH"
for tool in go node npm python3 caddy rsync runuser; do
  command -v "$tool" >/dev/null || die "缺少 ${tool}，请先不带 --skip-deps 执行"
done
id artex >/dev/null 2>&1 || useradd --system --user-group --create-home --home-dir /var/lib/artex --shell /bin/bash artex
id caddy >/dev/null 2>&1 || useradd --system --user-group --create-home --home-dir /var/lib/caddy --shell /usr/sbin/nologin caddy
install -d -m 755 /opt/artex /var/www/artex
install -d -m 750 -o root -g artex /etc/artex
install -d -m 750 -o artex -g artex /var/lib/artex

if [ ! -f /etc/artex/config.json ]; then
  if [ -n "${ARTEX_PG_DSN:-}" ]; then
    info "将 ARTEX_PG_DSN 保存到 /etc/artex/config.json"
    python3 - /etc/artex/config.json <<'PY'
import json, os, sys
with open(sys.argv[1], "w") as f:
    json.dump({"database": {"dsn": os.environ["ARTEX_PG_DSN"]}}, f, indent=2)
PY
  elif [ -f config.json ]; then
    cp config.json /etc/artex/config.json
  else
    info "填写已有 PostgreSQL 的连接串；Neon 使用 Direct connection，保留 sslmode=require"
    read -r -s -p "PostgreSQL 连接串（输入不回显）：" database_dsn
    printf '\n'
    case "$database_dsn" in postgres://*|postgresql://*) ;; *) die "连接串须以 postgres:// 或 postgresql:// 开头" ;; esac
    printf '%s' "$database_dsn" | python3 -c \
      'import json,sys; json.dump({"database":{"dsn":sys.stdin.read()}},open(sys.argv[1],"w"),indent=2)' /etc/artex/config.json
    unset database_dsn
  fi
fi
chown root:artex /etc/artex/config.json
chmod 640 /etc/artex/config.json

export PLAYWRIGHT_BROWSERS_PATH=/var/lib/artex/ms-playwright
if [ "$skip_deps" -eq 0 ]; then
  info "安装 Playwright、MCP、CLI 和 Chromium…"
  npm install --global playwright @playwright/mcp @playwright/cli
  playwright install --with-deps chromium
  chown -R artex:artex "$PLAYWRIGHT_BROWSERS_PATH"
fi
export NODE_PATH="$(npm root -g)"
chromium_path="$(node -e 'process.stdout.write(require("playwright").chromium.executablePath())')"
[ -x "$chromium_path" ] || die "Chromium 未安装，请先不带 --skip-deps 执行"

info "编译纯 Go 后端（不嵌入 web）…"
GOFLAGS= CGO_ENABLED=0 go build -trimpath -ldflags '-s -w' -o "$work_dir/artex" ./cmd/artex
info "编译 TanStack 静态前端…"
(cd web && HUSKY=0 npm ci && VITE_SSE_BASE= npm run build:static)
[ -s web/out/index.html ] || die "前端未生成 web/out/index.html"

# 两部分都构建成功后才更新运行目录，保留配置和运行数据。
install -m 755 "$work_dir/artex" /opt/artex/artex.next
mv -f /opt/artex/artex.next /opt/artex/artex
rsync -a --delete --exclude node_modules/ skills/ /opt/artex/skills/
npm ci --prefix /opt/artex/skills/api-recon/scripts
chown -R artex:artex /opt/artex/skills
rsync -a --delete --chmod=D755,F644 web/out/ /var/www/artex/
install -m 644 deploy/check_database.py deploy/check_browser.cjs /opt/artex/
cat > /etc/artex/runtime.env <<EOF
ARTEX_CONFIG=/etc/artex/config.json
ARTEX_SKILL_DIR=/opt/artex/skills
NODE_PATH=$NODE_PATH
PLAYWRIGHT_BROWSERS_PATH=$PLAYWRIGHT_BROWSERS_PATH
PLAYWRIGHT_MCP_EXECUTABLE_PATH=$chromium_path
PLAYWRIGHT_MCP_HEADLESS=true
CHROMIUM=$chromium_path
EOF
chmod 644 /etc/artex/runtime.env
printf '%s\n' "$site" > /etc/artex/site
# Caddy 以独立用户读取配置，不暴露数据库凭据。
install -d -m 755 /etc/artex/web
sed "s/__ARTEX_SITE__/$site/" deploy/Caddyfile > /etc/artex/web/Caddyfile
chmod 644 /etc/artex/site /etc/artex/web/Caddyfile
# /etc/artex 允许穿过目录；config.json 仍只可由 root 和 artex 读取。
chmod 751 /etc/artex
sed "s|__CADDY_BIN__|$(command -v caddy)|" deploy/artex-web.service > /etc/systemd/system/artex-web.service
install -m 644 deploy/artex.service /etc/systemd/system/artex.service
systemctl daemon-reload
caddy validate --config /etc/artex/web/Caddyfile --adapter caddyfile
info "准备完成，尚未启动 ARTEX。运行 sudo ./start-vps.sh 检查并启动。"
