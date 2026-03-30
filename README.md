# Tidr - Clean your drive

Tidr is a fast, beautiful, standalone desktop application that gamifies cleaning your computer files. It works just like Tinder—but for your cluttered hard drive! Select a directory, swipe right to KEEP a file, or swipe left to TRASH it. Your trashed files are safely moved to the Recycle Bin when you finish your session.

## Features
- **Interactive Swiping**: Drag cards left/right or click buttons to quickly review images, videos, audio, documents, and folders.
- **Premium Desktop UI**: Ethereal glass design with double-bezel architecture, floating island nav, staggered motion choreography, and OLED-black dark theme.
- **Safe Deletions**: Trashed files are moved to the OS-level Recycle Bin — nothing is permanently deleted.
- **Standalone Executable**: Download `Tidr.exe` from the latest release and run it. No Python required.

## Quick Start (Executable)

1. Download `Tidr.exe` from the [latest release](https://github.com/arturocookinup/Tidr/releases/latest).
2. Double-click to run. That's it.

## Running from Source

1. Clone this repository.
2. Ensure you have Python 3.10+ installed.
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Start the application:
   ```bash
   python main.py
   ```

## Building the Executable

To rebuild the standalone `.exe`:

```bash
pip install pyinstaller
python -m PyInstaller --noconfirm --onefile --windowed --icon "tidr.ico" --name "Tidr" --add-data "index.html;." --add-data "style.css;." --add-data "script.js;." main.py
```

The compiled `Tidr.exe` will appear in the `dist/` directory.

## Tech Stack
- **Desktop**: pywebview + Flask
- **Frontend**: Vanilla HTML/CSS/JS
- **Icons**: Phosphor Icons (Light)
- **Typography**: Plus Jakarta Sans
- **Packaging**: PyInstaller

## Credits
Built by Arturo ([@arturocookinup](https://github.com/arturocookinup)). For support, contact info@arturocookinup.com.
