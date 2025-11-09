import os
import sys

# Add the project root to Python path
project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, project_root)

from app.core.security import hash_password, verify_password

def test_password_hashing():
    # Test normal password
    password = "testpassword123"
    hashed = hash_password(password)
    print(f"Normal password test:")
    print(f"Original: {password}")
    print(f"Hashed: {hashed}")
    print(f"Verification: {verify_password(password, hashed)}\n")

    # Test password at limit (72 bytes)
    password_at_limit = "a" * 72
    try:
        hashed = hash_password(password_at_limit)
        print(f"72-byte password test:")
        print(f"Hashed successfully")
        print(f"Verification: {verify_password(password_at_limit, hashed)}\n")
    except ValueError as e:
        print(f"72-byte password test failed: {e}\n")

    # Test too long password (73 bytes)
    password_too_long = "a" * 73
    try:
        hashed = hash_password(password_too_long)
        print("Error: Too long password was accepted")
    except ValueError as e:
        print(f"Too long password test (expected error): {e}\n")

if __name__ == "__main__":
    test_password_hashing()