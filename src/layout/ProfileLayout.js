import React from "react";
import Header from "../components/Header";
import Footer from "../components/Footer";

const ProfileLayout = ({ children }) => {
  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col">
      <Header />
      <main className="flex-1 w-full px-4 py-4 pb-24">{children}</main>
      <Footer />
    </div>
  );
};

export default ProfileLayout;
