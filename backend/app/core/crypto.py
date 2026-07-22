from cryptography.fernet import Fernet, InvalidToken

from app.core.config import get_settings


def _fernet() -> Fernet:
    return Fernet(get_settings().provider_key_encryption_secret.encode())


def encrypt_secret(plaintext: str) -> str:
    return _fernet().encrypt(plaintext.encode()).decode()


def decrypt_secret(ciphertext: str) -> str:
    try:
        return _fernet().decrypt(ciphertext.encode()).decode()
    except InvalidToken as error:
        raise ValueError("Stored credential could not be decrypted.") from error


def last_four(plaintext: str) -> str:
    return plaintext[-4:] if len(plaintext) >= 4 else plaintext
