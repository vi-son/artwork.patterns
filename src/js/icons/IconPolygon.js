import * as React from "react";

function SvgPolygon(props) {
  return (
    <svg
      width="1em"
      height="1em"
      viewBox="0 0 40 40"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        fill="currentColor"
        d="M20 9l10.413 9.292-4.36 12.416H13.947l-4.36-12.416z"
        fillRule="evenodd"
      />
    </svg>
  );
}

export default SvgPolygon;

