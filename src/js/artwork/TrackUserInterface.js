import React from "react";
import { useValues, useActions } from "kea";
import patternsLogic from "./logic.patterns.js";
// SVG
import Triangle from "../icons/IconTriangle.js";
import Circle from "../icons/IconCircle.js";
import Flag from "../icons/IconFlag.js";
import Polygon from "../icons/IconPolygon.js";
import Stick from "../icons/IconStick.js";
// Style
import "./TrackUserInterface.sass";

const TrackUserInterface = () => {
  const { patternTracks, volumes, playProgress } = useValues(patternsLogic);
  const { updateVolume } = useActions(patternsLogic);

  const shapeFromTrack = (index, color) => {
    const colorHex = `#${color.getHexString()}`;
    switch (index) {
      case 0:
        return <Flag style={{ color: colorHex }} />;
      case 1:
        return <Triangle style={{ color: colorHex }} />;
      case 2:
        return <Polygon style={{ color: colorHex }} />;
      case 3:
        return <Circle style={{ color: colorHex }} />;
      case 4:
        return <Stick style={{ color: colorHex }} />;
      default:
        return <></>;
    }
  };

  return (
    <div className="track-user-interface">
      {volumes.map((volume, i) => {
        return (
          <div className="track" key={i}>
            <span className="track-name">{patternTracks[i].trackName}</span>
            <span
              className={`sound ${volume >= 0.5 ? "on" : "off"}`}
              key={i}
              onClick={() => {
                const newVolume = volume >= 0.5 ? 0.0 : 1.0;
                patternTracks[i].audio.setVolume(newVolume);
                updateVolume(i, newVolume);
              }}
            >
              <span className="icon">{volume <= 0.5 ? "🔇" : "🔊"}</span>
            </span>
            <span className="timeline">
              <span
                className="progress"
                style={{ width: `${playProgress * 100.0}%` }}
              />
            </span>
            <span className="shape">
              {shapeFromTrack(patternTracks[i].index, patternTracks[i].color)}
            </span>
          </div>
        );
      })}
    </div>
  );
};

export default TrackUserInterface;
