import { TransactionForm } from "@/components/TransactionForm";
import { TransactionList } from "@/components/TransactionList";

export default function TransactionsPage() {
  return (
    <>
      <div className="mint-head">
        <div>
          <h1>Transactions</h1>
          <p>Every peso in and out, this month.</p>
        </div>
      </div>
      <TransactionForm />
      <TransactionList />
    </>
  );
}
