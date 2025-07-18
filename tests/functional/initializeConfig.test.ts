import { BN, Program } from "@coral-xyz/anchor";
import { LiteSVMProvider } from "anchor-litesvm";
import { beforeEach, describe, expect, test } from "bun:test";
import { LiteSVM } from "litesvm";
import { Voting } from "../../target/types/voting";
import { Keypair } from "@solana/web3.js";
import { fundedSystemAccountInfo, getSetup } from "../setup";
import { DAO_MINT } from "../constants";
import { getConfigPda } from "../pda";
import { fetchConfigAcc } from "../accounts";

describe("initializeConfig", () => {
  let { litesvm, provider, program } = {} as {
    litesvm: LiteSVM;
    provider: LiteSVMProvider;
    program: Program<Voting>;
  };

  const configAuthority = Keypair.generate();

  beforeEach(async () => {
    ({ litesvm, provider, program } = await getSetup([
      {
        pubkey: configAuthority.publicKey,
        account: fundedSystemAccountInfo(),
      },
    ]));
  });

  test("initializes config", async () => {
    const unstakePeriod = 7 * 24 * 60 * 60; // 7 days

    await program.methods
      .initializeConfig({
        unstakePeriod: new BN(unstakePeriod),
      })
      .accounts({
        authority: configAuthority.publicKey,
        stakeMint: DAO_MINT,
      })
      .signers([configAuthority])
      .rpc();

    const configPda = getConfigPda();
    const configAcc = await fetchConfigAcc(program, configPda);

    expect(configAcc.authority).toStrictEqual(configAuthority.publicKey);
    expect(configAcc.stakeMint).toStrictEqual(DAO_MINT);
    expect(configAcc.unstakePeriod.toNumber()).toEqual(unstakePeriod);
  });
});
