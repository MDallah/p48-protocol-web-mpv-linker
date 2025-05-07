import os
import sys

def is_compiled():
    if hasattr(sys, "frozen") or '__compiled__' in globals():
        return True  # Running as a standalone compiled binary (e.g., with PyInstaller or nuitka)
    if __file__.endswith(('.pyc', '.pyo')):
        return True  # Running as a compiled Python file
    return False

def detect_os():
    if sys.platform.startswith('win'):
        print("Detected OS: Windows")
        return 'Windows'
    elif sys.platform.startswith('linux'):
        print("Detected OS: Linux")
        return 'Linux'
    elif sys.platform.startswith('darwin'):
        print("Detected OS: macOS")
        return 'macOS'
    else:
        print("Detected OS: Unknown")
        return 'Unknown OS'

def protocol_exists_win():
    try:
        import winreg

        reg = winreg.ConnectRegistry(None, winreg.HKEY_CLASSES_ROOT)
        key_to_read = r'P48\shell\open\command'
        k = winreg.OpenKey(reg, key_to_read)
        key_value = winreg.QueryValueEx(k, None)
        print(f"Successfully read registry key: {key_to_read}")
        print(f"Registry key value: {key_value[0]}")
        k.Close()
        reg.Close()
        return True
    except:
        print(f"Failed to read registry key: {key_to_read}")
        return False

def protocol_exists_linux():
    try:
        import subprocess

        result = subprocess.run(
            ['xdg-mime', 'query', 'default', 'x-scheme-handler/p48'],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )

        desktop_file = result.stdout.strip()
        if desktop_file:
            print(f"Found protocol handler for 'p48': {desktop_file}")
            return True
        else:
            print("No protocol handler found for 'p48'")
            return False
    except Exception as e:
        print(f"Failed to check protocol on Linux: {e}")
        return False

def add_protocol_win():
    try:
        import winreg

        base_key_path = r"P48"
        with winreg.CreateKey(winreg.HKEY_CLASSES_ROOT, base_key_path) as key:
            winreg.SetValueEx(key, None, 0, winreg.REG_SZ, "URL:P48 Protocol")
            winreg.SetValueEx(key, "URL Protocol", 0, winreg.REG_SZ, "")

        shell_key_path = base_key_path + r"\shell"
        open_key_path = shell_key_path + r"\open"
        command_key_path = open_key_path + r"\command"

        with winreg.CreateKey(winreg.HKEY_CLASSES_ROOT, command_key_path) as key:
            command = f'"{script_file}" "%1"'
            print(f"Registering command: {command}")
            winreg.SetValueEx(key, None, 0, winreg.REG_SZ, command)

        print("Protocol handler registered successfully.")
        input("Press any key to exit...")

    except PermissionError:
         print("Failed to register protocol handler: Permission denied.")
         print("Please ensure you are running this script/executable as Administrator.")
         input("Press any key to exit...")
    except Exception as e:
        print(f"Failed to register protocol handler: {e}")
        input("Press any key to exit...")

def add_protocol_linux():
    try:
        desktop_entry = f"""[Desktop Entry]
Name=P48 Protocol
Exec={script_file} %u
Type=Application
NoDisplay=true
MimeType=x-scheme-handler/p48;
"""
        applications_dir = os.path.expanduser("~/.local/share/applications")
        os.makedirs(applications_dir, exist_ok=True)

        desktop_file_path = os.path.join(applications_dir, "p48-handler.desktop")
        with open(desktop_file_path, "w") as f:
            f.write(desktop_entry)

        # Update the MIME database
        os.system(f'xdg-mime default p48-handler.desktop x-scheme-handler/p48')

        print("Protocol handler registered successfully for Linux.")
    except Exception as e:
        print(f"Failed to register protocol on Linux: {e}")

if __name__ == "__main__":
    if is_compiled():
        exe_path = sys.executable
        exe_dir = os.path.dirname(exe_path)
        script_file = os.path.join(exe_dir, 'P48')
    else:
        dir_path = os.path.dirname(os.path.realpath(__file__))
        script_file = os.path.join(dir_path, 'P48')

    os_type = detect_os()
    if os_type == 'Windows':
        if protocol_exists_win():
            print("Protocol already exists. Skipping registration.")
            print("Do you want to overwrite the existing protocol? ([Y]/n)")
            choice = input().lower()
            if choice in ['', 'yes', 'y']:
                add_protocol_win()
            else:
                print("Exiting without changes.")
        else:  
            add_protocol_win()
    elif os_type == 'Linux':
        if protocol_exists_linux():
            print("Protocol already exists. Skipping registration.")
            print("Do you want to overwrite the existing protocol? ([Y]/n)")
            choice = input().lower()
            if choice in ['', 'yes', 'y']:
                add_protocol_linux()
            else:
                print("Exiting without changes.")
    elif os_type == 'macOS':
        print("macOS support is not implemented yet.")
    else:
        print("Unsupported OS.")