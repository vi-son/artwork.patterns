import * as React from "react";

function SvgCircle(props) {
  return (
    <svg
      width="1em"
      height="1em"
      viewBox="0 0 40 40"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <circle fill="currentColor" cx={20} cy={20} r={9} fillRule="evenodd" />
    </svg>
  );
}

export default SvgCircle;

