import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import Layout from "../components/Layout";
import LeaderBoard from "../components/LeaderBoard";

export const Route = createFileRoute("/leaderboard")({
  component: LeaderBoardPage,
});

function LeaderBoardPage() {

  if (process.env.NODE_ENV === "production") {
    return null;
  }

  return (
    <Layout>
      <LeaderBoard />
    </Layout>
  );
}
