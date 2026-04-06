"use client";

import { ClientSearchForm } from "@/modules/client-search/components/client-search-form";
import { PaymentsSteps } from "@/modules/payment/components/payments-steps";
import { Pin6Validation } from "@/modules/pin6/components/pin6-validation";
import { useClientStore } from "@/shared/lib/store/client-store";
import { ChatBubble } from "@/modules/assistant/components/chat-bubble";
import { canAccessAIAssistant } from "@/shared/lib/validation/ai-access-control";
import Image from "next/image";

export default function HomePage() {
  const { selectedClient, pin6ValidationStep } = useClientStore();

  const handlePin6Validated = async () => {
    // No hacer nada aquí - los contratos ya se cargaron durante la validación PIN6
    // Este callback simplemente permite que el componente padre sepa que la validación terminó
  };

  // Determinar qué mostrar basado en el estado
  const showPin6Validation =
    selectedClient &&
    (pin6ValidationStep === null ||
      pin6ValidationStep === "pending" ||
      pin6ValidationStep === "validating" ||
      pin6ValidationStep === "failed");

  const showPaymentFlow = selectedClient && pin6ValidationStep === "validated";

  // Solo mostrar el chat cuando:
  // 1. El usuario esté autenticado (PIN6 validado)
  // 2. La cédula del usuario esté autorizada para acceder al asistente IA
  const showChat = 
    pin6ValidationStep === "validated" && 
    canAccessAIAssistant(selectedClient?.identification);

  return (
    <>
      {/* ChatBubble solo visible después de autenticación */}
      {showChat && <ChatBubble />}

      <div className="min-h-screen px-4 py-8 sm:px-6 lg:px-8">
        <main
          className={`mx-auto flex flex-col items-center gap-6 sm:gap-8 lg:gap-10 ${
            selectedClient ? "max-w-4xl" : "max-w-md sm:max-w-lg lg:max-w-xl"
          }`}
        >
          {/* Logo y título - Siempre visible */}
          <div className="flex flex-col items-center gap-3 sm:gap-4 text-center">
            <Image
              src="/assets/logo/logo_sgf.png"
              alt="logo"
              width={100}
              height={100}
              className="mb-4 sm:mb-6 lg:mb-8"
            />
            <h1 className="scroll-m-20 text-3xl sm:text-4xl lg:text-6xl font-black tracking-tight text-balance leading-tight">
              Pago Rápido
            </h1>
          </div>

          {/* Contenido dinámico basado en el estado */}
          {!selectedClient ? (
            /* Formulario de búsqueda cuando no hay cliente seleccionado */
            <ClientSearchForm />
          ) : showPin6Validation ? (
            /* Validación PIN6 cuando hay cliente pero no se ha validado */
            <Pin6Validation onValidated={handlePin6Validated} />
          ) : showPaymentFlow ? (
            /* Flujo de pagos cuando cliente y PIN6 están validados */
            <PaymentsSteps />
          ) : null}
        </main>
      </div>
    </>
  );
}
