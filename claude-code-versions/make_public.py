"""Copy the MCP-off raw logs with the PC user name replaced by USER, and zip them (connector logs stay private)."""
import glob, os, zipfile, getpass
BASE = os.path.dirname(os.path.abspath(__file__))
user = getpass.getuser()
zp = os.path.join(BASE, "raw-logs-mcp-off.zip")
with zipfile.ZipFile(zp, "w", zipfile.ZIP_DEFLATED) as z:
    n = 0
    for f in sorted(glob.glob(os.path.join(BASE, "raw", "*_clean_*.txt"))):
        s = open(f, encoding="utf-8", errors="replace").read()
        s = s.replace(user, "USER").replace(user.lower(), "USER")
        z.writestr(os.path.basename(f), s); n += 1
print(n, "files ->", zp, os.path.getsize(zp))
