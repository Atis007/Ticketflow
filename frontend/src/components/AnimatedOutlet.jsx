import { useLocation, useOutlet } from "react-router-dom";
import { AnimatePresence, motion } from "motion/react";

const MotionDiv = motion.div;
const transition = { duration: 0.15, ease: [0.4, 0, 0.2, 1] };

export default function AnimatedOutlet({ className, keyDepth }) {
  const location = useLocation();
  const outlet = useOutlet();

  const key = keyDepth
    ? "/" + location.pathname.split("/").filter(Boolean).slice(0, keyDepth).join("/")
    : location.pathname;

  return (
    <AnimatePresence mode="wait">
      <MotionDiv
        key={key}
        className={className}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 8 }}
        transition={transition}
      >
        {outlet}
      </MotionDiv>
    </AnimatePresence>
  );
}
