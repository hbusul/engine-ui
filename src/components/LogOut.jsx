import { useContext } from "react";
import { AuthContext } from "../AuthContext";
import { useEffect } from "react";

const LogOut = () => {
  const [, setLogin] = useContext(AuthContext);
  useEffect(() => {
    setLogin(false);
  }, [setLogin])
  return "";
};

export default LogOut;
