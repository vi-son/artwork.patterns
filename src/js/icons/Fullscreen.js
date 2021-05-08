import * as React from "react";

function SvgFullscreen(props) {
  return (
    <svg
      width="1em"
      height="1em"
      viewBox="0 0 48 48"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <g fill="currentColor" fillRule="evenodd">
        <path d="M10 10V7h20v3H10v20H7V10h3zM39 39V19h3v20h-3zm-20 3v-3h20v3H19z" />
      </g>
    </svg>
  );
}

export default SvgFullscreen;
