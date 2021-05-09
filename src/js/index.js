import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom";
import { Provider } from "react-redux";
import { useValues, useActions, resetContext, getContext } from "kea";
import { utils } from "@vi.son/components";
const { mobileCheck } = utils;
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
import TrackUserInterface from "./artwork/TrackUserInterface.js";
import patternsLogic, { PATTERNS_STATES } from "./artwork/logic.patterns";
import IconFullscreen from "./icons/Fullscreen.js";
import IconExitFullscreen from "./icons/ExitFullscreen.js";
// SVG imports
import IconMouse from "@assets/svg/mouse.svg";
import IconTouch from "@assets/svg/touchinput.svg";
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
  const [isFullscreen, setIsFullscreen] = useState(false);

  const { state, patternTracks, volumes } = useValues(patternsLogic);
  const { setState, updatePatternTrack, updateVolume } = useActions(
    patternsLogic
  );

  const isMobile = mobileCheck();

  useEffect(() => {
    console.group("Version");
    console.log(process.env.VERSION);
    console.groupEnd();
    get(`/pages/patterns`).then((d) => {
      console.log(d);
      setContent(d.content);
    });

    [
      "fullscreenchange",
      "webkitfullscreenchange",
      "mozfullscreenchange",
      "msfullscreenchange",
    ].forEach((eventType) =>
      document.addEventListener(eventType, handleFullscreen, false)
    );
  }, []);

  const handleFullscreen = () => {
    setIsFullscreen(window.fullScreen);
  };

  return (
    <ExhibitionLayout
      clickable={state === PATTERNS_STATES.INIT}
      showAside={showNarrative}
      fixed={
        <div className="canvas-wrapper">
          {process.env.NODE_ENV === "development" && (
            <h1 className="state">{state}</h1>
          )}
          <PatternsUI paused={showNarrative} />
          {/* <ArtworkContainer /> */}
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
                {isMobile ? (
                  <IconTouch className="icon" />
                ) : (
                  <IconMouse className="icon" />
                )}
                <article className="text">
                  Um die Kurve zu gestalten, verziehe die roten Punkte
                </article>
              </div>
              <ButtonEmoji
                className={`btn-set-bezier ${
                  patternTracks.length < 5 && "hidden"
                }`}
                emoji="🪄"
                text="Kurve festlegen"
                withText={!isMobile}
                onClick={() => setState(PATTERNS_STATES.PREPARE)}
              />
            </>
          ) : (
            <></>
          )}
          {state === PATTERNS_STATES.PREPARE ||
          state === PATTERNS_STATES.PATTERNS ? (
            <>
              <div className="interaction-camera">
                {isMobile ? (
                  <IconTouch className="icon" />
                ) : (
                  <IconMouse className="icon" />
                )}
                <article className="text">
                  {!isMobile
                    ? "Klick und ziehen zum Drehen Mausrad für Zoom"
                    : "Wischen zum Drehen Pinch für Zoom"}
                </article>
              </div>
              <TrackUserInterface />
            </>
          ) : (
            <></>
          )}
          {state === PATTERNS_STATES.FINISH ? (
            <>
              <div className="interaction-camera">
                {isMobile ? (
                  <IconTouch className="icon" />
                ) : (
                  <IconMouse className="icon" />
                )}
                <article className="text">
                  Klick und ziehen zum Drehen Mausrad für Zoom
                </article>
              </div>
              <ButtonEmoji
                className="btn-to-overview"
                emoji="🔎"
                onClick={() => setState(PATTERNS_STATES.OVERVIEW)}
              />
            </>
          ) : (
            <></>
          )}
          {state !== PATTERNS_STATES.PATTERNS && (
            <ButtonToExhibition withText={!isMobile} />
          )}
          {!isMobile && (
            <ButtonEmoji
              className="btn-fullscreen"
              emoji={isFullscreen ? <IconExitFullscreen /> : <IconFullscreen />}
              onClick={() =>
                isFullscreen
                  ? document.exitFullscreen()
                  : document.body.requestFullscreen()
              }
            />
          )}{" "}
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
