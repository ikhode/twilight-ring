import { useEffect, useRef, memo } from 'react';

// WebGL Shaders for GPU-accelerated particle rendering
const vertexShaderSource = `
    attribute vec2 a_position;
    attribute float a_size;
    attribute float a_alpha;
    
    varying float v_alpha;
    
    void main() {
        gl_Position = vec4(a_position, 0.0, 1.0);
        gl_PointSize = a_size;
        v_alpha = a_alpha;
    }
`;

const fragmentShaderSource = `
    precision mediump float;
    varying float v_alpha;
    
    void main() {
        float dist = distance(gl_PointCoord, vec2(0.5));
        if (dist > 0.5) discard;
        
        // Soft glow effect
        float alpha = v_alpha * (1.0 - dist * 2.0);
        gl_FragColor = vec4(0.392, 0.584, 0.929, alpha); // Slate blue
    }
`;

// Line shader for connections
const lineVertexShaderSource = `
    attribute vec2 a_position;
    attribute float a_alpha;
    varying float v_alpha;
    
    void main() {
        gl_Position = vec4(a_position, 0.0, 1.0);
        v_alpha = a_alpha;
    }
`;

const lineFragmentShaderSource = `
    precision mediump float;
    varying float v_alpha;
    
    void main() {
        gl_FragColor = vec4(0.392, 0.584, 0.929, v_alpha * 0.08);
    }
`;

interface Particle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    size: number;
    alpha: number;
}

/**
 * GPU-accelerated animated background using WebGL.
 * Falls back to Canvas 2D if WebGL is unavailable.
 * Optimized for minimal CPU usage and memory efficiency.
 */
