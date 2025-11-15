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

// Card type definitions for each system
const CARD_TYPE_DEFINITIONS = {
    graphics: [
        { id: 'formula-guide', name: 'Formula Guide (C/U)', pattern: /^\d+\s+[CU]$/ },
        { id: 'cmyk-guide', name: 'CMYK Guide (P)', pattern: /^P\s+\d+-\d+\s+[CU]$/ },
        { id: 'pastels', name: 'Pastels', pattern: /^9\d{3}\s+[CU]$/ },
        { id: 'neons', name: 'Neons', pattern: /^[89]\d{2}\s+[CU]$/ },
        { id: 'metallics-basic', name: 'Metallics (Basic)', pattern: /^8\d{3}\s+[CU]$/ },
        { id: 'metallics-premium', name: 'Metallics (Premium)', pattern: /^10\d{3}\s+[CU]$/ },
        { id: 'extended', name: 'Extended Colors (CP/XGC)', pattern: /^\d+\s+(CP|XGC)$/ }
    ],
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

// Drag state
let dragState = {
    isDragging: false,
    dragType: null, // 'point' or 'swatch'
    dragIndex: -1,
    offsetX: 0,
    offsetY: 0
};

// Initialize the application
function initColorPicker() {
    canvas = document.getElementById('mainCanvas');
    ctx = canvas.getContext('2d');
    
    imageCanvas = document.getElementById('imageCanvas');
    imageCtx = imageCanvas.getContext('2d');
    
    setupEventListeners();
    loadPantoneData();
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
    
    // Clear button
    document.getElementById('clearBtn').addEventListener('click', clearAllPoints);
    
    // Export button
    document.getElementById('exportBtn').addEventListener('click', exportImage);
    
    // Export JSON button
    document.getElementById('exportJsonBtn').addEventListener('click', exportJSON);
    
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

// Load image from file
function loadImage(file) {
    if (!file.type.match('image.*')) {
        alert('Please select an image file');
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
    
    const containerWidth = window.innerWidth - 40;
    const containerHeight = window.innerHeight - 150;
    
    let scale = Math.min(
        containerWidth / uploadedImage.width,
        containerHeight / uploadedImage.height,
        1
    );
    
    const scaledWidth = uploadedImage.width * scale;
    const scaledHeight = uploadedImage.height * scale;
    
    imageCanvas.width = scaledWidth;
    imageCanvas.height = scaledHeight;
    
    canvas.width = scaledWidth;
    canvas.height = scaledHeight;
    
    imageCtx.clearRect(0, 0, imageCanvas.width, imageCanvas.height);
    imageCtx.drawImage(uploadedImage, 0, 0, scaledWidth, scaledHeight);
    
    redrawAnnotations();
}

// Handle mouse down - check for drag or add new point
function handleMouseDown(e) {
    if (!uploadedImage) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
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
            alert('Pantone color database is still loading. Please wait a moment and try again.');
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
        
        console.log('RGB color:', rgb);
        
        // Find closest Pantone color using filtered data
        const pantone = findClosestPantone(rgb, filteredPantoneData.length > 0 ? filteredPantoneData : pantoneData);
        
        console.log('Matched Pantone:', pantone);
        
        if (pantone) {
            // Calculate initial swatch position
            const angle = (colorPoints.length * (360 / Math.max(colorPoints.length + 1, 8))) * Math.PI / 180;
            const radius = 150;
            let swatchX = x + Math.cos(angle) * radius;
            let swatchY = y + Math.sin(angle) * radius;
            
            // Ensure swatch stays within canvas
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
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
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
                
                // Find closest Pantone color using filtered data
                const pantone = findClosestPantone(rgb, filteredPantoneData.length > 0 ? filteredPantoneData : pantoneData);
                
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
    
    // Draw point on image
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
    
    // Draw color swatch
    ctx.fillStyle = pantone.hex;
    ctx.fillRect(swatchX, swatchY, config.swatchSize, config.swatchSize);
    
    // Draw swatch border
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.strokeRect(swatchX, swatchY, config.swatchSize, config.swatchSize);
    
    // Draw label background
    ctx.fillStyle = '#FFFFFF';
    const labelX = swatchX + config.swatchSize + 10;
    const labelY = swatchY;
    const labelWidth = config.labelWidth - 10;
    const labelHeight = config.swatchSize;
    
    ctx.fillRect(labelX, labelY, labelWidth, labelHeight);
    ctx.strokeStyle = '#CCCCCC';
    ctx.lineWidth = 1;
    ctx.strokeRect(labelX, labelY, labelWidth, labelHeight);
    
    // Draw text
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
function loadPantoneData() {
    console.log('Starting to load Pantone data...');
    
    // Use embedded data from pantone_data.js
    if (typeof PANTONE_DATA !== 'undefined' && PANTONE_DATA.set1) {
        pantoneData = PANTONE_DATA.set1;
        console.log(`✓ Successfully loaded ${pantoneData.length} Pantone colors`);
        console.log('Sample color:', pantoneData[0]);
        
        // Initialize filtered data
        applyColorFilter();
    } else {
        console.error('Pantone data not found. Please ensure pantone_data.js is loaded.');
        alert('Failed to load Pantone color database. Please ensure pantone_data.js is included in the HTML.');
    }
}

// Clear all points
function clearAllPoints() {
    if (confirm('Clear all color points?')) {
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

// Export annotated image
function exportImage() {
    if (!uploadedImage) return;
    
    // Set exporting flag to hide delete buttons
    isExporting = true;
    
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = canvas.width;
    exportCanvas.height = canvas.height;
    const exportCtx = exportCanvas.getContext('2d');
    
    // Draw original image
    exportCtx.drawImage(imageCanvas, 0, 0);
    
    // Redraw annotations without delete buttons
    const tempCtx = ctx;
    ctx = exportCtx;
    colorPoints.forEach((point, index) => {
        drawAnnotation(point, index, true);
    });
    ctx = tempCtx;
    
    // Reset exporting flag
    isExporting = false;
    
    // Download
    exportCanvas.toBlob((blob) => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = 'pantone_annotated_' + Date.now() + '.png';
        link.href = url;
        link.click();
        URL.revokeObjectURL(url);
    });
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
        const element = document.getElementById(slider.id + 'Slider');
        const display = document.getElementById(slider.displayId);
        
        if (element && display) {
            element.addEventListener('input', (e) => {
                const value = parseInt(e.target.value);
                window.SWATCH_CONFIG[slider.prop] = value;
                display.textContent = value;
                redrawAnnotations();
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
        container.innerHTML = '<div style="padding: 10px; color: #666; font-size: 0.9em;">Select a specific system to filter by card type</div>';
        return;
    }
    
    const cardTypes = CARD_TYPE_DEFINITIONS[system];
    if (!cardTypes) return;
    
    // Create checkbox for each card type
    cardTypes.forEach(cardType => {
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
        label.textContent = cardType.name;
        
        option.appendChild(checkbox);
        option.appendChild(label);
        container.appendChild(option);
    });
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
    } else {
        // Filter by system and optionally by card types
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
    
    if (total === 0) {
        statsElement.textContent = 'Loading color database...';
        return;
    }
    
    const system = window.COLOR_FILTER.system;
    const cardTypes = window.COLOR_FILTER.cardTypes;
    
    let message = `Showing ${filtered.toLocaleString()} of ${total.toLocaleString()} colors`;
    
    if (system === 'all') {
        message += ' (All Systems)';
    } else {
        const systemName = system === 'graphics' ? 'Graphics' : 
                          system === 'fhi' ? 'FHI' : 
                          system === 'plastics' ? 'Plastics' : system;
        message += ` (${systemName}`;
        
        if (cardTypes.length > 0) {
            message += `, ${cardTypes.length} type${cardTypes.length > 1 ? 's' : ''} selected`;
        }
        message += ')';
    }
    
    statsElement.textContent = message;
}

// ===== Similar Colors Modal Functions =====

// Global variable to track which color point is being edited
let currentEditingPointIndex = -1;

// Show similar colors modal
function showSimilarColorsModal(pointIndex) {
    currentEditingPointIndex = pointIndex;
    const point = colorPoints[pointIndex];
    const currentPantone = point.pantone;
    
    // Update modal header with current color
    document.getElementById('modalCurrentSwatch').style.backgroundColor = currentPantone.hex;
    document.getElementById('modalCurrentCode').textContent = currentPantone.code;
    document.getElementById('modalCurrentName').textContent = currentPantone.name;
    
    // Reset threshold slider
    const thresholdSlider = document.getElementById('thresholdSlider');
    thresholdSlider.value = 8;
    document.getElementById('thresholdValue').textContent = '8.0';
    
    // Find and display similar colors
    updateSimilarColors();
    
    // Show modal
    const modal = document.getElementById('similarColorsModal');
    modal.classList.add('active');
    
    // Setup event listeners if not already setup
    if (!thresholdSlider.hasAttribute('data-listener-added')) {
        thresholdSlider.addEventListener('input', updateSimilarColors);
        thresholdSlider.setAttribute('data-listener-added', 'true');
        
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
    const similarColors = findSimilarColors(currentPantone, searchData, threshold);
    
    // Render similar colors
    renderSimilarColors(similarColors, currentPantone);
}

// Find similar colors within threshold
function findSimilarColors(targetPantone, searchData, threshold) {
    const targetRgb = hexToRgb(targetPantone.hex);
    const targetLab = rgbToLab(targetRgb);
    
    const similar = [];
    
    for (const pantone of searchData) {
        // Skip the current color itself
        if (pantone.code === targetPantone.code) continue;
        
        const pantoneRgb = hexToRgb(pantone.hex);
        if (!pantoneRgb) continue;
        
        const pantoneLab = rgbToLab(pantoneRgb);
        const deltaE = deltaE2000(targetLab, pantoneLab);
        
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

// Render similar colors in grid
function renderSimilarColors(similarColors, currentPantone) {
    const grid = document.getElementById('similarColorsGrid');
    
    if (similarColors.length === 0) {
        grid.innerHTML = `
            <div class="no-results">
                <div class="no-results-icon">🔍</div>
                <div>No similar colors found within this threshold.</div>
                <div style="margin-top: 10px; font-size: 0.9em;">Try increasing the threshold value.</div>
            </div>
        `;
        return;
    }
    
    grid.innerHTML = '';
    
    similarColors.forEach(pantone => {
        const card = document.createElement('div');
        card.className = 'color-card';
        
        // Clean up code display
        const displayCode = pantone.code.replace(/\s+(TCX|TPX|TN|TPG|TSX|C|U|CP|XGC|PQ|Q)$/i, (match) => ` ${match.trim()}`);
        
        card.innerHTML = `
            <div class="color-card-swatch" style="background-color: ${pantone.hex};"></div>
            <div class="color-card-code">${displayCode}</div>
            <div class="color-card-name">${pantone.name}</div>
            <div class="color-card-delta">ΔE: ${pantone.deltaE.toFixed(2)}</div>
            <button class="color-card-select" data-code="${pantone.code}">Select</button>
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

// Export color points as JSON
function exportJSON() {
    if (!uploadedImage || colorPoints.length === 0) {
        alert('No color points to export. Please add some color points first.');
        return;
    }
    
    const exportData = {
        version: '1.0',
        timestamp: new Date().toISOString(),
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
    
    // Create JSON blob and download
    const jsonString = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = 'pantone_colors_' + Date.now() + '.json';
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
    
    console.log('Exported JSON with', colorPoints.length, 'color points');
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
        alert('Please load an image first before importing color points.');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const importData = JSON.parse(e.target.result);
            
            // Validate JSON structure
            if (!importData.colorPoints || !Array.isArray(importData.colorPoints)) {
                throw new Error('Invalid JSON format: missing colorPoints array');
            }
            
            // Validate image dimensions if present
            if (importData.imageInfo) {
                const widthMatch = Math.abs(canvas.width - importData.imageInfo.width) < 5;
                const heightMatch = Math.abs(canvas.height - importData.imageInfo.height) < 5;
                
                if (!widthMatch || !heightMatch) {
                    const proceed = confirm(
                        `Warning: Image dimensions don't match.\n` +
                        `JSON: ${importData.imageInfo.width}x${importData.imageInfo.height}\n` +
                        `Current: ${canvas.width}x${canvas.height}\n\n` +
                        `Color points may not align correctly. Continue anyway?`
                    );
                    
                    if (!proceed) return;
                }
            }
            
            // Convert imported data to colorPoints format
            const importedPoints = [];
            for (const point of importData.colorPoints) {
                // Validate required fields
                if (!point.position || !point.swatchPosition || !point.pantone) {
                    console.warn('Skipping invalid color point:', point);
                    continue;
                }
                
                // Find the pantone color in our database to get complete info
                let pantoneMatch = pantoneData.find(p => p.code === point.pantone.code);
                
                // If not found, use the imported pantone data
                if (!pantoneMatch) {
                    pantoneMatch = {
                        code: point.pantone.code,
                        name: point.pantone.name,
                        hex: point.pantone.hex
                    };
                }
                
                importedPoints.push({
                    x: point.position.x,
                    y: point.position.y,
                    swatchX: point.swatchPosition.x,
                    swatchY: point.swatchPosition.y,
                    rgb: point.sampledColor || { r: 0, g: 0, b: 0 },
                    pantone: pantoneMatch
                });
            }
            
            if (importedPoints.length === 0) {
                alert('No valid color points found in JSON file.');
                return;
            }
            
            // Ask user if they want to replace or append
            let shouldReplace = true;
            if (colorPoints.length > 0) {
                const choice = confirm(
                    `Found ${importedPoints.length} color points in JSON.\n` +
                    `You currently have ${colorPoints.length} color points.\n\n` +
                    `Click OK to REPLACE existing points\n` +
                    `Click Cancel to ADD to existing points`
                );
                shouldReplace = choice;
            }
            
            if (shouldReplace) {
                colorPoints = importedPoints;
            } else {
                colorPoints.push(...importedPoints);
            }
            
            redrawAnnotations();
            console.log('Successfully imported', importedPoints.length, 'color points');
            alert(`Successfully imported ${importedPoints.length} color points!`);
            
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

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initColorPicker);
} else {
    initColorPicker();
}
