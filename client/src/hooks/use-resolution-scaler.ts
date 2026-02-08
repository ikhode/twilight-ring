import { useState, useEffect } from "react";

/**
 * Hook to handle dynamic resolution-based scaling.
 * Calculates a scale factor relative to a standard 1920px (1080p) width.
 * Applies the scale factor as a CSS variable '--app-scale' to the document element.
 */
export function useResolutionScaler() {
    const [scale, setScale] = useState(1);

    useEffect(() => {
        const calculateScale = () => {
            // Base width for scaling is 1920px (Full HD)
            const baseWidth = 1920;
            const currentWidth = window.innerWidth;

            // Calculate ratio with bounds [0.75, 1.25]
            // This prevents too much shrinking on small screens or too much growth on ultra-wide
            let scaleFactor = currentWidth / baseWidth;

            // Fine-tuning: smaller screens need a bit more legibility, 
            // larger screens shouldn't grow exactly linearly.
            if (currentWidth < 1280) {
                scaleFactor = Math.max(scaleFactor, 0.85); // Min 85% scale on laptops
            } else if (currentWidth > 2560) {
                scaleFactor = Math.min(scaleFactor, 1.3); // Max 130% on 4K+
            } else {
                scaleFactor = Math.min(Math.max(scaleFactor, 0.8), 1.2);
            }

            setScale(scaleFactor);

            // Apply to document element for global CSS access
            document.documentElement.style.setProperty("--app-scale", scaleFactor.toString());
            // If scale is 0.85, root font-size base becomes slightly smaller
            const baseFontSize = 16 * scaleFactor;
            document.documentElement.style.setProperty("--app-font-size", `${baseFontSize}px`);

            // Adjust root font-size proportionally to complement clamp()
            document.documentElement.style.fontSize = `${baseFontSize}px`;

            console.log(`[ResolutionScaler] Width: ${currentWidth}px, Scale: ${scaleFactor.toFixed(2)}`);
        };

        // Initial calculation
        calculateScale();

        // Listen for resize events
        window.addEventListener("resize", calculateScale);
        return () => window.removeEventListener("resize", calculateScale);
    }, []);

    return scale;
}
