import React, { useState, useEffect } from "react";

export default function VintageTimestamp() {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
  const month = months[time.getMonth()];
  const day = String(time.getDate()).padStart(2, "0");
  const year = time.getFullYear();

  let hours = time.getHours();
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12 || 12;
  const hoursStr = String(hours).padStart(2, "0");
  const minutes = String(time.getMinutes()).padStart(2, "0");

  return (
    <div
      className="absolute bottom-28 right-4 pointer-events-none select-none z-20 text-right"
      style={{
        fontFamily: "'Courier New', Courier, monospace",
        textShadow: "0 0 8px rgba(255, 180, 0, 0.8), 0 0 2px rgba(255,255,255,0.6)",
        color: "#FFD700",
        letterSpacing: "0.05em",
      }}
    >
      <div className="text-xl font-bold leading-tight" style={{ fontSize: "clamp(14px, 4vw, 20px)" }}>
        {month}.{day} {year}
      </div>
      <div className="text-xl font-bold leading-tight" style={{ fontSize: "clamp(14px, 4vw, 20px)" }}>
        {hoursStr}:{minutes} {ampm}
      </div>
    </div>
  );
}