// node_modules imports
import React, { useState, useRef, useEffect } from "react";
import { useValues, useActions } from "kea";
// Logic imports
import patternsLogic, { PATTERNS_STATES } from "./logic.patterns.js";
// import Totem from "../artwork/Totem.js";
// Style imports
// import "../../sass/components/ArtworkContainer.sass";

const ArtworkContainer = ({ mapping, onResize, paused, state, onSelect }) => {
  const canvasRef = useRef();
  const canvasWrapperRef = useRef();

  const { setCanvas } = useActions(patternsLogic);

  useEffect(() => {
    const unmountLogic = patternsLogic.mount();
    // if (canvasRef.current) {
    //   setCanvas(canvasRef.current);
    //   const totem = new Totem(canvasRef.current, onSelect);
    //   initTotem(totem);
    // }
    return () => {
      // totem.dispose();
      unmountLogic();
    };
  }, []);

  return (
    <div className="artwork">
      <div className="canvas-wrapper" ref={canvasWrapperRef}>
        <canvas className="canvas" ref={canvasRef}></canvas>
      </div>
    </div>
  );
};

export default ArtworkContainer;
