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

  const { state } = useValues(patternsLogic);
  const { setState } = useActions(patternsLogic);

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
        </div>
      }
      content={
        <>
          {/* {state === PATTERNS_STATES.INIT ? <Intro /> : <></>} */}
          {state === PATTERNS_STATES.BEZIER_SETUP ? (
            <ButtonEmoji
              className="btn-set-bezier"
              emoji="👍🏻"
              onClick={() => {}}
            />
          ) : (
            <></>
          )}
          <ButtonToExhibition />
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
