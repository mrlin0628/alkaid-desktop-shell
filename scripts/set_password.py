import os
import hashlib
import getpass
from pathlib import Path

def set_password():
    print("\n--- Alkaid System 密碼設定工具 ---")
    print("此工具將會產生一組高強度 SHA-256 密碼雜湊，")
    print("並將其寫入專案根目錄下的 .env 檔案中以保護系統頁面。")
    print("------------------------------------\n")

    while True:
        # getpass hides the typed characters
        pwd1 = getpass.getpass("請輸入新密碼 (不會顯示在畫面上): ")
        if not pwd1:
            print("密碼不能為空，請重試。\n")
            continue

        pwd2 = getpass.getpass("請再次輸入新密碼以確認: ")
        if pwd1 != pwd2:
            print("兩次輸入的密碼不一致，請重試。\n")
            continue
        
        break

    # Hash the password
    pwd_hash = hashlib.sha256(pwd1.encode('utf-8')).hexdigest()

    # Find project root (assume this script is in /scripts)
    current_dir = Path(__file__).resolve().parent
    project_root = current_dir.parent
    env_file_path = project_root / ".env"

    updated_lines = []
    found = False

    if env_file_path.exists():
        with open(env_file_path, "r", encoding="utf-8") as f:
            lines = f.readlines()
        
        for line in lines:
            if line.startswith("ADMIN_PASSWORD_HASH="):
                updated_lines.append(f"ADMIN_PASSWORD_HASH={pwd_hash}\n")
                found = True
            else:
                updated_lines.append(line)
    
    if not found:
        # Either file didn't exist or didn't contain the key
        updated_lines.append(f"ADMIN_PASSWORD_HASH={pwd_hash}\n")

    # Write back
    with open(env_file_path, "w", encoding="utf-8") as f:
        f.writelines(updated_lines)

    print("\n✅ 密碼已成功透過 SHA-256 加密，並寫入 .env 檔案中。")
    print("請重新啟動 SvelteKit 伺服器以套用新密碼設定。")

if __name__ == "__main__":
    try:
        set_password()
    except KeyboardInterrupt:
        print("\n\n已取消密碼設定。")
