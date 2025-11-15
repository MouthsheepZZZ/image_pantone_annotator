// Pantone Color Picker - Core Logic

let canvas, ctx, imageCanvas, imageCtx;
let uploadedImage = null;
let pantoneData = [];
let filteredPantoneData = [];
let colorPoints = [];

// Global configuration parameters - can be adjusted
window.SWATCH_CONFIG = {
    swatchSize: 80,
    fontSize: 14,
    nameFontSize: 11,
    labelWidth: 120
};

// Global color filter configuration
window.COLOR_FILTER = {
    system: 'all',
    cardTypes: []
};

// Color matching weight configuration (Delta E 2000)
// Lower values = higher importance in matching
// kL: Lightness weight (default 0.3 strongly emphasizes lightness for artistic matching)
// kC: Chroma weight (default 1.0)
// kH: Hue weight (default 1.0)
window.COLOR_MATCHING_WEIGHTS = {
    kL: 0.3,  // Strongly emphasize lightness matching
    kC: 1.0,   // Standard chroma matching
    kH: 1.0    // Standard hue matching
};

// Modal-specific weights (used when finding similar colors)
let modalWeights = {
    kL: 0.3,
    kC: 1.0,
    kH: 1.0
};

// Card type definitions for each system
// Graphics system uses two groups: main types and suffix filters
const CARD_TYPE_DEFINITIONS = {
    graphics: {
        mainTypes: [
            { id: 'solid', name: 'Solid Colors', pattern: /^\d+\s+[CU]$/ },
            { id: 'color-bridge', name: 'Color Bridge (CP/UP)', pattern: /^\d+\s+(CP|UP)$/ },
            { id: 'cmyk-guide', name: 'CMYK Guide (P)', pattern: /^P\s+\d+-\d+\s+[CU]$/ },
            { id: 'pastels-neons', name: 'Pastels & Neons', pattern: /^(9\d{3}|[89]\d{2})\s+[CU]$/ },
            { id: 'metallics', name: 'Metallics', pattern: /^(8\d{3}|10\d{3})\s+[CU]$/ },
            { id: 'extended-gamut', name: 'Extended Gamut (XGC)', pattern: /^\d+\s+XGC$/ }
        ],
        suffixFilters: [
            { id: 'suffix-c', name: 'Coated (C)', pattern: /\s(C|CP)$/ },
            { id: 'suffix-u', name: 'Uncoated (U)', pattern: /\s(U|UP)$/ }
        ]
    },
    fhi: [
        { id: 'cotton-tcx', name: 'Cotton (TCX)', pattern: /^\d{2}-\d{4}\s+TCX$/ },
        { id: 'paper-tpg', name: 'Paper (TPG)', pattern: /^\d{2}-\d{4}\s+TPG$/ },
        { id: 'paper-tpx', name: 'Paper (TPX)', pattern: /^\d{2}-\d{4}\s+TPX$/ },
        { id: 'polyester-tsx', name: 'Polyester (TSX)', pattern: /^\d{2}-\d{4}\s+TSX$/ },
        { id: 'nylon-tn', name: 'Nylon (TN)', pattern: /^\d{2}-\d{4}\s+TN$/ }
    ],
    plastics: [
        { id: 'plastic-chips', name: 'Plastic Chips (PQ/Q)', pattern: /^(PQ-|Q)/ }
    ]
};

let swatchPadding = 20;
let isExporting = false; // Flag to control delete button visibility

// Drag state for annotations
let dragState = {
    isDragging: false,
    dragType: null, // 'point' or 'swatch'
    dragIndex: -1,
    offsetX: 0,
    offsetY: 0
};

// Canvas view state (zoom and pan)
let viewState = {
    scale: 1.0,           // Current zoom scale
    minScale: 0.1,        // Minimum zoom (10%)
    maxScale: 5.0,        // Maximum zoom (500%)
    panX: 0,              // Horizontal pan offset
    panY: 0,              // Vertical pan offset
    isPanning: false,     // Is user currently panning
    panStartX: 0,         // Pan start mouse X
    panStartY: 0,         // Pan start mouse Y
    panOriginX: 0,        // Pan origin X
    panOriginY: 0         // Pan origin Y
};

// Initialize the application
async function initColorPicker() {
    canvas = document.getElementById('mainCanvas');
    ctx = canvas.getContext('2d');
    
    imageCanvas = document.getElementById('imageCanvas');
    imageCtx = imageCanvas.getContext('2d');
    
    setupEventListeners();
    await loadPantoneData();
    resizeCanvas();
}

// Setup event listeners
function setupEventListeners() {
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    
    // File input change
    fileInput.addEventListener('change', handleFileSelect);
    
    // Drag and drop
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('dragover');
    });
    
    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('dragover');
    });
    
    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('dragover');
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            loadImage(files[0]);
        }
    });
    
    // Canvas mouse events for color picking and dragging
    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('mouseleave', handleMouseUp);
    
    // Canvas zoom (mouse wheel)
    const canvasContainer = document.getElementById('canvasContainer');
    canvasContainer.addEventListener('wheel', handleWheel, { passive: false });
    
    // Canvas pan (right click drag or middle mouse button)
    canvasContainer.addEventListener('mousedown', handlePanStart);
    canvasContainer.addEventListener('mousemove', handlePanMove);
    canvasContainer.addEventListener('mouseup', handlePanEnd);
    canvasContainer.addEventListener('mouseleave', handlePanEnd);
    
    // Prevent context menu on right click
    canvasContainer.addEventListener('contextmenu', (e) => {
        e.preventDefault();
    });
    
    // Clear button
    document.getElementById('clearBtn').addEventListener('click', clearAllPoints);
    
    // Export button
    document.getElementById('exportBtn').addEventListener('click', showExportImageModal);
    
    // Export JSON button
    document.getElementById('exportJsonBtn').addEventListener('click', showExportJsonModal);
    
    // Import JSON button
    document.getElementById('importJsonBtn').addEventListener('click', () => {
        document.getElementById('jsonFileInput').click();
    });
    
    // JSON file input change
    document.getElementById('jsonFileInput').addEventListener('change', handleJsonFileSelect);
    
    // Undo button
    document.getElementById('undoBtn').addEventListener('click', undoLastPoint);
    
    // Config button
    document.getElementById('configBtn').addEventListener('click', toggleConfigPanel);
    
    // Color Filter button
    document.getElementById('colorFilterBtn').addEventListener('click', toggleColorFilterPanel);
    
    // System filter change
    document.querySelectorAll('input[name="pantone-system"]').forEach(radio => {
        radio.addEventListener('change', handleSystemFilterChange);
    });
    
    // Config sliders
    setupConfigSliders();
    
    // Setup color filter
    setupColorFilter();
    
    // Paste event for clipboard images
    document.addEventListener('paste', handlePaste);
    
    // Window resize
    window.addEventListener('resize', resizeCanvas);
}

// Handle file selection
function handleFileSelect(e) {
    const files = e.target.files;
    if (files.length > 0) {
        loadImage(files[0]);
    }
}

// Handle paste event for clipboard images
function handlePaste(e) {
    const items = e.clipboardData?.items;
    if (!items) return;
    
    for (let i = 0; i < items.length; i++) {
        const item = items[i];
        
        // Check if the item is an image
        if (item.type.indexOf('image') !== -1) {
            e.preventDefault();
            const blob = item.getAsFile();
            
            if (blob) {
                loadImageFromBlob(blob);
                
                // Show feedback message
                const msg = window.i18n && window.i18n.t 
                    ? window.i18n.t('alerts.imageFromClipboard') 
                    : 'Image loaded from clipboard';
                console.log(msg);
            }
            break;
        }
    }
}

