import { useEffect, useRef } from "react";

export default function useIdleTimeout(onTimeout, timeout = 10 * 60 * 1000) {
  const timerRef = useRef(null);

  useEffect(() => {
    const resetTimer = () => {
      if (timerRef.current) clearTimeout(timerRef.current);

      timerRef.current = setTimeout(() => {
        console.log("User inactive → logging out");
        onTimeout();
      }, timeout);
    };

    const events = ["mousemove", "mousedown", "keypress", "scroll", "touchstart"];

    events.forEach((event) => window.addEventListener(event, resetTimer));

    resetTimer();

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      events.forEach((event) => window.removeEventListener(event, resetTimer));
    };
  }, [onTimeout, timeout]);
}