function AliveBackgroundComponent() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const glRef = useRef<WebGLRenderingContext | null>(null);
    const particlesRef = useRef<Particle[]>([]);
    const animationFrameRef = useRef<number>(0);
    const lastFrameTimeRef = useRef<number>(0);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        let width = window.innerWidth;
        let height = window.innerHeight;

        // Try WebGL first, fallback to 2D
        const gl = canvas.getContext('webgl', {
            alpha: true,
            antialias: false, // Disable for performance
            depth: false,
            stencil: false,
            preserveDrawingBuffer: false,
            powerPreference: 'low-power' // Prefer integrated GPU
        });

        if (gl) {
            setupWebGL(gl, canvas);
        } else {
            console.warn('[AliveBackground] WebGL not available, falling back to Canvas 2D');
            setupCanvas2D(canvas);
        }

        function setupWebGL(gl: WebGLRenderingContext, canvas: HTMLCanvasElement) {
            glRef.current = gl;

            // Compile shaders
            const vertexShader = compileShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
            const fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
            const lineVertexShader = compileShader(gl, gl.VERTEX_SHADER, lineVertexShaderSource);
            const lineFragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, lineFragmentShaderSource);

            if (!vertexShader || !fragmentShader || !lineVertexShader || !lineFragmentShader) return;

            // Particle program
            const particleProgram = createProgram(gl, vertexShader, fragmentShader);
            const lineProgram = createProgram(gl, lineVertexShader, lineFragmentShader);

            if (!particleProgram || !lineProgram) return;

            // Initialize particles (reduced count for performance)
            const particleCount = Math.min(30, Math.floor(width * height / 50000)); // Scale with screen size
            particlesRef.current = [];

            for (let i = 0; i < particleCount; i++) {
                particlesRef.current.push({
                    x: Math.random() * 2 - 1,
                    y: Math.random() * 2 - 1,
                    vx: (Math.random() - 0.5) * 0.0008,
                    vy: (Math.random() - 0.5) * 0.0008,
                    size: Math.random() * 4 + 2,
                    alpha: Math.random() * 0.4 + 0.1
                });
            }

            // Create buffers
            const positionBuffer = gl.createBuffer();
            const sizeBuffer = gl.createBuffer();
            const alphaBuffer = gl.createBuffer();
            const lineBuffer = gl.createBuffer();
            const lineAlphaBuffer = gl.createBuffer();

            // Get attribute locations
            const positionLoc = gl.getAttribLocation(particleProgram, 'a_position');
            const sizeLoc = gl.getAttribLocation(particleProgram, 'a_size');
            const alphaLoc = gl.getAttribLocation(particleProgram, 'a_alpha');
            const linePositionLoc = gl.getAttribLocation(lineProgram, 'a_position');
            const lineAlphaLoc = gl.getAttribLocation(lineProgram, 'a_alpha');

            // Typed arrays for GPU data (reused to avoid GC)
            const positions = new Float32Array(particleCount * 2);
            const sizes = new Float32Array(particleCount);
            const alphas = new Float32Array(particleCount);
            const maxLines = particleCount * (particleCount - 1) / 2;
            const linePositions = new Float32Array(maxLines * 4);
            const lineAlphas = new Float32Array(maxLines * 2);

            const resize = () => {
                width = window.innerWidth;
                height = window.innerHeight;
                canvas.width = width;
                canvas.height = height;
                gl.viewport(0, 0, width, height);
            };

            window.addEventListener('resize', resize);
            resize();

            gl.enable(gl.BLEND);
            gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

            // Animation loop with frame limiting
            const targetFPS = 30; // Limit to 30 FPS for power efficiency
            const frameInterval = 1000 / targetFPS;

            const animate = (timestamp: number) => {
                const elapsed = timestamp - lastFrameTimeRef.current;

                if (elapsed >= frameInterval) {
                    lastFrameTimeRef.current = timestamp - (elapsed % frameInterval);

                    gl.clearColor(0, 0, 0, 0);
                    gl.clear(gl.COLOR_BUFFER_BIT);

                    // Update particles
                    let lineCount = 0;
                    const connectionDist = 0.3; // Normalized distance

                    for (let i = 0; i < particlesRef.current.length; i++) {
                        const p = particlesRef.current[i];
                        p.x += p.vx;
                        p.y += p.vy;

                        // Wrap around
                        if (p.x < -1) p.x = 1;
                        if (p.x > 1) p.x = -1;
                        if (p.y < -1) p.y = 1;
                        if (p.y > 1) p.y = -1;

                        positions[i * 2] = p.x;
                        positions[i * 2 + 1] = p.y;
                        sizes[i] = p.size;
                        alphas[i] = p.alpha;

                        // Calculate connections (only nearby particles)
                        for (let j = i + 1; j < particlesRef.current.length; j++) {
                            const p2 = particlesRef.current[j];
                            const dx = p.x - p2.x;
                            const dy = p.y - p2.y;
                            const dist = Math.sqrt(dx * dx + dy * dy);

                            if (dist < connectionDist) {
                                const idx = lineCount * 4;
                                linePositions[idx] = p.x;
                                linePositions[idx + 1] = p.y;
                                linePositions[idx + 2] = p2.x;
                                linePositions[idx + 3] = p2.y;

                                const alphaIdx = lineCount * 2;
                                const lineAlpha = 1 - dist / connectionDist;
                                lineAlphas[alphaIdx] = lineAlpha;
                                lineAlphas[alphaIdx + 1] = lineAlpha;

                                lineCount++;
                            }
                        }
                    }

                    // Draw lines
                    if (lineCount > 0) {
                        gl.useProgram(lineProgram);

                        gl.bindBuffer(gl.ARRAY_BUFFER, lineBuffer);
                        gl.bufferData(gl.ARRAY_BUFFER, linePositions.subarray(0, lineCount * 4), gl.DYNAMIC_DRAW);
                        gl.enableVertexAttribArray(linePositionLoc);
                        gl.vertexAttribPointer(linePositionLoc, 2, gl.FLOAT, false, 0, 0);

                        gl.bindBuffer(gl.ARRAY_BUFFER, lineAlphaBuffer);
                        gl.bufferData(gl.ARRAY_BUFFER, lineAlphas.subarray(0, lineCount * 2), gl.DYNAMIC_DRAW);
                        gl.enableVertexAttribArray(lineAlphaLoc);
                        gl.vertexAttribPointer(lineAlphaLoc, 1, gl.FLOAT, false, 0, 0);

                        gl.drawArrays(gl.LINES, 0, lineCount * 2);
                    }

                    // Draw particles
                    gl.useProgram(particleProgram);

                    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
                    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.DYNAMIC_DRAW);
                    gl.enableVertexAttribArray(positionLoc);
                    gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 0, 0);

                    gl.bindBuffer(gl.ARRAY_BUFFER, sizeBuffer);
                    gl.bufferData(gl.ARRAY_BUFFER, sizes, gl.DYNAMIC_DRAW);
                    gl.enableVertexAttribArray(sizeLoc);
                    gl.vertexAttribPointer(sizeLoc, 1, gl.FLOAT, false, 0, 0);

                    gl.bindBuffer(gl.ARRAY_BUFFER, alphaBuffer);
                    gl.bufferData(gl.ARRAY_BUFFER, alphas, gl.DYNAMIC_DRAW);
                    gl.enableVertexAttribArray(alphaLoc);
                    gl.vertexAttribPointer(alphaLoc, 1, gl.FLOAT, false, 0, 0);

                    gl.drawArrays(gl.POINTS, 0, particlesRef.current.length);
                }

                animationFrameRef.current = requestAnimationFrame(animate);
            };

            animationFrameRef.current = requestAnimationFrame(animate);

            // Cleanup function
            return () => {
                window.removeEventListener('resize', resize);
                cancelAnimationFrame(animationFrameRef.current);

                // Cleanup WebGL resources
                gl.deleteBuffer(positionBuffer);
                gl.deleteBuffer(sizeBuffer);
                gl.deleteBuffer(alphaBuffer);
                gl.deleteBuffer(lineBuffer);
                gl.deleteBuffer(lineAlphaBuffer);
                gl.deleteProgram(particleProgram);
                gl.deleteProgram(lineProgram);
                gl.deleteShader(vertexShader);
                gl.deleteShader(fragmentShader);
                gl.deleteShader(lineVertexShader);
                gl.deleteShader(lineFragmentShader);

                glRef.current = null;
            };
        }

        function setupCanvas2D(canvas: HTMLCanvasElement) {
            const ctx = canvas.getContext('2d', { alpha: true });
            if (!ctx) return;

            const particleCount = 25;
            particlesRef.current = [];

            for (let i = 0; i < particleCount; i++) {
                particlesRef.current.push({
                    x: Math.random() * width,
                    y: Math.random() * height,
                    vx: (Math.random() - 0.5) * 0.3,
                    vy: (Math.random() - 0.5) * 0.3,
                    size: Math.random() * 2 + 1,
                    alpha: Math.random() * 0.3 + 0.1
                });
            }

            const resize = () => {
                width = window.innerWidth;
                height = window.innerHeight;
                canvas.width = width;
                canvas.height = height;
            };

            window.addEventListener('resize', resize);
            resize();

            const targetFPS = 30;
            const frameInterval = 1000 / targetFPS;

            const animate = (timestamp: number) => {
                const elapsed = timestamp - lastFrameTimeRef.current;

                if (elapsed >= frameInterval) {
                    lastFrameTimeRef.current = timestamp - (elapsed % frameInterval);

                    ctx.clearRect(0, 0, width, height);

                    particlesRef.current.forEach(p => {
                        p.x += p.vx;
                        p.y += p.vy;

                        if (p.x < 0) p.x = width;
                        if (p.x > width) p.x = 0;
                        if (p.y < 0) p.y = height;
                        if (p.y > height) p.y = 0;

                        ctx.beginPath();
                        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                        ctx.fillStyle = `rgba(100, 149, 237, ${p.alpha})`;
                        ctx.fill();
                    });

                    // Draw connections (simplified)
                    ctx.strokeStyle = 'rgba(100, 149, 237, 0.05)';
                    ctx.lineWidth = 1;

                    for (let i = 0; i < particlesRef.current.length; i++) {
                        for (let j = i + 1; j < particlesRef.current.length; j++) {
                            const p1 = particlesRef.current[i];
                            const p2 = particlesRef.current[j];
                            const dx = p1.x - p2.x;
                            const dy = p1.y - p2.y;
                            const dist = dx * dx + dy * dy;

                            if (dist < 22500) { // 150^2
                                ctx.beginPath();
                                ctx.moveTo(p1.x, p1.y);
                                ctx.lineTo(p2.x, p2.y);
                                ctx.stroke();
                            }
                        }
                    }
                }

                animationFrameRef.current = requestAnimationFrame(animate);
            };

            animationFrameRef.current = requestAnimationFrame(animate);

            return () => {
                window.removeEventListener('resize', resize);
                cancelAnimationFrame(animationFrameRef.current);
            };
        }

        // Cleanup on unmount
        return () => {
            cancelAnimationFrame(animationFrameRef.current);
            if (glRef.current) {
                // WebGL cleanup happens in setupWebGL return
            }
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            className="fixed inset-0 pointer-events-none z-[-1]"
            aria-hidden="true"
        />
    );
}

// Helper functions for WebGL
function compileShader(gl: WebGLRenderingContext, type: number, source: string): WebGLShader | null {
    const shader = gl.createShader(type);
    if (!shader) return null;

    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error('[WebGL] Shader compile error:', gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
    }

    return shader;
}

function createProgram(gl: WebGLRenderingContext, vertexShader: WebGLShader, fragmentShader: WebGLShader): WebGLProgram | null {
    const program = gl.createProgram();
    if (!program) return null;

    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error('[WebGL] Program link error:', gl.getProgramInfoLog(program));
        gl.deleteProgram(program);
        return null;
    }

    return program;
}

// Memoize to prevent unnecessary re-renders
export const AliveBackground = memo(AliveBackgroundComponent);