// Load image from blob (for clipboard paste)
function loadImageFromBlob(blob) {
    const reader = new FileReader();
    reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
            uploadedImage = img;
            document.getElementById('dropZone').style.display = 'none';
            document.getElementById('canvasContainer').style.display = 'block';
            document.getElementById('controls').style.display = 'flex';
            colorPoints = [];
            displayImage();
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(blob);
}

// Load image from file
function loadImage(file) {
    if (!file.type.match('image.*')) {
        const msg = window.i18n && window.i18n.t ? window.i18n.t('alerts.selectImageFile') : 'Please select an image file';
        alert(msg);
        return;
    }
    
    const reader = new FileReader();
    reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
            uploadedImage = img;
            document.getElementById('dropZone').style.display = 'none';
            document.getElementById('canvasContainer').style.display = 'block';
            document.getElementById('controls').style.display = 'flex';
            colorPoints = [];
            displayImage();
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

// Resize canvas to fit window
function resizeCanvas() {
    if (uploadedImage) {
        displayImage();
    }
}

// Display image on canvas
function displayImage() {
    if (!uploadedImage) return;
    
    // Use original image dimensions (no automatic scaling)
    const originalWidth = uploadedImage.width;
    const originalHeight = uploadedImage.height;
    
    // Set canvas to original image size
    imageCanvas.width = originalWidth;
    imageCanvas.height = originalHeight;
    
    canvas.width = originalWidth;
    canvas.height = originalHeight;
    
    // Draw image at original size
    imageCtx.clearRect(0, 0, imageCanvas.width, imageCanvas.height);
    imageCtx.drawImage(uploadedImage, 0, 0, originalWidth, originalHeight);
    
    // Apply current view transform (zoom and pan)
    applyViewTransform();
    
    redrawAnnotations();
}

// Apply view transform to canvas container
function applyViewTransform() {
    const container = document.querySelector('.canvas-wrapper');
    if (!container) return;
    
    const transform = `translate(${viewState.panX}px, ${viewState.panY}px) scale(${viewState.scale})`;
    container.style.transform = transform;
    container.style.transformOrigin = '0 0';
}

// Handle mouse down - check for drag or add new point
function handleMouseDown(e) {
    if (!uploadedImage) return;
    
    // Only handle left mouse button (button 0) for annotations
    // Right button (2) and middle button (1) are handled by pan functions
    if (e.button !== 0) return;
    
    // Transform mouse coordinates to canvas space
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    // Convert to canvas coordinates (accounting for zoom and pan)
    const x = mouseX / viewState.scale;
    const y = mouseY / viewState.scale;
    
    // Check if clicking on existing point or swatch
    const clickedElement = findClickedElement(x, y);
    
    if (clickedElement) {
        // Handle delete button click
        if (clickedElement.type === 'delete') {
            colorPoints.splice(clickedElement.index, 1);
            redrawAnnotations();
            return;
        }
        
        // Handle similar colors button click
        if (clickedElement.type === 'similar') {
            showSimilarColorsModal(clickedElement.index);
            return;
        }
        
        // Start dragging
        dragState.isDragging = true;
        dragState.dragType = clickedElement.type;
        dragState.dragIndex = clickedElement.index;
        dragState.offsetX = x - (clickedElement.type === 'point' ? 
            colorPoints[clickedElement.index].x : 
            colorPoints[clickedElement.index].swatchX);
        dragState.offsetY = y - (clickedElement.type === 'point' ? 
            colorPoints[clickedElement.index].y : 
            colorPoints[clickedElement.index].swatchY);
        
        canvas.style.cursor = 'grabbing';
    } else {
        // Add new color point
        if (pantoneData.length === 0) {
            const msg = window.i18n && window.i18n.t ? window.i18n.t('alerts.pantoneLoading') : 'Pantone color database is still loading. Please wait a moment and try again.';
            alert(msg);
            return;
        }
        
        console.log('Clicked at:', x, y);
        
        // Get pixel color
        const pixelData = imageCtx.getImageData(x, y, 1, 1).data;
        const rgb = {
            r: pixelData[0],
            g: pixelData[1],
            b: pixelData[2]
        };
        
        // Find closest Pantone color using filtered data with configured weights
        const pantone = findClosestPantone(
            rgb, 
            filteredPantoneData.length > 0 ? filteredPantoneData : pantoneData,
            window.COLOR_MATCHING_WEIGHTS.kL,
            window.COLOR_MATCHING_WEIGHTS.kC,
            window.COLOR_MATCHING_WEIGHTS.kH
        );
        
        if (pantone) {
            // Calculate initial swatch position (fixed pixel distance from sample point)
            const angle = (colorPoints.length * (360 / Math.max(colorPoints.length + 1, 8))) * Math.PI / 180;
            const radius = 150; // Fixed pixel radius relative to original image
            let swatchX = x + Math.cos(angle) * radius;
            let swatchY = y + Math.sin(angle) * radius;
            
            // Ensure swatch stays within canvas bounds
            swatchX = Math.max(window.SWATCH_CONFIG.labelWidth, Math.min(swatchX, canvas.width - window.SWATCH_CONFIG.swatchSize - 10));
            swatchY = Math.max(window.SWATCH_CONFIG.swatchSize + 40, Math.min(swatchY, canvas.height - 10));
            
            colorPoints.push({
                x: x,
                y: y,
                swatchX: swatchX,
                swatchY: swatchY,
                rgb: rgb,
                pantone: pantone
            });
            
            console.log('Total color points:', colorPoints.length);
            redrawAnnotations();
        } else {
            console.error('No Pantone match found!');
        }
    }
}

// Handle mouse move - update drag position
function handleMouseMove(e) {
    if (!uploadedImage) return;
    
    // Transform mouse coordinates to canvas space
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    // Convert to canvas coordinates (accounting for zoom and pan)
    const x = mouseX / viewState.scale;
    const y = mouseY / viewState.scale;
    
    if (dragState.isDragging) {
        // Update position while dragging
        const point = colorPoints[dragState.dragIndex];
        
        if (dragState.dragType === 'point') {
            point.x = x - dragState.offsetX;
            point.y = y - dragState.offsetY;
            
            // Resample color at new position
            const newX = Math.floor(point.x);
            const newY = Math.floor(point.y);
            
            // Make sure coordinates are within canvas bounds
            if (newX >= 0 && newX < imageCanvas.width && newY >= 0 && newY < imageCanvas.height) {
                const pixelData = imageCtx.getImageData(newX, newY, 1, 1).data;
                const rgb = {
                    r: pixelData[0],
                    g: pixelData[1],
                    b: pixelData[2]
                };
                
                // Find closest Pantone color using filtered data with configured weights
                const pantone = findClosestPantone(
                    rgb, 
                    filteredPantoneData.length > 0 ? filteredPantoneData : pantoneData,
                    window.COLOR_MATCHING_WEIGHTS.kL,
                    window.COLOR_MATCHING_WEIGHTS.kC,
                    window.COLOR_MATCHING_WEIGHTS.kH
                );
                
                if (pantone) {
                    point.rgb = rgb;
                    point.pantone = pantone;
                }
            }
        } else if (dragState.dragType === 'swatch') {
            point.swatchX = x - dragState.offsetX;
            point.swatchY = y - dragState.offsetY;
        }
        
        redrawAnnotations();
    } else {
        // Update cursor based on hover
        const clickedElement = findClickedElement(x, y);
        if (clickedElement) {
            canvas.style.cursor = (clickedElement.type === 'delete' || clickedElement.type === 'similar') ? 'pointer' : 'grab';
        } else {
            canvas.style.cursor = 'crosshair';
        }
    }
}

// Handle mouse up - stop dragging
function handleMouseUp(e) {
    if (dragState.isDragging) {
        dragState.isDragging = false;
        dragState.dragType = null;
        dragState.dragIndex = -1;
        canvas.style.cursor = 'crosshair';
    }
}

// Handle mouse wheel for zooming
function handleWheel(e) {
    if (!uploadedImage) return;
    
    e.preventDefault();
    
    // Get mouse position relative to canvas container
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    // Calculate zoom delta
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newScale = Math.max(viewState.minScale, Math.min(viewState.maxScale, viewState.scale * delta));
    
    // Calculate new pan to zoom towards mouse position
    const scaleChange = newScale / viewState.scale;
    viewState.panX = mouseX - (mouseX - viewState.panX) * scaleChange;
    viewState.panY = mouseY - (mouseY - viewState.panY) * scaleChange;
    viewState.scale = newScale;
    
    applyViewTransform();
}

// Handle pan start (right mouse button or middle button)
function handlePanStart(e) {
    if (!uploadedImage) return;
    
    // Right mouse button (2) or middle button (1)
    if (e.button === 2 || e.button === 1) {
        e.preventDefault();
        viewState.isPanning = true;
        viewState.panStartX = e.clientX;
        viewState.panStartY = e.clientY;
        viewState.panOriginX = viewState.panX;
        viewState.panOriginY = viewState.panY;
        
        const container = document.getElementById('canvasContainer');
        container.style.cursor = 'grabbing';
    }
}

// Handle pan move
function handlePanMove(e) {
    if (!viewState.isPanning) return;
    
    e.preventDefault();
    
    const dx = e.clientX - viewState.panStartX;
    const dy = e.clientY - viewState.panStartY;
    
    viewState.panX = viewState.panOriginX + dx;
    viewState.panY = viewState.panOriginY + dy;
    
    applyViewTransform();
}

// Handle pan end
function handlePanEnd(e) {
    if (viewState.isPanning) {
        viewState.isPanning = false;
        
        const container = document.getElementById('canvasContainer');
        container.style.cursor = 'default';
    }
}

// Find if click is on a point or swatch
function findClickedElement(x, y) {
    for (let i = colorPoints.length - 1; i >= 0; i--) {
        const point = colorPoints[i];
        
        // Check if clicking on delete button first (highest priority)
        if (point.deleteButtonX && point.deleteButtonY && point.deleteButtonRadius) {
            const distToDeleteButton = Math.sqrt(
                Math.pow(x - point.deleteButtonX, 2) + 
                Math.pow(y - point.deleteButtonY, 2)
            );
            if (distToDeleteButton <= point.deleteButtonRadius) {
                return { type: 'delete', index: i };
            }
        }
        
        // Check if clicking on similar colors button
        if (point.similarButtonX && point.similarButtonY && point.similarButtonRadius) {
            const distToSimilarButton = Math.sqrt(
                Math.pow(x - point.similarButtonX, 2) + 
                Math.pow(y - point.similarButtonY, 2)
            );
            if (distToSimilarButton <= point.similarButtonRadius) {
                return { type: 'similar', index: i };
            }
        }
        
        // Check if clicking on sampling point (circle)
        const distToPoint = Math.sqrt(Math.pow(x - point.x, 2) + Math.pow(y - point.y, 2));
        if (distToPoint <= 8) {
            return { type: 'point', index: i };
        }
        
        // Check if clicking on swatch (rectangle including label)
        const swatchWidth = window.SWATCH_CONFIG.swatchSize + window.SWATCH_CONFIG.labelWidth;
        const swatchHeight = window.SWATCH_CONFIG.swatchSize;
        
        if (x >= point.swatchX && x <= point.swatchX + swatchWidth &&
            y >= point.swatchY && y <= point.swatchY + swatchHeight) {
            return { type: 'swatch', index: i };
        }
    }
    
    return null;
}

// Redraw all annotations
function redrawAnnotations() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    colorPoints.forEach((point, index) => {
        drawAnnotation(point, index, isExporting);
    });
}

