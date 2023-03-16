// node_modules imports
import React, { useEffect, useRef, useState } from "react";
import ReactDOM from "react-dom";
import { useActions, useValues } from "kea";
// Local imports
import patternsLogic, { PATTERNS_STATES } from "./logic.patterns.js";
import Patterns from "./Patterns.js";

const PatternsUI = ({ paused }) => {
  const canvasWrapperRef = useRef();
  const canvasRef = useRef();
  const [freqData, setFreqData] = useState(
    Array.from({ length: 5 }, () => Array.from({ length: 16 }, () => null))
  );
  const [avgFreqData, setAvgFreqData] = useState([0, 0, 0, 0, 0]);
  const [progress, setProgress] = useState(0);
  const [freqIndex] = useState(3);
  const [thresholds] = useState([10, 10, 10, 10, 10]);
  const [isHovering, setIsHovering] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const { init } = useActions(patternsLogic);
  const { artwork } = useValues(patternsLogic);

  useEffect(() => {
    if (canvasRef.current && canvasWrapperRef.current) {
      init(new Patterns(canvasRef.current, canvasWrapperRef.current));
    }
  }, []);

  useEffect(() => {
    if (artwork === null) return;
    if (paused) {
      artwork.pause();
    }
    if (!paused) {
      artwork.continue();
    }
  }, [paused]);

  return (
    <>
      <div className="progress-bar">
        <div className="progress" style={{ width: `${progress * 100.0}%` }} />
      </div>
      <div className="freq-row">
        {freqData !== undefined ? (
          freqData.map((f, i) => {
            const row = f.map((v, j) => {
              return (
                <b
                  key={`${i}${j}`}
                  className={
                    j === freqIndex && v >= thresholds[i] ? "colored" : ""
                  }
                >
                  {v}
                </b>
              );
            });
            return (
              <div key={i} className="row" data-size={freqData[0].length}>
                <span>
                  <b className="threshold">T</b>
                  <span className="text">{thresholds[i]}</span>
                </span>
                <span>
                  <b className="average">∅</b>
                  <span className="text">{avgFreqData[i]}</span>
                </span>
                {row}
              </div>
            );
          })
        ) : (
          <></>
        )}

        {progress !== undefined ? (
          <span className="percentage">{Math.round(progress * 100.0)} %</span>
        ) : (
          ""
        )}
      </div>
      <div
        className={[
          "canvas-wrapper",
          isHovering ? "hover" : "",
          isDragging ? "drag" : "",
        ].join(" ")}
        ref={canvasWrapperRef}
      >
        <canvas ref={canvasRef} />
      </div>
    </>
  );
};

export default PatternsUI;
