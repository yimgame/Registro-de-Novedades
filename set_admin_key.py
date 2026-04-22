import os
from getpass import getpass

from argon2 import PasswordHasher

BASE_DIR = os.path.abspath(os.path.dirname(__file__))
HASH_FILE = os.getenv("ADMIN_HASH_FILE", os.path.join(BASE_DIR, ".env", "admin_key.hash"))
AUTH_PEPPER_FILE = os.getenv("AUTH_PEPPER_FILE", os.path.join(BASE_DIR, ".env", "auth_pepper.env"))

password_hasher = PasswordHasher(
    time_cost=3,
    memory_cost=19456,
    parallelism=1,
)


def read_env_value(file_path: str, key: str) -> str:
    if not os.path.exists(file_path):
        return ""

    try:
        with open(file_path, "r", encoding="utf-8") as file:
            for line in file:
                line_clean = line.strip()
                if not line_clean or line_clean.startswith("#") or "=" not in line_clean:
                    continue
                env_key, env_value = line_clean.split("=", 1)
                if env_key.strip().lstrip("\ufeff") == key:
                    return env_value.strip().strip('"').strip("'")
    except OSError:
        return ""

    return ""


AUTH_PEPPER = os.getenv("AUTH_PEPPER", "") or read_env_value(AUTH_PEPPER_FILE, "AUTH_PEPPER")


def apply_pepper(raw_key: str) -> str:
    value = raw_key or ""
    if not AUTH_PEPPER:
        return value
    return f"{value}{AUTH_PEPPER}"


def hash_key(raw_key: str) -> str:
    return password_hasher.hash(apply_pepper(raw_key))


def main() -> None:
    key_1 = getpass("Ingresar admin key: ").strip()
    key_2 = getpass("Repetir admin key: ").strip()

    if not key_1:
        print("ERROR: La admin key no puede estar vacia.")
        raise SystemExit(1)

    if key_1 != key_2:
        print("ERROR: Las claves no coinciden.")
        raise SystemExit(1)

    digest = hash_key(key_1)

    os.makedirs(os.path.dirname(HASH_FILE), exist_ok=True)

    with open(HASH_FILE, "w", encoding="utf-8") as file:
        file.write(digest)

    print(f"OK: Hash guardado en {HASH_FILE}")


if __name__ == "__main__":
    main()
