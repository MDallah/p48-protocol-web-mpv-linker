import os
import sys
import subprocess
from datetime import datetime

current_path = os.path.dirname(__file__)
log_file_name = "P48-Proxy.log"
log_file = os.path.join(current_path, log_file_name)

def log_message(message: str):
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    log_entry = f"[{timestamp}] {message}\n"
    # print(message)  # Print to console
    with open(log_file, "a") as f:
        f.write(log_entry)

def fix_url(url: str) -> str:
    # Remove "P48://" or "p48://" prefix
    url = url.replace("P48://", "", 1).replace("p48://", "", 1) 
    # Fix missing colon in protocol if needed
    url = url.replace("https//", "https://").replace("http//", "http://") 
    return url

if __name__ == "__main__":
    log_message("====== P48 Proxy Started ======")
    
    if len(sys.argv) < 2:
        log_message("Error: No URL provided")
        log_message("Usage: python script.py <url>")
        sys.exit(1)

    try:
        raw_url = sys.argv[1]
        log_message(f"Original URL:\t\t\t {raw_url}")
        
        corrected_url = fix_url(raw_url)
        log_message(f"Extracted URL:\t\t {corrected_url}")
        
        # mpv_path = r"C:\ProgramData\chocolatey\lib\mpvio.install\tools\mpv.exe"
        log_message(f"Sent to MPV:\t\t\t {corrected_url}")
        
        # subprocess.Popen([mpv_path, corrected_url], shell=True)
        subprocess.Popen(['mpv', corrected_url], shell=False)
        
    except Exception as e:
        log_message(f"CRITICAL ERROR: {str(e)}")
        sys.exit(1)