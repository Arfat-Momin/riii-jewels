"use client";

import { motion, AnimatePresence, Variants } from "framer-motion";
import React, { useEffect, useState } from "react";

import { usePathname } from "next/navigation";

// Module-level flag: persists across SPA navigations, resets on browser reload
let introHasPlayed = false;

export default function IntroAnimation() {
  const [show, setShow] = useState(true);
  const pathname = usePathname();

  useEffect(() => {
    const timer = setTimeout(() => setShow(false), 4800);
    return () => clearTimeout(timer);
  }, []);

  // Skip the intro animation for admin routes
  if (pathname?.startsWith("/admin")) {
    return null;
  }

  const text = "Riii Jewels";
  const letters = text.split("");

  const container: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1, delayChildren: 0.3 },
    },
    exit: {
      opacity: 0,
      transition: { duration: 1, ease: "easeInOut" },
    },
  };

  const child: Variants = {
    hidden: {
      opacity: 0,
      filter: "blur(15px)",
    },
    visible: {
      opacity: [0, 1, 1, 0],
      filter: ["blur(15px)", "blur(0px)", "blur(0px)", "blur(15px)"],
      transition: {
        duration: 3.5,
        times: [0, 0.2, 0.8, 1], // 0 -> 0.7s (fade in), 0.7s -> 2.8s (stay), 2.8s -> 3.5s (fade out)
        ease: "easeInOut",
      },
    },
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="fixed inset-0 z-[99999] flex items-center justify-center pointer-events-none"
          style={{ backgroundColor: "#F7F4EF" }}
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.2, ease: "easeInOut" }}
        >
          <motion.div
            variants={container}
            initial="hidden"
            animate="visible"
            className="flex font-serif text-5xl sm:text-6xl md:text-7xl lg:text-8xl text-charcoal tracking-widest"
          >
            {letters.map((letter, index) => (
              <motion.span
                key={index}
                variants={child}
                style={{
                  display: "inline-block",
                  width: letter === " " ? "0.3em" : "auto",
                }}
              >
                {letter}
              </motion.span>
            ))}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
