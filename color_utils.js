// Color utility functions for Pantone matching

// Convert hex to RGB
function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
}

// Convert RGB to hex
function rgbToHex(r, g, b) {
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase();
}

// Convert RGB to LAB color space (for Delta E calculation)
function rgbToLab(rgb) {
    // RGB to XYZ
    let r = rgb.r / 255;
    let g = rgb.g / 255;
    let b = rgb.b / 255;

    r = r > 0.04045 ? Math.pow((r + 0.055) / 1.055, 2.4) : r / 12.92;
    g = g > 0.04045 ? Math.pow((g + 0.055) / 1.055, 2.4) : g / 12.92;
    b = b > 0.04045 ? Math.pow((b + 0.055) / 1.055, 2.4) : b / 12.92;

    r *= 100;
    g *= 100;
    b *= 100;

    // Observer = 2°, Illuminant = D65
    const x = r * 0.4124 + g * 0.3576 + b * 0.1805;
    const y = r * 0.2126 + g * 0.7152 + b * 0.0722;
    const z = r * 0.0193 + g * 0.1192 + b * 0.9505;

    // XYZ to LAB
    let xn = x / 95.047;
    let yn = y / 100.000;
    let zn = z / 108.883;

    xn = xn > 0.008856 ? Math.pow(xn, 1/3) : (7.787 * xn) + (16/116);
    yn = yn > 0.008856 ? Math.pow(yn, 1/3) : (7.787 * yn) + (16/116);
    zn = zn > 0.008856 ? Math.pow(zn, 1/3) : (7.787 * zn) + (16/116);

    const L = (116 * yn) - 16;
    const A = 500 * (xn - yn);
    const B = 200 * (yn - zn);

    return { L, A, B };
}

// Calculate Delta E 2000 (CIEDE2000)
// More accurate color difference calculation
// kL, kC, kH: weighting factors (lower value = higher importance)
// Default kL=0.65 emphasizes lightness matching for artistic applications
function deltaE2000(lab1, lab2, kL = 0.65, kC = 1, kH = 1) {
    
    const deltaLPrime = lab2.L - lab1.L;
    const LBar = (lab1.L + lab2.L) / 2;
    
    const C1 = Math.sqrt(lab1.A * lab1.A + lab1.B * lab1.B);
    const C2 = Math.sqrt(lab2.A * lab2.A + lab2.B * lab2.B);
    const CBar = (C1 + C2) / 2;
    
    const G = 0.5 * (1 - Math.sqrt(Math.pow(CBar, 7) / (Math.pow(CBar, 7) + Math.pow(25, 7))));
    
    const a1Prime = lab1.A * (1 + G);
    const a2Prime = lab2.A * (1 + G);
    
    const C1Prime = Math.sqrt(a1Prime * a1Prime + lab1.B * lab1.B);
    const C2Prime = Math.sqrt(a2Prime * a2Prime + lab2.B * lab2.B);
    const CBarPrime = (C1Prime + C2Prime) / 2;
    const deltaCPrime = C2Prime - C1Prime;
    
    const h1Prime = Math.atan2(lab1.B, a1Prime) * 180 / Math.PI;
    const h2Prime = Math.atan2(lab2.B, a2Prime) * 180 / Math.PI;
    
    let deltahPrime;
    if (Math.abs(h1Prime - h2Prime) <= 180) {
        deltahPrime = h2Prime - h1Prime;
    } else if (h2Prime <= h1Prime) {
        deltahPrime = h2Prime - h1Prime + 360;
    } else {
        deltahPrime = h2Prime - h1Prime - 360;
    }
    
    const deltaHPrime = 2 * Math.sqrt(C1Prime * C2Prime) * Math.sin(deltahPrime * Math.PI / 360);
    
    const HBarPrime = Math.abs(h1Prime - h2Prime) <= 180 ? 
        (h1Prime + h2Prime) / 2 : 
        (h1Prime + h2Prime + 360) / 2;
    
    const T = 1 - 0.17 * Math.cos((HBarPrime - 30) * Math.PI / 180) +
        0.24 * Math.cos(2 * HBarPrime * Math.PI / 180) +
        0.32 * Math.cos((3 * HBarPrime + 6) * Math.PI / 180) -
        0.20 * Math.cos((4 * HBarPrime - 63) * Math.PI / 180);
    
    const SL = 1 + (0.015 * Math.pow(LBar - 50, 2)) / Math.sqrt(20 + Math.pow(LBar - 50, 2));
    const SC = 1 + 0.045 * CBarPrime;
    const SH = 1 + 0.015 * CBarPrime * T;
    
    const RT = -2 * Math.sqrt(Math.pow(CBarPrime, 7) / (Math.pow(CBarPrime, 7) + Math.pow(25, 7))) *
        Math.sin(60 * Math.exp(-Math.pow((HBarPrime - 275) / 25, 2)) * Math.PI / 180);
    
    const deltaE = Math.sqrt(
        Math.pow(deltaLPrime / (kL * SL), 2) +
        Math.pow(deltaCPrime / (kC * SC), 2) +
        Math.pow(deltaHPrime / (kH * SH), 2) +
        RT * (deltaCPrime / (kC * SC)) * (deltaHPrime / (kH * SH))
    );
    
    return deltaE;
}

