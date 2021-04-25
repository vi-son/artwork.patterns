import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom";
import { Provider } from "react-redux";
import { useValues, useActions, resetContext, getContext } from "kea";
// Local imports
import { get } from "./api.js";
import { ExhibitionLayout } from "@vi.son/components";
import { Narrative } from "@vi.son/components";
import { ButtonCloseNarrative } from "@vi.son/components";
import { ButtonEmoji } from "@vi.son/components";
import { ButtonOpenNarrative } from "@vi.son/components";
import { ButtonToExhibition } from "@vi.son/components";
import ArtworkContainer from "./artwork/ArtworkContainer.js";
import PatternsUI from "./artwork/PatternsUI.js";
import Intro from "./artwork/Intro.js";
import patternsLogic, { PATTERNS_STATES } from "./artwork/logic.patterns.js";
// SVG imports
import IconMouse from "@assets/svg/mouse.svg";
// Style imports
import "../sass/index.sass";

console.log(process.env.NODE_ENV);

resetContext({
  createStore: {},
  plugins: [],
});

const Artwork = () => {
  const [showNarrative, setShowNarrative] = useState(false);
  const [content, setContent] = useState({});

  const { state, patternTracks, volumes } = useValues(patternsLogic);
  const { setState, updatePatternTrack, updateVolume } = useActions(
    patternsLogic
  );

  useEffect(() => {
    console.group("Version");
    console.log(process.env.VERSION);
    console.groupEnd();
    get(`/pages/patterns`).then((d) => {
      console.log(d);
      setContent(d.content);
    });
  }, []);

  return (
    <ExhibitionLayout
      showAside={showNarrative}
      fixed={
        <div className="canvas-wrapper">
          <PatternsUI paused={showNarrative} />
          {/* <ArtworkContainer /> */}

          <div className="sounds-ui">
            {volumes.map((volume, i) => {
              return (
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
                  <span className="track-name">
                    {patternTracks[i].trackName}
                  </span>
                </span>
              );
            })}
          </div>
        </div>
      }
      content={
        <>
          {state === PATTERNS_STATES.INIT ? <Intro /> : <></>}
          {state === PATTERNS_STATES.BEZIER_SETUP ? (
            <>
              <div className="interaction-bezier-handles">
                <span className="bezier-icons">
                  <span>◼</span>
                  <span>●</span>
                </span>
                <IconMouse className="icon" />
                <article className="text">
                  Um die Kurve zu gestalten, verziehe die roten Punkte
                </article>
              </div>

              <ButtonEmoji
                className="btn-set-bezier"
                emoji="🪄"
                text="Kurve festlegen"
                onClick={() => setState(PATTERNS_STATES.PREPARE)}
              />
            </>
          ) : (
            <></>
          )}
          {state === PATTERNS_STATES.PREPARE ||
          state === PATTERNS_STATES.PATTERNS ? (
            <div className="interaction-camera">
              <IconMouse className="icon" />
              <article className="text">
                Klick und ziehen zum Drehen Mausrad für Zoom
              </article>
            </div>
          ) : (
            <></>
          )}
          {state === PATTERNS_STATES.FINISH ? (
            <ButtonEmoji
              className="btn-to-overview"
              emoji="👁"
              onClick={() => setState(PATTERNS_STATES.OVERVIEW)}
            />
          ) : (
            <></>
          )}
          <ButtonToExhibition withText={false} />
          <ButtonOpenNarrative
            showNarrative={showNarrative}
            setShowNarrative={setShowNarrative}
          />
        </>
      }
      aside={
        <>
          <ButtonCloseNarrative
            showNarrative={showNarrative}
            setShowNarrative={setShowNarrative}
          />
          <Narrative
            show={showNarrative}
            version={process.env.VERSION}
            content={content}
          />
        </>
      }
    />
  );
};

const mount = document.querySelector("#mount");
ReactDOM.render(
  <Provider store={getContext().store}>
    <Artwork />
  </Provider>,
  mount
);
