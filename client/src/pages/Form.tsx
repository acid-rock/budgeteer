import axios from "axios";
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

type FormProps = {
  mode: "Add" | "Edit";
};

type DataProps = {
  type: string;
  amount: number;
  category: string;
  date: string;
  description: string;
};

export default function Form(props: FormProps) {
  const link = import.meta.env.VITE_BACKEND_URL
  const { mode } = props;

  const navigate = useNavigate();
  const params = useParams();
  const [data, setData] = useState<DataProps>({
    type: "income",
    amount: 0,
    category: "",
    date: "",
    description: "",
  });

  useEffect(() => {
    const fetchData = async () => {
      const response = await axios.get(
        `${link}transactions/get/${params.id}`
      );

      console.log(response.data);

      setData(response.data);
    };

    if (mode === "Edit") {
      fetchData();
    }
  }, [mode, params.id, link]);

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setData({ ...data, [e.target.name]: e.target.value });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setData({ ...data, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const response = await axios.post(
      `${link}transactions/create`,
      data
    );

    if (response.status === 201) {
      navigate("/");
    }
  };

  return (
    <>
      <h1>{mode} transaction</h1>

      <form onSubmit={handleSubmit}>
        <div>
          <label>Type: </label>
          <select
            name="type"
            id="type"
            value={data?.type}
            onChange={handleSelectChange}
          >
            <option value="income">Income</option>
            <option value="expense">Expense</option>
          </select>
        </div>
        <div>
          <label>Amount: </label>
          <input
            type="number"
            name="amount"
            id="amount"
            required
            autoComplete="off"
            value={data?.amount}
            onChange={handleChange}
          />
        </div>
        <div>
          <label>Category: </label>
          <input
            type="text"
            name="category"
            id="category"
            required
            autoComplete="off"
            value={data?.category}
            onChange={handleChange}
          />
        </div>
        <div>
          <label>Date: </label>
          <input
            type="datetime-local"
            name="date"
            id="date"
            required
            autoComplete="off"
            value={data?.date}
            onChange={handleChange}
          />
        </div>
        <div>
          <label>Description: </label>
          <input
            type="text"
            name="description"
            id="description"
            autoComplete="off"
            value={data?.description}
            onChange={handleChange}
          />
        </div>
        <br />
        <button type="submit">Submit</button>
        &nbsp;
        <Link to="/">Go back</Link>
      </form>
    </>
  );
}