// Draw single annotation
function drawAnnotation(point, index, hideDeleteButton = false) {
    const { x, y, swatchX, swatchY, pantone } = point;
    const config = window.SWATCH_CONFIG;
    
    // Draw point on image (fixed size relative to original image pixels)
    ctx.fillStyle = '#5D4037';
    ctx.beginPath();
    ctx.arc(x, y, 8, 0, 2 * Math.PI);
    ctx.fill();
    
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // Draw connecting line
    ctx.strokeStyle = '#5D4037';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(swatchX + config.swatchSize / 2, swatchY);
    ctx.stroke();
    
    // Draw color swatch (fixed size relative to original image pixels)
    ctx.fillStyle = pantone.hex;
    ctx.fillRect(swatchX, swatchY, config.swatchSize, config.swatchSize);
    
    // Draw swatch border
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.strokeRect(swatchX, swatchY, config.swatchSize, config.swatchSize);
    
    // Draw label background (fixed size relative to original image pixels)
    ctx.fillStyle = '#FFFFFF';
    const labelX = swatchX + config.swatchSize + 10;
    const labelY = swatchY;
    const labelWidth = config.labelWidth - 10;
    const labelHeight = config.swatchSize;
    
    ctx.fillRect(labelX, labelY, labelWidth, labelHeight);
    ctx.strokeStyle = '#CCCCCC';
    ctx.lineWidth = 1;
    ctx.strokeRect(labelX, labelY, labelWidth, labelHeight);
    
    // Draw text (fixed size relative to original image pixels)
    ctx.fillStyle = '#000000';
    ctx.font = `bold ${config.fontSize}px "Helvetica Neue", Helvetica, Arial, sans-serif`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    
    const pantoneCode = pantone.code.replace(' TCX', '').replace(' TPX', '').replace(' TN', '').replace(' TPG', '');
    
    // Wrap text if needed
    const padding = 8;
    const maxWidth = labelWidth - padding * 2;
    
    ctx.fillText(pantoneCode, labelX + padding, labelY + padding);
    
    // Draw color name (smaller font)
    ctx.font = `${config.nameFontSize}px "Helvetica Neue", Helvetica, Arial, sans-serif`;
    const words = pantone.name.split(' ');
    let line = '';
    let lineY = labelY + padding + config.fontSize + 6;
    
    for (let word of words) {
        const testLine = line + word + ' ';
        const metrics = ctx.measureText(testLine);
        
        if (metrics.width > maxWidth && line !== '') {
            ctx.fillText(line, labelX + padding, lineY);
            line = word + ' ';
            lineY += config.nameFontSize + 3;
        } else {
            line = testLine;
        }
    }
    ctx.fillText(line, labelX + padding, lineY);
    
    // Draw interactive buttons (only when not exporting)
    if (!hideDeleteButton) {
        const buttonRadius = 12;
        
        // Draw delete button (top-right)
        const deleteButtonX = swatchX + config.swatchSize - buttonRadius / 2;
        const deleteButtonY = swatchY - buttonRadius / 2;
        
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(deleteButtonX, deleteButtonY, buttonRadius, 0, 2 * Math.PI);
        ctx.fill();
        
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Draw X mark
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        const crossSize = 6;
        ctx.beginPath();
        ctx.moveTo(deleteButtonX - crossSize / 2, deleteButtonY - crossSize / 2);
        ctx.lineTo(deleteButtonX + crossSize / 2, deleteButtonY + crossSize / 2);
        ctx.moveTo(deleteButtonX + crossSize / 2, deleteButtonY - crossSize / 2);
        ctx.lineTo(deleteButtonX - crossSize / 2, deleteButtonY + crossSize / 2);
        ctx.stroke();
        
        // Store delete button position
        point.deleteButtonX = deleteButtonX;
        point.deleteButtonY = deleteButtonY;
        point.deleteButtonRadius = buttonRadius;
        
        // Draw similar colors button (top-left)
        const similarButtonX = swatchX + buttonRadius / 2;
        const similarButtonY = swatchY - buttonRadius / 2;
        
        ctx.fillStyle = '#667eea';
        ctx.beginPath();
        ctx.arc(similarButtonX, similarButtonY, buttonRadius, 0, 2 * Math.PI);
        ctx.fill();
        
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Draw search icon (magnifying glass)
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        
        // Circle part of magnifying glass
        const glassRadius = 4;
        ctx.beginPath();
        ctx.arc(similarButtonX - 1, similarButtonY - 1, glassRadius, 0, 2 * Math.PI);
        ctx.stroke();
        
        // Handle of magnifying glass
        ctx.beginPath();
        ctx.moveTo(similarButtonX + 2, similarButtonY + 2);
        ctx.lineTo(similarButtonX + 4, similarButtonY + 4);
        ctx.stroke();
        
        // Store similar button position
        point.similarButtonX = similarButtonX;
        point.similarButtonY = similarButtonY;
        point.similarButtonRadius = buttonRadius;
    }
}

