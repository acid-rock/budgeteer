import { TransactionForm } from "@/components/TransactionForm";
import { TransactionList } from "@/components/TransactionList";

// Fully wired: the form POSTs to /api/transactions and the list re-renders
// via TanStack Query cache invalidation. Use this flow to verify the stack.
export default function TransactionsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-semibold">Transactions</h2>
        <p className="text-sm text-slate-500">
          Log income and expenses. New entries appear in the list immediately.
        </p>
      </div>
      <TransactionForm />
      <TransactionList />
    </div>
  );
}
