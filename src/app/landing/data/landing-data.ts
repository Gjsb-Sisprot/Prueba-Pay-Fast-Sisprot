import {
  Smartphone,
  Lock,
  CreditCard,
  Zap,
  Globe,
  Clock,
  MessageSquare,
  Database,
  Bot,
  Package,
  Star,
  Tag,
} from "lucide-react";
import { Feature, PaymentMethod, AIFeatureItem, Message } from "../types/landing.types";
import React from "react";

export const FEATURES: Feature[] = [
  {
    id: "mobile-first",
    icon: React.createElement(Smartphone, { className: "w-6 h-6" }),
    title: "Optimizado para celular",
    features: ["Optimizado para usar desde tu celular. Paga desde cualquier lugar."],
  },
  {
    id: "pin6",
    icon: React.createElement(Lock, { className: "w-6 h-6" }),
    title: "Verificación PIN6",
    features: [
      "Sistema de seguridad con un PIN único de 6 dígitos enviado a tu teléfono.",
      "Este PIN es personal, único y permanente, por lo que debes guardarlo y no compartirlo con nadie.",
      "Es necesario para validar tu identidad dentro del portal.",
    ],
  },
  {
    id: "methods",
    icon: React.createElement(CreditCard, { className: "w-6 h-6" }),
    title: "Métodos Afiliados",
    features: [
      "Guarda tus métodos de pago para realizar pagos más rápidos.",
      "Cada método afiliado se asocia a un contrato específico.",
      "Puedes afiliar diferentes cuentas o métodos a otros contratos, pero un mismo método no puede utilizarse para múltiples contratos al mismo tiempo."
    ],
  },
  {
    id: "guided",
    icon: React.createElement(Zap, { className: "w-6 h-6" }),
    title: "Proceso Guiado",
    features: ["Te guiamos paso a paso para que tu pago sea exitoso."],
  },
  {
    id: "bcv",
    icon: React.createElement(Globe, { className: "w-6 h-6" }),
    title: "Tasa BCV en Tiempo Real",
    features: ["Conversión automática con la tasa oficial del BCV."],
  },
  {
    id: "24-7",
    icon: React.createElement(Clock, { className: "w-6 h-6" }),
    title: "Disponible 24/7",
    features: [
      "Disponible 24/7 para realizar tus pagos.",
      "El horario de atención administrativa es de lunes a viernes de 8:00 am a 5:00 pm."
    ],
  },
];

export const PAYMENT_METHODS: PaymentMethod[] = [
  {
    id: "debt-inmediato",
    name: "Debito Inmediato",
    subtitle: "Todos los bancos",
    image: "/assets/methods/pago-movil.png",
    bgColor: "from-gray-50 to-gray-100",
    borderColor: "border-gray-200",
    textColor: "text-gray-600",
    bulletColor: "text-gray-600",
    features: ["Instantáneo", "Sin comisiones", "Código OTP enviado desde tu banco","Reporte de pago"],
  },
  {
    id: "pago-movil",
    name: "Pago Móvil",
    subtitle: "Todos los bancos",
    image: "/assets/methods/pago-movil.png",
    bgColor: "from-green-50 to-green-100",
    borderColor: "border-green-200",
    textColor: "text-green-600",
    bulletColor: "text-green-600",
    features: ["Instantáneo", "Sin comisiones", "Código QR disponible","Reporte de pago manual","Reporte de pago con IA al cargar tu comprobante"],
  },
  {
    id: "transferencia",
    name: "Transferencia",
    subtitle: "Bancaria",
    image: "/assets/methods/transferencia.png",
    bgColor: "from-blue-50 to-blue-100",
    borderColor: "border-blue-200",
    textColor: "text-blue-600",
    bulletColor: "text-blue-600",
    features: ["Bancos nacionales", "Montos mayores", "Comprobante digital","Reporte de pago manual","Reporte de pago con IA al cargar tu comprobante"],
  },
  {
    id: "zelle",
    name: "Pagos en USD",
    subtitle: "(Zelle, Binance, PayPal y otros)",
    image: "/assets/methods/zelle.png",
    bgColor: "from-purple-50 to-purple-100",
    borderColor: "border-purple-200",
    textColor: "text-purple-600",
    bulletColor: "text-purple-600",
    features: ["Dólares americanos", "Tasa BCV actualizada", "Confirmación rápida"],
  },
];

export const CHAT_MESSAGES: Message[] = [
  {
    id: "1",
    sender: "bot",
    text: "¡Hola! Soy el asistente virtual de Sisprot. ¿En qué puedo ayudarte hoy?",
  },
  {
    id: "2",
    sender: "user",
    text: "¿Puedo reportar un pago?",
  },
  {
    id: "3",
    sender: "bot",
    text: "Por supuesto. Por favor, proporciona los detalles de tu pago y te ayudaré a registrarlo.",
  },
];

export const AI_FEATURES: AIFeatureItem[] = [
  {
    id: "chat",
    icon: React.createElement(MessageSquare, { className: "w-5 h-5 text-white" }),
    title: "Chat en Tiempo Real",
    description: "Respuestas instantáneas a tus preguntas",
  },
  {
    id: "database",
    icon: React.createElement(Database, { className: "w-5 h-5 text-white" }),
    title: "Consulta de Información",
    description: "Consulta tus facturas y contratos",
  },
  {
    id: "payment",
    icon: React.createElement(CreditCard, { className: "w-5 h-5 text-white" }),
    title: "Reportes de Pagos",
    description: "Reporta tus pagos de forma mas rapida a traves de nuestro asistente inteligente",
  },
  {
    id: "support",
    icon: React.createElement(Bot, { className: "w-5 h-5 text-white" }),
    title: "Soporte 24/7",
    description: "Siempre disponible para ayudarte",
  },
];

export const EARLY_PAYMENT_BENEFITS = [
  {
    id: "points",
    icon: React.createElement(Star, { className: "w-6 h-6 text-[#FFB800] fill-[#FFB800]" }),
    title: "Puntos por Pronto Pago",
    description: "Próximamente: Obtén puntos cada vez que pagues antes de tu fecha de vencimiento.",
  },
  {
    id: "allies",
    icon: React.createElement(Package, { className: "w-6 h-6 text-gray-900" }),
    title: "Canje con Aliados",
    description: "Tus puntos podrán ser canjeados por productos y servicios con nuestros aliados comerciales.",
  },
  {
    id: "promos",
    icon: React.createElement(Tag, { className: "w-6 h-6 text-[#10B981]" }),
    title: "Promociones Especiales",
    description: "Acceso exclusivo a descuentos y promociones especiales para pagadores puntuales.",
  },
];