// Load Pantone data
async function loadPantoneData() {
    console.log('Starting to load Pantone data...');
    
    try {
        const response = await fetch('pantone_data.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        if (data && data.set1) {
            pantoneData = data.set1;
            console.log(`✓ Successfully loaded ${pantoneData.length} Pantone colors from JSON`);
            console.log('Sample color:', pantoneData[0]);
            
            // Initialize filtered data
            applyColorFilter();
        } else {
            throw new Error('Invalid data format in pantone_data.json');
        }
    } catch (error) {
        console.error('Failed to load Pantone data:', error);
        const msg = window.i18n && window.i18n.t 
            ? window.i18n.t('alerts.pantoneLoadError') 
            : 'Failed to load Pantone color database. Please ensure pantone_data.json is accessible and the server is running.';
        alert(msg);
    }
}

// Clear all points
function clearAllPoints() {
    const msg = window.i18n && window.i18n.t ? window.i18n.t('alerts.clearConfirm') : 'Clear all color points?';
    if (confirm(msg)) {
        colorPoints = [];
        redrawAnnotations();
    }
}

// Undo last point
function undoLastPoint() {
    if (colorPoints.length > 0) {
        colorPoints.pop();
        redrawAnnotations();
    }
}

// Show export image modal
function showExportImageModal() {
    if (!uploadedImage) return;
    
    const modal = document.getElementById('exportImageModal');
    modal.classList.add('active');
    
    // Setup event listeners if not already setup
    const confirmBtn = document.getElementById('exportImageConfirmBtn');
    const cancelBtn = document.getElementById('exportImageCancelBtn');
    
    if (!confirmBtn.hasAttribute('data-listener-added')) {
        confirmBtn.addEventListener('click', performImageExport);
        confirmBtn.setAttribute('data-listener-added', 'true');
        
        cancelBtn.addEventListener('click', () => {
            modal.classList.remove('active');
        });
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.remove('active');
            }
        });
    }
}

// Perform image export with selected options
async function performImageExport() {
    const modal = document.getElementById('exportImageModal');
    const exportType = document.querySelector('input[name="export-type"]:checked').value;
    const shouldDownload = document.getElementById('export-download').checked;
    const shouldCopyToClipboard = document.getElementById('export-clipboard').checked;
    
    if (!shouldDownload && !shouldCopyToClipboard) {
        const msg = window.i18n && window.i18n.t ? window.i18n.t('alerts.selectExportOption') : 'Please select at least one export option';
        alert(msg);
        return;
    }
    
    // Set exporting flag to hide delete buttons
    isExporting = true;
    
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = canvas.width;
    exportCanvas.height = canvas.height;
    const exportCtx = exportCanvas.getContext('2d');
    
    if (exportType === 'full') {
        // Draw original image
        exportCtx.drawImage(imageCanvas, 0, 0);
    } else {
        // Transparent background for swatches only
        exportCtx.clearRect(0, 0, exportCanvas.width, exportCanvas.height);
    }
    
    // Redraw annotations without delete buttons
    const tempCtx = ctx;
    ctx = exportCtx;
    colorPoints.forEach((point, index) => {
        drawAnnotation(point, index, true);
    });
    ctx = tempCtx;
    
    // Reset exporting flag
    isExporting = false;
    
    // Export based on selected options
    try {
        const blob = await new Promise(resolve => {
            exportCanvas.toBlob(resolve);
        });
        
        if (shouldDownload) {
            const filename = exportType === 'full' 
                ? 'pantone_annotated_' + Date.now() + '.png'
                : 'pantone_swatches_' + Date.now() + '.png';
            
            // Try to use File System Access API for file picker
            if (window.showSaveFilePicker) {
                try {
                    const handle = await window.showSaveFilePicker({
                        suggestedName: filename,
                        types: [{
                            description: 'PNG Images',
                            accept: { 'image/png': ['.png'] }
                        }]
                    });
                    
                    const writable = await handle.createWritable();
                    await writable.write(blob);
                    await writable.close();
                    
                    const msg = window.i18n && window.i18n.t ? window.i18n.t('alerts.fileSaved') : 'File saved successfully!';
                    if (shouldCopyToClipboard) {
                        // If also copying to clipboard, don't show alert yet
                    } else {
                        alert(msg);
                    }
                } catch (err) {
                    if (err.name !== 'AbortError') {
                        console.error('File save failed:', err);
                        // Fallback to default download
                        downloadBlob(blob, filename);
                    }
                }
            } else {
                // Fallback for browsers that don't support File System Access API
                downloadBlob(blob, filename);
            }
        }
        
        if (shouldCopyToClipboard) {
            try {
                await navigator.clipboard.write([
                    new ClipboardItem({ 'image/png': blob })
                ]);
                const msg = window.i18n && window.i18n.t ? window.i18n.t('alerts.copiedToClipboard') : 'Image copied to clipboard!';
                alert(msg);
            } catch (err) {
                console.error('Failed to copy to clipboard:', err);
                const msg = window.i18n && window.i18n.t ? window.i18n.t('alerts.clipboardError') : 'Failed to copy to clipboard. Your browser may not support this feature.';
                alert(msg);
            }
        }
        
        modal.classList.remove('active');
    } catch (error) {
        console.error('Export failed:', error);
        const msg = window.i18n && window.i18n.t ? window.i18n.t('alerts.exportError') : 'Failed to export image';
        alert(msg);
    }
}

// Helper function to download blob (fallback method)
function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = filename;
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
}

// Toggle config panel
function toggleConfigPanel() {
    const panel = document.getElementById('configPanel');
    if (panel.style.display === 'none' || panel.style.display === '') {
        panel.style.display = 'block';
    } else {
        panel.style.display = 'none';
    }
}

