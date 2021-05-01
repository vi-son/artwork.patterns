import * as React from "react";

function SvgStick(props) {
  return (
    <svg
      width="1em"
      height="1em"
      viewBox="0 0 40 40"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path fill="currentColor" d="M19 3h2v34h-2z" fillRule="evenodd" />
    </svg>
  );
}

export default SvgStick;

