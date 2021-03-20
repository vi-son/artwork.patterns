import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom";
// Local imports
import { get } from "./api.js";
import { Narrative } from "@vi.son/components";
import { ButtonCloseNarrative } from "@vi.son/components";
import { ButtonOpenNarrative } from "@vi.son/components";
import { ButtonToExhibition } from "@vi.son/components";
import PatternsUI from "./artwork/PatternsUI.js";
// Style imports
import "../sass/index.sass";

const Artwork = () => {
  const [showNarrative, setShowNarrative] = useState(false);
  const [content, setContent] = useState({});

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
    <>
      <div className="canvas-wrapper">
        <PatternsUI paused={showNarrative} />
        <ButtonOpenNarrative
          showNarrative={showNarrative}
          setShowNarrative={setShowNarrative}
        />
      </div>
      <ButtonToExhibition />
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
  );
};

const mount = document.querySelector("#mount");
ReactDOM.render(<Artwork />, mount);
