# JSON Export/Import Format Documentation

## Overview

The Pantone Color Picker application allows you to export and import color point data in JSON format. This enables you to save your work and restore color annotations later, even on different images with the same dimensions.

## Export Function

Click the **"Export JSON"** button to save all current color points to a JSON file. The file will contain:
- Timestamp of export
- Image dimensions
- All color point positions and Pantone information

## Import Function

Click the **"Import JSON"** button to load previously saved color points:
- The application will verify image dimensions match
- You can choose to replace or append to existing color points
- Pantone color information will be validated against the current database

## JSON File Structure

```json
{
  "version": "1.0",
  "timestamp": "2024-11-15T03:54:00.000Z",
  "imageInfo": {
    "width": 1200,
    "height": 800
  },
  "colorPoints": [
    {
      "position": {
        "x": 150.5,
        "y": 200.3
      },
      "swatchPosition": {
        "x": 300.0,
        "y": 150.0
      },
      "sampledColor": {
        "r": 255,
        "g": 128,
        "b": 64
      },
      "pantone": {
        "code": "16-1449 TCX",
        "name": "Living Coral",
        "hex": "#FF6F61"
      }
    }
  ]
}
```

## Field Descriptions

### Root Level
- `version` (string): Format version number
- `timestamp` (string): ISO 8601 timestamp of export
- `imageInfo` (object): Information about the source image
- `colorPoints` (array): Array of color point objects

### imageInfo Object
- `width` (number): Canvas width in pixels
- `height` (number): Canvas height in pixels

### colorPoints Array Elements

Each color point contains:

#### position
- `x` (number): X coordinate of the sampling point on the image
- `y` (number): Y coordinate of the sampling point on the image

#### swatchPosition
- `x` (number): X coordinate of the color swatch display
- `y` (number): Y coordinate of the color swatch display

#### sampledColor
- `r` (number): Red channel value (0-255)
- `g` (number): Green channel value (0-255)
- `b` (number): Blue channel value (0-255)

#### pantone
- `code` (string): Pantone color code (e.g., "16-1449 TCX")
- `name` (string): Pantone color name (e.g., "Living Coral")
- `hex` (string): Hex color value (e.g., "#FF6F61")

## Use Cases

### 1. Save Work Progress
Export your color annotations to continue work later without losing your progress.

### 2. Template for Similar Images
Export color points from one image and reuse them on similar images with the same dimensions.

### 3. Backup and Version Control
Keep JSON backups of different color annotation versions.

### 4. Batch Processing
Create a template JSON file and apply it to multiple images programmatically.

### 5. Documentation
Share color point data with team members or include in project documentation.

## Import Behavior

### Dimension Validation
When importing a JSON file:
- The application checks if the image dimensions match
- If dimensions differ by more than 5 pixels, a warning is displayed
- You can choose to proceed despite the dimension mismatch

### Merge Options
When importing into an existing session with color points:
- **OK**: Replace all existing color points with imported ones
- **Cancel**: Add imported color points to existing ones

### Pantone Validation
- The application attempts to match imported Pantone codes with the current database
- If a Pantone color is not found, the imported data is used as-is
- This ensures compatibility even if the Pantone database is updated

## Tips

1. **Consistent Dimensions**: For best results, use JSON files with images of the same dimensions
2. **File Naming**: Use descriptive filenames like `project-name_pantone_colors_YYYYMMDD.json`
3. **Version Control**: Keep multiple versions of JSON files for different stages of your work
4. **Backup**: Always keep backup copies of important JSON files

## Example Workflow

1. **Initial Work**: 
   - Load an image
   - Add color points by clicking on the image
   - Export JSON when done

2. **Resume Work**:
   - Load the same or similar image
   - Import the previously saved JSON
   - Continue adding or adjusting color points

3. **Apply Template**:
   - Create a template with strategic color point positions
   - Export as JSON
   - Use this template on multiple similar images

## Compatibility

- **Format Version**: 1.0
- **Browser Compatibility**: Modern browsers supporting FileReader API and Blob
- **File Extension**: `.json`
- **MIME Type**: `application/json`
