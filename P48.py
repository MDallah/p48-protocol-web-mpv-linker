import os
import sys
import subprocess
from datetime import datetime
import urllib.parse

current_path = os.path.dirname(__file__)
log_file_name = "P48-Proxy.log"
log_file = os.path.join(current_path, log_file_name)

def log_message(message: str):
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    log_entry = f"[{timestamp}] {message}\n"
    # print(message) # Print to console for immediate feedback if running manually
    with open(log_file, "a", encoding='utf-8') as f:
        f.write(log_entry)

def fix_and_parse_url(url_with_protocol: str) -> tuple[str | None, str | None]:
    """
    Removes "P48://" prefix, fixes common URL issues, 
    and extracts the base URL and 'q' quality parameter.
    Returns (base_video_url, quality_param_value)
    """
    if not url_with_protocol:
        return None, None
        
    url_string_no_protocol = url_with_protocol.replace("P48://", "", 1).replace("p48://", "", 1)
    
    # Attempt to fix missing colon in protocol first
    url_string_no_protocol = url_string_no_protocol.replace("https//", "https://").replace("http//", "http://")

    try:
        # Ensure scheme is present for urlparse to work correctly
        if not (url_string_no_protocol.startswith("http://") or url_string_no_protocol.startswith("https://")):
            log_message(f"Warning: URL '{url_string_no_protocol}' lacks scheme. Assuming https.")
            url_string_no_protocol = "https://" + url_string_no_protocol

        parsed_original_url = urllib.parse.urlparse(url_string_no_protocol)
        query_params = urllib.parse.parse_qs(parsed_original_url.query, keep_blank_values=True)
        
        quality_val_list = query_params.pop('q', None) # Remove 'q' if it exists
        quality_val = quality_val_list[0] if quality_val_list else None
            
        base_query_string = urllib.parse.urlencode(query_params, doseq=True)
        
        # Reconstruct URL without 'q' param
        base_url_cleaned = urllib.parse.urlunparse(parsed_original_url._replace(query=base_query_string))
        
        return base_url_cleaned, quality_val
    except Exception as e:
        log_message(f"Error parsing URL '{url_string_no_protocol}': {e}")
        # Fallback: treat the whole thing as a URL if parsing fails badly, but without quality
        return url_string_no_protocol.split('?')[0], None


QUALITIES_MAP = {
    "1080p": 1080, "720p": 720, "480p": 480, 
    "360p": 360, "240p": 240, "144p": 144
}

def get_mpv_format_string(target_height: int) -> str:
    """
    Generates the --ytdl-format string for mpv.
    Prioritizes specified height, then best video/audio combination.
    """
    # Prioritize exact height if possible, then progressively lower or best
    # This string aims for video at target_height and best audio,
    # or best video if target_height is not available.
    # yt-dlp format selection is quite powerful.
    return f"(bestvideo[height<={target_height}][vcodec^=avc1]+bestaudio[acodec^=mp4a]/bestvideo[height<={target_height}]+bestaudio/best[height<={target_height}])/best"


if __name__ == "__main__":
    log_message("====== P48 Proxy Started ======")
    
    if len(sys.argv) < 2:
        log_message("Error: No URL provided")
        log_message("Usage: P48.py <P48://url[&q=quality]>")
        sys.exit(1)

    try:
        raw_url_from_arg = sys.argv[1]
        log_message(f"Received P48 URL:\t {raw_url_from_arg}")
        
        base_video_url, requested_quality_str = fix_and_parse_url(raw_url_from_arg)

        if not base_video_url:
            log_message("Error: Could not extract a valid base video URL.")
            sys.exit(1)
            
        log_message(f"Base Video URL:\t\t {base_video_url}")
        if requested_quality_str:
            log_message(f"Requested Quality Str:\t {requested_quality_str}")
        
        mpv_command = ['mpv'] # Base command
        
        if requested_quality_str and requested_quality_str.lower() != "best":
            target_height = QUALITIES_MAP.get(requested_quality_str.lower())
            if target_height:
                log_message(f"Target quality: {target_height}p for {base_video_url}")
                
                # Check if yt-dlp is available
                try:
                    subprocess.run(['yt-dlp', '--version'], capture_output=True, check=True, text=True)
                    log_message("yt-dlp found. Will use it for quality selection.")
                    mpv_format_arg = get_mpv_format_string(target_height)
                    mpv_command.append(f'--ytdl-format={mpv_format_arg}')
                except FileNotFoundError:
                    log_message("Warning: yt-dlp command not found. Cannot apply advanced quality settings through --ytdl-format. MPV might still use its internal youtube-dl or yt-dlp if configured.")
                except subprocess.CalledProcessError:
                    log_message("Warning: yt-dlp found but '--version' command failed. Assuming it might still work for mpv.")
                except Exception as e_ytdlp_check:
                    log_message(f"Warning: Error checking yt-dlp: {e_ytdlp_check}. Will proceed without explicit --ytdl-format.")

            else:
                log_message(f"Unknown quality string '{requested_quality_str}'. Using mpv default behavior.")
        
        elif requested_quality_str and requested_quality_str.lower() == "best":
            log_message("Requested 'best' quality. Using mpv's default behavior (which is typically best).")
            # Optionally, could explicitly set --ytdl-format=best if desired, but mpv default usually is this.
        else: # No quality string or it was empty
            log_message("No specific quality requested or 'best' selected. Using mpv's default behavior.")

        mpv_command.append(base_video_url) # Add URL last

        log_message(f"Final MPV command:\t {' '.join(mpv_command)}")
        subprocess.Popen(mpv_command, shell=False)
        
    except Exception as e:
        log_message(f"CRITICAL ERROR: {str(e)}")
        # Attempt to open with basic mpv if all else fails and base_video_url is somewhat valid
        if 'base_video_url' in locals() and base_video_url:
            try:
                log_message(f"Attempting fallback launch: mpv {base_video_url}")
                subprocess.Popen(['mpv', base_video_url], shell=False)
            except Exception as fallback_e:
                log_message(f"Fallback launch also failed: {fallback_e}")
        sys.exit(1)