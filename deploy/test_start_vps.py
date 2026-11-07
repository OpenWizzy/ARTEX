"""Exercise startup ordering without touching system services or a real database.

Run from any platform with: python3 -m unittest discover -s deploy -p 'test_*.py'
The fixture redirects VPS paths to a temp directory and stubs privileged tools.
"""
import os
from pathlib import Path
import re
import subprocess
import tempfile
import unittest


class StartVpsTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.bin = self.root / "bin"
        self.bin.mkdir()
        self.trace = self.root / "trace"
        self.trace.touch()
        source = (Path(__file__).resolve().parents[1] / "start-vps.sh").read_text()
        source = re.sub(r"/(?:etc|opt|var|run)/", lambda match: str(self.root) + match[0], source)
        source = source.replace(
            'export PATH="/usr/local/bin:/usr/bin:/bin:$PATH"',
            'export PATH="$ARTEX_TEST_BIN:/usr/bin:/bin"',
        )
        self.script = self.root / "start.sh"
        self.script.write_text(source)
        for directory in (
            "run/systemd/system", "opt/artex/skills", "var/lib/artex",
            "var/www/artex", "etc/artex/web", "etc/systemd/system",
        ):
            (self.root / directory).mkdir(parents=True, exist_ok=True)
        for file in (
            "var/www/artex/index.html", "etc/artex/web/Caddyfile",
            "etc/systemd/system/artex.service", "etc/systemd/system/artex-web.service",
        ):
            (self.root / file).write_text("fixture")
        (self.root / "etc/artex/runtime.env").write_text(
            "ARTEX_CONFIG=" + str(self.root / "etc/artex/config.json") + "\n"
        )
        (self.root / "etc/artex/site").write_text(":80\n")
        binary = self.root / "opt/artex/artex"
        binary.write_text("#!/bin/bash\nexit 0\n")
        binary.chmod(0o755)
        for tool in (
            "go", "node", "npm", "npx", "python3", "psql", "caddy", "nmap", "playwright",
            "playwright-cli", "playwright-mcp", "curl", "wget", "git", "jq",
            "unzip", "rsync", "rg", "vim", "dig", "ping", "nc", "telnet",
            "whois", "runuser", "ss", "sleep",
        ):
            self.stub(tool, "exit 0")
        self.stub("uname", "echo Linux")
        self.stub("id", "echo 0")
        self.stub("systemctl", r'''
printf '%s\n' "$*" >> "$ARTEX_TEST_TRACE"
[ "$1" != is-active ]
''')
        self.stub("caddy", r'''
[ "@{ARTEX_TEST_FAILURE:-}" != caddy ]
''')
        self.stub("ss", r'''
if [ "@{ARTEX_TEST_FAILURE:-}" = port ]; then echo 'LISTEN conflict'; fi
exit 0
''')
        self.stub("runuser", r'''
shift 2
shift
case "$1" in
  python3)
    echo check-database >> "$ARTEX_TEST_TRACE"
    [ "@{ARTEX_TEST_FAILURE:-}" != database ]; exit $? ;;
  node)
    echo check-browser >> "$ARTEX_TEST_TRACE"
    [ "@{ARTEX_TEST_FAILURE:-}" != browser ]; exit $? ;;
esac
"$@"
''')
        self.stub("curl", r'''
[ "@{ARTEX_TEST_FAILURE:-}" != health ] || exit 7
case "$*" in
  */api/health*) echo '{"ok":true}' ;;
  *) echo '<!doctype html><html>ARTEX</html>' ;;
esac
''')
        # JSON parsing at the end should be real, unlike the database preflight.
        self.stub("python3", 'exec "' + os.sys.executable + '" "$@"')

    def stub(self, name, code):
        path = self.bin / name
        path.write_text("#!/bin/bash\n" + code.replace("@{", "$" + "{").strip() + "\n")
        path.chmod(0o755)

    def run_script(self, *arguments, failure=""):
        environment = dict(os.environ)
        environment.update(
            PATH=str(self.bin) + ":/usr/bin:/bin",
            ARTEX_TEST_BIN=str(self.bin),
            ARTEX_TEST_TRACE=str(self.trace),
            ARTEX_TEST_FAILURE=failure,
        )
        return subprocess.run(
            ["/bin/bash", str(self.script), *arguments],
            env=environment, capture_output=True, text=True, timeout=10,
        )

    def mutations(self):
        return [
            line for line in self.trace.read_text().splitlines()
            if line.startswith(("enable ", "restart "))
        ]

    def test_check_only_leaves_services_untouched(self):
        result = self.run_script("--check-only")
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn("check-database", self.trace.read_text())
        self.assertIn("check-browser", self.trace.read_text())
        self.assertEqual(self.mutations(), [])

    def test_failed_preflight_never_starts_services(self):
        for stage in ("caddy", "database", "browser", "port"):
            with self.subTest(stage=stage):
                self.trace.write_text("")
                result = self.run_script(failure=stage)
                self.assertNotEqual(result.returncode, 0)
                self.assertEqual(self.mutations(), [])

    def test_missing_frontend_never_starts_services(self):
        (self.root / "var/www/artex/index.html").unlink()
        result = self.run_script()
        self.assertNotEqual(result.returncode, 0)
        self.assertEqual(self.mutations(), [])

    def test_starts_backend_before_frontend(self):
        result = self.run_script()
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(self.mutations(), [
            "enable artex artex-web", "restart artex", "restart artex-web",
        ])

    def test_unhealthy_backend_does_not_start_frontend(self):
        result = self.run_script(failure="health")
        self.assertNotEqual(result.returncode, 0)
        self.assertNotIn("restart artex-web", self.mutations())


if __name__ == "__main__":
    unittest.main()
