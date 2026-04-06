import { ReactNode } from "react";

export interface Feature {
  id: string;
  title: string;
  features: string[];
  icon: ReactNode;
}

export interface PaymentMethod {
  id: string;
  name: string;
  subtitle: string;
  image: string;
  bgColor: string;
  borderColor: string;
  textColor: string;
  bulletColor: string;
  features: string[];
}

export interface AIFeatureItem {
  id: string;
  title: string;
  description: string;
  icon: ReactNode;
}

export interface Message {
  id: string;
  sender: "bot" | "user";
  text: string;
}
