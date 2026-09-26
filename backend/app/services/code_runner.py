"""Runs submitted code locally using the interpreters/compilers already
installed on this machine — Python, Node.js, g++, javac. No external API,
no API key, no Docker, no sandboxing service to sign up for.

Security note: this executes submitted code directly on the host process,
with a wall-clock timeout but no OS-level sandbox (no container, no seccomp).
That's an appropriate, well-understood trade-off for a project you run
locally for yourself or a small trusted group — the same trade-off every
"run code locally" judge makes. It is NOT what you'd want for a public,
multi-tenant service accepting code from strangers; that needs an isolated
sandbox (gVisor, Firecracker, a container, or a hosted judge) in front of it.
"""
import asyncio
import shutil
import tempfile
import shutil as _shutil_mod  # noqa: F401 (kept for clarity of rmtree usage below)
import os
from app.config import get_settings

settings = get_settings()

SUPPORTED_LANGUAGES = {"python", "javascript", "cpp", "java"}


def _find(*names: str) -> str | None:
    for name in names:
        path = shutil.which(name)
        if path:
            return path
    return None


async def _run_proc(cmd: list[str], cwd: str, stdin_data: str, timeout: int) -> dict:
    try:
        proc = await asyncio.create_subprocess_exec(
            *cmd,
            cwd=cwd,
            stdin=asyncio.subprocess.PIPE,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
    except FileNotFoundError as e:
        return {"ok": False, "stdout": "", "stderr": str(e), "status": "Setup Error"}

    try:
        stdout, stderr = await asyncio.wait_for(
            proc.communicate(input=stdin_data.encode()), timeout=timeout
        )
    except asyncio.TimeoutError:
        proc.kill()
        await proc.wait()
        return {"ok": False, "stdout": "", "stderr": "Time limit exceeded", "status": "Timeout"}

    ok = proc.returncode == 0
    return {
        "ok": ok,
        "stdout": stdout.decode(errors="replace"),
        "stderr": stderr.decode(errors="replace"),
        "status": "Accepted" if ok else "Runtime Error",
    }


async def _compile(cmd: list[str], cwd: str, timeout: int = 20) -> dict | None:
    """Returns None on success, or an error dict on failure."""
    try:
        proc = await asyncio.create_subprocess_exec(
            *cmd, cwd=cwd, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE
        )
        _, stderr = await asyncio.wait_for(proc.communicate(), timeout=timeout)
    except FileNotFoundError as e:
        return {"tool_missing": True, "message": str(e)}
    except asyncio.TimeoutError:
        return {"tool_missing": False, "message": "Compilation timed out"}

    if proc.returncode != 0:
        return {"tool_missing": False, "message": stderr.decode(errors="replace")}
    return None


async def run_code(language: str, source_code: str, test_cases: list[dict]) -> dict:
    if language not in SUPPORTED_LANGUAGES:
        raise ValueError(f"Unsupported language: {language}")

    timeout = settings.CODE_EXEC_TIMEOUT_SECONDS
    workdir = tempfile.mkdtemp(prefix="nextround_")
    results = []
    passed = 0

    try:
        run_cmd_template = await _prepare(language, source_code, workdir)
        if isinstance(run_cmd_template, dict):  # compile/setup error — fails every test case
            for tc in test_cases:
                results.append({
                    "passed": False, "stdout": "", "stderr": run_cmd_template["message"],
                    "expected": tc["expected_output"], "status": "Compile Error" if not run_cmd_template.get("tool_missing") else "Setup Error",
                })
            return {"passed": 0, "total": len(test_cases), "results": results}

        for tc in test_cases:
            outcome = await _run_proc(run_cmd_template, workdir, tc.get("input", ""), timeout)
            ok = outcome["ok"] and outcome["stdout"].strip() == tc["expected_output"].strip()
            if ok:
                passed += 1
            results.append({
                "passed": ok,
                "stdout": outcome["stdout"],
                "stderr": outcome["stderr"],
                "expected": tc["expected_output"],
                "status": outcome["status"] if not outcome["ok"] else ("Accepted" if ok else "Wrong Answer"),
            })

        return {"passed": passed, "total": len(test_cases), "results": results}
    finally:
        shutil.rmtree(workdir, ignore_errors=True)


async def _prepare(language: str, source_code: str, workdir: str):
    """Writes the source file (and compiles it if needed). Returns the
    command list to run per test case, or an error dict."""

    if language == "python":
        interpreter = _find("python3", "python")
        if not interpreter:
            return {"tool_missing": True, "message": "Python was not found on this machine. Install Python 3 and make sure it's on your PATH."}
        path = os.path.join(workdir, "submission.py")
        with open(path, "w") as f:
            f.write(source_code)
        return [interpreter, path]

    if language == "javascript":
        node = _find("node")
        if not node:
            return {"tool_missing": True, "message": "Node.js was not found on this machine. Install Node.js and make sure it's on your PATH."}
        path = os.path.join(workdir, "submission.js")
        with open(path, "w") as f:
            f.write(source_code)
        return [node, path]

    if language == "cpp":
        gxx = _find("g++", "c++")
        if not gxx:
            return {"tool_missing": True, "message": "No C++ compiler found. Install g++ (e.g. MinGW-w64 on Windows, 'sudo apt install g++' on Linux, or Xcode Command Line Tools on macOS)."}
        src = os.path.join(workdir, "submission.cpp")
        exe = os.path.join(workdir, "submission.exe" if os.name == "nt" else "submission.out")
        with open(src, "w") as f:
            f.write(source_code)
        err = await _compile([gxx, "-O2", "-o", exe, src], workdir)
        if err:
            return err
        return [exe]

    if language == "java":
        javac = _find("javac")
        java = _find("java")
        if not javac or not java:
            return {"tool_missing": True, "message": "No Java JDK found. Install a JDK (e.g. from https://adoptium.net) and make sure javac/java are on your PATH."}
        src = os.path.join(workdir, "Main.java")
        with open(src, "w") as f:
            f.write(source_code)
        err = await _compile([javac, src], workdir)
        if err:
            return err
        return [java, "-cp", workdir, "Main"]

    raise ValueError(f"Unsupported language: {language}")
