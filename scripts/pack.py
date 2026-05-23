"""Pack the project source code, excluding generated/large directories."""

import os
import zipfile
from pathlib import Path

EXCLUDE_DIRS = {"node_modules", ".next", "dist", "__pycache__", ".git"}
PROJECT_ROOT = Path(__file__).parent.parent.resolve()
OUTPUT = Path.home() / "Desktop" / "speakup-ai-source.zip"


def main():
    count = 0
    total_size = 0
    with zipfile.ZipFile(OUTPUT, "w", zipfile.ZIP_DEFLATED) as zf:
        for root, dirs, files in os.walk(PROJECT_ROOT):
            # Prune excluded directories (modifies dirs in-place)
            dirs[:] = [d for d in dirs if d not in EXCLUDE_DIRS]

            for file in files:
                if file.endswith(".pyc") or file.endswith(".pyo"):
                    continue
                file_path = Path(root) / file
                arcname = file_path.relative_to(PROJECT_ROOT)
                zf.write(file_path, arcname)
                count += 1
                total_size += file_path.stat().st_size

    print(f"Packed {count} files, {total_size / 1024 / 1024:.2f} MB")
    print(f"Output: {OUTPUT}")
    print()
    print("Excluded directories: node_modules, .next, dist, __pycache__, .git")
    print("After extracting, run:")
    print("  cd apps/web && npm install")
    print("  cd services/api && pip install -r requirements.txt")


if __name__ == "__main__":
    main()