// Setup config sliders
function setupConfigSliders() {
    const sliders = [
        { id: 'swatchSize', prop: 'swatchSize', displayId: 'swatchSizeValue' },
        { id: 'fontSize', prop: 'fontSize', displayId: 'fontSizeValue' },
        { id: 'nameFontSize', prop: 'nameFontSize', displayId: 'nameFontSizeValue' },
        { id: 'labelWidth', prop: 'labelWidth', displayId: 'labelWidthValue' }
    ];
    
    sliders.forEach(slider => {
        const sliderElement = document.getElementById(slider.id + 'Slider');
        const inputElement = document.getElementById(slider.displayId);
        
        if (sliderElement && inputElement) {
            // Slider changes input
            sliderElement.addEventListener('input', (e) => {
                const value = parseInt(e.target.value);
                window.SWATCH_CONFIG[slider.prop] = value;
                inputElement.value = value;
                redrawAnnotations();
            });
            
            // Input changes slider
            inputElement.addEventListener('input', (e) => {
                let value = parseInt(e.target.value);
                
                // Validate input - only check minimum
                const min = parseInt(inputElement.min);
                const sliderMax = parseInt(sliderElement.max);
                
                if (isNaN(value)) {
                    return;
                }
                
                // Only enforce minimum, no maximum for input
                value = Math.max(min, value);
                
                window.SWATCH_CONFIG[slider.prop] = value;
                
                // Update slider only if value is within slider range
                if (value <= sliderMax) {
                    sliderElement.value = value;
                } else {
                    sliderElement.value = sliderMax;
                }
                
                inputElement.value = value;
                redrawAnnotations();
            });
            
            // Handle blur to ensure valid value
            inputElement.addEventListener('blur', (e) => {
                let value = parseInt(e.target.value);
                const min = parseInt(inputElement.min);
                const sliderMax = parseInt(sliderElement.max);
                
                if (isNaN(value) || value < min) {
                    // If invalid, revert to current config value
                    value = window.SWATCH_CONFIG[slider.prop];
                } else {
                    // Only enforce minimum
                    value = Math.max(min, value);
                }
                
                inputElement.value = value;
                
                // Update slider only if value is within slider range
                if (value <= sliderMax) {
                    sliderElement.value = value;
                } else {
                    sliderElement.value = sliderMax;
                }
                
                window.SWATCH_CONFIG[slider.prop] = value;
                redrawAnnotations();
            });
        }
    });
    
    // Setup weight sliders
    const weightSliders = [
        { id: 'kL', prop: 'kL', displayId: 'kLValue' },
        { id: 'kC', prop: 'kC', displayId: 'kCValue' },
        { id: 'kH', prop: 'kH', displayId: 'kHValue' }
    ];
    
    weightSliders.forEach(slider => {
        const sliderElement = document.getElementById(slider.id + 'Slider');
        const inputElement = document.getElementById(slider.displayId);
        
        if (sliderElement && inputElement) {
            // Slider changes input
            sliderElement.addEventListener('input', (e) => {
                const value = parseFloat(e.target.value);
                window.COLOR_MATCHING_WEIGHTS[slider.prop] = value;
                inputElement.value = value.toFixed(2);
            });
            
            // Input changes slider
            inputElement.addEventListener('input', (e) => {
                let value = parseFloat(e.target.value);
                
                // Validate input
                const min = parseFloat(inputElement.min);
                const max = parseFloat(inputElement.max);
                
                if (isNaN(value)) {
                    return;
                }
                
                // Enforce min and max
                value = Math.max(min, Math.min(max, value));
                
                window.COLOR_MATCHING_WEIGHTS[slider.prop] = value;
                sliderElement.value = value;
                inputElement.value = value.toFixed(2);
            });
            
            // Handle blur to ensure valid value
            inputElement.addEventListener('blur', (e) => {
                let value = parseFloat(e.target.value);
                const min = parseFloat(inputElement.min);
                const max = parseFloat(inputElement.max);
                
                if (isNaN(value) || value < min) {
                    // If invalid, revert to current config value
                    value = window.COLOR_MATCHING_WEIGHTS[slider.prop];
                } else {
                    // Enforce min and max
                    value = Math.max(min, Math.min(max, value));
                }
                
                inputElement.value = value.toFixed(2);
                sliderElement.value = value;
                window.COLOR_MATCHING_WEIGHTS[slider.prop] = value;
            });
        }
    });
}

// Toggle color filter panel
function toggleColorFilterPanel() {
    const panel = document.getElementById('colorFilterPanel');
    if (panel.style.display === 'none' || panel.style.display === '') {
        panel.style.display = 'block';
    } else {
        panel.style.display = 'none';
    }
}

// Setup color filter initialization
function setupColorFilter() {
    // Initialize with all card types for 'all' system
    updateCardTypeOptions('all');
    applyColorFilter();
}

// Handle system filter change
function handleSystemFilterChange(e) {
    const selectedSystem = e.target.value;
    window.COLOR_FILTER.system = selectedSystem;
    
    // Update card type options based on selected system
    updateCardTypeOptions(selectedSystem);
    
    // Apply filter
    applyColorFilter();
}

// Update card type checkbox options based on selected system
function updateCardTypeOptions(system) {
    const container = document.getElementById('cardTypeFilterGroup');
    container.innerHTML = '';
    
    // Reset card types selection
    window.COLOR_FILTER.cardTypes = [];
    
    if (system === 'all') {
        const hint = window.i18n && window.i18n.t ? window.i18n.t('colorFilter.cardTypeHint') : 'Select a specific system to filter by card type';
        container.innerHTML = `<div style="padding: 10px; color: #666; font-size: 0.9em;">${hint}</div>`;
        return;
    }
    
    const cardTypes = CARD_TYPE_DEFINITIONS[system];
    if (!cardTypes) return;
    
    // Handle graphics system with grouped layout
    if (system === 'graphics' && cardTypes.mainTypes && cardTypes.suffixFilters) {
        // Create main types section
        const mainTypesSection = document.createElement('div');
        mainTypesSection.className = 'filter-type-group';
        
        const mainTypesLabel = document.createElement('div');
        mainTypesLabel.className = 'filter-section-subtitle';
        mainTypesLabel.setAttribute('data-i18n', 'colorFilter.mainTypes');
        mainTypesLabel.textContent = 'Main Types';
        mainTypesSection.appendChild(mainTypesLabel);
        
        const mainTypesGrid = document.createElement('div');
        mainTypesGrid.className = 'filter-checkbox-group';
        cardTypes.mainTypes.forEach(cardType => {
            const option = createCheckboxOption(cardType, system);
            mainTypesGrid.appendChild(option);
        });
        mainTypesSection.appendChild(mainTypesGrid);
        container.appendChild(mainTypesSection);
        
        // Create suffix filters section
        const suffixSection = document.createElement('div');
        suffixSection.className = 'filter-type-group';
        
        const suffixFiltersLabel = document.createElement('div');
        suffixFiltersLabel.className = 'filter-section-subtitle';
        suffixFiltersLabel.setAttribute('data-i18n', 'colorFilter.suffixFilters');
        suffixFiltersLabel.textContent = 'Suffix Filters (Intersection)';
        suffixSection.appendChild(suffixFiltersLabel);
        
        const suffixGrid = document.createElement('div');
        suffixGrid.className = 'filter-checkbox-group';
        cardTypes.suffixFilters.forEach(cardType => {
            const option = createCheckboxOption(cardType, system);
            suffixGrid.appendChild(option);
        });
        suffixSection.appendChild(suffixGrid);
        container.appendChild(suffixSection);
        
        // Apply i18n translations to the newly created elements
        if (window.i18n && window.i18n.updateContent) {
            window.i18n.updateContent();
        }
    } else {
        // Handle other systems (fhi, plastics) - simple list
        const cardTypeList = Array.isArray(cardTypes) ? cardTypes : [];
        cardTypeList.forEach(cardType => {
            const option = createCheckboxOption(cardType, system);
            container.appendChild(option);
        });
    }
}

// Helper function to create checkbox option
function createCheckboxOption(cardType, system) {
    const option = document.createElement('div');
    option.className = 'filter-checkbox-option';
    
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = `cardtype-${cardType.id}`;
    checkbox.value = cardType.id;
    checkbox.addEventListener('change', handleCardTypeFilterChange);
    
    const label = document.createElement('label');
    label.className = 'filter-checkbox-label';
    label.htmlFor = `cardtype-${cardType.id}`;
    
    // Get translated name from i18n
    const cardTypeKey = `cardTypes.${system}.${cardType.id.replace(/-/g, '')}`;
    const translation = window.i18n && window.i18n.t ? window.i18n.t(cardTypeKey) : null;
    label.textContent = (translation && translation !== cardTypeKey) ? translation : cardType.name;
    
    option.appendChild(checkbox);
    option.appendChild(label);
    
    return option;
}

