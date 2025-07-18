import { PublicKey } from "@solana/web3.js";
import idl from "../target/idl/voting.json";

export const VOTING_PROGRAM_ID = new PublicKey(idl.address);
export const DAO_MINT = PublicKey.unique();
export const DAO_MINT_DECIMALS = 6;
