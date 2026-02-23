# Tidr - Clean your drive
Tidr is a fast, beautiful, standalone desktop application that gamifies cleaning your computer files. It works just like Tinder—but for your cluttered hard drive! Select a directory, swipe right to KEEP a file, or swipe left to TRASH it. Your trashed files are safely moved to the Recycle Bin when you finish your session.

## Features
- **Interactive Swiping**: Quickly review images, videos, audio, and documents.
- **Premium Desktop UI**: Glassmorphic design, fluid animations, and a sleek dark theme.
- **Safe Deletions**: Trashed files are moved to the OS-level Recycle Bin, so you never accidentally lose anything permanently.
- **Standalone Capability**: Easily built into a portable, 1-click `.exe` application.

## Running Locally

1. Clone this repository.
2. Ensure you have Python installed.
3. Install the dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Start the application:
   ```bash
   python main.py
   ```

## Deploying / Building the Executable

To package the application into a standalone `.exe` file (so run-time users don't need Python installed), we use PyInstaller.

First, ensure PyInstaller is installed (`pip install pyinstaller`).

Then run the compilation command:
```bash
pyinstaller --noconfirm --onefile --windowed --icon "tidr.ico" --name "Tidr" --add-data "index.html;." --add-data "style.css;." --add-data "script.js;." main.py
```

The compiled `Tidr.exe` will appear in your `dist/` directory!

## Known Bugs & Notes
If the application crashes or you get a silent failure upon opening, ensure that Python is locating your local statically-served HTML/CSS files correctly via the `get_resource_path()` function in `app.py`.

## Credits
Built and polished by Arturo (@arturocookinup). For support, contact info@arturocookinup.com.
