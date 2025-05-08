import os
import sys
from pathlib import Path
import subprocess

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
    key_to_read = r'P48\shell\open\command'
    try:
        import winreg

        reg = winreg.ConnectRegistry(None, winreg.HKEY_CLASSES_ROOT)
        with winreg.OpenKey(reg, key_to_read) as k:
            key_value = winreg.QueryValueEx(k, None)
            print(f"Successfully read registry key: {key_to_read}")
            print(f"Registry key value: {key_value[0]}")
        reg.Close()
        return True
    except FileNotFoundError:
        print(f"Registry key not found: {key_to_read}")
        return False
    except OSError as e: # Catch other OS-level errors like permission issues if any
        print(f"Error accessing registry key '{key_to_read}': {e}")
        return False
    except Exception as e: # Catch other potential errors during winreg operations
        print(f"Failed to query registry key '{key_to_read}': {e}")
        return False

def protocol_exists_linux():
    try:
        result = subprocess.run(
            ['xdg-mime', 'query', 'default', 'x-scheme-handler/p48'],
            capture_output=True,
            text=True,
            check=False
        )

        if result.returncode == 0:
            desktop_file = result.stdout.strip()
            if desktop_file:
                print(f"Found protocol handler for 'p48': {desktop_file}")
                return True
            else:
                print("No protocol handler found for 'p48' (xdg-mime returned empty).")
                return False
        else:
            print("No protocol handler found for 'p48' (xdg-mime query failed).")
            if result.stderr:
                print(f"xdg-mime stderr: {result.stderr.strip()}")
            return False
    except FileNotFoundError:
        print("Failed to check protocol on Linux: 'xdg-mime' command not found.")
        return False
    except Exception as e:
        print(f"An unexpected error occurred while checking protocol on Linux: {e}")
        return False

def determine_handler_paths(os_name, base_dir):
    script_p = None
    interp_p = None
    py_script_name = 'P48.py'
    py_candidate_path = os.path.join(base_dir, py_script_name)

    if os_name == 'Windows':
        exe_script_name = 'P48.exe'
        exe_candidate_path = os.path.join(base_dir, exe_script_name)
        if os.path.exists(exe_candidate_path):
            script_p = exe_candidate_path
            print(f"Found target for registration: {script_p} (Executable)")
        elif os.path.exists(py_candidate_path):
            script_p = py_candidate_path
            interp_p = sys.executable
            print(f"Found target for registration: {script_p} (Python script via {interp_p})")
        else:
            print(f"Error: Neither '{exe_script_name}' nor '{py_script_name}' found in '{base_dir}'.")
            print("Cannot determine script for protocol registration.")
    elif os_name == 'Linux':
        bin_script_name = 'P48.bin'
        bin_candidate_path = os.path.join(base_dir, bin_script_name)
        if os.path.exists(bin_candidate_path):
            script_p = bin_candidate_path
            print(f"Found target for registration: {script_p} (Binary)")
        elif os.path.exists(py_candidate_path):
            script_p = py_candidate_path
            interp_p = sys.executable
            print(f"Found target for registration: {script_p} (Python script via {interp_p})")
        else:
            print(f"Error: Neither '{bin_script_name}' nor '{py_script_name}' found in '{base_dir}'.")
            print("Cannot determine script for protocol registration.")
    
    return script_p, interp_p

def add_protocol_win(script_path_to_register, interpreter_for_script):
    if not script_path_to_register:
        print("Error: Script path for registration is not determined. Cannot register protocol.")
        input("Press any key to exit...")
        return
        
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
            if interpreter_for_script and script_path_to_register.lower().endswith('.py'):
                command = f'"{interpreter_for_script}" "{script_path_to_register}" "%1"'
            else:
                command = f'"{script_path_to_register}" "%1"'
            
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

def get_real_user_home():
    sudo_user = os.environ.get("SUDO_USER")
    if sudo_user:
        return Path(f"/home/{sudo_user}")
    else:
        return Path.home()