// Simple Delta E 76 (faster but less accurate)
function deltaE76(lab1, lab2) {
    return Math.sqrt(
        Math.pow(lab2.L - lab1.L, 2) +
        Math.pow(lab2.A - lab1.A, 2) +
        Math.pow(lab2.B - lab1.B, 2)
    );
}

// Find closest Pantone color using improved Delta E 2000 algorithm
// Optional weight parameters: kL (lightness), kC (chroma), kH (hue)
// Lower values increase importance. Default kL=0.65 emphasizes lightness.
function findClosestPantone(rgb, pantoneData, kL = 0.65, kC = 1, kH = 1) {
    const targetLab = rgbToLab(rgb);
    
    let closest = null;
    let minDistance = Infinity;
    
    for (const pantone of pantoneData) {
        const pantoneRgb = hexToRgb(pantone.hex);
        if (!pantoneRgb) continue;
        
        const pantoneLab = rgbToLab(pantoneRgb);
        // Use Delta E 2000 for more accurate color matching
        const distance = deltaE2000(targetLab, pantoneLab, kL, kC, kH);
        
        if (distance < minDistance) {
            minDistance = distance;
            closest = {
                ...pantone,
                distance: distance
            };
        }
    }
    
    return closest;
}

// Get relative luminance for contrast calculation
function getRelativeLuminance(rgb) {
    const r = rgb.r / 255;
    const g = rgb.g / 255;
    const b = rgb.b / 255;
    
    const R = r <= 0.03928 ? r / 12.92 : Math.pow((r + 0.055) / 1.055, 2.4);
    const G = g <= 0.03928 ? g / 12.92 : Math.pow((g + 0.055) / 1.055, 2.4);
    const B = b <= 0.03928 ? b / 12.92 : Math.pow((b + 0.055) / 1.055, 2.4);
    
    return 0.2126 * R + 0.7152 * G + 0.0722 * B;
}

// Calculate contrast ratio
function getContrastRatio(rgb1, rgb2) {
    const l1 = getRelativeLuminance(rgb1);
    const l2 = getRelativeLuminance(rgb2);
    
    const lighter = Math.max(l1, l2);
    const darker = Math.min(l1, l2);
    
    return (lighter + 0.05) / (darker + 0.05);
}

// Determine if text should be black or white on a background
function getContrastTextColor(bgRgb) {
    const whiteContrast = getContrastRatio(bgRgb, {r: 255, g: 255, b: 255});
    const blackContrast = getContrastRatio(bgRgb, {r: 0, g: 0, b: 0});
    
    return whiteContrast > blackContrast ? '#FFFFFF' : '#000000';
}
