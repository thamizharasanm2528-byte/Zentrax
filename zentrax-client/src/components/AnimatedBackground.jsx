import React from 'react';

const AnimatedBackground = () => {
    return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0 bg-slate-50">
            {/* Animated Grid */}
            <div 
                className="absolute inset-0 opacity-[0.03]"
                style={{
                    backgroundImage: `linear-gradient(to right, #4F46E5 1px, transparent 1px), linear-gradient(to bottom, #4F46E5 1px, transparent 1px)`,
                    backgroundSize: '40px 40px',
                    maskImage: 'radial-gradient(circle at center, black, transparent 80%)',
                    WebkitMaskImage: 'radial-gradient(circle at center, black, transparent 80%)',
                }}
            />

            {/* Glowing Orbs */}
            <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-indigo-500/10 blur-[100px] animate-blob" />
            <div className="absolute top-[20%] right-[-10%] w-[400px] h-[400px] rounded-full bg-purple-500/10 blur-[100px] animate-blob animation-delay-2000" />
            <div className="absolute bottom-[-20%] left-[20%] w-[600px] h-[600px] rounded-full bg-pink-500/10 blur-[100px] animate-blob animation-delay-4000" />
            
            {/* Floating Connection Nodes */}
            <div className="absolute inset-0">
                {[...Array(6)].map((_, i) => (
                    <div 
                        key={i}
                        className="absolute rounded-full bg-indigo-500/20 shadow-[0_0_15px_rgba(79,70,229,0.3)] animate-float"
                        style={{
                            width: `${Math.random() * 8 + 4}px`,
                            height: `${Math.random() * 8 + 4}px`,
                            left: `${Math.random() * 100}%`,
                            top: `${Math.random() * 100}%`,
                            animationDuration: `${Math.random() * 10 + 10}s`,
                            animationDelay: `${Math.random() * 5}s`
                        }}
                    />
                ))}
            </div>

            <style>{`
                @keyframes blob {
                    0% { transform: translate(0px, 0px) scale(1); }
                    33% { transform: translate(30px, -50px) scale(1.1); }
                    66% { transform: translate(-20px, 20px) scale(0.9); }
                    100% { transform: translate(0px, 0px) scale(1); }
                }
                @keyframes float {
                    0% { transform: translateY(0) translateX(0); opacity: 0; }
                    10% { opacity: 1; }
                    90% { opacity: 1; }
                    100% { transform: translateY(-100px) translateX(20px); opacity: 0; }
                }
                .animate-blob {
                    animation: blob 7s infinite;
                }
                .animate-float {
                    animation: float 15s infinite linear;
                }
                .animation-delay-2000 {
                    animation-delay: 2s;
                }
                .animation-delay-4000 {
                    animation-delay: 4s;
                }
            `}</style>
        </div>
    );
};

export default AnimatedBackground;