// Handle card type filter change
function handleCardTypeFilterChange() {
    const selectedTypes = [];
    const checkboxes = document.querySelectorAll('#cardTypeFilterGroup input[type="checkbox"]:checked');
    
    checkboxes.forEach(cb => {
        selectedTypes.push(cb.value);
    });
    
    window.COLOR_FILTER.cardTypes = selectedTypes;
    applyColorFilter();
}

// Apply color filter to pantone data
function applyColorFilter() {
    const system = window.COLOR_FILTER.system;
    const cardTypes = window.COLOR_FILTER.cardTypes;
    
    if (system === 'all' && cardTypes.length === 0) {
        // No filter applied
        filteredPantoneData = pantoneData;
    } else if (system === 'all') {
        // Should not happen, but handle it
        filteredPantoneData = pantoneData;
    } else if (system === 'graphics') {
        // Special handling for graphics system with main types and suffix filters
        const systemDef = CARD_TYPE_DEFINITIONS[system];
        
        if (!systemDef || !systemDef.mainTypes || !systemDef.suffixFilters) {
            filteredPantoneData = pantoneData;
            updateFilterStats();
            return;
        }
        
        // Separate selected card types into main types and suffix filters
        const selectedMainTypes = cardTypes.filter(id => 
            systemDef.mainTypes.some(mt => mt.id === id)
        );
        const selectedSuffixes = cardTypes.filter(id => 
            systemDef.suffixFilters.some(sf => sf.id === id)
        );
        
        if (selectedMainTypes.length === 0 && selectedSuffixes.length === 0) {
            // No filters selected, show all colors in graphics system
            const allPatterns = [...systemDef.mainTypes, ...systemDef.suffixFilters];
            filteredPantoneData = pantoneData.filter(color => {
                return allPatterns.some(cardType => cardType.pattern.test(color.code));
            });
        } else {
            // Apply filters with intersection logic
            filteredPantoneData = pantoneData.filter(color => {
                // First check main types (OR logic)
                let mainTypeMatch = selectedMainTypes.length === 0; // If no main types selected, pass
                if (!mainTypeMatch) {
                    const mainTypePatterns = systemDef.mainTypes.filter(mt => selectedMainTypes.includes(mt.id));
                    mainTypeMatch = mainTypePatterns.some(cardType => cardType.pattern.test(color.code));
                }
                
                // Then check suffix filters (AND logic)
                let suffixMatch = selectedSuffixes.length === 0; // If no suffixes selected, pass
                if (!suffixMatch) {
                    const suffixPatterns = systemDef.suffixFilters.filter(sf => selectedSuffixes.includes(sf.id));
                    suffixMatch = suffixPatterns.some(cardType => cardType.pattern.test(color.code));
                }
                
                // Both conditions must be true (intersection)
                return mainTypeMatch && suffixMatch;
            });
        }
    } else {
        // Handle other systems (fhi, plastics) - simple OR logic
        const systemCardTypes = CARD_TYPE_DEFINITIONS[system];
        
        if (cardTypes.length === 0) {
            // No specific card types selected, show all colors in this system
            filteredPantoneData = pantoneData.filter(color => {
                return systemCardTypes.some(cardType => cardType.pattern.test(color.code));
            });
        } else {
            // Filter by selected card types
            const selectedPatterns = systemCardTypes.filter(ct => cardTypes.includes(ct.id));
            
            filteredPantoneData = pantoneData.filter(color => {
                return selectedPatterns.some(cardType => cardType.pattern.test(color.code));
            });
        }
    }
    
    updateFilterStats();
}

// Update filter statistics display
function updateFilterStats() {
    const statsElement = document.getElementById('filterStats');
    const total = pantoneData.length;
    const filtered = filteredPantoneData.length;
    
    // Check if i18n is available
    if (!window.i18n || !window.i18n.t) {
        statsElement.textContent = total === 0 ? 'Loading color database...' : `Showing ${filtered.toLocaleString()} of ${total.toLocaleString()} colors`;
        return;
    }
    
    if (total === 0) {
        statsElement.textContent = window.i18n.t('colorFilter.statsLoading');
        return;
    }
    
    const system = window.COLOR_FILTER.system;
    const cardTypes = window.COLOR_FILTER.cardTypes;
    
    let message = window.i18n.t('colorFilter.statsShowing', {
        filtered: filtered.toLocaleString(),
        total: total.toLocaleString()
    });
    
    if (system === 'all') {
        message += ' ' + window.i18n.t('colorFilter.statsAllSystems');
    } else {
        const systemName = system === 'graphics' ? 'Graphics' : 
                          system === 'fhi' ? 'FHI' : 
                          system === 'plastics' ? 'Plastics' : system;
        message += ' ' + window.i18n.t('colorFilter.statsSystem', { system: systemName });
        
        if (cardTypes.length > 0) {
            const typeKey = cardTypes.length > 1 ? 'colorFilter.statsTypes' : 'colorFilter.statsType';
            message += window.i18n.t(typeKey, { count: cardTypes.length });
        }
    }
    
    statsElement.textContent = message;
}

// Listen for language changes and update filter stats
window.addEventListener('languageChanged', () => {
    updateFilterStats();
    
    // Update card type options with new translations
    const system = window.COLOR_FILTER.system;
    if (system !== 'all') {
        updateCardTypeOptions(system);
        
        // Re-apply checked states
        const selectedTypes = window.COLOR_FILTER.cardTypes;
        selectedTypes.forEach(typeId => {
            const checkbox = document.getElementById(`cardtype-${typeId}`);
            if (checkbox) {
                checkbox.checked = true;
            }
        });
    }
});

// ===== Similar Colors Modal Functions =====

// Global variable to track which color point is being edited
let currentEditingPointIndex = -1;

