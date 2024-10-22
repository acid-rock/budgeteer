import axios from "axios";
import { Link } from "react-router-dom";

export type TransactionProps = {
  id?: number;
  type: string;
  amount: number;
  category: string;
  date: string;
  description: string;
};

export default function Transaction(props: TransactionProps) {
  const link = import.meta.env.VITE_BACKEND_URL
  const { id, type, amount, category, date, description } = props;

  const handleDelete = async () => {
    const response = await axios.delete(
      `${link}transactions/delete/${id}`
    );

    if (response.status === 200) {
      window.location.reload();
    }
  };

  return (
    <>
      <h1>
        {type === "income" ? "+" : "-"}
        {amount}.00
      </h1>
      <p>{category}</p>
      <p>"{description}"</p>
      <p>{date}</p>
      <Link to={`/edit/${id}`}>Edit</Link>
      &nbsp;
      <button onClick={handleDelete}>Delete</button>
      <hr />
    </>
  );
}
