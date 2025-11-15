# Pantone Color Picker

[English](./README.md) | [中文](./README_zh.md)

A professional web-based tool for extracting colors from images and matching them to Pantone color cards with visual annotations. Perfect for designers, artists, and color professionals.

## Features

- **Local Server Application**: Requires a local web server to load data files
- **Image Upload**: Drag & drop or click to upload images
- **Color Extraction**: Click anywhere on the image to extract colors
- **Accurate Pantone Matching**: Uses Delta E 2000 algorithm for superior color matching
- **Visual Annotations**: Beautiful color swatches with connecting lines and labels
- **Draggable Swatches**: Move color swatches and sampling points freely with mouse drag
- **Customizable Display**: Adjust swatch size and font sizes via settings panel
- **Export Options**: Download annotated images or export color data as JSON
- **Multiple Points**: Add multiple color points to create a complete color palette
- **Color Filtering**: Filter by Pantone system (Graphics/FHI/Plastics) and card types
- **Similar Colors**: Find and compare similar Pantone colors with adjustable threshold
- **Import/Export**: Save and load your color projects in JSON format
- **Multilingual**: Support for English and Chinese interfaces
- **Large Database**: Includes 20,970+ Pantone colors across all categories

## Screenshots

![Pantone Color Picker Interface](./docs/screenshot.png)
*Extract colors from images and match them to Pantone color cards*

## Files

- `color_picker.html` - Main application interface with responsive design
- `color_picker.js` - Core interaction logic and canvas handling
- `color_utils.js` - Color conversion and matching algorithms (Delta E 2000)
- `i18n.js` - Internationalization support for multiple languages
- `pantone_data.json` - Pantone color database in JSON format (3MB+, 20,970+ colors)
- `locales/` - Translation files (en.json, zh.json)
- `Pantone_finder/` - Original data scraper and JSON source
- `docs/` - Documentation and format specifications

## Quick Start

### Option 1: Windows Batch File (Easiest)

Double-click `start_server.bat` to automatically start the server and open the application.

### Option 2: Command Line

**Start a local web server:**

```bash
# Using Python 3
python -m http.server 8000

# Or using Python 2
python -m SimpleHTTPServer 8000

# Or using Node.js
npx http-server -p 8000
```

Then open `http://localhost:8000/color_picker.html` in your browser.

## Usage

### Basic Workflow

1. **Start a local web server** (see Quick Start above)
2. **Navigate to** `http://localhost:8000/color_picker.html` in your browser
3. **Upload an image**:
   - Click the upload area or drag & drop an image
   - Or press `Ctrl+V` to paste from clipboard
4. **Extract colors**: Click on any location in the image to extract the color
5. The tool will display the closest matching Pantone color with:
   - Color swatch
   - Pantone code (e.g., "19-3909 TCX")
   - Color name (e.g., "Black Bean")
   - Delta E value (color difference)
   - Connecting line from the clicked point

### Advanced Features

- **Drag to reposition**: Click and drag any color swatch or sampling point to move it
- **Find similar colors**: Click "Similar" button on any color swatch to explore alternatives
- **Color filtering**: Use the "Color Filter" panel to restrict matching to specific Pantone systems
- **Customize appearance**: Click "Settings" button to adjust:
  - Swatch size (40-150px)
  - Code font size (10-24px)
  - Name font size (8-18px)
  - Label width (80-200px)
- **Add multiple points**: Click multiple locations to create a complete color palette
- **Export options**:
  - **Export Image**: Download annotated image with all color information
  - **Export JSON**: Save your project data including all color points
  - **Import JSON**: Load previously saved projects

### Keyboard Shortcuts

- `Ctrl+V` / `Cmd+V` - Paste image from clipboard
- `Ctrl+Z` / `Cmd+Z` - Undo last action
- `Delete` - Remove selected color point

### Global Configuration

You can also programmatically adjust settings by modifying `window.SWATCH_CONFIG` in the browser console:

```javascript
window.SWATCH_CONFIG.swatchSize = 100;
window.SWATCH_CONFIG.fontSize = 16;
window.SWATCH_CONFIG.nameFontSize = 12;
window.SWATCH_CONFIG.labelWidth = 150;
```

## Technical Details

### Color Matching Algorithm

Uses **Delta E 2000 (CIEDE2000)** - the industry standard for perceptual color matching:
- Converts RGB to LAB color space (D65 illuminant, 2° observer)
- Applies CIEDE2000 formula for accurate perceptual color difference
- Accounts for human vision's non-uniform sensitivity to color differences
- Provides superior accuracy compared to Delta E 76 or simple Euclidean distance
- Compares against 20,970+ Pantone colors to find the best match

### Canvas Layers

- **Image Canvas**: Displays the uploaded image
- **Main Canvas**: Renders annotations (points, lines, swatches, labels)

### Supported Formats

- JPG/JPEG
- PNG
- GIF
- WebP

## Browser Compatibility

Works in all modern browsers that support:
- HTML5 Canvas
- File API
- ES6 JavaScript

## Dependencies

- **Zero dependencies!** All Pantone data is loaded from JSON file
- No external JavaScript libraries required
- Requires a local web server (Python, Node.js, or any HTTP server)
- Works offline once the server is running

## Project Structure

```
pantone_color_creator/
├── color_picker.html      # Main application interface
├── color_picker.js        # Application logic and interaction handling
├── color_utils.js         # Color conversion & Delta E 2000 algorithm
├── i18n.js                # Internationalization support
├── pantone_data.json      # Pantone database (20,970+ colors)
├── start_server.bat       # Windows batch file to start server
├── README.md              # This file (English)
├── README_zh.md           # Chinese documentation
├── locales/               # Translation files
│   ├── en.json            # English translations
│   └── zh.json            # Chinese translations
├── docs/                  # Documentation
│   ├── JSON_FORMAT.md     # JSON export format specification
│   └── pantone_category.md # Pantone category reference
└── Pantone_finder/        # Original data scraper
    ├── fetch_colors.py    # Python scraper for Pantone data
    ├── index.html         # Original Pantone finder
    ├── pantone.js         # Original finder logic
    └── set1.json          # Source JSON data
```

## How It Works

1. **Data Collection**: `fetch_colors.py` scrapes Pantone colors from numerosamente.it
2. **Data Storage**: JSON data is stored in `pantone_data.json` for async loading
3. **Data Loading**: Application fetches data asynchronously on startup
4. **Color Matching**: Uses LAB color space and CIEDE2000 formula for accurate matching
5. **Local Server**: Requires HTTP server for fetch API to work properly

## Data Source

Pantone color data is scraped from [numerosamente.it](https://numerosamente.it) using the included Python script.

## Contributing

Contributions are welcome! Feel free to:
- Report bugs
- Suggest new features
- Submit pull requests
- Improve documentation

## Credits

This project extends the original [Pantone Finder](https://github.com/picorana/Pantone_finder) by picorana.

## License

MIT License - Feel free to use this project for personal or commercial purposes.

---

**Made with ❤️ for designers and color professionals**
