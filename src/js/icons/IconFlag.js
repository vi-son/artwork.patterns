import * as React from "react";

function SvgFlag(props) {
  return (
    <svg
      width="1em"
      height="1em"
      viewBox="0 0 40 40"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path fill="currentColor" d="M16 3h8v34h-8z" fillRule="evenodd" />
    </svg>
  );
}

export default SvgFlag;

