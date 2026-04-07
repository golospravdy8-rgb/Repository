"use client";

import { useQuery } from "@tanstack/react-query";

export interface MvpPlayer {
  playerId: number;
  firstName: string;
  lastName: string;
  photoUrl: string | null;
  number: number;
  teamName: string;
  teamLogo: string | null;
  votes: number;
}

export interface MvpUserVote {
  playerId: number;
  firstName: string;
  lastName: string;
  photoUrl: string | null;
  number: number;
}

export type MvpStatus = "not_started" | "active_not_voted" | "active_voted" | "finished";

export interface MvpData {
  currentLeader: MvpPlayer | null;
  allResults: MvpPlayer[];
  userVote: MvpUserVote | null;
  month: string;
  status: MvpStatus; // NEW: explicit status instead of hasVotes boolean
  totalVotes: number; // Total votes cast this month
  votingStartsAt: string; // ISO date when voting starts
  votingEndsAt: string;   // ISO date when voting ends
}

export function useMvpData(phone: string | null) {
  return useQuery<MvpData>({
    queryKey: ["mvp-data", phone],
    queryFn: async (): Promise<MvpData> => {
      if (!phone) {
        return {
          currentLeader: null,
          allResults: [],
          userVote: null,
          month: "",
          status: "not_started",
          totalVotes: 0,
          votingStartsAt: "",
          votingEndsAt: "",
        };
      }

      const response = await fetch(`/api/chat/mvp-vote?phone=${encodeURIComponent(phone)}`);
      if (!response.ok) {
        throw new Error("Failed to fetch MVP data");
      }

      const json = await response.json();

      return {
        currentLeader: json.currentLeader || null,
        allResults: json.allResults || [],
        userVote: json.userVote || null,
        month: json.month || "",
        status: json.status || "not_started", // NEW: from API
        totalVotes: json.totalVotes || 0, // NEW: from API
        votingStartsAt: json.votingStartsAt || "", // NEW: from API
        votingEndsAt: json.votingEndsAt || "", // NEW: from API
      };
    },
    enabled: !!phone,
    refetchInterval: 3000,
    staleTime: 2000,
    gcTime: 5 * 60 * 1000,
  });
}
