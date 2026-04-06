export type Bank = {
  id?: number;
  achronym?: string;
  code: string;
  name: string;
};

export const BANKS: Bank[] = [
  { code: "0102", name: "BANCO DE VENEZUELA" },
  { code: "0104", name: "BANCO VENEZOLANO DE CREDITO" },
  { code: "0105", name: "BANCO MERCANTIL" },
  { code: "0108", name: "BBVA PROVINCIAL" },
  { code: "0114", name: "BANCARIBE" },
  { code: "0115", name: "BANCO EXTERIOR" },
  { code: "0128", name: "BANCO CARONI" },
  { code: "0134", name: "BANESCO" },
  { code: "0137", name: "BANCO SOFITASA" },
  { code: "0138", name: "BANCO PLAZA" },
  { code: "0146", name: "BANGENTE" },
  { code: "0151", name: "BANCO FONDO COMUN" },
  { code: "0156", name: "100% BANCO" },
  { code: "0157", name: "DELSUR BANCO UNIVERSAL" },
  { code: "0163", name: "BANCO DEL TESORO" },
  { code: "0168", name: "BANCRECER" },
  { code: "0169", name: "R4 BANCO MICROFINANCIERO C.A." },
  { code: "0171", name: "BANCO ACTIVO" },
  { code: "0172", name: "BANCAMIGA BANCO UNIVERSAL, C.A." },
  { code: "0173", name: "BANCO INTERNACIONAL DE DESARROLLO" },
  { code: "0174", name: "BANPLUS" },
  { code: "0175", name: "BANCO DIGITAL DE LOS TRABAJADORES, BANCO UNIVERSAL" },
  { code: "0177", name: "BANFANB" },
  { code: "0178", name: "N58 BANCO DIGITAL BANCO MICROFINANCIERO S A" },
  { code: "0191", name: "BANCO NACIONAL DE CREDITO" },
];