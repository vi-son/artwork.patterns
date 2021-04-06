import { kea } from "kea";
import * as THREE from "three";

const PATTERNS_STATES = {
  INIT: "init",
  BEZIER_SETUP: "bezier-setup",
  PREPARE: "preapre",
  PATTERNS: "patterns",
  FINISH: "finish",
};

const patternLogic = kea({
  actions: {
    setState: (state) => ({ state }),

    init: (artwork) => ({ artwork }),

    setStartPoint: (point) => ({ point }),
    setStartHandle: (handle) => ({ point }),
    setEndPoint: (point) => ({ point }),
    setEndHandle: (handle) => ({ point }),
  },

  reducers: {
    state: [
      PATTERNS_STATES.INIT,
      {
        setState: (_, { state }) => state,
      },
    ],

    artwork: [
      null,
      {
        init: (_, { artwork }) => artwork,
      },
    ],

    startPoint: [
      new THREE.Vector3(-1, 0, 0),
      {
        setStartPoint: (_, { point }) => point,
      },
    ],

    startHandle: [
      new THREE.Vector3(-1, 0, 0),
      {
        setStartHandle: (_, { handle }) => handle,
      },
    ],

    endPoint: [
      new THREE.Vector3(+1, 0, 0),
      {
        setEndPoint: (_, { point }) => point,
      },
    ],

    endHandle: [
      new THREE.Vector3(-1, 0, 0),
      {
        setEndHandle: (_, { handle }) => handle,
      },
    ],
  },

  listeners: ({ actions, values }) => ({
    setState: () => {
      console.log("State change", values.state);
      values.artwork.reactOnStateChange();
    },
  }),
});

export default patternLogic;
export { PATTERNS_STATES };
