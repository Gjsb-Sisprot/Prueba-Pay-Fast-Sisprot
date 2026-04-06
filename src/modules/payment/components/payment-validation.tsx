"use client";

import { useClientStore } from "@/shared/lib/store/client-store";
import { PaymentReferenceStep } from "@/modules/payment/components/validation/reference-step";
import { PaymentBankStep } from "@/modules/payment/components/validation/bank-step";
import { PaymentAccountHolderStep } from "@/modules/payment/components/validation/account-holder-step";
import { PaymentDateStep } from "@/modules/payment/components/validation/date-step";
import { PaymentAmountStep } from "@/modules/payment/components/validation/amount-step";
import { PaymentConfirmationStep } from "@/modules/payment/components/validation/confirmation-step";
import { PaymentReceiptStep } from "@/modules/payment/components/validation/receipt-step";

interface PaymentValidationProps {
  paymentMethod: string;
  amount: string;
  dollarAmount?: string;
}

export function PaymentValidation({
  paymentMethod,
  amount,
  dollarAmount,
}: PaymentValidationProps) {
  const { validationStep } = useClientStore();

  const renderValidationStep = () => {
    switch (validationStep) {
      case "reference":
        return <PaymentReferenceStep paymentMethod={paymentMethod} />;
      case "bank":
        return <PaymentBankStep />;
      case "account-holder":
        return <PaymentAccountHolderStep />;
      case "date":
        return <PaymentDateStep paymentMethod={paymentMethod} />;
      case "amount":
        return (
          <PaymentAmountStep
            expectedAmount={amount}
            dollarAmount={dollarAmount}
            paymentMethod={paymentMethod}
          />
        );
      case "confirmation":
        return <PaymentConfirmationStep paymentMethod={paymentMethod} />;
      case "receipt":
        return <PaymentReceiptStep paymentMethod={paymentMethod} />;
      default:
        return <PaymentReferenceStep paymentMethod={paymentMethod} />; // Por defecto empezar con referencia
    }
  };

  return <div className="space-y-4">{renderValidationStep()}</div>;
}