// Show similar colors modal
function showSimilarColorsModal(pointIndex) {
    currentEditingPointIndex = pointIndex;
    const point = colorPoints[pointIndex];
    const currentPantone = point.pantone;
    
    // Update modal header with current color - split display
    const originalColorHex = rgbToHex(point.rgb.r, point.rgb.g, point.rgb.b);
    const modalSwatch = document.getElementById('modalCurrentSwatch');
    const gradientStyle = `linear-gradient(90deg, ${originalColorHex} 0%, ${originalColorHex} 50%, ${currentPantone.hex} 50%, ${currentPantone.hex} 100%)`;
    modalSwatch.style.background = gradientStyle;
    document.getElementById('modalCurrentCode').textContent = currentPantone.code;
    document.getElementById('modalCurrentName').textContent = currentPantone.name;
    
    // Reset threshold slider
    const thresholdSlider = document.getElementById('thresholdSlider');
    thresholdSlider.value = 8;
    document.getElementById('thresholdValue').textContent = '8.0';
    
    // Initialize modal weight sliders with global values
    modalWeights.kL = window.COLOR_MATCHING_WEIGHTS.kL;
    modalWeights.kC = window.COLOR_MATCHING_WEIGHTS.kC;
    modalWeights.kH = window.COLOR_MATCHING_WEIGHTS.kH;
    
    document.getElementById('modalKLSlider').value = modalWeights.kL;
    document.getElementById('modalKLValue').textContent = modalWeights.kL.toFixed(2);
    document.getElementById('modalKCSlider').value = modalWeights.kC;
    document.getElementById('modalKCValue').textContent = modalWeights.kC.toFixed(2);
    document.getElementById('modalKHSlider').value = modalWeights.kH;
    document.getElementById('modalKHValue').textContent = modalWeights.kH.toFixed(2);
    
    // Find and display similar colors
    updateSimilarColors();
    
    // Show modal
    const modal = document.getElementById('similarColorsModal');
    modal.classList.add('active');
    
    // Setup event listeners if not already setup
    if (!thresholdSlider.hasAttribute('data-listener-added')) {
        thresholdSlider.addEventListener('input', updateSimilarColors);
        thresholdSlider.setAttribute('data-listener-added', 'true');
        
        // Modal weight sliders
        const modalKLSlider = document.getElementById('modalKLSlider');
        const modalKCSlider = document.getElementById('modalKCSlider');
        const modalKHSlider = document.getElementById('modalKHSlider');
        
        modalKLSlider.addEventListener('input', (e) => {
            modalWeights.kL = parseFloat(e.target.value);
            document.getElementById('modalKLValue').textContent = modalWeights.kL.toFixed(2);
            updateSimilarColors();
        });
        
        modalKCSlider.addEventListener('input', (e) => {
            modalWeights.kC = parseFloat(e.target.value);
            document.getElementById('modalKCValue').textContent = modalWeights.kC.toFixed(2);
            updateSimilarColors();
        });
        
        modalKHSlider.addEventListener('input', (e) => {
            modalWeights.kH = parseFloat(e.target.value);
            document.getElementById('modalKHValue').textContent = modalWeights.kH.toFixed(2);
            updateSimilarColors();
        });
        
        document.getElementById('modalCancelBtn').addEventListener('click', closeSimilarColorsModal);
        
        // Close on overlay click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeSimilarColorsModal();
            }
        });
        
        // Close on ESC key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && modal.classList.contains('active')) {
                closeSimilarColorsModal();
            }
        });
    }
}

// Close similar colors modal
function closeSimilarColorsModal() {
    const modal = document.getElementById('similarColorsModal');
    modal.classList.remove('active');
    currentEditingPointIndex = -1;
}

// Update similar colors based on threshold
function updateSimilarColors() {
    if (currentEditingPointIndex === -1) return;
    
    const point = colorPoints[currentEditingPointIndex];
    const currentPantone = point.pantone;
    const threshold = parseFloat(document.getElementById('thresholdSlider').value);
    
    // Update threshold display
    document.getElementById('thresholdValue').textContent = threshold.toFixed(1);
    
    // Find similar colors from the current filtered dataset (or all data if no filter)
    const searchData = filteredPantoneData.length > 0 ? filteredPantoneData : pantoneData;
    const similarColors = findSimilarColors(
        point.rgb,
        searchData, 
        threshold,
        modalWeights.kL,
        modalWeights.kC,
        modalWeights.kH
    );
    
    // Render similar colors
    renderSimilarColors(similarColors, currentPantone);
}

// Find similar colors within threshold
// targetRgb: Original sampled RGB color from image
function findSimilarColors(targetRgb, searchData, threshold, kL = 0.65, kC = 1.0, kH = 1.0) {
    const targetLab = rgbToLab(targetRgb);
    
    const similar = [];
    
    for (const pantone of searchData) {
        const pantoneRgb = hexToRgb(pantone.hex);
        if (!pantoneRgb) continue;
        
        const pantoneLab = rgbToLab(pantoneRgb);
        const deltaE = deltaE2000(targetLab, pantoneLab, kL, kC, kH);
        
        if (deltaE <= threshold) {
            similar.push({
                ...pantone,
                deltaE: deltaE
            });
        }
    }
    
    // Sort by delta E (closest first)
    similar.sort((a, b) => a.deltaE - b.deltaE);
    
    // Limit to top 50 results for performance
    return similar.slice(0, 50);
}

// Render similar colors in the modal
function renderSimilarColors(similarColors, currentPantone) {
    const grid = document.getElementById('similarColorsGrid');
    grid.innerHTML = '';
    
    if (similarColors.length === 0) {
        const noResultsText = window.i18n && window.i18n.t ? window.i18n.t('similarColors.noResults') : 'No similar colors found';
        const hintText = window.i18n && window.i18n.t ? window.i18n.t('similarColors.noResultsHint') : 'Try increasing the threshold to see more colors';
        
        grid.innerHTML = `
            <div class="no-results">
                <div class="no-results-icon">🔍</div>
                <p>${noResultsText}</p>
                <small>${hintText}</small>
            </div>
        `;
        return;
    }
    
    grid.innerHTML = '';
    
    // Get original color from current point
    const point = colorPoints[currentEditingPointIndex];
    const originalColorHex = rgbToHex(point.rgb.r, point.rgb.g, point.rgb.b);
    
    similarColors.forEach(pantone => {
        const card = document.createElement('div');
        card.className = 'color-card';
        
        // Clean up code display
        const displayCode = pantone.code.replace(/\s+(TCX|TPX|TN|TPG|TSX|C|U|CP|XGC|PQ|Q)$/i, (match) => ` ${match.trim()}`);
        
        const deltaText = window.i18n && window.i18n.t ? 
            window.i18n.t('similarColors.deltaE', { value: pantone.deltaE.toFixed(2) }) : 
            `ΔE: ${pantone.deltaE.toFixed(2)}`;
        const selectText = window.i18n && window.i18n.t ? 
            window.i18n.t('similarColors.selectButton') : 
            'Select';
        
        // Create split color swatch: left half original, right half pantone
        card.innerHTML = `
            <div class="color-card-swatch" style="background: linear-gradient(90deg, ${originalColorHex} 0%, ${originalColorHex} 50%, ${pantone.hex} 50%, ${pantone.hex} 100%);"></div>
            <div class="color-card-code">${displayCode}</div>
            <div class="color-card-name">${pantone.name}</div>
            <div class="color-card-delta">${deltaText}</div>
            <button class="color-card-select" data-code="${pantone.code}">${selectText}</button>
        `;
        
        // Add click handler to select button
        const selectBtn = card.querySelector('.color-card-select');
        selectBtn.addEventListener('click', () => {
            replacePantoneColor(pantone);
        });
        
        grid.appendChild(card);
    });
}

// Replace current pantone color with selected one
function replacePantoneColor(newPantone) {
    if (currentEditingPointIndex === -1) return;
    
    const point = colorPoints[currentEditingPointIndex];
    point.pantone = newPantone;
    
    // Redraw annotations
    redrawAnnotations();
    
    // Close modal with animation feedback
    const modal = document.getElementById('similarColorsModal');
    modal.style.opacity = '0.8';
    setTimeout(() => {
        closeSimilarColorsModal();
        modal.style.opacity = '1';
    }, 200);
}

// Show export JSON modal
function showExportJsonModal() {
    if (!uploadedImage) {
        const msg = window.i18n && window.i18n.t ? window.i18n.t('alerts.uploadImageFirst') : 'Please upload an image first.';
        alert(msg);
        return;
    }
    
    const modal = document.getElementById('exportJsonModal');
    modal.classList.add('active');
    
    // Set default filename based on current timestamp
    const filenameInput = document.getElementById('json-filename');
    if (!filenameInput.value || filenameInput.value === 'pantone_project') {
        filenameInput.value = 'pantone_project_' + new Date().toISOString().split('T')[0];
    }
    
    // Setup event listeners if not already setup
    const confirmBtn = document.getElementById('exportJsonConfirmBtn');
    const cancelBtn = document.getElementById('exportJsonCancelBtn');
    
    if (!confirmBtn.hasAttribute('data-listener-added')) {
        confirmBtn.addEventListener('click', performJsonExport);
        confirmBtn.setAttribute('data-listener-added', 'true');
        
        cancelBtn.addEventListener('click', () => {
            modal.classList.remove('active');
        });
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.remove('active');
            }
        });
    }
}

