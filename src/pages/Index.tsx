import ExpenseTracker from "@/components/ExpenseTracker";
import { CurrencyProvider } from "@/hooks/use-currency";

const Index = () => {
  return (
    <CurrencyProvider>
      <ExpenseTracker />
    </CurrencyProvider>
  );
};

export default Index;
