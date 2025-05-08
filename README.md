# P48-Protocol (Web-MPV-Linker) 🚀

Welcome to **P48-Protocol (Web-MPV-Linker)** – a lightweight and super-easy way to open videos directly in your external player like **mpv**. This tool consists of a browser extension and a Python-based protocol handler that work together to make launching videos in `mpv` a breeze.

## 🌐 Table of Contents

- [P48-Protocol (Web-MPV-Linker) 🚀](#p48-protocol-web-mpv-linker-)
  - [🌐 Table of Contents](#-table-of-contents)
  - [🌟 Features](#-features)
  - [✅ Prerequisites](#-prerequisites)
  - [🚀 Installation Guide](#-installation-guide)
    - [1. Install MPV](#1-install-mpv)
    - [2. Set Up the Browser Extension](#2-set-up-the-browser-extension)
    - [3. Configure the Protocol Handler](#3-configure-the-protocol-handler)
      - [🪟 Windows Setup](#-windows-setup)
      - [🐧 Linux Setup](#-linux-setup)
  - [📌 How to Use](#-how-to-use)
    - [Quick Start](#quick-start)
    - [Manually Add Links (Popup)](#manually-add-links-popup)
  - [⚙️ Development Guide](#️-development-guide)
  - [🤝 Contributing](#-contributing)
  - [📜 License](#-license)

## 🌟 Features

- 🚀 **Instant Video Launch**: One-click playback of YouTube videos (including Shorts) in `mpv`.
- 🔗 **Custom Protocol**: Defines a `P48://` URL scheme to launch videos directly in your external player (default: `mpv`).
- 🖱️ **Inline Buttons**: A small `🔻` button next to each YouTube video or Short for easy access.
- 💡 **Cross-Platform Support**: Works seamlessly on both Windows and Linux.

## ✅ Prerequisites

- **`mpv` Video Player**: Ensure it’s installed and available in your system PATH.

  - [Get mpv here](https://mpv.io/installation/)

- **Compatible Browser**:

  - Firefox-based browsers (like Firefox, Zen).
  - Chromium-based browsers (like Chrome, Edge).

- **Windows Requirements:**

  - `protocol-registrer.exe` and `P48.exe` must be in the same directory.

- **Linux Requirements:**

  - `protocol-registrer.bin` and `P48.bin` must be in the same directory.

## 🚀 Installation Guide

### 1. Install MPV

Make sure `mpv` is installed and working on your system.

### 2. Set Up the Browser Extension

1. Go to your browser’s Extensions page.
2. Enable **Developer Mode**.
3. Click **Load Unpacked** and select the `extension/` directory.
4. Make sure the extension is enabled and has the necessary permissions.

### 3. Configure the Protocol Handler

#### 🪟 Windows Setup

1. Download the `P48.zip` file and extract it.
2. Right-click `protocol-registrer.exe` and choose **Run as Administrator**.
3. Confirm the `p48://` protocol registration (overwrite if prompted).
4. Ensure `P48.exe` is in the same folder as `protocol-registrer.exe`.

#### 🐧 Linux Setup

1. Download and extract the `P48.zip` file.
2. Run the command:

   ```bash
   sudo ./protocol-registrer.bin
   ```

3. Confirm the `p48://` protocol registration (overwrite if prompted).
4. Ensure `P48.bin` is in the same folder as `protocol-registrer.bin`.

## 📌 How to Use

### Quick Start

1. Open YouTube.
2. Click the red `🔻` button next to any video or Short.

   - the button will appear next to the view count of each video.

     <img src="./imgs/yt-btn-preview.png" alt="yt-btn-preview" width="400"/>

3. The video will automatically open in `mpv`.

### Manually Add Links (Popup)

1. Click the extension icon in your browser toolbar.
2. Paste any video URL.
3. Click **Submit** to open it in `mpv`.

## ⚙️ Development Guide

- **Building Executables:** Use [Nuitka](https://nuitka.net/):

```bash
python -m nuitka --standalone --onefile --remove-output protocol-registrer.py
```

- Optional Icons:

  - Windows: `--windows-icon-from-ico='.../icon.png'`
  - Linux: `--linux-icon='.../icon.png'`

## 🤝 Contributing

We love contributions! Feel free to open an issue or send a pull request.

## 📜 License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
