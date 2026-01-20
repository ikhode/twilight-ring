import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

// A Neural Network visualization component using HTML5 Canvas
export function SystemHealth() {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let width = canvas.width = canvas.parentElement?.clientWidth || 300;
        let height = canvas.height = canvas.parentElement?.clientHeight || 150;

        // Neural Nodes
        const nodes: { x: number; y: number; vx: number; vy: number; active: boolean }[] = [];
        const nodeCount = 40;

        for (let i = 0; i < nodeCount; i++) {
            nodes.push({
                x: Math.random() * width,
                y: Math.random() * height,
                vx: (Math.random() - 0.5) * 0.5,
                vy: (Math.random() - 0.5) * 0.5,
                active: Math.random() > 0.8
            });
        }

        let animationFrameId: number;

        const draw = () => {
            ctx.fillStyle = '#020617'; // Match slate-950
            ctx.fillRect(0, 0, width, height);

            // Update nodes
            nodes.forEach(node => {
                node.x += node.vx;
                node.y += node.vy;

                // Bounce off walls
                if (node.x < 0 || node.x > width) node.vx *= -1;
                if (node.y < 0 || node.y > height) node.vy *= -1;
            });

            // Draw Connections
            ctx.lineWidth = 1;
            for (let i = 0; i < nodes.length; i++) {
                for (let j = i + 1; j < nodes.length; j++) {
                    const dx = nodes[i].x - nodes[j].x;
                    const dy = nodes[i].y - nodes[j].y;
                    const dist = Math.sqrt(dx * dx + dy * dy);

                    if (dist < 100) {
                        ctx.beginPath();
                        // Active nodes create stronger connections
                        const alpha = (1 - dist / 100) * (nodes[i].active || nodes[j].active ? 0.4 : 0.1);
                        ctx.strokeStyle = `rgba(59, 130, 246, ${alpha})`; // Primary Blue
                        ctx.moveTo(nodes[i].x, nodes[i].y);
                        ctx.lineTo(nodes[j].x, nodes[j].y);
                        ctx.stroke();
                    }
                }
            }

            // Draw Nodes
            nodes.forEach(node => {
                ctx.beginPath();
                ctx.arc(node.x, node.y, node.active ? 3 : 1.5, 0, Math.PI * 2);
                ctx.fillStyle = node.active ? '#3b82f6' : '#64748b';
                ctx.fill();

                if (node.active) {
                    // Glow effect
                    ctx.beginPath();
                    ctx.arc(node.x, node.y, 8, 0, Math.PI * 2);
                    ctx.fillStyle = 'rgba(59, 130, 246, 0.1)';
                    ctx.fill();
                }
            });

            // Randomly activate nodes
            if (Math.random() > 0.95) {
                const node = nodes[Math.floor(Math.random() * nodes.length)];
                node.active = true;
                setTimeout(() => { node.active = false }, 500);
            }

            animationFrameId = requestAnimationFrame(draw);
        };

        draw();

        const handleResize = () => {
            width = canvas.width = canvas.parentElement?.clientWidth || 300;
            height = canvas.height = canvas.parentElement?.clientHeight || 150;
        };
        window.addEventListener('resize', handleResize);

        return () => {
            cancelAnimationFrame(animationFrameId);
            window.removeEventListener('resize', handleResize);
        };
    }, []);

    return (
        <div className="relative w-full h-full min-h-[150px] overflow-hidden rounded-xl bg-slate-950 border border-slate-800">
            <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
            <div className="absolute bottom-3 left-4 pointer-events-none">
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-[10px] font-mono text-green-500 uppercase tracking-widest">Neural Network Active</span>
                </div>
            </div>
        </div>
    );
}
