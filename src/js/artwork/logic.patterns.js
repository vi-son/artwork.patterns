import { kea } from "kea";
import * as THREE from "three";

const PATTERNS_STATES = {
  INIT: "init",
  BEZIER_SETUP: "bezier-setup",
  PREPARE: "prepare",
  PATTERNS: "patterns",
  FINISH: "finish",
  OVERVIEW: "overview",
};

const patternLogic = kea({
  actions: {
    setState: (state) => ({ state }),
    init: (artwork) => ({ artwork }),
    setStartPoint: (point) => ({ point: THREE.Vector3 }),
    setStartHandle: (handle) => ({ handle: THREE.Vector3 }),
    setEndPoint: (point) => ({ point: THREE.Vector3 }),
    setEndHandle: (handle) => ({ handle: THREE.Vector3 }),
    addPatternTrack: (track) => ({ track }),
    updatePatternTrack: (track) => ({ track }),
    addVolume: (volume) => ({ volume }),
    updateVolume: (index, volume) => ({ index, volume }),
    updatePlayProgress: (time) => ({ time }),
  },

  reducers: {
    playProgress: [
      0,
      {
        updatePlayProgress: (_, { time }) => time,
      },
    ],
    trackCount: [5],
    volumes: [
      [],
      {
        addVolume: (state, { volume }) => [...state, volume],
        updateVolume: (state, { index, volume }) =>
          state.map((v, i) => (i === index ? volume : v)),
      },
    ],
    patternTracks: [
      [],
      {
        addPatternTrack: (state, { track }) => [...state, track],
        updatePatternTrack: (state, { track }) => state,
      },
    ],
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
    setSounds: ({ sounds }) => {
      console.log("Got sounds: ", sounds);
    },
    addPatternTrack: ({ track }) => {
      actions.addVolume(track.audio.getVolume());
    },
    updateVolume: ({ index, volume }) => {
      console.log(index, volume);
    },
  }),
});

export default patternLogic;
export { PATTERNS_STATES };
