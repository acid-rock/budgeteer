type DashboardLayoutProps = {
  children: React.ReactNode;
};

export default function DashboardLayout(props: DashboardLayoutProps) {
  const { children } = props;

  return (
    <>
      <header>
        <h1>Dashboard Page.</h1>
      </header>

      {children}
    </>
  );
}
