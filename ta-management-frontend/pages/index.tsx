// pages/index.tsx
import { useEffect } from "react";
import { useRouter } from "next/router";

const Home = () => {
  const router = useRouter();

  useEffect(() => {
    router.push("/login"); // Changed to redirect to login page instead
  }, [router]);

  return (
    <div className="min-h-screen flex justify-center items-center bg-gray-100">
      <p>Loading...</p> {/* Optional loading message until redirect happens */}
    </div>
  );
};

export default Home;