// Perform JSON export with selected options
async function performJsonExport() {
    const modal = document.getElementById('exportJsonModal');
    let filename = document.getElementById('json-filename').value.trim();
    
    if (!filename) {
        const msg = window.i18n && window.i18n.t ? window.i18n.t('alerts.enterFilename') : 'Please enter a filename';
        alert(msg);
        return;
    }
    
    // Remove .json extension if user added it
    if (filename.toLowerCase().endsWith('.json')) {
        filename = filename.slice(0, -5);
    }
    
    const exportData = {
        version: '1.1',
        timestamp: new Date().toISOString(),
        settings: window.SWATCH_CONFIG,
        colorFilter: window.COLOR_FILTER,
        imageInfo: {
            width: canvas.width,
            height: canvas.height
        },
        colorPoints: colorPoints.map(point => ({
            position: {
                x: point.x,
                y: point.y
            },
            swatchPosition: {
                x: point.swatchX,
                y: point.swatchY
            },
            sampledColor: {
                r: point.rgb.r,
                g: point.rgb.g,
                b: point.rgb.b
            },
            pantone: {
                code: point.pantone.code,
                name: point.pantone.name,
                hex: point.pantone.hex
            }
        }))
    };

    // Create JSON blob
    const jsonString = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    
    // Try to use File System Access API for file picker
    if (window.showSaveFilePicker) {
        try {
            const handle = await window.showSaveFilePicker({
                suggestedName: filename + '.json',
                types: [{
                    description: 'JSON Files',
                    accept: { 'application/json': ['.json'] }
                }]
            });
            
            const writable = await handle.createWritable();
            await writable.write(blob);
            await writable.close();
            
            console.log('Exported JSON with settings, filter, and', colorPoints.length, 'color points');
            
            const msg = window.i18n && window.i18n.t ? window.i18n.t('alerts.fileSaved') : 'File saved successfully!';
            alert(msg);
            
            modal.classList.remove('active');
        } catch (err) {
            if (err.name !== 'AbortError') {
                console.error('File save failed:', err);
                // Fallback to default download
                downloadBlob(blob, filename + '.json');
                modal.classList.remove('active');
            }
        }
    } else {
        // Fallback for browsers that don't support File System Access API
        downloadBlob(blob, filename + '.json');
        console.log('Exported JSON with settings, filter, and', colorPoints.length, 'color points');
        modal.classList.remove('active');
    }
}

// Handle JSON file selection
function handleJsonFileSelect(e) {
    const files = e.target.files;
    if (files.length > 0) {
        importJSON(files[0]);
    }
    // Reset file input so the same file can be selected again
    e.target.value = '';
}

// Import color points from JSON
function importJSON(file) {
    if (!uploadedImage) {
        alert('Please load an image first before importing a project file.');
        return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const importData = JSON.parse(e.target.result);

            // --- Apply Settings and Filters First ---
            if (importData.settings) {
                applyImportedSettings(importData.settings);
            }
            if (importData.colorFilter) {
                applyImportedColorFilter(importData.colorFilter);
            }

            // --- Then Handle Color Points ---
            const importedPoints = [];
            if (importData.colorPoints && Array.isArray(importData.colorPoints)) {
                // Validate image dimensions if present
                if (importData.imageInfo) {
                    const widthMatch = Math.abs(canvas.width - importData.imageInfo.width) < 5;
                    const heightMatch = Math.abs(canvas.height - importData.imageInfo.height) < 5;

                    if (!widthMatch || !heightMatch) {
                        const proceed = confirm(window.i18n.t('alerts.dimensionMismatch', {
                            jsonWidth: importData.imageInfo.width,
                            jsonHeight: importData.imageInfo.height,
                            canvasWidth: canvas.width,
                            canvasHeight: canvas.height
                        }));
                        if (!proceed) return;
                    }
                }

                // Convert imported data to colorPoints format
                for (const point of importData.colorPoints) {
                    if (!point.position || !point.swatchPosition || !point.pantone) {
                        console.warn('Skipping invalid color point:', point);
                        continue;
                    }

                    let pantoneMatch = pantoneData.find(p => p.code === point.pantone.code) || { ...point.pantone };

                    importedPoints.push({
                        x: point.position.x,
                        y: point.position.y,
                        swatchX: point.swatchPosition.x,
                        swatchY: point.swatchPosition.y,
                        rgb: point.sampledColor || { r: 0, g: 0, b: 0 },
                        pantone: pantoneMatch
                    });
                }
            }

            if (importedPoints.length === 0 && importData.colorPoints && importData.colorPoints.length > 0) {
                alert('No valid color points could be processed from the JSON file.');
            }

            // Ask user if they want to replace or append
            let shouldReplace = true;
            if (colorPoints.length > 0 && importedPoints.length > 0) {
                const msg = window.i18n.t('alerts.replacePointsConfirm', {
                    importedCount: importedPoints.length,
                    currentCount: colorPoints.length
                });
                const choice = confirm(msg);
                shouldReplace = choice;
            }

            if (shouldReplace) {
                colorPoints = importedPoints;
            } else {
                colorPoints.push(...importedPoints);
            }

            redrawAnnotations();
            console.log('Successfully imported project file.');
            alert(`Successfully imported settings, filters, and ${importedPoints.length} color points!`);

        } catch (error) {
            console.error('Failed to import JSON:', error);
            alert('Failed to import JSON file: ' + error.message);
        }
    };

    reader.onerror = () => {
        alert('Failed to read JSON file.');
    };

    reader.readAsText(file);
}

// ===== Import Helper Functions =====

function applyImportedSettings(settings) {
    // Update global config, merging with existing to preserve defaults
    window.SWATCH_CONFIG = { ...window.SWATCH_CONFIG, ...settings };

    // Update UI sliders and input fields
    const sliders = [
        { id: 'swatchSize', prop: 'swatchSize', displayId: 'swatchSizeValue' },
        { id: 'fontSize', prop: 'fontSize', displayId: 'fontSizeValue' },
        { id: 'nameFontSize', prop: 'nameFontSize', displayId: 'nameFontSizeValue' },
        { id: 'labelWidth', prop: 'labelWidth', displayId: 'labelWidthValue' }
    ];

    sliders.forEach(slider => {
        const value = window.SWATCH_CONFIG[slider.prop];
        if (value !== undefined) {
            const sliderElement = document.getElementById(slider.id + 'Slider');
            const inputElement = document.getElementById(slider.displayId);
            if (sliderElement) sliderElement.value = value;
            if (inputElement) inputElement.value = value;
        }
    });

    console.log('Applied imported settings:', window.SWATCH_CONFIG);
}

function applyImportedColorFilter(filter) {
    // Update global filter object
    window.COLOR_FILTER = { ...window.COLOR_FILTER, ...filter };

    // Update UI
    // 1. System radio button
    const systemRadio = document.querySelector(`input[name="pantone-system"][value="${filter.system}"]`);
    if (systemRadio) {
        systemRadio.checked = true;
    }

    // 2. Update card type options for the selected system
    updateCardTypeOptions(filter.system);

    // 3. Check the correct card type checkboxes
    if (filter.cardTypes && Array.isArray(filter.cardTypes)) {
        filter.cardTypes.forEach(typeId => {
            const checkbox = document.getElementById(`cardtype-${typeId}`);
            if (checkbox) {
                checkbox.checked = true;
            }
        });
    }

    // 4. Apply the filter to the dataset
    applyColorFilter();

    console.log('Applied imported color filter:', window.COLOR_FILTER);
}

