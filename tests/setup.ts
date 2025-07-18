import { LAMPORTS_PER_SOL, PublicKey, SystemProgram } from "@solana/web3.js";
import { AccountInfoBytes, Clock, LiteSVM } from "litesvm";
import { fromWorkspace, LiteSVMProvider } from "anchor-litesvm";
import { Voting } from "../target/types/voting";
import { AnchorError, Program } from "@coral-xyz/anchor";
import idl from "../target/idl/voting.json";
import { expect } from "bun:test";
import { MINT_SIZE, MintLayout, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { DAO_MINT, DAO_MINT_DECIMALS } from "./constants";

export async function getSetup(
  accounts: { pubkey: PublicKey; account: AccountInfoBytes }[] = []
) {
  const litesvm = fromWorkspace("./");
  litesvm.withLogBytesLimit(null);

  initDaoMint(litesvm);

  for (const { pubkey, account } of accounts) {
    litesvm.setAccount(new PublicKey(pubkey), {
      data: account.data,
      executable: account.executable,
      lamports: account.lamports,
      owner: new PublicKey(account.owner),
    });
  }

  const provider = new LiteSVMProvider(litesvm);
  const program = new Program<Voting>(idl, provider);

  return { litesvm, provider, program };
}

export function fundedSystemAccountInfo(
  lamports: number = LAMPORTS_PER_SOL
): AccountInfoBytes {
  return {
    lamports,
    data: Buffer.alloc(0),
    owner: SystemProgram.programId,
    executable: false,
  };
}

export async function expectAnchorError(error: Error, code: string) {
  expect(error).toBeInstanceOf(AnchorError);
  const { errorCode } = (error as AnchorError).error;
  expect(errorCode.code).toBe(code);
}

export async function forwardTime(litesvm: LiteSVM, sec: number) {
  const clock = litesvm.getClock();
  litesvm.setClock(
    new Clock(
      clock.slot,
      clock.epochStartTimestamp,
      clock.epoch,
      clock.leaderScheduleEpoch,
      clock.unixTimestamp + BigInt(sec)
    )
  );
}

function initDaoMint(litesvm: LiteSVM) {
  const daoMintData = Buffer.alloc(MINT_SIZE);

  MintLayout.encode(
    {
      mintAuthority: PublicKey.default,
      mintAuthorityOption: 0,
      supply: BigInt(1000 * 10 ** DAO_MINT_DECIMALS),
      decimals: DAO_MINT_DECIMALS,
      isInitialized: true,
      freezeAuthority: PublicKey.default,
      freezeAuthorityOption: 0,
    },
    daoMintData
  );

  litesvm.setAccount(DAO_MINT, {
    data: daoMintData,
    executable: false,
    lamports: LAMPORTS_PER_SOL,
    owner: TOKEN_PROGRAM_ID,
  });
}
