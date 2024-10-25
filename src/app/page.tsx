"use client";

import {motion} from 'framer-motion';

export default function Home() {
  return (<div className="flex flex-grow justify-center items-center h-dvh overscroll-none fixed w-full select-none">
      <motion.div className="p-4" initial={{opacity: 0.1, scale: 0.98}}
                  animate={{opacity: 1, scale: 1}} transition={{ease: "easeOut", duration: 0.3}}>
          <p className="text-xl font-light">FundFuture.xyz</p>
          <p className="text-sm text-muted-foreground">Coming soon...</p>
          <p className="text-xs text-muted-foreground absolute left-4 bottom-4 font-mono">© 2024</p>
      </motion.div>
  </div>);
}
