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
          Musik erscheint uns geheimnisvoll, wild, organisch, wirkmächtig,
          mitreissend, ein Spiel zwischen Ordnung und Umbrüchen. Sie ist ein
          Mittel, um Zeit, Emotionen und Eindrücke zu strukturieren. Mit festen,
          harmonischen <b>Regeln der Wiederholung und Musterhaftigkeit</b> - und
          hin und wieder überraschenden und mutigen Regelbrüchen.
          <br />
          <br />
          <b>Was wäre, wenn Musik so aussieht wie laufende Muster?</b> Dann
          werden Soundwelten zu filigranen Skulpturen und lineares Hören tritt
          in einen neuen Erlebnisraum ein. Mit unserem Exponat tauchst du in
          diesen Raum ein.
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
