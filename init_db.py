import os

import app


def main() -> int:
    os.makedirs(app.INSTANCE_DIR, exist_ok=True)

    with app.app.app_context():
        app.db.create_all()
        app.ensure_block_request_schema()
        app.ensure_user_schema()
        app.ensure_settings_defaults()

    print("OK: Base de datos inicializada.")
    print(f"DB: {app.app.config['SQLALCHEMY_DATABASE_URI']}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
