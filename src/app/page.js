import Header from "@/components/Header";
import Login from "@/components/Login";

export default function Home() {
  return (
    <main className="max-w-5xl mx-auto pt-8 min-h-screen flex flex-col items-center gap-10">
      {/* <Header/> */}
      <Login/>
    </main>
  );
}
