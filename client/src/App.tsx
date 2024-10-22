import axios from "axios";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Transaction, { TransactionProps } from "./components/Transaction";

export default function App() {
  const link = import.meta.env.VITE_BACKEND_URL;

  const [data, setData] = useState([]);
  const [range, setRange] = useState("daily");
  const [loading, setLoading] = useState(true);
  const [account, setAccount] = useState({
    income: 0,
    expenses: 0,
    balance: 0,
  });

  // Range change handler
  const handleRangeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setRange(e.target.value);
  };

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const getAccountDetails = (data: any) => {
      let income = 0;
      let expenses = 0;

      for (const record of data) {
        if (record.type === "income") {
          income += record.amount;
        } else if (record.type === "expense") {
          expenses += record.amount;
        }
      }

      return { income: income, expenses: expenses, balance: income - expenses };
    };

    const fetchData = async (range: string) => {
      let route = "";

      switch (range) {
        case "daily":
          route = "transactions/getCurrentTransactions";
          break;
        case "weekly":
          route = "transactions/getWeeklyTransactions";
          break;
        case "monthly":
          route = "transactions/getMonthlyTransactions";
          break;
        case "yearly":
          route = "transactions/getYearlyTransactions";
          break;
        default:
          route = "transactions/getAll";
          break;
      }

      const response = await axios.get(`${link}${route}`);

      setData(response.data);
      const account = getAccountDetails(response.data);
      setAccount(account);
    };

    fetchData(range);
    setLoading(false);
  }, [range, link]);

  if (loading) return <p>Loading...</p>;

  return (
    <>
      <h1>Budgeteer</h1>

      <h1>Income: {account.income}.00</h1>
      <h1>Expenses: {account.expenses}.00</h1>
      <h1>Balance: {account.balance}.00</h1>

      <Link to="/add">Add new transaction</Link>

      <hr />

      <div>
        <select name="range" onChange={handleRangeChange}>
          <option value="daily">Daily</option>
          <option value="weekly">Weekly</option>
          <option value="monthly">Monthly</option>
          <option value="yearly">Yearly</option>
        </select>
      </div>

      <hr />

      {data.length ? (
        data.map((transaction: TransactionProps) => (
          <Transaction
            key={transaction.id}
            id={transaction.id}
            type={transaction.type}
            amount={transaction.amount}
            category={transaction.category}
            date={transaction.date}
            description={transaction.description}
          />
        ))
      ) : (
        <i>No transactions yet.</i>
      )}
    </>
  );
}
