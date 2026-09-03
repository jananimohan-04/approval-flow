import React, { useEffect, useRef } from 'react';

export function AnimatedNetworkBg() {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let animationFrameId: number;
        let width = 0;
        let height = 0;
        let time = 0;

        // Premium Brand Colors
        const COLOR_RED = '#E31837';
        const COLOR_RED_GLOW = 'rgba(227, 24, 55, 0.6)';
        const COLOR_RED_LIGHT = '#ff4d6d';
        const COLOR_WHITE = 'rgba(255, 255, 255, 0.9)';
        const COLOR_DARK = '#050505';

        // --- Elements ---

        class Particle {
            x: number;
            y: number;
            z: number;
            size: number;
            speed: number;
            color: string;

            constructor() {
                this.x = Math.random() * width;
                this.y = Math.random() * height;
                this.z = Math.random() * 2 + 0.1; // Depth for parallax
                this.size = (Math.random() * 2 + 0.5) / this.z;
                this.speed = (Math.random() * 0.5 + 0.1) / this.z;
                this.color = Math.random() > 0.7 ? COLOR_RED : 'rgba(255,255,255,0.3)';
            }

            update() {
                this.y -= this.speed;
                this.x += Math.sin(time * 0.001 + this.y * 0.01) * 0.5; // Gentle sway
                if (this.y < -10) {
                    this.y = height + 10;
                    this.x = Math.random() * width;
                }
            }

            draw(ctx: CanvasRenderingContext2D) {
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                ctx.fillStyle = this.color;
                if (this.color === COLOR_RED) {
                    ctx.shadowBlur = 10 / this.z;
                    ctx.shadowColor = COLOR_RED;
                } else {
                    ctx.shadowBlur = 0;
                }
                ctx.fill();
            }
        }

        class DataStream {
            angle: number;
            speed: number;
            particles: { r: number, size: number, speed: number, alpha: number }[];
            width: number;

            constructor(angle: number) {
                this.angle = angle;
                this.speed = Math.random() * 2 + 1;
                this.width = Math.random() * 2 + 1;
                this.particles = [];
                for (let i = 0; i < 5; i++) {
                    this.particles.push({
                        r: Math.random() * 200,
                        size: Math.random() * 3 + 1,
                        speed: Math.random() * 3 + 2,
                        alpha: Math.random()
                    });
                }
            }

            update() {
                this.particles.forEach(p => {
                    p.r += p.speed;
                    p.alpha -= 0.005;
                    if (p.r > Math.max(width, height)) {
                        p.r = 40; // Reset near core
                        p.alpha = 1;
                    }
                });
            }

            draw(ctx: CanvasRenderingContext2D, cx: number, cy: number) {
                // Draw the main beam
                ctx.beginPath();
                ctx.moveTo(cx + Math.cos(this.angle) * 40, cy + Math.sin(this.angle) * 40);
                ctx.lineTo(cx + Math.cos(this.angle) * Math.max(width, height), cy + Math.sin(this.angle) * Math.max(width, height));

                const gradient = ctx.createLinearGradient(
                    cx + Math.cos(this.angle) * 40, cy + Math.sin(this.angle) * 40,
                    cx + Math.cos(this.angle) * 500, cy + Math.sin(this.angle) * 500
                );
                gradient.addColorStop(0, 'rgba(227, 24, 55, 0.8)');
                gradient.addColorStop(1, 'rgba(227, 24, 55, 0)');

                ctx.strokeStyle = gradient;
                ctx.lineWidth = this.width;
                ctx.shadowBlur = 15;
                ctx.shadowColor = COLOR_RED;
                ctx.stroke();
                ctx.shadowBlur = 0;

                // Draw data packets traveling along the beam
                this.particles.forEach(p => {
                    if (p.alpha > 0) {
                        const px = cx + Math.cos(this.angle) * p.r;
                        const py = cy + Math.sin(this.angle) * p.r;
                        ctx.beginPath();
                        ctx.arc(px, py, p.size, 0, Math.PI * 2);
                        ctx.fillStyle = `rgba(255, 255, 255, ${p.alpha})`;
                        ctx.shadowBlur = 10;
                        ctx.shadowColor = COLOR_WHITE;
                        ctx.fill();
                        ctx.shadowBlur = 0;
                    }
                });
            }
        }

        let particles: Particle[] = [];
        let streams: DataStream[] = [];
        let pulseRings: { r: number, alpha: number }[] = [];

        const init = () => {
            width = canvas.width = canvas.offsetWidth;
            height = canvas.height = canvas.offsetHeight;

            particles = [];
            streams = [];
            pulseRings = [];

            // Dense background particles
            for (let i = 0; i < 150; i++) {
                particles.push(new Particle());
            }

            // Data streams radiating from center
            const numStreams = 12;
            for (let i = 0; i < numStreams; i++) {
                // Focus streams downwards to represent assigning to users
                const angle = (Math.PI / numStreams) * i + Math.PI / 2 - Math.PI / 4;
                streams.push(new DataStream(angle));
            }
            // Add a few going up for balance
            for (let i = 0; i < 4; i++) {
                streams.push(new DataStream(Math.random() * Math.PI + Math.PI));
            }
        };

        const animate = () => {
            time += 1;

            // Dark, rich background with a slight trail effect for smoothness
            ctx.fillStyle = 'rgba(5, 5, 5, 0.3)';
            ctx.fillRect(0, 0, width, height);

            const cx = width / 2;
            const cy = height * 0.3; // Core positioned higher up

            // 1. Draw Perspective Grid (Floor)
            ctx.save();
            ctx.translate(cx, height);
            ctx.scale(1, 0.3); // Flatten to create perspective
            ctx.beginPath();
            const gridSize = 60;
            const gridLines = 20;
            for (let i = -gridLines; i <= gridLines; i++) {
                // Vertical lines
                ctx.moveTo(i * gridSize, 0);
                ctx.lineTo(i * gridSize * 3, -height * 3); // Vanishing point effect
            }
            for (let i = 0; i <= gridLines; i++) {
                // Horizontal lines
                const y = -i * gridSize * (i * 0.2); // Exponential spacing for perspective
                ctx.moveTo(-width * 2, y);
                ctx.lineTo(width * 2, y);
            }
            ctx.strokeStyle = 'rgba(227, 24, 55, 0.05)';
            ctx.lineWidth = 2;
            ctx.stroke();
            ctx.restore();

            // 2. Update & Draw Background Particles
            particles.forEach(p => {
                p.update();
                p.draw(ctx);
            });

            // 3. Update & Draw Data Streams (Tasks being assigned)
            streams.forEach(stream => {
                stream.update();
                stream.draw(ctx, cx, cy);
            });

            // 4. Draw Expanding Pulse Rings (System activity)
            if (time % 60 === 0) {
                pulseRings.push({ r: 40, alpha: 0.8 });
            }
            pulseRings.forEach((ring, index) => {
                ring.r += 2;
                ring.alpha -= 0.01;
                if (ring.alpha <= 0) {
                    pulseRings.splice(index, 1);
                } else {
                    ctx.beginPath();
                    ctx.arc(cx, cy, ring.r, 0, Math.PI * 2);
                    ctx.strokeStyle = `rgba(227, 24, 55, ${ring.alpha})`;
                    ctx.lineWidth = 2;
                    ctx.stroke();
                }
            });

            // 5. Draw AI Core (Massive, glowing, multi-layered)

            // Outer glow
            const outerGlow = ctx.createRadialGradient(cx, cy, 20, cx, cy, 150 + Math.sin(time * 0.05) * 20);
            outerGlow.addColorStop(0, 'rgba(227, 24, 55, 0.4)');
            outerGlow.addColorStop(1, 'rgba(227, 24, 55, 0)');
            ctx.beginPath();
            ctx.arc(cx, cy, 170, 0, Math.PI * 2);
            ctx.fillStyle = outerGlow;
            ctx.fill();

            // Inner core
            ctx.beginPath();
            ctx.arc(cx, cy, 40, 0, Math.PI * 2);
            const coreGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 40);
            coreGrad.addColorStop(0, COLOR_WHITE);
            coreGrad.addColorStop(0.4, COLOR_RED_LIGHT);
            coreGrad.addColorStop(1, COLOR_RED);
            ctx.fillStyle = coreGrad;
            ctx.shadowBlur = 50;
            ctx.shadowColor = COLOR_RED;
            ctx.fill();
            ctx.shadowBlur = 0;

            // Core details (rotating rings)
            ctx.save();
            ctx.translate(cx, cy);
            ctx.rotate(time * 0.02);
            ctx.beginPath();
            ctx.arc(0, 0, 50, 0, Math.PI * 1.5);
            ctx.strokeStyle = COLOR_RED_LIGHT;
            ctx.lineWidth = 3;
            ctx.stroke();
            ctx.restore();

            ctx.save();
            ctx.translate(cx, cy);
            ctx.rotate(-time * 0.015);
            ctx.beginPath();
            ctx.arc(0, 0, 60, Math.PI * 0.5, Math.PI * 2);
            ctx.strokeStyle = 'rgba(255,255,255,0.5)';
            ctx.lineWidth = 1;
            ctx.stroke();
            ctx.restore();

            // Floating "AI SCHEDULER" text
            ctx.fillStyle = COLOR_WHITE;
            ctx.font = 'bold 14px "Inter", sans-serif';
            ctx.textAlign = 'center';
            // @ts-ignore
            ctx.letterSpacing = '2px';
            ctx.shadowBlur = 10;
            ctx.shadowColor = COLOR_RED;
            ctx.fillText('AI SCHEDULER CORE', cx, cy - 80);
            ctx.shadowBlur = 0;

            animationFrameId = requestAnimationFrame(animate);
        };

        init();
        animate();

        const handleResize = () => {
            init();
        };

        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            cancelAnimationFrame(animationFrameId);
        };
    }, []);

    return (
        <div className="absolute inset-0 w-full h-full overflow-hidden bg-[#050505]">
            <canvas
                ref={canvasRef}
                className="absolute inset-0 w-full h-full"
            />
            {/* Premium Vignette and Gradient Overlays */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,#050505_100%)] opacity-80 pointer-events-none" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-transparent to-transparent pointer-events-none" />
            <div className="absolute inset-0 bg-gradient-to-r from-[#050505]/90 via-transparent to-transparent pointer-events-none" />
        </div>
    );
}
