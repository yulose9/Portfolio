"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ArrowDown } from "lucide-react";

interface ScrollPromptProps {
    isVisible: boolean;
    onClick: () => void;
}

export default function ScrollPrompt({ isVisible, onClick }: ScrollPromptProps) {
    return (
        <AnimatePresence>
            {isVisible && (
                <>
                    {/* Mobile Version - Proper Touch Target (44x44px minimum) */}
                    <motion.button
                        initial={{ opacity: 0 }}
                        animate={{
                            opacity: 1,
                            y: [0, 10, 0],
                        }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        transition={{
                            opacity: { duration: 0.5, delay: 5.2 },
                            y: {
                                duration: 1.5,
                                repeat: Infinity,
                                ease: "easeInOut",
                                delay: 5.2,
                            },
                            scale: { duration: 0.3, ease: "easeOut" },
                        }}
                        className="md:hidden absolute bottom-[40px] right-[34px] z-10 cursor-pointer bg-transparent border-none p-0 
                       w-11 h-11 flex items-center justify-center
                       active:scale-95 transition-transform"
                        onClick={onClick}
                        aria-label="Scroll to portfolio"
                    >
                        <ArrowDown className="w-[21px] h-[18px]" />
                    </motion.button>

                    {/* Desktop Version */}
                    <motion.button
                        initial={{ opacity: 0 }}
                        animate={{
                            opacity: 1,
                            y: [0, 10, 0],
                        }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        transition={{
                            opacity: { duration: 0.5, delay: 5.4 },
                            y: {
                                duration: 1.5,
                                repeat: Infinity,
                                ease: "easeInOut",
                                delay: 5.4,
                            },
                            scale: { duration: 0.3, ease: "easeOut" },
                        }}
                        className="hidden md:block absolute bottom-8 right-8 z-10 cursor-pointer hover:scale-105 transition-transform bg-transparent border-none p-0"
                        onClick={onClick}
                        aria-label="Scroll to portfolio"
                    >
                        <div className="flex items-center gap-3">
                            <motion.p
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ duration: 0.5, delay: 5.4 }}
                                className="text-[20px] font-semibold leading-[1.068] tracking-[-0.08em] text-white"
                                style={{ fontFamily: "SF Pro Text, Inter, sans-serif" }}
                            >
                                Scroll to Discover
                            </motion.p>
                            <div className="flex items-center justify-center">
                                <ArrowDown className="w-[20px] h-[20px]" />
                            </div>
                        </div>
                    </motion.button>
                </>
            )}
        </AnimatePresence>
    );
}
