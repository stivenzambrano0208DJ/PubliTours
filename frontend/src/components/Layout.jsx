import { Outlet } from "react-router-dom";
import Header from "./Header";
import Footer from "./Footer";

export default function Layout() {
  return (
    <div className="flex flex-col min-h-screen bg-surface">
      <Header />
      <main className="w-full pt-20 print:pt-0 flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
