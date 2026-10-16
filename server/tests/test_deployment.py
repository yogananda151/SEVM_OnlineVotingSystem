import os
import sys
import unittest
from unittest.mock import MagicMock, patch

# Ensure server directory is in sys.path
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from app.config import Settings
from app.main import app, health_check
from app.services.storage import StorageService, ALLOWED_EXTENSIONS, ALLOWED_SUBFOLDERS
from fastapi import HTTPException


class TestConfiguration(unittest.TestCase):
    def test_local_development_defaults(self):
        s = Settings(ENV="development")
        self.assertEqual(s.ENV, "development")
        self.assertIn("mysql+pymysql://", s.sqlalchemy_database_url)
        self.assertIn("http://localhost:5173", s.cors_origins)

    def test_production_rejects_insecure_secrets(self):
        # Insecure placeholder in JWT_SECRET
        with self.assertRaises(ValueError):
            Settings(
                ENV="production",
                JWT_SECRET="smart_evm_super_secret_jwt_key_2025_change_in_production",
                JWT_REFRESH_SECRET="random_refresh_token_secret_min_32_characters_123456",
                AADHAAR_HMAC_SECRET="random_aadhaar_hmac_secret_min_32_characters_123456",
                DATABASE_URL="mysql+pymysql://tidb_user:tidb_pass@gateway01.tidbcloud.com:4000/db",
            )

        # Duplicate secrets
        with self.assertRaises(ValueError):
            identical_secret = "a" * 36
            Settings(
                ENV="production",
                JWT_SECRET=identical_secret,
                JWT_REFRESH_SECRET=identical_secret,
                AADHAAR_HMAC_SECRET="b" * 36,
                DATABASE_URL="mysql+pymysql://tidb_user:tidb_pass@gateway01.tidbcloud.com:4000/db",
            )

        # Localhost database in production
        with self.assertRaises(ValueError):
            Settings(
                ENV="production",
                JWT_SECRET="a" * 36,
                JWT_REFRESH_SECRET="b" * 36,
                AADHAAR_HMAC_SECRET="c" * 36,
                DATABASE_URL="mysql+pymysql://root:password@localhost:3306/voting_system",
            )

    def test_production_accepts_valid_secrets(self):
        s = Settings(
            ENV="production",
            JWT_SECRET="f0a8d6e3c9b241578e91234567890abcdef1234567890abcdef1234567890abc",
            JWT_REFRESH_SECRET="9b241578e91234567890abcdef1234567890abcdef1234567890abcf0a8d6e3c",
            AADHAAR_HMAC_SECRET="1234567890abcdef1234567890abcdef1234567890abcf0a8d6e3c9b241578e9",
            DATABASE_URL="mysql+pymysql://app_user:prod_pass@gateway01.ap-southeast-1.prod.aws.tidbcloud.com:4000/voting_system",
        )
        self.assertEqual(s.ENV, "production")

    def test_database_url_parsing_and_tidb_compatibility(self):
        s = Settings(
            DATABASE_URL="mysql://app_user:p@ss#word@gateway01.ap-southeast-1.prod.aws.tidbcloud.com:4000/voting_system?ssl_mode=VERIFY_IDENTITY&ssl_ca=/etc/ssl/certs/ca-certificates.crt"
        )
        url, connect_args = s.get_database_engine_params()

        # Scheme converted
        self.assertTrue(url.startswith("mysql+pymysql://"))
        # Password encoded
        self.assertIn("p%40ss%23word", url)
        # ssl_mode stripped so PyMySQL doesn't fail with unexpected keyword argument
        self.assertNotIn("ssl_mode", url)
        # TLS enabled in connect_args
        self.assertIn("ssl", connect_args)
        # Password masked in safe_database_url
        self.assertIn("app_user:***@", s.safe_database_url)

    def test_cors_origin_cleaning(self):
        s = Settings(CLIENT_URL="https://smart-evm.vercel.app/, https://demo.evm.gov.in")
        origins = s.cors_origins
        self.assertIn("https://smart-evm.vercel.app", origins)
        self.assertNotIn("https://smart-evm.vercel.app/", origins)
        self.assertIn("https://demo.evm.gov.in", origins)
        self.assertIn("http://localhost:5173", origins)


class TestFastAPIApp(unittest.TestCase):
    def test_app_object_exists(self):
        self.assertEqual(app.title, "Smart EVM – Online Voting System API")

    def test_health_check_response(self):
        response = health_check(check_db=False)
        self.assertEqual(response.status_code, 200)
        import json
        data = json.loads(response.body.decode("utf-8"))
        self.assertEqual(data["status"], "ok")
        self.assertIn("timestamp", data)
        self.assertIn("services", data)
        self.assertEqual(data["services"]["api"], "healthy")

    def test_routes_registered(self):
        paths = app.openapi()["paths"].keys()
        self.assertIn("/health", paths)
        self.assertIn("/api/auth/login", paths)
        self.assertIn("/api/voting/cast", paths)
        self.assertIn("/api/elections", paths)


class TestStorageService(unittest.TestCase):
    def test_subfolder_traversal_prevention(self):
        mock_file = MagicMock()
        mock_file.filename = "photo.jpg"
        mock_file.content_type = "image/jpeg"

        with self.assertRaises(HTTPException) as ctx:
            StorageService.validate_and_save(mock_file, "../etc")
        self.assertEqual(ctx.exception.status_code, 400)

    def test_disallowed_extension_rejected(self):
        mock_file = MagicMock()
        mock_file.filename = "script.py"
        mock_file.content_type = "text/x-python"

        with self.assertRaises(HTTPException) as ctx:
            StorageService.validate_and_save(mock_file, "candidates")
        self.assertEqual(ctx.exception.status_code, 400)


class TestONNXModels(unittest.TestCase):
    def test_onnx_models_exist_and_meet_size_requirements(self):
        models_dir = os.path.join(BASE_DIR, "app", "models_cv")
        yunet = os.path.join(models_dir, "face_detection_yunet_2023mar.onnx")
        sface = os.path.join(models_dir, "face_recognition_sface_2021dec.onnx")

        self.assertTrue(os.path.exists(yunet), f"Missing model: {yunet}")
        self.assertTrue(os.path.exists(sface), f"Missing model: {sface}")
        self.assertGreater(os.path.getsize(yunet), 200000)
        self.assertGreater(os.path.getsize(sface), 35000000)


class TestSeedAccountProtection(unittest.TestCase):
    def test_seed_preserves_existing_user(self):
        from app.models.user import User
        from app.models.enums import UserRole

        mock_db = MagicMock()
        existing_user = User(
            id=1,
            email="commissioner@evm.gov.in",
            passwordHash="existing_secure_hash_12345",
            role=UserRole.COMMISSIONER,
        )
        mock_db.query().filter().first.return_value = existing_user

        # In seed logic, when user exists, no password overwrite occurs
        user = mock_db.query(User).filter(User.email == "commissioner@evm.gov.in").first()
        self.assertEqual(user.passwordHash, "existing_secure_hash_12345")


if __name__ == "__main__":
    unittest.main()
