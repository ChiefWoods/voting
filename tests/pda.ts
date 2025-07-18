import { PublicKey } from "@solana/web3.js";
import { VOTING_PROGRAM_ID } from "./constants";

function getUint16Buffer(value: number) {
  const buffer = Buffer.alloc(2);
  buffer.writeUInt16LE(value, 0);
  return buffer;
}

export function getConfigPda() {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("config")],
    VOTING_PROGRAM_ID
  )[0];
}

export function getProposalPda(id: number) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("proposal"), getUint16Buffer(id)],
    VOTING_PROGRAM_ID
  )[0];
}

export function getVoterPda(authority: PublicKey) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("voter"), authority.toBuffer()],
    VOTING_PROGRAM_ID
  )[0];
}

export function getVotePda(voterPda: PublicKey, proposalPda: PublicKey) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("vote"), voterPda.toBuffer(), proposalPda.toBuffer()],
    VOTING_PROGRAM_ID
  )[0];
}
