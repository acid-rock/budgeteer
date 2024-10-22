import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import Form from "./pages/Form.tsx";

const router = createBrowserRouter([
  { path: "/", element: <App /> },
  { path: "add", element: <Form mode={"Add"} /> },
  { path: "edit/:id", element: <Form mode={"Edit"} /> },
]);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>
);
