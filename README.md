# Pantone Color Picker

A web-based tool for extracting colors from images and matching them to Pantone color cards with visual annotations.

## Features

- **Standalone Application**: No web server required - just double-click the HTML file to run!
- **Image Upload**: Drag & drop or click to upload images
- **Color Extraction**: Click anywhere on the image to extract colors
- **Accurate Pantone Matching**: Uses Delta E 2000 algorithm for superior color matching
- **Visual Annotations**: Beautiful color swatches with connecting lines and labels
- **Draggable Swatches**: Move color swatches and sampling points freely with mouse drag
- **Customizable Display**: Adjust swatch size and font sizes via settings panel
- **Export**: Download annotated images with all color information
- **Multiple Points**: Add multiple color points to create a complete color palette
- **Large Database**: Includes 20,970+ Pantone colors across all categories

## Files

- `color_picker.html` - Main application interface
- `color_picker.js` - Core interaction logic and canvas handling
- `color_utils.js` - Color conversion and matching algorithms (Delta E 2000)
- `pantone_data.js` - Embedded Pantone color database (4MB+)
- `Pantone_finder/` - Original data scraper and JSON source

## Quick Start

**Simply double-click `color_picker.html` to launch the application!**

No installation, no server, no command-line required.

## Usage

1. **Double-click** `color_picker.html` to open in your default browser
2. Upload an image by clicking the upload area or dragging & dropping
3. Click on any location in the image to extract the color
4. The tool will display the closest matching Pantone color with:
   - Color swatch
   - Pantone code (e.g., "19-3909 TCX")
   - Color name (e.g., "Black Bean")
   - Connecting line from the clicked point
5. **Drag to reposition**: Click and drag any color swatch or sampling point to move it
6. **Customize appearance**: Click "Settings" button to adjust:
   - Swatch size (40-150px)
   - Code font size (10-24px)
   - Name font size (8-18px)
   - Label width (80-200px)
7. Add multiple points to create a color palette
8. Click "Export Image" to download the annotated result

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

- **Zero dependencies!** All Pantone data is embedded in JavaScript
- No external JavaScript libraries required
- No web server required
- Works completely offline

## Project Structure

```
pantone_color_creator/
├── color_picker.html      # Main application (double-click to run!)
├── color_picker.js        # Application logic
├── color_utils.js         # Color conversion & Delta E 2000 algorithm
├── pantone_data.js        # Embedded Pantone database (20,970 colors)
├── README.md              # This file
└── Pantone_finder/
    ├── fetch_colors.py    # Python scraper for Pantone data
    ├── index.html         # Original Pantone finder
    ├── pantone.js         # Original finder logic
    └── set1.json          # Source JSON data
```

## How It Works

1. **Data Collection**: `fetch_colors.py` scrapes Pantone colors from numerosamente.it
2. **Data Embedding**: JSON data is converted to JavaScript constant in `pantone_data.js`
3. **Color Matching**: Uses LAB color space and CIEDE2000 formula for accurate matching
4. **No Server Required**: All data is embedded, so the app runs directly from file://

## License

This project extends the original Pantone Finder by picorana.
