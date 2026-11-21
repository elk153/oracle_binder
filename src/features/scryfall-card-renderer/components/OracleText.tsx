import type { ElementType } from "react";
import useOracleText from "../../../hooks/useOracleText.tsx";

type OracleTextProps = {
  text: string | null | undefined;
  /** Element used for each line of text; defaults to a paragraph. */
  container?: ElementType;
};

const OracleText = ({ text, container = "p" }: OracleTextProps) => {
  const oracleText = useOracleText(text, container);

  return (
    <div >
      {oracleText}
    </div>
  )
};

export default OracleText;
