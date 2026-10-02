"""
Helper script to generate a bcrypt password hash for AUTH_PASSWORD_HASH.
Usage:
    python generate_password_hash.py [your_password]
"""
import sys
import bcrypt

def main():
    if len(sys.argv) > 1:
        password = sys.argv[1]
    else:
        password = input("Enter password to hash (default: admin123): ").strip()
        if not password:
            password = "admin123"

    salt = bcrypt.gensalt(rounds=12)
    hashed = bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")

    print("\n------------------------------------------------------------")
    print(f"Password : {password}")
    print(f"Bcrypt Hash : {hashed}")
    print("------------------------------------------------------------")
    print("Copy the Bcrypt Hash above and set it as AUTH_PASSWORD_HASH in Render/environment.\n")

if __name__ == "__main__":
    main()
