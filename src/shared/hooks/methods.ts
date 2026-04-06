
 export const getMethodTitle = (method: string) => {
    switch (method) {
      case "pago-movil":
        return "Pago Móvil";
        case "pago-qr":
        return "Pago Móvil QR";
      case "transferencia":
        return "Transferencia";
      case "zelle":
        return "Zelle";
      case "debito-inmediato":
        return "Débito Inmediato";
      default:
        return "Transferencia";
    }
  };
