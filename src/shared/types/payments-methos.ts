export interface PaymentMethod {
  id: string;
  name: string;
  description: string;
  image?: string;
}

 export const methods: PaymentMethod[] = [
    {
      id: "debito-inmediato",
      name: "Débito Inmediato",
      description: "Pago instantáneo con débito",
      image: "/assets/methods/pago-movil.png",
    },
    {
      id: "pago-movil",
      name: "Pago Móvil",
      description: "Pago instantáneo por teléfono",
      image: "/assets/methods/pago-movil.png",
    },
      {
      id: "pago-qr",
      name: "Pago QR",
      description: "Pago instantáneo por teléfono a traves de QR",
      image: "/assets/methods/pago-qr.png",
    },
    {
      id: "transferencia",
      name: "Transferencia",
      description: "Pago por transferencia bancaria",
      image: "/assets/methods/transferencia.png",
    },
    {
      id: "zelle",
      name: "Zelle",
      description: "Pago internacional con Zelle",
      image: "/assets/methods/zelle.png",
    },
  
  ];