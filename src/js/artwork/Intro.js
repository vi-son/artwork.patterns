// node_modules imports
import React from "react";
import { Link } from "react-router-dom";
import { useActions } from "kea";
// Local imports
import patternsLogic, { PATTERNS_STATES } from "./logic.patterns.js";
// Style imports
import "@sass/Intro.sass";

const Intro = () => {
  const { setState } = useActions(patternsLogic);

  return (
    <main className="intro">
      <div className="content">
        <h2 className="heading">patterns</h2>
        <article className="text">
          Patterns ist ein audiovisuelle Experiment. Wir lassen dich kurzer
          Musikschnipsel (Samples) hören, zu denen du auswählst, was du fühlst,
          spürst oder dir vorstellst.
          <br />
          Zu jedem Sample hast du <b>drei Möglichkeiten</b>, von denen du eine
          auswählst, um deinen Eindruck der Musik zuzuordnen: Emotion Farbe oder
          Form
          <br />
          <b>
            Viel Spaß <span className="emoji">🎉</span>
          </b>
        </article>
        <span
          className="btn btn-start"
          onClick={() => setState(PATTERNS_STATES.BEZIER_SETUP)}
        >
          Loslegen
        </span>
      </div>
    </main>
  );
};

export default Intro;