def add_protocol_linux(script_path_to_register, interpreter_for_script):
    if not script_path_to_register:
        print("Error: Script path for registration is not determined. Cannot register protocol.")
        return

    try:
        if interpreter_for_script and script_path_to_register.lower().endswith('.py'):
            exec_line = f'Exec="{interpreter_for_script}" "{script_path_to_register}" %u'
        else:
            exec_line = f'Exec="{script_path_to_register}" %u'

        lines = [
            "[Desktop Entry]",
            "Name=P48 Protocol",
            exec_line,
            "Type=Application",
            "NoDisplay=true",
            "MimeType=x-scheme-handler/p48;"
        ]
        desktop_entry_content = "\n".join(lines)

        applications_dir = get_real_user_home() / ".local/share/applications"
        os.makedirs(applications_dir, exist_ok=True)

        desktop_file_path = applications_dir / "p48-handler.desktop"
        with open(desktop_file_path, "w") as f:
            f.write(desktop_entry_content)
        print(f"Desktop entry written to: {desktop_file_path}")

        mime_update_cmd = ['xdg-mime', 'default', 'p48-handler.desktop', 'x-scheme-handler/p48']
        print(f"Running: {' '.join(str(arg) for arg in mime_update_cmd)}") # Ensure args are strings if any aren't
        mime_result = subprocess.run(mime_update_cmd, check=False, capture_output=True, text=True)
        if mime_result.returncode != 0:
            print(f"Warning: 'xdg-mime default' command failed (return code {mime_result.returncode}).")
            if mime_result.stdout: print(f"Stdout: {mime_result.stdout.strip()}")
            if mime_result.stderr: print(f"Stderr: {mime_result.stderr.strip()}")
        else:
            print("'xdg-mime default' set successfully.")
        
        print("Attempting to update desktop database...")
        try:
            db_update_cmd = ["update-desktop-database", str(applications_dir)]
            print(f"Running: {' '.join(db_update_cmd)}")
            update_db_result = subprocess.run(db_update_cmd, check=False, capture_output=True, text=True)
            if update_db_result.returncode != 0:
                print(f"Warning: 'update-desktop-database' failed (return code {update_db_result.returncode}).")
                if update_db_result.stdout: print(f"Stdout: {update_db_result.stdout.strip()}")
                if update_db_result.stderr: print(f"Stderr: {update_db_result.stderr.strip()}")
            else:
                print("Desktop database updated successfully.")
        except FileNotFoundError:
            print("Warning: 'update-desktop-database' command not found. Desktop database may not be updated.")
            print("Ensure 'desktop-file-utils' package (or equivalent) is installed.")
        except subprocess.CalledProcessError as e: # Should not happen with check=False
            print(f"Error updating desktop database: {e}")
        
        print("Protocol handler registration process for Linux completed.")

    except Exception as e:
        print(f"Failed to register protocol on Linux: {e}")

if __name__ == "__main__":
    os_type = detect_os()
    current_working_dir = os.getcwd()
    print(f"Current Working Directory: {current_working_dir}")
    
    actual_script_path, actual_interpreter_path = determine_handler_paths(os_type, current_working_dir)

    if os_type == 'Windows':
        if not actual_script_path:
            print("Exiting: No suitable script/executable (P48.exe or P48.py) found for Windows.")
            input("Press any key to exit...")
            sys.exit(1)
        
        if protocol_exists_win():
            print("Protocol 'p48' already appears to be registered on Windows.")
            print("Do you want to overwrite the existing protocol registration? [Y/n]")
            choice = input().lower()
            if choice in ['', 'yes', 'y']:
                add_protocol_win(actual_script_path, actual_interpreter_path)
            else:
                print("Exiting without making changes to Windows registry.")
        else:  
            print("Protocol 'p48' not found or accessible in Windows registry. Attempting to register.")
            add_protocol_win(actual_script_path, actual_interpreter_path)

    elif os_type == 'Linux':
        if not actual_script_path:
            print("Exiting: No suitable script/executable (P48.bin or P48.py) found for Linux.")
            sys.exit(1)

        if protocol_exists_linux():
            print("Protocol 'p48' already appears to be registered on Linux.")
            print("Do you want to overwrite the existing protocol registration? [Y/n]")
            choice = input().lower()
            if choice in ['', 'yes', 'y']:
                add_protocol_linux(actual_script_path, actual_interpreter_path)
            else:
                print("Exiting without making changes to Linux protocol handlers.")
        else:
            print("Protocol 'p48' not found for Linux. Attempting to register.")
            add_protocol_linux(actual_script_path, actual_interpreter_path)

    elif os_type == 'macOS':
        print("macOS support for protocol registration is not implemented in this script.")
    else:
        print("Unsupported OS. Protocol registration cannot be performed.")