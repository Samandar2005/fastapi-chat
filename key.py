# secret_key_gen.py
import secrets
import string

DEFAULT_LENGTH = 50
ALLOWED_CHARS = string.ascii_lowercase + string.digits + "!@#$%^&*(-_=+)"

def generate_django_secret_key(length: int = DEFAULT_LENGTH) -> str:
    """
    Django'ga mos, xavfsiz (cryptographically secure) SECRET_KEY generatsiya qiladi.
    Default uzunlik 50 ta belgi (Django tavsiya qilgan uzunlik).
    """
    return ''.join(secrets.choice(ALLOWED_CHARS) for _ in range(length))

if __name__ == "__main__":
    key = generate_django_secret_key()
    print(key)
