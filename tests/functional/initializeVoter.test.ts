import { Program } from "@coral-xyz/anchor";
import { LiteSVMProvider } from "anchor-litesvm";
import { beforeEach, describe, expect, test } from "bun:test";
import { LiteSVM } from "litesvm";
import { Voting } from "../../target/types/voting";
import { Keypair } from "@solana/web3.js";
import { fundedSystemAccountInfo, getSetup } from "../setup";
import { getVoterPda } from "../pda";
import { fetchVoterAcc } from "../accounts";

describe("initializeVoter", () => {
  let { litesvm, provider, program } = {} as {
    litesvm: LiteSVM;
    provider: LiteSVMProvider;
    program: Program<Voting>;
  };

  const voterAuthority = Keypair.generate();

  beforeEach(async () => {
    ({ litesvm, provider, program } = await getSetup([
      {
        pubkey: voterAuthority.publicKey,
        account: fundedSystemAccountInfo(),
      },
    ]));
  });

  test("initializes voter", async () => {
    await program.methods
      .initializeVoter()
      .accounts({
        authority: voterAuthority.publicKey,
      })
      .signers([voterAuthority])
      .rpc();

    const voterPda = getVoterPda(voterAuthority.publicKey);
    const voterAcc = await fetchVoterAcc(program, voterPda);

    expect(voterAcc.authority).toStrictEqual(voterAuthority.publicKey);
  });
});
