import { Program } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import { Voting } from "../target/types/voting";

export async function fetchConfigAcc(
  program: Program<Voting>,
  configPda: PublicKey
) {
  return program.account.config.fetchNullable(configPda);
}

export async function fetchProposalAcc(
  program: Program<Voting>,
  proposalPda: PublicKey
) {
  return program.account.proposal.fetchNullable(proposalPda);
}

export async function fetchVoterAcc(
  program: Program<Voting>,
  voterPda: PublicKey
) {
  return program.account.voter.fetchNullable(voterPda);
}

export async function fetchVoteAcc(
  program: Program<Voting>,
  votePda: PublicKey
) {
  return program.account.vote.fetchNullable(votePda);
}
