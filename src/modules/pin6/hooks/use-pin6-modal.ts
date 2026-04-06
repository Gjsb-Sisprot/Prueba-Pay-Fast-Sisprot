"use client";

import { useState, useEffect } from "react";
import Cookies from "js-cookie";

export function usePin6Modal() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const flag = Cookies.get("hidePin6Modal");
    if (!flag) {
      setVisible(true);
    }
  }, []);

  const hideModal = (remember: boolean) => {
    if (remember) {
      Cookies.set("hidePin6Modal", "true", { expires: 365 });
    }
    setVisible(false);
  };

  return {
    visible,
    hideModal
  };
}
